import { requireRole } from "../services/authService.ts";
import {
  confirmPayment,
  createSubscription,
  fetchMembers,
  fetchPackages,
  fetchPayments,
  fetchSubscriptions,
  rejectPayment,
  renewSubscription,
} from "../services/gymService.ts";
import { realtimeClient } from "../services/realtimeClient.ts";
import { initAppShell } from "../ui/layout.ts";
import { closeModal, openModal, wireModalDismiss } from "../ui/modals.ts";
import { showToast } from "../ui/toast.ts";
import type { MemberSummary, PackageItem, PlanDuration } from "../types.ts";
import {
  downloadCsv,
  escapeHtml,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatDurationLabel,
  formatStatusText,
  statusTagClass,
} from "../utils/formatters.ts";

let allPayments: Array<Record<string, unknown>> = [];
let allSubscriptions: Array<Record<string, unknown>> = [];
let allMembers: MemberSummary[] = [];
let allPackages: PackageItem[] = [];
let statusFilter = "all";
let searchTerm = "";

function renderPaymentStats(): void {
  const confirmed = allPayments.filter((p) => p.status === "confirmed");
  const totalRevenue = confirmed.reduce(
    (acc, p) => acc + Number(p.amount || 0),
    0,
  );
  const currentMonth = new Date().toISOString().slice(0, 7);
  const monthRevenue = confirmed
    .filter((p) => String(p.paid_at || p.created_at).startsWith(currentMonth))
    .reduce((acc, p) => acc + Number(p.amount || 0), 0);
  const pendingCount = allPayments.filter(
    (p) => p.status === "pending_approval",
  ).length;
  const unpaidTotal = allPayments
    .filter((p) => p.status === "unpaid" || p.status === "pending_approval")
    .reduce((acc, p) => acc + Number(p.amount || 0), 0);

  const setText = (id: string, val: string): void => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };
  setText("pay-kpi-total", formatCurrency(totalRevenue));
  setText("pay-kpi-month", formatCurrency(monthRevenue));
  setText("pay-kpi-pending", String(pendingCount));
  setText("pay-kpi-unpaid", formatCurrency(unpaidTotal));
}

