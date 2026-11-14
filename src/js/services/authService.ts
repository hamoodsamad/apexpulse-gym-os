import type { AuthUser } from "../types.ts";
import { apiRequest, clearSessionToken, setSessionToken } from "./apiClient.ts";
import { realtimeClient } from "./realtimeClient.ts";

export async function fetchAuthStatus(): Promise<{
  hasAdmin: boolean;
  dbEngine: string;
}> {
  return apiRequest("/api/auth/status");
}

export async function setupInitialAdmin(payload: {
  fullName: string;
  email: string;
  password: string;
}): Promise<AuthUser> {
  const data = await apiRequest<{ token: string; user: AuthUser }>(
    "/api/auth/setup-admin",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  setSessionToken(data.token);
  return data.user;
}

export async function loginAccount(
  email: string,
  password: string,
): Promise<AuthUser> {
  const data = await apiRequest<{ token: string; user: AuthUser }>(
    "/api/auth/login",
    {
      method: "POST",
      body: JSON.stringify({ email, password }),
    },
  );
  setSessionToken(data.token);
  return data.user;
}

export async function registerMemberAccount(payload: {
  fullName: string;
  email: string;
  phone: string;
  age: number;
  password: string;
}): Promise<AuthUser> {
  const data = await apiRequest<{ token: string; user: AuthUser }>(
    "/api/auth/register",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
  setSessionToken(data.token);
  return data.user;
}

export async function logoutAccount(): Promise<void> {
  try {
    await apiRequest("/api/auth/logout", { method: "POST" });
  } finally {
    clearSessionToken();
    realtimeClient.disconnect();
    window.location.href = "/index-login.html";
  }
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const data = await apiRequest<{ user: AuthUser }>("/api/auth/me");
    return data.user;
  } catch {
    return null;
  }
}

export async function requireRole(
  expectedRole: "admin" | "member",
): Promise<AuthUser | null> {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = "/index-login.html";
    return null;
  }
  if (expectedRole === "admin" && user.role !== "admin") {
    window.location.href = "/index-member-portal.html";
    return null;
  }
  return user;
}

export function redirectAfterAuth(user: AuthUser): void {
  if (user.role === "admin") {
    window.location.href = "/index-dashboard.html";
  } else {
    window.location.href = "/index-member-portal.html";
  }
}
