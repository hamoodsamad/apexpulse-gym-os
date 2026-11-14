import { requireRole } from "../services/authService.ts";
import {
  createSubscription,
  fetchMemberDetail,
  fetchPackages,
  updateMember,
} from "../services/gymService.ts";
import { realtimeClient } from "../services/realtimeClient.ts";
import { initAppShell } from "../ui/layout.ts";
import { closeModal, openModal, wireModalDismiss } from "../ui/modals.ts";
import { showToast } from "../ui/toast.ts";
import type { PackageItem, PlanDuration } from "../types.ts";
import {
  escapeHtml,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatDurationLabel,
  formatStatusText,
  statusTagClass,
} from "../utils/formatters.ts";

let memberId: string | null = null;
let packagesCatalog: PackageItem[] = [];
let selectedPackageForRequest: PackageItem | null = null;

function renderPortalOverview(
  detail: Awaited<ReturnType<typeof fetchMemberDetail>>,
): void {
  const m = detail.member;
  const activeOrLatestSub = detail.subscriptions[0] as
    | Record<string, unknown>
    | undefined;

  const setText = (id: string, val: string): void => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setText("portal-member-name", m.fullName);
  setText("portal-member-code", m.memberCode);
  setText("portal-member-phone", m.phone);
  setText("portal-member-age", `${m.age} yrs`);
  setText(
    "portal-sub-name",
    activeOrLatestSub
      ? `${String(activeOrLatestSub.package_name)} (${formatDurationLabel(String(activeOrLatestSub.duration))})`
      : "No Plan Yet",
  );
  setText(
    "portal-sub-expiry",
    activeOrLatestSub ? formatDate(String(activeOrLatestSub.expiry_date)) : "—",
  );

  const statusBadge = document.getElementById("portal-status-badge");
  if (statusBadge) {
    statusBadge.className = statusTagClass(m.status);
    statusBadge.textContent = formatStatusText(m.status);
  }

  const payBadge = document.getElementById("portal-payment-badge");
  if (payBadge) {
    const pStatus = activeOrLatestSub
      ? String(activeOrLatestSub.payment_status)
      : "unpaid";
    payBadge.className = statusTagClass(pStatus);
    payBadge.textContent = formatStatusText(pStatus);
  }

  const phoneInput = document.getElementById(
    "portal-edit-phone",
  ) as HTMLInputElement | null;
  const ageInput = document.getElementById(
    "portal-edit-age",
  ) as HTMLInputElement | null;
  if (phoneInput) phoneInput.value = m.phone;
  if (ageInput) ageInput.value = String(m.age);

  const subBody = document.getElementById("portal-subscriptions-body");
  if (subBody) {
    if (detail.subscriptions.length === 0) {
      subBody.innerHTML =
        '<tr><td colspan="6" class="empty-state">No subscription history yet. Select a package below to request enrollment.</td></tr>';
    } else {
      subBody.innerHTML = detail.subscriptions
        .map(
          (s) => `
          <tr>
            <td>${escapeHtml(s.package_name)}</td>
            <td>${escapeHtml(formatDurationLabel(String(s.duration)))}</td>
            <td class="mono">${escapeHtml(formatDate(String(s.start_date)))}</td>
            <td class="mono">${escapeHtml(formatDate(String(s.expiry_date)))}</td>
            <td class="col-numeric">${escapeHtml(formatCurrency(Number(s.amount)))}</td>
            <td><span class="${statusTagClass(String(s.status))}">${escapeHtml(formatStatusText(String(s.status)))}</span></td>
          </tr>
        `,
        )
        .join("");
    }
  }

  const payBody = document.getElementById("portal-payments-body");
  if (payBody) {
    if (detail.payments.length === 0) {
      payBody.innerHTML =
        '<tr><td colspan="5" class="empty-state">No payments recorded yet.</td></tr>';
    } else {
      payBody.innerHTML = detail.payments
        .map(
          (p) => `
          <tr>
            <td class="mono">${escapeHtml(formatDateTime(String(p.paid_at || p.created_at)))}</td>
            <td>${escapeHtml(formatStatusText(String(p.method)))}</td>
            <td class="col-numeric">${escapeHtml(formatCurrency(Number(p.amount)))}</td>
            <td><span class="${statusTagClass(String(p.status))}">${escapeHtml(formatStatusText(String(p.status)))}</span></td>
            <td class="mono">${escapeHtml(p.reference_no || "—")}</td>
          </tr>
        `,
        )
        .join("");
    }
  }

  const attBody = document.getElementById("portal-attendance-body");
  if (attBody) {
    if (detail.attendance.length === 0) {
      attBody.innerHTML =
        '<tr><td colspan="3" class="empty-state">No gym check-ins recorded yet.</td></tr>';
    } else {
      attBody.innerHTML = detail.attendance
        .map(
          (a) => `
          <tr>
            <td class="mono">${escapeHtml(formatDateTime(String(a.scanned_at)))}</td>
            <td>${escapeHtml(a.device_label)}</td>
            <td><span class="${statusTagClass(String(a.verification_result))}">${escapeHtml(formatStatusText(String(a.verification_result)))}</span></td>
          </tr>
        `,
        )
        .join("");
    }
  }
}

