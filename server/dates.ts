import type { PlanDuration } from "./types.ts";

export function nowIso(): string {
  return new Date().toISOString();
}

export function todayDateStr(): string {
  return new Date().toISOString().slice(0, 10);
}

export function calculateExpiryDate(
  startDateStr: string,
  duration: PlanDuration,
): string {
  const base = new Date(`${startDateStr.slice(0, 10)}T00:00:00.000Z`);
  if (Number.isNaN(base.getTime())) {
    throw new Error("Invalid start date for expiry calculation");
  }

  const target = new Date(base.getTime());
  switch (duration) {
    case "1m":
      target.setUTCMonth(target.getUTCMonth() + 1);
      break;
    case "3m":
      target.setUTCMonth(target.getUTCMonth() + 3);
      break;
    case "6m":
      target.setUTCMonth(target.getUTCMonth() + 6);
      break;
    case "1y":
      target.setUTCFullYear(target.getUTCFullYear() + 1);
      break;
    default:
      throw new Error(`Unsupported duration: ${String(duration)}`);
  }

  return target.toISOString().slice(0, 10);
}

export function isDateExpired(expiryDateStr: string): boolean {
  if (!expiryDateStr) return true;
  const today = todayDateStr();
  return expiryDateStr.slice(0, 10) < today;
}

export function daysUntilDate(targetDateStr: string): number {
  const today = new Date(`${todayDateStr()}T00:00:00.000Z`).getTime();
  const target = new Date(
    `${targetDateStr.slice(0, 10)}T00:00:00.000Z`,
  ).getTime();
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24));
}
