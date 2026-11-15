import {
  ArrowLeft,
  ClipboardCheck,
  CreditCard,
  Eye,
  EyeOff,
  Fingerprint,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Shield,
  User,
  UserCheck,
  Users,
  createElement,
} from "lucide";
import type { AuthUser } from "../types.ts";
import {
  changePassword,
  logoutAccount,
  switchViewMode,
} from "../services/authService.ts";
import { realtimeClient } from "../services/realtimeClient.ts";
import { closeModal, openModal, wireModalDismiss } from "./modals.ts";
import { showToast } from "./toast.ts";
import { escapeHtml } from "../utils/formatters.ts";

const PORTFOLIO_URL =
  "https://my-portfolio-czuhuqnne-hamoodsamad0321-6526.vercel.app";

interface NavLinkDef {
  href: string;
  label: string;
  key: string;
  icon: typeof LayoutDashboard;
}

const ADMIN_NAV_LINKS: NavLinkDef[] = [
  {
    href: "/index-dashboard.html",
    label: "Dashboard",
    key: "dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/index-members.html",
    label: "Members",
    key: "members",
    icon: Users,
  },
  {
    href: "/index-scanner.html",
    label: "Scanner Terminal",
    key: "scanner",
    icon: Fingerprint,
  },
  {
    href: "/index-packages.html",
    label: "Plans & Deals",
    key: "packages",
    icon: Package,
  },
  {
    href: "/index-payments.html",
    label: "Payments",
    key: "payments",
    icon: CreditCard,
  },
  {
    href: "/index-attendance.html",
    label: "Attendance",
    key: "attendance",
    icon: ClipboardCheck,
  },
];

const MEMBER_NAV_LINKS: NavLinkDef[] = [
  {
    href: "/index-member-portal.html",
    label: "My Membership",
    key: "member-portal",
    icon: UserCheck,
  },
];

export function wirePasswordToggles(
  root: Document | HTMLElement = document,
): void {
  const buttons = root.querySelectorAll<HTMLButtonElement>(
    "[data-toggle-password]",
  );
  for (const btn of buttons) {
    if (btn.dataset.wired === "1") continue;
    btn.dataset.wired = "1";
    btn.innerHTML = "";
    btn.appendChild(createElement(Eye, { "aria-hidden": "true" }));

    btn.addEventListener("click", () => {
      const targetId = btn.dataset.togglePassword;
      if (!targetId) return;
      const input = document.getElementById(
        targetId,
      ) as HTMLInputElement | null;
      if (!input) return;
      const isHidden = input.type === "password";
      input.type = isHidden ? "text" : "password";
      btn.setAttribute(
        "aria-label",
        isHidden ? "Hide password" : "Show password",
      );
      btn.innerHTML = "";
      btn.appendChild(
        createElement(isHidden ? EyeOff : Eye, { "aria-hidden": "true" }),
      );
    });
  }
}

function ensureChangePasswordModal(): void {
  if (document.getElementById("global-change-password-modal")) return;

  const modal = document.createElement("div");
  modal.id = "global-change-password-modal";
  modal.className = "modal-overlay hidden";
  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "chg-pwd-title");

  modal.innerHTML = `
    <div class="modal-panel">
      <div class="modal-header">
        <h2 id="chg-pwd-title" class="section-title">Change Account Password</h2>
        <button type="button" class="btn btn-secondary btn-sm" data-close-modal>Close</button>
      </div>
      <form id="global-change-password-form" class="form-grid">
        <div class="form-field form-field-full">
          <label class="form-label" for="chg-current-pwd">Current Password</label>
          <div class="password-field-wrap">
            <input id="chg-current-pwd" name="currentPassword" type="password" class="form-input" required />
            <button type="button" class="password-toggle-btn" data-toggle-password="chg-current-pwd" aria-label="Show password"></button>
          </div>
        </div>
        <div class="form-field form-field-full">
          <label class="form-label" for="chg-new-pwd">New Password (minimum 8 characters)</label>
          <div class="password-field-wrap">
            <input id="chg-new-pwd" name="newPassword" type="password" minlength="8" class="form-input" required />
            <button type="button" class="password-toggle-btn" data-toggle-password="chg-new-pwd" aria-label="Show password"></button>
          </div>
        </div>
        <div class="modal-footer form-field-full">
          <button type="button" class="btn btn-secondary" data-close-modal>Cancel</button>
          <button type="submit" class="btn btn-primary">Update Password</button>
        </div>
      </form>
    </div>
  `;

  document.body.appendChild(modal);
  wireModalDismiss("global-change-password-modal");
  wirePasswordToggles(modal);

  const form = document.getElementById(
    "global-change-password-form",
  ) as HTMLFormElement | null;
  form?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(form);
    try {
      await changePassword(
        String(fd.get("currentPassword") || ""),
        String(fd.get("newPassword") || ""),
      );
      showToast("Password updated successfully", "success");
      form.reset();
      closeModal("global-change-password-modal");
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Unable to update password.",
        "error",
      );
    }
  });
}

