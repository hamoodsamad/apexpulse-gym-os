import { requireRole } from "../services/authService.ts";
import {
  checkBiometricCapabilities,
  getDefaultSdkEndpoint,
  verifyHardwareSdkFingerprint,
  verifyWebAuthnFingerprint,
  type HardwareSdkProvider,
} from "../services/biometricService.ts";
import { fetchAttendance, fetchMembers } from "../services/gymService.ts";
import { realtimeClient } from "../services/realtimeClient.ts";
import { initAppShell } from "../ui/layout.ts";
import { showToast } from "../ui/toast.ts";
import type { MemberSummary, ScanVerificationResult } from "../types.ts";
import {
  escapeHtml,
  formatDate,
  formatDateTime,
  formatDurationLabel,
  formatStatusText,
  statusTagClass,
} from "../utils/formatters.ts";

let membersList: MemberSummary[] = [];

function renderScanResult(result: ScanVerificationResult): void {
  const container = document.getElementById("scan-result-panel");
  if (!container) return;

  let bannerClass = "result-danger";
  let symbol = "✕";
  if (result.verificationResult === "valid") {
    bannerClass = "result-valid";
    symbol = "✓";
  } else if (result.verificationResult === "suspended") {
    bannerClass = "result-warning";
    symbol = "!";
  }

  container.innerHTML = `
    <div class="scan-result-banner ${bannerClass}">
      <div class="toolbar-group">
        <span class="scan-status-icon" aria-hidden="true">${symbol}</span>
        <div>
          <h2 class="section-title">${escapeHtml(result.statusLabel)} — ${escapeHtml(result.member.fullName)}</h2>
          <p class="section-subtitle">${escapeHtml(result.reason)}</p>
        </div>
      </div>
      <div class="mono">${escapeHtml(formatDateTime(result.scannedAt))}</div>
    </div>

    <div class="profile-kv-grid">
      <div class="kv-item">
        <div class="kv-label">Member Name</div>
        <div class="kv-value">${escapeHtml(result.member.fullName)}</div>
      </div>
      <div class="kv-item">
        <div class="kv-label">Phone Number</div>
        <div class="kv-value mono">${escapeHtml(result.member.phone)}</div>
      </div>
      <div class="kv-item">
        <div class="kv-label">Age</div>
        <div class="kv-value mono">${result.member.age} yrs</div>
      </div>
      <div class="kv-item">
        <div class="kv-label">Subscription Plan</div>
        <div class="kv-value">
          ${
            result.subscription
              ? `${escapeHtml(result.subscription.packageName)} (${escapeHtml(formatDurationLabel(result.subscription.duration))})`
              : "No Active Plan"
          }
        </div>
      </div>
      <div class="kv-item">
        <div class="kv-label">Payment Status</div>
        <div class="kv-value">
          <span class="${statusTagClass(result.payment?.status || "unpaid")}">
            ${escapeHtml(formatStatusText(result.payment?.status || "unpaid"))}
          </span>
        </div>
      </div>
      <div class="kv-item">
        <div class="kv-label">Expiry Date</div>
        <div class="kv-value mono">${result.subscription ? escapeHtml(formatDate(result.subscription.expiryDate)) : "—"}</div>
      </div>
    </div>
  `;
}

function renderScannerError(message: string): void {
  const container = document.getElementById("scan-result-panel");
  if (!container) return;
  container.innerHTML = `
    <div class="error-banner">${escapeHtml(message)}</div>
  `;
}

async function loadRecentScans(): Promise<void> {
  const tbody = document.getElementById("scanner-recent-body");
  if (!tbody) return;
  try {
    const rows = await fetchAttendance();
    const recent = rows.slice(0, 12);
    if (recent.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="5" class="empty-state">No biometric attendance scans recorded yet.</td></tr>';
      return;
    }
    tbody.innerHTML = recent
      .map(
        (r) => `
        <tr>
          <td class="mono">${escapeHtml(formatDateTime(String(r.scanned_at)))}</td>
          <td>${escapeHtml(r.member_name)} <span class="mono">(${escapeHtml(r.member_code)})</span></td>
          <td>${escapeHtml(r.package_name || "—")}</td>
          <td>${escapeHtml(r.device_label)}</td>
          <td><span class="${statusTagClass(String(r.verification_result))}">${escapeHtml(formatStatusText(String(r.verification_result)))}</span></td>
        </tr>
      `,
      )
      .join("");
  } catch (err) {
    showToast(
      err instanceof Error ? err.message : "Unable to load recent scans.",
      "error",
    );
  }
}

