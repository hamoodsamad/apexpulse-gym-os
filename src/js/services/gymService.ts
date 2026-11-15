import { apiRequest } from "./apiClient.ts";
import type {
  DashboardAnalytics,
  MemberSummary,
  PackageCategory,
  PackageItem,
  PlanDuration,
  ServiceItem,
} from "../types.ts";

export async function fetchDashboardAnalytics(): Promise<DashboardAnalytics> {
  return apiRequest<DashboardAnalytics>("/api/analytics/dashboard");
}

export async function fetchMembers(): Promise<MemberSummary[]> {
  const res = await apiRequest<{ members: MemberSummary[] }>("/api/members");
  return res.members;
}

export async function fetchMemberDetail(memberId: string): Promise<{
  member: MemberSummary;
  subscriptions: Array<Record<string, unknown>>;
  payments: Array<Record<string, unknown>>;
  attendance: Array<Record<string, unknown>>;
  biometrics: Array<Record<string, unknown>>;
}> {
  return apiRequest(`/api/members/${encodeURIComponent(memberId)}`);
}

export async function createMember(
  payload: Record<string, unknown>,
): Promise<{ id: string; memberCode: string }> {
  return apiRequest("/api/members", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateMember(
  memberId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await apiRequest(`/api/members/${encodeURIComponent(memberId)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function setMemberStatus(
  memberId: string,
  status: "active" | "suspended",
): Promise<void> {
  await apiRequest(`/api/members/${encodeURIComponent(memberId)}/status`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

export async function freezeMember(
  memberId: string,
): Promise<{ remainingDays: number; frozenAt: string }> {
  return apiRequest(`/api/members/${encodeURIComponent(memberId)}/freeze`, {
    method: "POST",
  });
}

export async function unfreezeMember(
  memberId: string,
): Promise<{ remainingDays: number; expiryDate: string }> {
  return apiRequest(`/api/members/${encodeURIComponent(memberId)}/unfreeze`, {
    method: "POST",
  });
}

export async function deleteMember(memberId: string): Promise<void> {
  await apiRequest(`/api/members/${encodeURIComponent(memberId)}`, {
    method: "DELETE",
  });
}

export async function fetchServices(): Promise<ServiceItem[]> {
  const res = await apiRequest<{ services: ServiceItem[] }>("/api/services");
  return res.services;
}

export async function createService(
  name: string,
  description: string,
): Promise<void> {
  await apiRequest("/api/services", {
    method: "POST",
    body: JSON.stringify({ name, description }),
  });
}

export async function updateService(
  id: string,
  payload: { name?: string; description?: string; isActive?: boolean },
): Promise<void> {
  await apiRequest(`/api/services/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteService(id: string): Promise<void> {
  await apiRequest(`/api/services/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function fetchPackages(): Promise<PackageItem[]> {
  const res = await apiRequest<{ packages: PackageItem[] }>("/api/packages");
  return res.packages;
}

export async function createPackage(payload: {
  name: string;
  category: PackageCategory;
  description: string;
  isDeal: boolean;
  serviceIds: string[];
  prices: Record<PlanDuration, number>;
}): Promise<void> {
  await apiRequest("/api/packages", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updatePackage(
  id: string,
  payload: {
    name?: string;
    category?: PackageCategory;
    description?: string;
    isDeal?: boolean;
    isActive?: boolean;
    serviceIds?: string[];
    prices?: Record<PlanDuration, number>;
  },
): Promise<void> {
  await apiRequest(`/api/packages/${encodeURIComponent(id)}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deletePackage(id: string): Promise<void> {
  await apiRequest(`/api/packages/${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function fetchSubscriptions(): Promise<
  Array<Record<string, unknown>>
> {
  const res = await apiRequest<{
    subscriptions: Array<Record<string, unknown>>;
  }>("/api/subscriptions");
  return res.subscriptions;
}

export async function createSubscription(
  payload: Record<string, unknown>,
): Promise<void> {
  await apiRequest("/api/subscriptions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function renewSubscription(
  subscriptionId: string,
  payload: Record<string, unknown>,
): Promise<void> {
  await apiRequest(
    `/api/subscriptions/${encodeURIComponent(subscriptionId)}/renew`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function approveSubscription(
  subscriptionId: string,
): Promise<void> {
  await apiRequest(
    `/api/subscriptions/${encodeURIComponent(subscriptionId)}/approve`,
    {
      method: "POST",
    },
  );
}

export async function fetchPayments(): Promise<Array<Record<string, unknown>>> {
  const res = await apiRequest<{ payments: Array<Record<string, unknown>> }>(
    "/api/payments",
  );
  return res.payments;
}

export async function createPayment(
  payload: Record<string, unknown>,
): Promise<void> {
  await apiRequest("/api/payments", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function confirmPayment(paymentId: string): Promise<void> {
  await apiRequest(`/api/payments/${encodeURIComponent(paymentId)}/confirm`, {
    method: "POST",
  });
}

export async function rejectPayment(paymentId: string): Promise<void> {
  await apiRequest(`/api/payments/${encodeURIComponent(paymentId)}/reject`, {
    method: "POST",
  });
}

export async function fetchAttendance(): Promise<
  Array<Record<string, unknown>>
> {
  const res = await apiRequest<{ attendance: Array<Record<string, unknown>> }>(
    "/api/attendance",
  );
  return res.attendance;
}
