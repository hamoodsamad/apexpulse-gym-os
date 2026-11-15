import { requireRole } from "../services/authService.ts";
import {
  checkBiometricCapabilities,
  enrollHardwareSdkFingerprint,
  enrollWebAuthnFingerprint,
  getDefaultSdkEndpoint,
  listMemberBiometrics,
  removeBiometricCredential,
  type HardwareSdkProvider,
} from "../services/biometricService.ts";
import {
  createMember,
  deleteMember,
  fetchMemberDetail,
  fetchMembers,
  fetchPackages,
  freezeMember,
  setMemberStatus,
  unfreezeMember,
  updateMember,
} from "../services/gymService.ts";
import { realtimeClient } from "../services/realtimeClient.ts";
import { initAppShell, wirePasswordToggles } from "../ui/layout.ts";
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

let allMembers: MemberSummary[] = [];
let allPackages: PackageItem[] = [];
let statusFilter = "all";
let searchTerm = "";
let selectedMemberId: string | null = null;

function populatePackageSelect(): void {
  const select = document.getElementById(
    "reg-package-select",
  ) as HTMLSelectElement | null;
  if (!select) return;
  const activePkgs = allPackages.filter((p) => p.isActive);
  select.innerHTML =
    '<option value="">No initial subscription (Register profile only)</option>' +
    activePkgs
      .map(
        (p) =>
          `<option value="${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`,
      )
      .join("");
}

function updateRegistrationPricePreview(): void {
  const pkgSelect = document.getElementById(
    "reg-package-select",
  ) as HTMLSelectElement | null;
  const durSelect = document.getElementById(
    "reg-duration-select",
  ) as HTMLSelectElement | null;
  const preview = document.getElementById("reg-price-preview");
  const subFields = document.getElementById("reg-subscription-fields");
  if (!pkgSelect || !durSelect || !preview || !subFields) return;

  const pkg = allPackages.find((p) => p.id === pkgSelect.value);
  if (!pkg) {
    subFields.classList.add("hidden");
    preview.textContent = "—";
    return;
  }
  subFields.classList.remove("hidden");
  const dur = durSelect.value as PlanDuration;
  preview.textContent = formatCurrency(pkg.prices[dur] ?? 0);
}

