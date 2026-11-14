export type UserRole = "admin" | "member";
export type PlanDuration = "1m" | "3m" | "6m" | "1y";
export type PackageCategory =
  | "gym_only"
  | "cardio_only"
  | "gym_cardio"
  | "custom_deal";

export interface AuthUser {
  userId: string;
  email: string;
  role: UserRole;
  fullName: string;
  memberId: string | null;
}

export interface ServiceItem {
  id: string;
  name: string;
  description: string;
  isActive: boolean;
}

export interface PackageItem {
  id: string;
  name: string;
  category: PackageCategory;
  description: string;
  isDeal: boolean;
  isActive: boolean;
  serviceIds: string[];
  services: Array<{ id: string; name: string }>;
  prices: Record<PlanDuration, number>;
}

export interface MemberSubscriptionSummary {
  id: string;
  packageId: string;
  packageName: string;
  duration: PlanDuration;
  amount: number;
  startDate: string;
  expiryDate: string;
  status: string;
  paymentStatus: string;
}

export interface MemberSummary {
  id: string;
  userId: string | null;
  memberCode: string;
  fullName: string;
  email: string;
  phone: string;
  age: number;
  status: "active" | "expired" | "suspended" | "pending";
  notes: string;
  biometricCount: number;
  activeSubscription: MemberSubscriptionSummary | null;
  latestPayment: {
    id: string;
    amount: number;
    method: string;
    status: string;
    paidAt: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
}

export interface ScanVerificationResult {
  attendanceId: string;
  scannedAt: string;
  verificationMethod: "webauthn" | "hardware_sdk";
  verificationResult: "valid" | "expired" | "unpaid" | "suspended";
  statusLabel: string;
  reason: string;
  deviceLabel: string;
  member: {
    id: string;
    memberCode: string;
    fullName: string;
    phone: string;
    age: number;
    status: string;
  };
  subscription: {
    id: string;
    packageName: string;
    duration: PlanDuration;
    startDate: string;
    expiryDate: string;
    status: string;
    paymentStatus: string;
  } | null;
  payment: {
    id: string;
    amount: number;
    status: string;
    method: string;
    paidAt: string | null;
  } | null;
}

export interface DashboardAnalytics {
  stats: {
    totalMembers: number;
    activeMembers: number;
    expiredMembers: number;
    suspendedMembers: number;
    pendingMembers: number;
    activeSubscriptions: number;
    expiredSubscriptions: number;
    pendingApprovals: number;
    totalRevenue: number;
    monthRevenue: number;
    unpaidAmount: number;
    todayCheckins: number;
    todayValidCheckins: number;
  };
  recentRegistrations: Array<{
    id: string;
    memberCode: string;
    fullName: string;
    phone: string;
    age: number;
    status: string;
    createdAt: string;
  }>;
  upcomingExpirations: Array<{
    subscriptionId: string;
    memberId: string;
    memberName: string;
    memberCode: string;
    phone: string;
    packageName: string;
    expiryDate: string;
    daysRemaining: number;
  }>;
  attendanceSeries: Array<{ date: string; valid: number; denied: number }>;
  revenueSeries: Array<{ month: string; amount: number }>;
  packageBreakdown: Array<{ name: string; count: number }>;
}
