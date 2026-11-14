import { requireRole } from "../services/authService.ts";
import { fetchAttendance } from "../services/gymService.ts";
import { realtimeClient } from "../services/realtimeClient.ts";
import { initAppShell } from "../ui/layout.ts";
import { showToast } from "../ui/toast.ts";
import {
  downloadCsv,
  escapeHtml,
  formatDate,
  formatDateTime,
  formatStatusText,
  statusTagClass,
} from "../utils/formatters.ts";

let allAttendance: Array<Record<string, unknown>> = [];
let resultFilter = "all";
let searchTerm = "";
let dateFilter = "";

function renderAttendanceTable(): void {
  const tbody = document.getElementById("attendance-table-body");
  if (!tbody) return;

  const q = searchTerm.trim().toLowerCase();
  const filtered = allAttendance.filter((row) => {
    const matchResult =
      resultFilter === "all" || row.verification_result === resultFilter;
    const matchDate =
      !dateFilter || String(row.scanned_at || "").startsWith(dateFilter);
    const matchQuery =
      !q ||
      String(row.member_name || "")
        .toLowerCase()
        .includes(q) ||
      String(row.member_code || "")
        .toLowerCase()
        .includes(q) ||
      String(row.device_label || "")
        .toLowerCase()
        .includes(q);
    return matchResult && matchDate && matchQuery;
  });

  if (filtered.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="6" class="empty-state">No attendance check-ins match your filters.</td></tr>';
    return;
  }

  tbody.innerHTML = filtered
    .map(
      (r) => `
      <tr>
        <td class="mono">${escapeHtml(formatDateTime(String(r.scanned_at)))}</td>
        <td>
          <div><strong>${escapeHtml(r.member_name)}</strong></div>
          <div class="section-subtitle mono">${escapeHtml(r.member_code)} · ${escapeHtml(r.phone || "")}</div>
        </td>
        <td>${escapeHtml(r.package_name || "None")}</td>
        <td class="mono">${r.expiry_date ? escapeHtml(formatDate(String(r.expiry_date))) : "—"}</td>
        <td>${escapeHtml(r.device_label)} <span class="section-subtitle">(${escapeHtml(formatStatusText(String(r.verification_method)))})</span></td>
        <td><span class="${statusTagClass(String(r.verification_result))}">${escapeHtml(formatStatusText(String(r.verification_result)))}</span></td>
      </tr>
    `,
    )
    .join("");
}

async function loadAttendance(): Promise<void> {
  try {
    allAttendance = await fetchAttendance();
    renderAttendanceTable();
  } catch (err) {
    showToast(
      err instanceof Error ? err.message : "Unable to load attendance logs.",
      "error",
    );
  }
}

async function initAttendancePage(): Promise<void> {
  const user = await requireRole("admin");
  if (!user) return;

  initAppShell({
    user,
    activeNavKey: "attendance",
    pageTitle: "Facility Attendance & Biometric Audit Log",
  });

  await loadAttendance();

  realtimeClient.subscribe((evt) => {
    if (evt.type === "attendance:recorded") {
      void loadAttendance();
    }
  });

  document
    .getElementById("attendance-search-input")
    ?.addEventListener("input", (e) => {
      searchTerm = (e.target as HTMLInputElement).value;
      renderAttendanceTable();
    });

  document
    .getElementById("attendance-date-input")
    ?.addEventListener("change", (e) => {
      dateFilter = (e.target as HTMLInputElement).value;
      renderAttendanceTable();
    });

  document
    .getElementById("attendance-result-filters")
    ?.addEventListener("click", (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(
        "[data-result]",
      );
      if (!btn) return;
      resultFilter = btn.dataset.result || "all";
      for (const sibling of btn.parentElement?.querySelectorAll(
        ".segment-btn",
      ) || []) {
        sibling.classList.remove("active");
      }
      btn.classList.add("active");
      renderAttendanceTable();
    });

  document
    .getElementById("export-attendance-btn")
    ?.addEventListener("click", () => {
      downloadCsv(
        `gym-attendance-${new Date().toISOString().slice(0, 10)}.csv`,
        [
          "Scanned At",
          "Member Code",
          "Member Name",
          "Plan",
          "Device",
          "Method",
          "Result",
        ],
        allAttendance.map((r) => [
          String(r.scanned_at || ""),
          String(r.member_code || ""),
          String(r.member_name || ""),
          String(r.package_name || ""),
          String(r.device_label || ""),
          String(r.verification_method || ""),
          String(r.verification_result || ""),
        ]),
      );
      showToast("Attendance log exported", "success");
    });
}

void initAttendancePage();