function renderMembersTable(): void {
  const tbody = document.getElementById("members-table-body");
  if (!tbody) return;

  const q = searchTerm.trim().toLowerCase();
  const filtered = allMembers.filter((m) => {
    const matchesStatus = statusFilter === "all" || m.status === statusFilter;
    const matchesQuery =
      !q ||
      m.fullName.toLowerCase().includes(q) ||
      m.memberCode.toLowerCase().includes(q) ||
      m.phone.toLowerCase().includes(q) ||
      m.email.toLowerCase().includes(q);
    return matchesStatus && matchesQuery;
  });

  if (filtered.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="8" class="empty-state">No members match the current filter.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered
    .map((m) => {
      const sub = m.activeSubscription;
      const payStatus = m.latestPayment?.status ?? "unpaid";
      return `
        <tr>
          <td class="mono">${escapeHtml(m.memberCode)}</td>
          <td>
            <div><strong>${escapeHtml(m.fullName)}</strong></div>
            <div class="section-subtitle">${escapeHtml(m.email)}</div>
          </td>
          <td class="mono">${escapeHtml(m.phone)}</td>
          <td class="col-numeric">${m.age}</td>
          <td>${sub ? `${escapeHtml(sub.packageName)} (${escapeHtml(formatDurationLabel(sub.duration))})` : "None"}</td>
          <td class="mono">${sub ? escapeHtml(formatDate(sub.expiryDate)) : "—"}</td>
          <td>
            <span class="${statusTagClass(m.status)}">${escapeHtml(formatStatusText(m.status))}</span>
            ${
              sub?.status === "frozen"
                ? `<div class="section-subtitle">Frozen (${Number(sub.frozenRemainingDays ?? 0)} days saved)</div>`
                : `<div class="section-subtitle">Payment: ${escapeHtml(formatStatusText(payStatus))} · Fingerprints: ${m.biometricCount}</div>`
            }
          </td>
          <td>
            <div class="toolbar-group">
              <button type="button" class="btn btn-secondary btn-sm" data-action="view" data-id="${escapeHtml(m.id)}">Profile</button>
              <button type="button" class="btn btn-secondary btn-sm" data-action="biometrics" data-id="${escapeHtml(m.id)}">Fingerprint</button>
              ${
                m.status === "active" && sub?.status === "active"
                  ? `<button type="button" class="btn btn-secondary btn-sm" data-action="freeze" data-id="${escapeHtml(m.id)}">Freeze</button>`
                  : m.status === "frozen" || sub?.status === "frozen"
                    ? `<button type="button" class="btn btn-primary btn-sm" data-action="unfreeze" data-id="${escapeHtml(m.id)}">Unfreeze</button>`
                    : ""
              }
              <button type="button" class="btn btn-danger btn-sm" data-action="delete" data-id="${escapeHtml(m.id)}">Delete</button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

async function openMemberProfileModal(memberId: string): Promise<void> {
  selectedMemberId = memberId;
  const content = document.getElementById("member-profile-content");
  if (!content) return;
  content.innerHTML =
    '<div class="empty-state">Loading member profile...</div>';
  openModal("member-profile-modal");

  try {
    const detail = await fetchMemberDetail(memberId);
    const m = detail.member;
    const activeSub = detail.subscriptions[0] as
      | Record<string, unknown>
      | undefined;
    const isFrozen = m.status === "frozen" || activeSub?.status === "frozen";

    content.innerHTML = `
      <div class="profile-kv-grid">
        <div class="kv-item"><div class="kv-label">Member ID</div><div class="kv-value mono">${escapeHtml(m.memberCode)}</div></div>
        <div class="kv-item"><div class="kv-label">Full Name</div><div class="kv-value">${escapeHtml(m.fullName)}</div></div>
        <div class="kv-item"><div class="kv-label">Phone Number</div><div class="kv-value mono">${escapeHtml(m.phone)}</div></div>
        <div class="kv-item"><div class="kv-label">Age</div><div class="kv-value mono">${m.age}</div></div>
        <div class="kv-item"><div class="kv-label">Account Status</div><div class="kv-value"><span class="${statusTagClass(m.status)}">${escapeHtml(formatStatusText(m.status))}</span></div></div>
        <div class="kv-item"><div class="kv-label">${isFrozen ? "Saved Frozen Days" : "Latest Expiry"}</div><div class="kv-value mono">${
          isFrozen
            ? `${Number(activeSub?.frozen_remaining_days ?? 0)} days saved`
            : activeSub
              ? escapeHtml(formatDate(String(activeSub.expiry_date)))
              : "—"
        }</div></div>
      </div>

      <form id="edit-member-form" class="form-grid mt-16">
        <div class="form-field">
          <label class="form-label" for="edit-full-name">Full Name</label>
          <input id="edit-full-name" name="fullName" class="form-input" value="${escapeHtml(m.fullName)}" required />
        </div>
        <div class="form-field">
          <label class="form-label" for="edit-phone">Phone Number</label>
          <input id="edit-phone" name="phone" class="form-input" value="${escapeHtml(m.phone)}" required />
        </div>
        <div class="form-field">
          <label class="form-label" for="edit-age">Age</label>
          <input id="edit-age" name="age" type="number" min="12" max="110" class="form-input" value="${m.age}" required />
        </div>
        <div class="form-field">
          <label class="form-label" for="edit-notes">Admin Notes</label>
          <input id="edit-notes" name="notes" class="form-input" value="${escapeHtml(m.notes)}" />
        </div>
        <div class="form-field-full toolbar-group">
          <button type="submit" class="btn btn-primary btn-sm">Save Changes</button>
          ${
            m.status === "active" && activeSub?.status === "active"
              ? '<button type="button" id="modal-freeze-btn" class="btn btn-secondary btn-sm">Freeze Membership</button>'
              : isFrozen
                ? '<button type="button" id="modal-unfreeze-btn" class="btn btn-primary btn-sm">Unfreeze Membership</button>'
                : ""
          }
          <button type="button" id="toggle-suspend-btn" class="btn btn-secondary btn-sm">
            ${m.status === "suspended" ? "Reactivate Membership" : "Suspend Membership"}
          </button>
          <button type="button" id="delete-member-btn" class="btn btn-danger btn-sm">Delete Member</button>
        </div>
      </form>

      <div class="mt-20">
        <h3 class="section-title">Subscription History (${detail.subscriptions.length})</h3>
        <div class="table-wrap mt-12">
          <table class="data-table">
            <thead>
              <tr><th>Plan</th><th>Duration</th><th>Start</th><th>Expiry</th><th>Status</th><th>Payment</th></tr>
            </thead>
            <tbody>
              ${
                detail.subscriptions.length === 0
                  ? '<tr><td colspan="6" class="empty-state">No subscriptions recorded.</td></tr>'
                  : detail.subscriptions
                      .map(
                        (s) => `
                  <tr>
                    <td>${escapeHtml(s.package_name)}</td>
                    <td>${escapeHtml(formatDurationLabel(String(s.duration)))}</td>
                    <td class="mono">${escapeHtml(formatDate(String(s.start_date)))}</td>
                    <td class="mono">${escapeHtml(formatDate(String(s.expiry_date)))}</td>
                    <td><span class="${statusTagClass(String(s.status))}">${escapeHtml(formatStatusText(String(s.status)))}</span></td>
                    <td><span class="${statusTagClass(String(s.payment_status))}">${escapeHtml(formatStatusText(String(s.payment_status)))}</span></td>
                  </tr>
                `,
                      )
                      .join("")
              }
            </tbody>
          </table>
        </div>
      </div>

      <div class="mt-20">
        <h3 class="section-title">Payment History (${detail.payments.length})</h3>
        <div class="table-wrap mt-12">
          <table class="data-table">
            <thead>
              <tr><th>Date</th><th>Method</th><th class="col-numeric">Amount</th><th>Status</th><th>Reference</th></tr>
            </thead>
            <tbody>
              ${
                detail.payments.length === 0
                  ? '<tr><td colspan="5" class="empty-state">No payments recorded.</td></tr>'
                  : detail.payments
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
                      .join("")
              }
            </tbody>
          </table>
        </div>
      </div>
    `;

    const editForm = document.getElementById(
      "edit-member-form",
    ) as HTMLFormElement | null;
    editForm?.addEventListener("submit", async (e) => {
      e.preventDefault();
      const fd = new FormData(editForm);
      try {
        await updateMember(m.id, {
          fullName: String(fd.get("fullName") || ""),
          phone: String(fd.get("phone") || ""),
          age: Number(fd.get("age") || 0),
          notes: String(fd.get("notes") || ""),
        });
        showToast("Member profile updated", "success");
        closeModal("member-profile-modal");
        await loadData();
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : "Update failed",
          "error",
        );
      }
    });

    document
      .getElementById("modal-freeze-btn")
      ?.addEventListener("click", async () => {
        try {
          const res = await freezeMember(m.id);
          showToast(
            `Membership frozen (${res.remainingDays} days saved)`,
            "success",
          );
          closeModal("member-profile-modal");
          await loadData();
        } catch (err) {
          showToast(
            err instanceof Error ? err.message : "Freeze failed",
            "error",
          );
        }
      });

    document
      .getElementById("modal-unfreeze-btn")
      ?.addEventListener("click", async () => {
        try {
          const res = await unfreezeMember(m.id);
          showToast(
            `Membership unfrozen until ${formatDate(res.expiryDate)}`,
            "success",
          );
          closeModal("member-profile-modal");
          await loadData();
        } catch (err) {
          showToast(
            err instanceof Error ? err.message : "Unfreeze failed",
            "error",
          );
        }
      });

    document
      .getElementById("toggle-suspend-btn")
      ?.addEventListener("click", async () => {
        try {
          await setMemberStatus(
            m.id,
            m.status === "suspended" ? "active" : "suspended",
          );
          showToast(
            m.status === "suspended"
              ? "Member reactivated"
              : "Member suspended",
            "success",
          );
          closeModal("member-profile-modal");
          await loadData();
        } catch (err) {
          showToast(
            err instanceof Error ? err.message : "Status update failed",
            "error",
          );
        }
      });

    document
      .getElementById("delete-member-btn")
      ?.addEventListener("click", async () => {
        if (
          !window.confirm(`Delete member ${m.fullName}? This cannot be undone.`)
        )
          return;
        try {
          await deleteMember(m.id);
          showToast("Member deleted", "success");
          closeModal("member-profile-modal");
          await loadData();
        } catch (err) {
          showToast(
            err instanceof Error ? err.message : "Delete failed",
            "error",
          );
        }
      });
  } catch (err) {
    content.innerHTML = `<div class="error-banner">${escapeHtml(err instanceof Error ? err.message : "Failed to load profile")}</div>`;
  }
}

async function openBiometricEnrollModal(memberId: string): Promise<void> {
  selectedMemberId = memberId;
  const member = allMembers.find((m) => m.id === memberId);
  const titleEl = document.getElementById("bio-modal-member-name");
  if (titleEl && member) {
    titleEl.textContent = `${member.fullName} (${member.memberCode})`;
  }

  const capNote = document.getElementById("bio-capability-note");
  if (capNote) {
    const caps = await checkBiometricCapabilities();
    capNote.textContent = caps.platformAuthenticatorAvailable
      ? "Platform biometric hardware (Touch ID / Windows Hello / FIDO2) detected and ready."
      : caps.webauthnSupported
        ? "WebAuthn API available for external FIDO2 USB fingerprint security keys, or use a connected USB Scanner SDK daemon below."
        : "WebAuthn unavailable in this browser context; use the USB Scanner SDK bridge below.";
  }

  await refreshBiometricCredentialList(memberId);
  openModal("biometric-enroll-modal");
}

async function refreshBiometricCredentialList(memberId: string): Promise<void> {
  const listEl = document.getElementById("enrolled-biometrics-list");
  if (!listEl) return;

  try {
    const creds = await listMemberBiometrics(memberId);
    if (creds.length === 0) {
      listEl.innerHTML =
        '<div class="empty-state">No hardware fingerprints enrolled for this member yet.</div>';
      return;
    }

    listEl.innerHTML = creds
      .map(
        (c) => `
        <div class="breakdown-row">
          <div>
            <div><strong>${escapeHtml(c.device_label)}</strong></div>
            <div class="section-subtitle mono">${escapeHtml(c.provider.toUpperCase())} · ${escapeHtml(formatDateTime(c.created_at))}</div>
          </div>
          <button type="button" class="btn btn-danger btn-sm" data-remove-bio="${escapeHtml(c.id)}">Remove</button>
        </div>
      `,
      )
      .join("");
  } catch (err) {
    listEl.innerHTML = `<div class="error-banner">${escapeHtml(err instanceof Error ? err.message : "Unable to load credentials")}</div>`;
  }
}

async function loadData(): Promise<void> {
  try {
    const [members, packages] = await Promise.all([
      fetchMembers(),
      fetchPackages(),
    ]);
    allMembers = members;
    allPackages = packages;
    populatePackageSelect();
    updateRegistrationPricePreview();
    renderMembersTable();
  } catch (err) {
    showToast(
      err instanceof Error ? err.message : "Failed to load members.",
      "error",
    );
  }
}

async function initMembersPage(): Promise<void> {
  const user = await requireRole("admin");
  if (!user) return;

  initAppShell({
    user,
    activeNavKey: "members",
    pageTitle: "Member Directory & Biometric Enrollment",
  });

  wirePasswordToggles(document);
  wireModalDismiss("register-member-modal");
  wireModalDismiss("member-profile-modal");
  wireModalDismiss("biometric-enroll-modal");

  await loadData();

  realtimeClient.subscribe((evt) => {
    if (
      evt.type === "member:updated" ||
      evt.type === "subscription:updated" ||
      evt.type === "payment:updated" ||
      evt.type === "biometric:updated"
    ) {
      void loadData();
    }
  });

  document
    .getElementById("open-register-modal-btn")
    ?.addEventListener("click", () => {
      openModal("register-member-modal");
    });

  document
    .getElementById("reg-package-select")
    ?.addEventListener("change", updateRegistrationPricePreview);
  document
    .getElementById("reg-duration-select")
    ?.addEventListener("change", updateRegistrationPricePreview);

  const regForm = document.getElementById(
    "register-member-form",
  ) as HTMLFormElement | null;
  regForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const fd = new FormData(regForm);
    try {
      await createMember({
        fullName: String(fd.get("fullName") || ""),
        email: String(fd.get("email") || ""),
        phone: String(fd.get("phone") || ""),
        age: Number(fd.get("age") || 0),
        notes: String(fd.get("notes") || ""),
        accountPassword: String(fd.get("accountPassword") || ""),
        packageId: String(fd.get("packageId") || "") || undefined,
        duration: String(fd.get("duration") || "1m"),
        startDate: String(fd.get("startDate") || "") || undefined,
        paymentStatus: String(fd.get("paymentStatus") || "paid"),
        paymentMethod: String(fd.get("paymentMethod") || "cash"),
        referenceNo: String(fd.get("referenceNo") || ""),
      });
      showToast("Member registered successfully", "success");
      regForm.reset();
      updateRegistrationPricePreview();
      closeModal("register-member-modal");
      await loadData();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Member registration failed.",
        "error",
      );
    }
  });

  document
    .getElementById("member-search-input")
    ?.addEventListener("input", (e) => {
      searchTerm = (e.target as HTMLInputElement).value;
      renderMembersTable();
    });

  document
    .getElementById("member-status-filters")
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
      renderMembersTable();
    });

  document
    .getElementById("members-table-body")
    ?.addEventListener("click", async (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(
        "[data-action]",
      );
      if (!btn || !btn.dataset.id) return;
      const id = btn.dataset.id;

      if (btn.dataset.action === "view") {
        void openMemberProfileModal(id);
      } else if (btn.dataset.action === "biometrics") {
        void openBiometricEnrollModal(id);
      } else if (btn.dataset.action === "freeze") {
        try {
          const res = await freezeMember(id);
          showToast(
            `Account frozen (${res.remainingDays} remaining days saved)`,
            "success",
          );
          await loadData();
        } catch (err) {
          showToast(
            err instanceof Error ? err.message : "Freeze failed.",
            "error",
          );
        }
      } else if (btn.dataset.action === "unfreeze") {
        try {
          const res = await unfreezeMember(id);
          showToast(
            `Account unfrozen! Resumed until ${formatDate(res.expiryDate)}`,
            "success",
          );
          await loadData();
        } catch (err) {
          showToast(
            err instanceof Error ? err.message : "Unfreeze failed.",
            "error",
          );
        }
      } else if (btn.dataset.action === "delete") {
        const target = allMembers.find((m) => m.id === id);
        if (
          !window.confirm(
            `Delete member ${target?.fullName || ""}? This cannot be undone.`,
          )
        )
          return;
        try {
          await deleteMember(id);
          showToast("Member deleted", "success");
          await loadData();
        } catch (err) {
          showToast(
            err instanceof Error ? err.message : "Delete failed.",
            "error",
          );
        }
      }
    });

  document
    .getElementById("enroll-webauthn-btn")
    ?.addEventListener("click", async () => {
      if (!selectedMemberId) return;
      const labelInput = document.getElementById(
        "bio-device-label",
      ) as HTMLInputElement | null;
      try {
        await enrollWebAuthnFingerprint(
          selectedMemberId,
          labelInput?.value.trim() || "WebAuthn Biometric Sensor",
        );
        showToast("Hardware biometric enrolled via WebAuthn", "success");
        await refreshBiometricCredentialList(selectedMemberId);
        await loadData();
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : "WebAuthn enrollment failed.",
          "error",
        );
      }
    });

  const sdkProviderSelect = document.getElementById(
    "sdk-provider-select",
  ) as HTMLSelectElement | null;
  const sdkEndpointInput = document.getElementById(
    "sdk-endpoint-input",
  ) as HTMLInputElement | null;
  sdkProviderSelect?.addEventListener("change", () => {
    if (sdkEndpointInput) {
      sdkEndpointInput.value = getDefaultSdkEndpoint(
        sdkProviderSelect.value as HardwareSdkProvider,
      );
    }
  });

  document
    .getElementById("enroll-sdk-btn")
    ?.addEventListener("click", async () => {
      if (!selectedMemberId || !sdkProviderSelect || !sdkEndpointInput) return;
      const labelInput = document.getElementById(
        "bio-device-label",
      ) as HTMLInputElement | null;
      try {
        await enrollHardwareSdkFingerprint(
          selectedMemberId,
          sdkProviderSelect.value as HardwareSdkProvider,
          sdkEndpointInput.value.trim(),
          labelInput?.value.trim() ||
            `${sdkProviderSelect.value.toUpperCase()} Scanner`,
        );
        showToast("USB Scanner SDK fingerprint enrolled", "success");
        await refreshBiometricCredentialList(selectedMemberId);
        await loadData();
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : "Scanner SDK enrollment failed.",
          "error",
        );
      }
    });

  document
    .getElementById("enrolled-biometrics-list")
    ?.addEventListener("click", async (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(
        "[data-remove-bio]",
      );
      if (!btn || !btn.dataset.removeBio || !selectedMemberId) return;
      try {
        await removeBiometricCredential(btn.dataset.removeBio);
        showToast("Biometric credential removed", "success");
        await refreshBiometricCredentialList(selectedMemberId);
        await loadData();
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : "Failed to remove credential.",
          "error",
        );
      }
    });

  document
    .getElementById("export-members-btn")
    ?.addEventListener("click", () => {
      downloadCsv(
        `gym-members-${new Date().toISOString().slice(0, 10)}.csv`,
        [
          "Member Code",
          "Full Name",
          "Email",
          "Phone",
          "Age",
          "Status",
          "Active Plan",
          "Expiry Date",
          "Payment Status",
        ],
        allMembers.map((m) => [
          m.memberCode,
          m.fullName,
          m.email,
          m.phone,
          m.age,
          m.status,
          m.activeSubscription?.packageName || "None",
          m.activeSubscription?.expiryDate || "",
          m.latestPayment?.status || "unpaid",
        ]),
      );
      showToast("Member directory exported", "success");
    });
}

void initMembersPage();
