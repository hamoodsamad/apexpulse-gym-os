import type { PlanDuration } from "../types.ts";

export function escapeHtml(input: unknown): string {
  const str = String(input ?? "");
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function formatCurrency(amount: number): string {
  const num = Number(amount || 0);
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

export function formatDurationLabel(duration: PlanDuration | string): string {
  switch (duration) {
    case "1m":
      return "1 Month";
    case "3m":
      return "3 Months";
    case "6m":
      return "6 Months";
    case "1y":
      return "1 Year";
    default:
      return String(duration).toUpperCase();
  }
}

export function formatDate(isoOrDate: string | null | undefined): string {
  if (!isoOrDate) return "—";
  const datePart = isoOrDate.slice(0, 10);
  const parsed = new Date(`${datePart}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return isoOrDate;
  return parsed.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function formatDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function statusTagClass(status: string): string {
  switch (status) {
    case "active":
    case "valid":
    case "confirmed":
    case "paid":
      return "status-tag status-valid";
    case "expired":
    case "unpaid":
    case "rejected":
    case "cancelled":
      return "status-tag status-danger";
    case "suspended":
    case "pending":
    case "pending_approval":
      return "status-tag status-warning";
    default:
      return "status-tag status-neutral";
  }
}

export function formatStatusText(status: string): string {
  return String(status || "unknown")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export function downloadCsv(
  filename: string,
  headers: string[],
  rows: Array<Array<string | number>>,
): void {
  const csvEscape = (cell: string | number): string => {
    const s = String(cell ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [
    headers.map(csvEscape).join(","),
    ...rows.map((r) => r.map(csvEscape).join(",")),
  ];
  const blob = new Blob([lines.join("\n")], {
    type: "text/csv;charset=utf-8;",
  });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