async function loadMembersDropdown(): Promise<void> {
  const select = document.getElementById(
    "scanner-member-select",
  ) as HTMLSelectElement | null;
  if (!select) return;
  membersList = await fetchMembers();
  select.innerHTML =
    '<option value="">Identify automatically across all enrolled members</option>' +
    membersList
      .map(
        (m) =>
          `<option value="${escapeHtml(m.id)}">${escapeHtml(m.fullName)} (${escapeHtml(m.memberCode)}) — ${m.biometricCount} enrolled</option>`,
      )
      .join("");
}

async function initScannerPage(): Promise<void> {
  const user = await requireRole("admin");
  if (!user) return;

  initAppShell({
    user,
    activeNavKey: "scanner",
    pageTitle: "Fingerprint Hardware Verification Terminal",
  });

  const capBanner = document.getElementById("hardware-capability-status");
  if (capBanner) {
    const caps = await checkBiometricCapabilities();
    capBanner.textContent = caps.platformAuthenticatorAvailable
      ? "WebAuthn Platform Biometric Authenticator detected. Ready for real fingerprint verification."
      : caps.webauthnSupported
        ? "WebAuthn FIDO2 supported (external USB security key) or connect a local vendor Scanner SDK daemon below."
        : "WebAuthn unavailable in this browser; connect a local USB Scanner SDK daemon below.";
  }

  await Promise.all([loadMembersDropdown(), loadRecentScans()]);

  realtimeClient.subscribe((evt) => {
    if (evt.type === "attendance:recorded") {
      void loadRecentScans();
    } else if (
      evt.type === "member:updated" ||
      evt.type === "biometric:updated"
    ) {
      void loadMembersDropdown();
    }
  });

  const memberSelect = document.getElementById(
    "scanner-member-select",
  ) as HTMLSelectElement | null;
  const deviceLabelInput = document.getElementById(
    "scanner-device-label",
  ) as HTMLInputElement | null;

  document
    .getElementById("scan-webauthn-btn")
    ?.addEventListener("click", async () => {
      try {
        const result = await verifyWebAuthnFingerprint(
          deviceLabelInput?.value.trim() || "Front Desk WebAuthn Sensor",
          memberSelect?.value || undefined,
        );
        renderScanResult(result);
        await loadRecentScans();
      } catch (err) {
        const msg =
          err instanceof Error
            ? err.message
            : "WebAuthn fingerprint scan failed.";
        renderScannerError(msg);
        showToast(msg, "error");
      }
    });

  const sdkProviderSelect = document.getElementById(
    "terminal-sdk-provider",
  ) as HTMLSelectElement | null;
  const sdkEndpointInput = document.getElementById(
    "terminal-sdk-endpoint",
  ) as HTMLInputElement | null;
  sdkProviderSelect?.addEventListener("change", () => {
    if (sdkEndpointInput) {
      sdkEndpointInput.value = getDefaultSdkEndpoint(
        sdkProviderSelect.value as HardwareSdkProvider,
      );
    }
  });

  document
    .getElementById("scan-sdk-btn")
    ?.addEventListener("click", async () => {
      if (!sdkProviderSelect || !sdkEndpointInput) return;
      try {
        const result = await verifyHardwareSdkFingerprint(
          sdkProviderSelect.value as HardwareSdkProvider,
          sdkEndpointInput.value.trim(),
          deviceLabelInput?.value.trim() ||
            `${sdkProviderSelect.value.toUpperCase()} USB Scanner`,
        );
        renderScanResult(result);
        await loadRecentScans();
      } catch (err) {
        const msg =
          err instanceof Error ? err.message : "Hardware SDK capture failed.";
        renderScannerError(msg);
        showToast(msg, "error");
      }
    });
}

void initScannerPage();
