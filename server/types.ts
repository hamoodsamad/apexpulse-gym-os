export type UserRole = "admin" | "member";
export type MemberStatus = "active" | "expired" | "suspended" | "pending";
export type PackageCategory =
  | "gym_only"
  | "cardio_only"
  | "gym_cardio"
  | "custom_deal";
export type PlanDuration = "1m" | "3m" | "6m" | "1y";
export type SubscriptionStatus =
  | "active"
  | "expired"
  | "suspended"
  | "pending_approval"
  | "cancelled";
export type SubscriptionPaymentStatus = "paid" | "unpaid" | "pending";
export type PaymentMethod = "cash" | "card" | "transfer" | "online";
export type PaymentStatus =
  | "confirmed"
  | "unpaid"
  | "pending_approval"
  | "rejected";
export type BiometricProvider =
  | "webauthn"
  | "secugen"
  | "zkteco"
  | "digitalpersona";
export type VerificationResult = "valid" | "expired" | "unpaid" | "suspended";
export type VerificationMethod = "webauthn" | "hardware_sdk";

export interface DbUser {
  id: string;
  email: string;
  password_hash: string;
  role: UserRole;
  full_name: string;
  created_at: string;
}

export interface AuthTokenPayload {
  userId: string;
  email: string;
  role: UserRole;
  fullName: string;
  memberId: string | null;
}

export interface DbMember {
  id: string;
  user_id: string | null;
  member_code: string;
  full_name: string;
  email: string;
  phone: string;
  age: number;
  status: MemberStatus;
  notes: string;
  created_at: string;
  updated_at: string;
}

export interface DbService {
  id: string;
  name: string;
  description: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface DbPackage {
  id: string;
  name: string;
  category: PackageCategory;
  description: string;
  is_deal: number;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export interface DbSubscription {
  id: string;
  member_id: string;
  package_id: string;
  package_name: string;
  duration: PlanDuration;
  amount: number;
  start_date: string;
  expiry_date: string;
  status: SubscriptionStatus;
  payment_status: SubscriptionPaymentStatus;
  approved_by_user_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface DbPayment {
  id: string;
  member_id: string;
  subscription_id: string;
  amount: number;
  method: PaymentMethod;
  status: PaymentStatus;
  reference_no: string;
  notes: string;
  approved_by_user_id: string | null;
  paid_at: string | null;
  created_at: string;
}

export interface DbBiometricCredential {
  id: string;
  member_id: string;
  provider: BiometricProvider;
  credential_id: string;
  public_key: string;
  counter: number;
  transports: string;
  device_label: string;
  template_hash: string;
  created_at: string;
}

export interface DbAttendance {
  id: string;
  member_id: string;
  subscription_id: string | null;
  verification_method: VerificationMethod;
  verification_result: VerificationResult;
  device_label: string;
  scanned_at: string;
}
