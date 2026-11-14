import { requireRole } from "../services/authService.ts";
import { fetchDashboardAnalytics } from "../services/gymService.ts";
import { realtimeClient } from "../services/realtimeClient.ts";
import {
  renderAttendanceBarChart,
  renderRevenueBarChart,
} from "../ui/charts.ts";
import { initAppShell } from "../ui/layout.ts";
import { showToast } from "../ui/toast.ts";
import type { DashboardAnalytics } from "../types.ts";
import {
  downloadCsv,
  escapeHtml,
  formatCurrency,
  formatDate,
  formatDateTime,
  formatStatusText,
  statusTagClass,
} from "../utils/formatters.ts";

let latestData: DashboardAnalytics | null = null;

function renderKpis(data: DashboardAnalytics): void {
  const { stats } = data;
  const setText = (id: string, val: string): void => {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
  };

  setText("kpi-total-members", String(stats.totalMembers));
  setText(
    "kpi-members-breakdown",
    `${stats.activeMembers} active · ${stats.expiredMembers} expired · ${stats.suspendedMembers} suspended`,
  );
  setText("kpi-month-revenue", formatCurrency(stats.monthRevenue));
  setText(
    "kpi-total-revenue",
    `Total collected: ${formatCurrency(stats.totalRevenue)}`,
  );
  setText("kpi-today-checkins", String(stats.todayCheckins));
  setText(
    "kpi-valid-checkins",
    `${stats.todayValidCheckins} valid entries today`,
  );
  setText("kpi-pending-approvals", String(stats.pendingApprovals));
  setText(
    "kpi-unpaid-amount",
    `Unpaid / Pending: ${formatCurrency(stats.unpaidAmount)}`,
  );
}

function renderTables(data: DashboardAnalytics): void {
  const expirationsBody = document.getElementById("upcoming-expirations-body");
  if (expirationsBody) {
    if (data.upcomingExpirations.length === 0) {
      expirationsBody.innerHTML =
        '<tr><td colspan="5" class="empty-state">No memberships expiring in the next 14 days.</td></tr>';
    } else {
      expirationsBody.innerHTML = data.upcomingExpirations
        .map(
          (row) => `
          <tr>
            <td class="mono">${escapeHtml(row.memberCode)}</td>
            <td>
              <div>${escapeHtml(row.memberName)}</div>
              <div class="section-subtitle">${escapeHtml(row.phone)}</div>
            </td>
            <td>${escapeHtml(row.packageName)}</td>
            <td class="mono">${escapeHtml(formatDate(row.expiryDate))}</td>
            <td class="col-numeric">
              <span class="status-tag ${row.daysRemaining <= 3 ? "status-danger" : "status-warning"}">
                ${row.daysRemaining === 0 ? "Today" : `${row.daysRemaining}d left`}
              </span>
            </td>
          </tr>
        `,
        )
        .join("");
    }
  }

  const recentBody = document.getElementById("recent-registrations-body");
  if (recentBody) {
    if (data.recentRegistrations.length === 0) {
      recentBody.innerHTML =
        '<tr><td colspan="5" class="empty-state">No members registered yet.</td></tr>';
    } else {
      recentBody.innerHTML = data.recentRegistrations
        .map(
          (m) => `
          <tr>
            <td class="mono">${escapeHtml(m.memberCode)}</td>
            <td>${escapeHtml(m.fullName)}</td>
            <td class="mono">${escapeHtml(m.phone)}</td>
            <td><span class="${statusTagClass(m.status)}">${escapeHtml(formatStatusText(m.status))}</span></td>
            <td class="mono">${escapeHtml(formatDateTime(m.createdAt))}</td>
          </tr>
        `,
        )
        .join("");
    }
  }

  const breakdownList = document.getElementById("package-breakdown-list");
  if (breakdownList) {
    if (data.packageBreakdown.length === 0) {
      breakdownList.innerHTML =
        '<div class="empty-state">No active subscriptions assigned yet.</div>';
    } else {
      breakdownList.innerHTML = data.packageBreakdown
        .map(
          (item) => `
          <div class="breakdown-row">
            <span>${escapeHtml(item.name)}</span>
            <span class="mono">${item.count} active</span>
          </div>
        `,
        )
        .join("");
    }
  }
}

function drawCharts(data: DashboardAnalytics): void {
  const revCanvas = document.getElementById(
    "revenue-chart-canvas",
  ) as HTMLCanvasElement | null;
  const attCanvas = document.getElementById(
    "attendance-chart-canvas",
  ) as HTMLCanvasElement | null;
  if (revCanvas) renderRevenueBarChart(revCanvas, data.revenueSeries);
  if (attCanvas) renderAttendanceBarChart(attCanvas, data.attendanceSeries);
}

async function loadDashboard(): Promise<void> {
  try {
    const data = await fetchDashboardAnalytics();
    latestData = data;
    renderKpis(data);
    renderTables(data);
    drawCharts(data);
  } catch (err) {
    showToast(
      err instanceof Error ? err.message : "Failed to load analytics.",
      "error",
    );
  }
}

async function initDashboardPage(): Promise<void> {
  const user = await requireRole("admin");
  if (!user) return;

  initAppShell({
    user,
    activeNavKey: "dashboard",
    pageTitle: "Facility Dashboard & Analytics",
  });

  await loadDashboard();

  realtimeClient.subscribe((evt) => {
    if (
      evt.type === "member:updated" ||
      evt.type === "subscription:updated" ||
      evt.type === "payment:updated" ||
      evt.type === "attendance:recorded"
    ) {
      void loadDashboard();
    }
  });

  window.addEventListener("resize", () => {
    if (latestData) drawCharts(latestData);
  });

  document
    .getElementById("refresh-dashboard-btn")
    ?.addEventListener("click", () => {
      void loadDashboard();
    });

  document
    .getElementById("export-report-btn")
    ?.addEventListener("click", () => {
      if (!latestData) return;
      const { stats } = latestData;
      downloadCsv(
        `gym-analytics-report-${new Date().toISOString().slice(0, 10)}.csv`,
        ["Metric", "Value"],
        [
          ["Total Members", stats.totalMembers],
          ["Active Members", stats.activeMembers],
          ["Expired Members", stats.expiredMembers],
          ["Suspended Members", stats.suspendedMembers],
          ["Pending Members", stats.pendingMembers],
          ["Active Subscriptions", stats.activeSubscriptions],
          ["Expired Subscriptions", stats.expiredSubscriptions],
          ["Pending Payment Approvals", stats.pendingApprovals],
          ["Monthly Collected Revenue", stats.monthRevenue.toFixed(2)],
          ["Total Collected Revenue", stats.totalRevenue.toFixed(2)],
          ["Unpaid / Pending Balance", stats.unpaidAmount.toFixed(2)],
          ["Today Total Check-ins", stats.todayCheckins],
          ["Today Valid Check-ins", stats.todayValidCheckins],
        ],
      );
      showToast("Analytics report exported", "success");
    });
}

void initDashboardPage();