export function initAppShell(options: {
  user: AuthUser;
  activeNavKey: string;
  pageTitle: string;
}): void {
  const sidebar = document.getElementById("app-sidebar");
  const backdrop = document.getElementById("sidebar-backdrop");
  const topbarLeft = document.getElementById("topbar-left");

  if (sidebar) {
    const links =
      options.user.role === "admin" ? ADMIN_NAV_LINKS : MEMBER_NAV_LINKS;

    sidebar.innerHTML = "";

    const topGroup = document.createElement("div");
    const brand = document.createElement("div");
    brand.className = "sidebar-brand";
    brand.textContent = "ApexPulse Gym OS";
    topGroup.appendChild(brand);

    const backLink = document.createElement("a");
    backLink.href = PORTFOLIO_URL;
    backLink.className = "portfolio-back-link";
    backLink.appendChild(
      createElement(ArrowLeft, { class: "nav-icon", "aria-hidden": "true" }),
    );
    const backLabel = document.createElement("span");
    backLabel.textContent = "Back to Portfolio";
    backLink.appendChild(backLabel);
    topGroup.appendChild(backLink);

    const nav = document.createElement("nav");
    nav.className = "sidebar-nav";
    nav.setAttribute("aria-label", "Primary navigation");

    for (const item of links) {
      const anchor = document.createElement("a");
      anchor.href = item.href;
      anchor.className = `nav-link${item.key === options.activeNavKey ? " active" : ""}`;
      const iconEl = createElement(item.icon, {
        class: "nav-icon",
        "aria-hidden": "true",
      });
      const labelSpan = document.createElement("span");
      labelSpan.textContent = item.label;
      anchor.appendChild(iconEl);
      anchor.appendChild(labelSpan);
      nav.appendChild(anchor);
    }

    topGroup.appendChild(nav);
    sidebar.appendChild(topGroup);

    const footer = document.createElement("div");
    footer.className = "sidebar-footer";
    footer.innerHTML = `
      <div class="sidebar-user">
        <div class="sidebar-user-name">${escapeHtml(options.user.fullName)}</div>
        <div class="sidebar-user-meta">${escapeHtml(
          options.user.isDemo
            ? "Read-Only Portfolio Demo"
            : options.user.role === "admin"
              ? "Administrator (Full Access)"
              : "Member Account",
        )}</div>
      </div>
    `;

    if (!options.user.isDemo) {
      ensureChangePasswordModal();
      const chgPwdBtn = document.createElement("button");
      chgPwdBtn.type = "button";
      chgPwdBtn.className = "btn btn-ghost btn-sm";
      chgPwdBtn.appendChild(
        createElement(KeyRound, { class: "nav-icon", "aria-hidden": "true" }),
      );
      const chgTxt = document.createElement("span");
      chgTxt.textContent = "Change Password";
      chgPwdBtn.appendChild(chgTxt);
      chgPwdBtn.addEventListener("click", () => {
        openModal("global-change-password-modal");
      });
      footer.appendChild(chgPwdBtn);
    }

    const logoutBtn = document.createElement("button");
    logoutBtn.type = "button";
    logoutBtn.className = "btn btn-ghost btn-sm";
    logoutBtn.appendChild(
      createElement(LogOut, { class: "nav-icon", "aria-hidden": "true" }),
    );
    const btnText = document.createElement("span");
    btnText.textContent = options.user.isDemo
      ? "Admin / Member Login"
      : "Sign Out";
    logoutBtn.appendChild(btnText);
    logoutBtn.addEventListener("click", () => {
      void logoutAccount();
    });

    footer.appendChild(logoutBtn);
    sidebar.appendChild(footer);
  }

  if (topbarLeft) {
    topbarLeft.innerHTML = "";
    const menuBtn = document.createElement("button");
    menuBtn.type = "button";
    menuBtn.className = "mobile-menu-btn";
    menuBtn.setAttribute("aria-label", "Open navigation menu");
    menuBtn.appendChild(
      createElement(Menu, { class: "nav-icon", "aria-hidden": "true" }),
    );

    menuBtn.addEventListener("click", () => {
      sidebar?.classList.toggle("open");
      backdrop?.classList.toggle("open");
    });

    backdrop?.addEventListener("click", () => {
      sidebar?.classList.remove("open");
      backdrop?.classList.remove("open");
    });

    const titleEl = document.createElement("h1");
    titleEl.className = "topbar-title";
    titleEl.textContent = options.pageTitle;

    const roleSwitcher = document.createElement("div");
    roleSwitcher.className = "role-switcher-group";
    roleSwitcher.setAttribute("role", "group");
    roleSwitcher.setAttribute("aria-label", "Switch portal view");

    const adminSwitchBtn = document.createElement("button");
    adminSwitchBtn.type = "button";
    adminSwitchBtn.className = `role-switch-btn${options.user.role === "admin" ? " active" : ""}`;
    adminSwitchBtn.appendChild(
      createElement(Shield, { class: "nav-icon", "aria-hidden": "true" }),
    );
    adminSwitchBtn.appendChild(document.createTextNode("Admin View"));
    adminSwitchBtn.addEventListener("click", () => {
      if (options.user.role !== "admin") {
        void switchViewMode("admin");
      }
    });

    const memberSwitchBtn = document.createElement("button");
    memberSwitchBtn.type = "button";
    memberSwitchBtn.className = `role-switch-btn${options.user.role === "member" ? " active" : ""}`;
    memberSwitchBtn.appendChild(
      createElement(User, { class: "nav-icon", "aria-hidden": "true" }),
    );
    memberSwitchBtn.appendChild(document.createTextNode("Member View"));
    memberSwitchBtn.addEventListener("click", () => {
      if (options.user.role !== "member") {
        void switchViewMode("member");
      }
    });

    roleSwitcher.appendChild(adminSwitchBtn);
    roleSwitcher.appendChild(memberSwitchBtn);

    const topPortfolioBtn = document.createElement("a");
    topPortfolioBtn.href = PORTFOLIO_URL;
    topPortfolioBtn.className = "topbar-portfolio-btn";
    topPortfolioBtn.appendChild(
      createElement(ArrowLeft, { class: "nav-icon", "aria-hidden": "true" }),
    );
    topPortfolioBtn.appendChild(document.createTextNode("Portfolio"));

    topbarLeft.appendChild(menuBtn);
    topbarLeft.appendChild(titleEl);
    topbarLeft.appendChild(roleSwitcher);
    topbarLeft.appendChild(topPortfolioBtn);
  }

  if (options.user.isDemo && !document.getElementById("demo-readonly-banner")) {
    const mainViewport = document.querySelector(".main-viewport");
    const topbar = mainViewport?.querySelector(".topbar");
    if (mainViewport && topbar) {
      const banner = document.createElement("div");
      banner.id = "demo-readonly-banner";
      banner.className = "demo-readonly-banner";
      banner.innerHTML = `
        <span>Portfolio Preview (Read-Only Demo): Visitors can explore all pages &amp; analytics, while adding, editing, or deleting is locked.</span>
        <a href="/index-login.html?switch=1" class="btn btn-secondary btn-sm">Admin Sign In</a>
      `;
      topbar.insertAdjacentElement("afterend", banner);
    }
  }

  wirePasswordToggles(document);
  realtimeClient.connect();
}
