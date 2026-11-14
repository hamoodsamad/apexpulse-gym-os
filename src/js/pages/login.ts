import {
  fetchAuthStatus,
  getCurrentUser,
  loginAccount,
  redirectAfterAuth,
  registerMemberAccount,
  setupInitialAdmin,
} from "../services/authService.ts";
import { showToast } from "../ui/toast.ts";

async function initLoginPage(): Promise<void> {
  const existingUser = await getCurrentUser();
  if (existingUser) {
    redirectAfterAuth(existingUser);
    return;
  }

  const setupSection = document.getElementById("admin-setup-section");
  const authTabsSection = document.getElementById("auth-tabs-section");
  const loginPanel = document.getElementById("login-panel");
  const registerPanel = document.getElementById("register-panel");
  const tabLoginBtn = document.getElementById("tab-login-btn");
  const tabRegisterBtn = document.getElementById("tab-register-btn");
  const errorBox = document.getElementById("auth-error-box");
  const dbEngineText = document.getElementById("db-engine-note");

  const showError = (msg: string): void => {
    if (!errorBox) return;
    errorBox.textContent = msg;
    errorBox.classList.remove("hidden");
  };

  const clearError = (): void => {
    if (!errorBox) return;
    errorBox.textContent = "";
    errorBox.classList.add("hidden");
  };

  try {
    const status = await fetchAuthStatus();
    if (dbEngineText) {
      dbEngineText.textContent =
        status.dbEngine === "postgres"
          ? "Connected to Cloud PostgreSQL database with multi-device live synchronization."
          : "Connected to persistent local SQLite database with live synchronization.";
    }

    if (!status.hasAdmin) {
      setupSection?.classList.remove("hidden");
      authTabsSection?.classList.add("hidden");
    } else {
      setupSection?.classList.add("hidden");
      authTabsSection?.classList.remove("hidden");
    }
  } catch (err) {
    showError(
      err instanceof Error
        ? err.message
        : "Unable to reach authentication server.",
    );
  }

  tabLoginBtn?.addEventListener("click", () => {
    clearError();
    tabLoginBtn.classList.add("active");
    tabRegisterBtn?.classList.remove("active");
    loginPanel?.classList.remove("hidden");
    registerPanel?.classList.add("hidden");
  });

  tabRegisterBtn?.addEventListener("click", () => {
    clearError();
    tabRegisterBtn.classList.add("active");
    tabLoginBtn?.classList.remove("active");
    registerPanel?.classList.remove("hidden");
    loginPanel?.classList.add("hidden");
  });

  const setupForm = document.getElementById(
    "admin-setup-form",
  ) as HTMLFormElement | null;
  setupForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearError();
    const formData = new FormData(setupForm);
    try {
      const user = await setupInitialAdmin({
        fullName: String(formData.get("fullName") || ""),
        email: String(formData.get("email") || ""),
        password: String(formData.get("password") || ""),
      });
      showToast("Administrator account initialized", "success");
      redirectAfterAuth(user);
    } catch (err) {
      showError(
        err instanceof Error
          ? err.message
          : "Failed to initialize administrator account.",
      );
    }
  });

  const loginForm = document.getElementById(
    "login-form",
  ) as HTMLFormElement | null;
  loginForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearError();
    const formData = new FormData(loginForm);
    try {
      const user = await loginAccount(
        String(formData.get("email") || ""),
        String(formData.get("password") || ""),
      );
      redirectAfterAuth(user);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Sign in failed.");
    }
  });

  const registerForm = document.getElementById(
    "register-form",
  ) as HTMLFormElement | null;
  registerForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearError();
    const formData = new FormData(registerForm);
    try {
      const user = await registerMemberAccount({
        fullName: String(formData.get("fullName") || ""),
        email: String(formData.get("email") || ""),
        phone: String(formData.get("phone") || ""),
        age: Number(formData.get("age") || 0),
        password: String(formData.get("password") || ""),
      });
      showToast("Member account created", "success");
      redirectAfterAuth(user);
    } catch (err) {
      showError(err instanceof Error ? err.message : "Registration failed.");
    }
  });
}

void initLoginPage();