function renderAvailablePackages(): void {
  const grid = document.getElementById("portal-packages-grid");
  if (!grid) return;

  const activePkgs = packagesCatalog.filter((p) => p.isActive);
  if (activePkgs.length === 0) {
    grid.innerHTML =
      '<div class="empty-state">No subscription packages currently available.</div>';
    return;
  }

  grid.innerHTML = activePkgs
    .map((pkg) => {
      const servicesText = pkg.services.map((s) => s.name).join(" · ");
      return `
        <article class="surface-card">
          <div class="section-header">
            <div>
              <div class="metadata-line">
                <span>${pkg.isDeal ? "Featured Deal" : "Membership Plan"}</span>
              </div>
              <h3 class="section-title mt-12">${escapeHtml(pkg.name)}</h3>
            </div>
            <button type="button" class="btn btn-primary btn-sm" data-request-pkg="${escapeHtml(pkg.id)}">Request Plan</button>
          </div>
          <p class="section-subtitle">${escapeHtml(pkg.description || "")}</p>
          <div class="metadata-line mt-12">
            <span>Includes: ${escapeHtml(servicesText)}</span>
          </div>
          <div class="duration-price-grid">
            <div class="duration-cell"><div class="duration-label">1M</div><div class="duration-price">${escapeHtml(formatCurrency(pkg.prices["1m"]))}</div></div>
            <div class="duration-cell"><div class="duration-label">3M</div><div class="duration-price">${escapeHtml(formatCurrency(pkg.prices["3m"]))}</div></div>
            <div class="duration-cell"><div class="duration-label">6M</div><div class="duration-price">${escapeHtml(formatCurrency(pkg.prices["6m"]))}</div></div>
            <div class="duration-cell"><div class="duration-label">1Y</div><div class="duration-price">${escapeHtml(formatCurrency(pkg.prices["1y"]))}</div></div>
          </div>
        </article>
      `;
    })
    .join("");
}

function updateRequestPricePreview(): void {
  const durSelect = document.getElementById(
    "req-duration-select",
  ) as HTMLSelectElement | null;
  const priceEl = document.getElementById("req-price-preview");
  if (!durSelect || !priceEl || !selectedPackageForRequest) return;
  const dur = durSelect.value as PlanDuration;
  priceEl.textContent = formatCurrency(
    selectedPackageForRequest.prices[dur] ?? 0,
  );
}

async function loadPortalData(): Promise<void> {
  if (!memberId) return;
  try {
    const [detail, packages] = await Promise.all([
      fetchMemberDetail(memberId),
      fetchPackages(),
    ]);
    packagesCatalog = packages;
    renderPortalOverview(detail);
    renderAvailablePackages();
  } catch (err) {
    showToast(
      err instanceof Error ? err.message : "Unable to load member portal data.",
      "error",
    );
  }
}

async function initMemberPortalPage(): Promise<void> {
  const user = await requireRole("member");
  if (!user) return;
  memberId = user.memberId;

  initAppShell({
    user,
    activeNavKey: "member-portal",
    pageTitle: "My Membership & Billing Portal",
  });

  wireModalDismiss("request-plan-modal");

  if (!memberId) {
    showToast(
      "No member profile linked to this account. Contact front desk.",
      "error",
    );
    return;
  }

  await loadPortalData();

  realtimeClient.subscribe((evt) => {
    if (
      evt.type === "package:updated" ||
      evt.type === "service:updated" ||
      evt.memberId === memberId ||
      evt.memberId === "*"
    ) {
      void loadPortalData();
    }
  });

  const contactForm = document.getElementById(
    "portal-contact-form",
  ) as HTMLFormElement | null;
  contactForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!memberId) return;
    const fd = new FormData(contactForm);
    try {
      await updateMember(memberId, {
        phone: String(fd.get("phone") || ""),
        age: Number(fd.get("age") || 0),
      });
      showToast("Contact details updated", "success");
      await loadPortalData();
    } catch (err) {
      showToast(
        err instanceof Error
          ? err.message
          : "Failed to update contact details.",
        "error",
      );
    }
  });

  document
    .getElementById("portal-packages-grid")
    ?.addEventListener("click", (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(
        "[data-request-pkg]",
      );
      if (!btn?.dataset.requestPkg) return;
      const pkg = packagesCatalog.find((p) => p.id === btn.dataset.requestPkg);
      if (!pkg) return;
      selectedPackageForRequest = pkg;
      const pkgNameEl = document.getElementById("req-package-name");
      if (pkgNameEl) pkgNameEl.textContent = pkg.name;
      updateRequestPricePreview();
      openModal("request-plan-modal");
    });

  document
    .getElementById("req-duration-select")
    ?.addEventListener("change", updateRequestPricePreview);

  const reqForm = document.getElementById(
    "request-plan-form",
  ) as HTMLFormElement | null;
  reqForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!selectedPackageForRequest) return;
    const fd = new FormData(reqForm);
    try {
      await createSubscription({
        packageId: selectedPackageForRequest.id,
        duration: String(fd.get("duration") || "1m"),
        paymentMethod: String(fd.get("paymentMethod") || "transfer"),
        referenceNo: String(fd.get("referenceNo") || ""),
      });
      showToast(
        "Renewal / plan request submitted for Admin approval",
        "success",
      );
      reqForm.reset();
      closeModal("request-plan-modal");
      await loadPortalData();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Unable to submit request.",
        "error",
      );
    }
  });
}

void initMemberPortalPage();