function renderPaymentsTable(): void {
  const tbody = document.getElementById("payments-table-body");
  if (!tbody) return;

  const q = searchTerm.trim().toLowerCase();
  const filtered = allPayments.filter((p) => {
    const matchStatus = statusFilter === "all" || p.status === statusFilter;
    const matchQuery =
      !q ||
      String(p.member_name || "")
        .toLowerCase()
        .includes(q) ||
      String(p.member_code || "")
        .toLowerCase()
        .includes(q) ||
      String(p.reference_no || "")
        .toLowerCase()
        .includes(q) ||
      String(p.package_name || "")
        .toLowerCase()
        .includes(q);
    return matchStatus && matchQuery;
  });

  if (filtered.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="8" class="empty-state">No payment records match the current filter.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered
    .map((p) => {
      const canConfirm =
        p.status === "pending_approval" || p.status === "unpaid";
      const canReject = p.status === "pending_approval";
      return `
        <tr>
          <td class="mono">${escapeHtml(formatDateTime(String(p.paid_at || p.created_at)))}</td>
          <td>
            <div><strong>${escapeHtml(p.member_name)}</strong></div>
            <div class="section-subtitle mono">${escapeHtml(p.member_code)}</div>
          </td>
          <td>${escapeHtml(p.package_name)} (${escapeHtml(formatDurationLabel(String(p.duration)))})</td>
          <td class="mono">${escapeHtml(formatDate(String(p.expiry_date)))}</td>
          <td>${escapeHtml(formatStatusText(String(p.method)))}</td>
          <td class="col-numeric">${escapeHtml(formatCurrency(Number(p.amount || 0)))}</td>
          <td>
            <span class="${statusTagClass(String(p.status))}">${escapeHtml(formatStatusText(String(p.status)))}</span>
            ${p.reference_no ? `<div class="section-subtitle mono">Ref: ${escapeHtml(p.reference_no)}</div>` : ""}
          </td>
          <td>
            <div class="toolbar-group">
              ${canConfirm ? `<button type="button" class="btn btn-primary btn-sm" data-confirm-pay="${escapeHtml(p.id)}">Confirm</button>` : ""}
              ${canReject ? `<button type="button" class="btn btn-danger btn-sm" data-reject-pay="${escapeHtml(p.id)}">Reject</button>` : ""}
              ${!canConfirm && !canReject ? '<span class="section-subtitle">Finalized</span>' : ""}
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function populateAssignmentDropdowns(): void {
  const memberSelect = document.getElementById(
    "assign-member-select",
  ) as HTMLSelectElement | null;
  const packageSelect = document.getElementById(
    "assign-package-select",
  ) as HTMLSelectElement | null;
  const renewSelect = document.getElementById(
    "renew-subscription-select",
  ) as HTMLSelectElement | null;

  if (memberSelect) {
    memberSelect.innerHTML = allMembers
      .map(
        (m) =>
          `<option value="${escapeHtml(m.id)}">${escapeHtml(m.fullName)} (${escapeHtml(m.memberCode)})</option>`,
      )
      .join("");
  }

  if (packageSelect) {
    packageSelect.innerHTML = allPackages
      .filter((p) => p.isActive)
      .map(
        (p) =>
          `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`,
      )
      .join("");
  }

  if (renewSelect) {
    const latestByMember = new Map<string, Record<string, unknown>>();
    for (const s of allSubscriptions) {
      const mId = String(s.member_id);
      if (!latestByMember.has(mId)) latestByMember.set(mId, s);
    }
    renewSelect.innerHTML = Array.from(latestByMember.values())
      .map(
        (s) =>
          `<option value="${escapeHtml(s.id)}">${escapeHtml(s.member_name)} (${escapeHtml(s.member_code)}) — ${escapeHtml(s.package_name)} (Exp: ${escapeHtml(formatDate(String(s.expiry_date)))})</option>`,
      )
      .join("");
  }

  updateAssignPricePreview();
}

function updateAssignPricePreview(): void {
  const pkgSelect = document.getElementById(
    "assign-package-select",
  ) as HTMLSelectElement | null;
  const durSelect = document.getElementById(
    "assign-duration-select",
  ) as HTMLSelectElement | null;
  const preview = document.getElementById("assign-price-preview");
  if (!pkgSelect || !durSelect || !preview) return;
  const pkg = allPackages.find((p) => p.id === pkgSelect.value);
  const dur = durSelect.value as PlanDuration;
  preview.textContent = pkg ? formatCurrency(pkg.prices[dur] ?? 0) : "—";
}

async function loadPaymentsData(): Promise<void> {
  try {
    const [payments, subscriptions, members, packages] = await Promise.all([
      fetchPayments(),
      fetchSubscriptions(),
      fetchMembers(),
      fetchPackages(),
    ]);
    allPayments = payments;
    allSubscriptions = subscriptions;
    allMembers = members;
    allPackages = packages;
    renderPaymentStats();
    renderPaymentsTable();
    populateAssignmentDropdowns();
  } catch (err) {
    showToast(
      err instanceof Error ? err.message : "Failed to load payment records.",
      "error",
    );
  }
}

async function initPaymentsPage(): Promise<void> {
  const user = await requireRole("admin");
  if (!user) return;

  initAppShell({
    user,
    activeNavKey: "payments",
    pageTitle: "Payments, Renewals & Expiry Management",
  });

  wireModalDismiss("assign-subscription-modal");
  wireModalDismiss("renew-subscription-modal");

  await loadPaymentsData();

  realtimeClient.subscribe((evt) => {
    if (
      evt.type === "payment:updated" ||
      evt.type === "subscription:updated" ||
      evt.type === "member:updated"
    ) {
      void loadPaymentsData();
    }
  });

  document
    .getElementById("open-assign-sub-btn")
    ?.addEventListener("click", () => {
      openModal("assign-subscription-modal");
    });

  document
    .getElementById("open-renew-sub-btn")
    ?.addEventListener("click", () => {
      openModal("renew-subscription-modal");
    });

  document
    .getElementById("assign-package-select")
    ?.addEventListener("change", updateAssignPricePreview);
  document
    .getElementById("assign-duration-select")
    ?.addEventListener("change", updateAssignPricePreview);

  const assignForm = document.getElementById(
    "assign-subscription-form",
  ) as HTMLFormElement | null;
  assignForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(assignForm);
    try {
      await createSubscription({
        memberId: String(fd.get("memberId") || ""),
        packageId: String(fd.get("packageId") || ""),
        duration: String(fd.get("duration") || "1m"),
        startDate: String(fd.get("startDate") || "") || undefined,
        paymentStatus: String(fd.get("paymentStatus") || "paid"),
        paymentMethod: String(fd.get("paymentMethod") || "cash"),
        referenceNo: String(fd.get("referenceNo") || ""),
      });
      showToast("Subscription & payment recorded", "success");
      assignForm.reset();
      closeModal("assign-subscription-modal");
      await loadPaymentsData();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to assign subscription.",
        "error",
      );
    }
  });

  const renewForm = document.getElementById(
    "renew-subscription-form",
  ) as HTMLFormElement | null;
  renewForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(renewForm);
    const subId = String(fd.get("subscriptionId") || "");
    if (!subId) {
      showToast("No existing subscription selected to renew.", "error");
      return;
    }
    try {
      await renewSubscription(subId, {
        duration: String(fd.get("duration") || "1m"),
        paymentStatus: String(fd.get("paymentStatus") || "paid"),
        paymentMethod: String(fd.get("paymentMethod") || "cash"),
        referenceNo: String(fd.get("referenceNo") || ""),
      });
      showToast(
        "Membership renewed with automatic expiry calculation",
        "success",
      );
      renewForm.reset();
      closeModal("renew-subscription-modal");
      await loadPaymentsData();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Renewal failed.",
        "error",
      );
    }
  });

  document
    .getElementById("payment-search-input")
    ?.addEventListener("input", (e) => {
      searchTerm = (e.target as HTMLInputElement).value;
      renderPaymentsTable();
    });

  document
    .getElementById("payment-status-filters")
    ?.addEventListener("click", (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(
        "[data-status]",
      );
      if (!btn) return;
      statusFilter = btn.dataset.status || "all";
      for (const sibling of btn.parentElement?.querySelectorAll(
        ".segment-btn",
      ) || []) {
        sibling.classList.remove("active");
      }
      btn.classList.add("active");
      renderPaymentsTable();
    });

  document
    .getElementById("payments-table-body")
    ?.addEventListener("click", async (e) => {
      const confirmBtn = (e.target as HTMLElement).closest<HTMLButtonElement>(
        "[data-confirm-pay]",
      );
      if (confirmBtn?.dataset.confirmPay) {
        try {
          await confirmPayment(confirmBtn.dataset.confirmPay);
          showToast("Payment confirmed and membership activated", "success");
          await loadPaymentsData();
        } catch (err) {
          showToast(
            err instanceof Error ? err.message : "Confirmation failed.",
            "error",
          );
        }
        return;
      }

      const rejectBtn = (e.target as HTMLElement).closest<HTMLButtonElement>(
        "[data-reject-pay]",
      );
      if (rejectBtn?.dataset.rejectPay) {
        try {
          await rejectPayment(rejectBtn.dataset.rejectPay);
          showToast("Payment request rejected", "success");
          await loadPaymentsData();
        } catch (err) {
          showToast(
            err instanceof Error ? err.message : "Rejection failed.",
            "error",
          );
        }
      }
    });

  document
    .getElementById("export-payments-btn")
    ?.addEventListener("click", () => {
      downloadCsv(
        `gym-payments-${new Date().toISOString().slice(0, 10)}.csv`,
        [
          "Date",
          "Member Code",
          "Member Name",
          "Package",
          "Duration",
          "Amount",
          "Method",
          "Status",
          "Reference",
        ],
        allPayments.map((p) => [
          String(p.paid_at || p.created_at),
          String(p.member_code || ""),
          String(p.member_name || ""),
          String(p.package_name || ""),
          String(p.duration || ""),
          Number(p.amount || 0).toFixed(2),
          String(p.method || ""),
          String(p.status || ""),
          String(p.reference_no || ""),
        ]),
      );
      showToast("Payment ledger exported", "success");
    });
}

void initPaymentsPage();
