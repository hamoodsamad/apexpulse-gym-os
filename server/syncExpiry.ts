import { execute, query, queryOne } from "./db.ts";
import { isDateExpired, nowIso, todayDateStr } from "./dates.ts";
import type {
  DbMember,
  DbPayment,
  DbSubscription,
  VerificationResult,
} from "./types.ts";

export async function syncExpiredSubscriptions(): Promise<void> {
  const today = todayDateStr();
  const ts = nowIso();

  const expiredRows = await query<{ id: string; member_id: string }>(
    `SELECT id, member_id FROM subscriptions WHERE status = 'active' AND expiry_date < ?`,
    [today],
  );

  for (const row of expiredRows) {
    await execute(
      `UPDATE subscriptions SET status = 'expired', updated_at = ? WHERE id = ?`,
      [ts, row.id],
    );
    const otherActive = await queryOne<{ id: string }>(
      `SELECT id FROM subscriptions WHERE member_id = ? AND status = 'active' AND expiry_date >= ? LIMIT 1`,
      [row.member_id, today],
    );
    if (!otherActive) {
      await execute(
        `UPDATE members SET status = 'expired', updated_at = ? WHERE id = ? AND status != 'suspended'`,
        [ts, row.member_id],
      );
    }
  }
}

export interface MemberAccessEvaluation {
  member: DbMember;
  latestSubscription: DbSubscription | null;
  latestPayment: DbPayment | null;
  verificationResult: VerificationResult;
  statusLabel: string;
  reason: string;
}

export async function evaluateMemberAccessState(
  memberId: string,
): Promise<MemberAccessEvaluation | null> {
  await syncExpiredSubscriptions();

  const member = await queryOne<DbMember>(
    "SELECT * FROM members WHERE id = ?",
    [memberId],
  );
  if (!member) return null;

  const subscriptions = await query<DbSubscription>(
    `SELECT * FROM subscriptions WHERE member_id = ? ORDER BY created_at DESC`,
    [memberId],
  );

  const activeSub = subscriptions.find((s) => s.status === "active") ?? null;
  const suspendedSub =
    subscriptions.find((s) => s.status === "suspended") ?? null;
  const latestSubscription = activeSub ?? subscriptions[0] ?? null;

  const latestPayment = latestSubscription
    ? await queryOne<DbPayment>(
        `SELECT * FROM payments WHERE subscription_id = ? ORDER BY created_at DESC LIMIT 1`,
        [latestSubscription.id],
      )
    : await queryOne<DbPayment>(
        `SELECT * FROM payments WHERE member_id = ? ORDER BY created_at DESC LIMIT 1`,
        [memberId],
      );

  if (member.status === "suspended" || (suspendedSub && !activeSub)) {
    return {
      member,
      latestSubscription,
      latestPayment,
      verificationResult: "suspended",
      statusLabel: "SUSPENDED",
      reason: "Membership is currently suspended by administration.",
    };
  }

  if (!latestSubscription) {
    return {
      member,
      latestSubscription: null,
      latestPayment,
      verificationResult: "unpaid",
      statusLabel: "UNPAID",
      reason: "No active subscription or confirmed payment on file.",
    };
  }

  if (
    latestSubscription.payment_status !== "paid" ||
    latestPayment?.status === "unpaid" ||
    latestPayment?.status === "pending_approval"
  ) {
    return {
      member,
      latestSubscription,
      latestPayment,
      verificationResult: "unpaid",
      statusLabel: "UNPAID",
      reason:
        latestPayment?.status === "pending_approval"
          ? "Payment is awaiting administrator confirmation."
          : "Subscription payment is unpaid.",
    };
  }

  if (
    latestSubscription.status === "expired" ||
    isDateExpired(latestSubscription.expiry_date)
  ) {
    return {
      member,
      latestSubscription,
      latestPayment,
      verificationResult: "expired",
      statusLabel: "EXPIRED",
      reason: `Membership expired on ${latestSubscription.expiry_date}.`,
    };
  }

  if (
    latestSubscription.status === "active" &&
    latestSubscription.payment_status === "paid"
  ) {
    return {
      member,
      latestSubscription,
      latestPayment,
      verificationResult: "valid",
      statusLabel: "VALID",
      reason: `Active ${latestSubscription.package_name} membership valid through ${latestSubscription.expiry_date}.`,
    };
  }

  return {
    member,
    latestSubscription,
    latestPayment,
    verificationResult: "unpaid",
    statusLabel: "UNPAID",
    reason: "Membership requires active confirmation.",
  };
}
