import { requireRole } from "../services/authService.ts";
import {
  createPackage,
  createService,
  deletePackage,
  deleteService,
  fetchPackages,
  fetchServices,
  updatePackage,
} from "../services/gymService.ts";
import { realtimeClient } from "../services/realtimeClient.ts";
import { initAppShell } from "../ui/layout.ts";
import { closeModal, openModal, wireModalDismiss } from "../ui/modals.ts";
import { showToast } from "../ui/toast.ts";
import type { PackageCategory, PackageItem, ServiceItem } from "../types.ts";
import { escapeHtml, formatCurrency } from "../utils/formatters.ts";

let servicesList: ServiceItem[] = [];
let packagesList: PackageItem[] = [];
let editingPackageId: string | null = null;

function renderServicesTable(): void {
  const tbody = document.getElementById("services-table-body");
  if (!tbody) return;
  if (servicesList.length === 0) {
    tbody.innerHTML =
      '<tr><td colspan="4" class="empty-state">No services defined yet.</td></tr>';
    return;
  }
  tbody.innerHTML = servicesList
    .map(
      (svc) => `
      <tr>
        <td><strong>${escapeHtml(svc.name)}</strong></td>
        <td>${escapeHtml(svc.description || "—")}</td>
        <td><span class="status-tag ${svc.isActive ? "status-valid" : "status-neutral"}">${svc.isActive ? "Active" : "Disabled"}</span></td>
        <td>
          <button type="button" class="btn btn-danger btn-sm" data-delete-service="${escapeHtml(svc.id)}">Remove</button>
        </td>
      </tr>
    `,
    )
    .join("");
}

function renderPackagesGrid(): void {
  const grid = document.getElementById("packages-catalog-grid");
  if (!grid) return;
  if (packagesList.length === 0) {
    grid.innerHTML =
      '<div class="empty-state">No packages configured yet.</div>';
    return;
  }

  grid.innerHTML = packagesList
    .map((pkg) => {
      const servicesText =
        pkg.services.map((s) => s.name).join(" · ") || "No services attached";
      const categoryLabel =
        pkg.category === "gym_only"
          ? "Gym Only"
          : pkg.category === "cardio_only"
            ? "Cardio Only"
            : pkg.category === "gym_cardio"
              ? "Gym + Cardio"
              : pkg.isDeal
                ? "Special Deal"
                : "Custom Package";

      return `
        <article class="surface-card">
          <div class="section-header">
            <div>
              <div class="metadata-line">
                <span>${escapeHtml(categoryLabel)}</span>
                <span aria-hidden="true">·</span>
                <span>${pkg.isActive ? "Active" : "Archived"}</span>
              </div>
              <h3 class="section-title mt-12">${escapeHtml(pkg.name)}</h3>
            </div>
            <div class="toolbar-group">
              <button type="button" class="btn btn-secondary btn-sm" data-edit-package="${escapeHtml(pkg.id)}">Edit</button>
              <button type="button" class="btn btn-danger btn-sm" data-delete-package="${escapeHtml(pkg.id)}">Delete</button>
            </div>
          </div>
          <p class="section-subtitle">${escapeHtml(pkg.description || "Configurable multi-duration gym membership plan.")}</p>
          <div class="metadata-line mt-12">
            <span>Services: ${escapeHtml(servicesText)}</span>
          </div>
          <div class="duration-price-grid">
            <div class="duration-cell">
              <div class="duration-label">1 Month</div>
              <div class="duration-price">${escapeHtml(formatCurrency(pkg.prices["1m"]))}</div>
            </div>
            <div class="duration-cell">
              <div class="duration-label">3 Months</div>
              <div class="duration-price">${escapeHtml(formatCurrency(pkg.prices["3m"]))}</div>
            </div>
            <div class="duration-cell">
              <div class="duration-label">6 Months</div>
              <div class="duration-price">${escapeHtml(formatCurrency(pkg.prices["6m"]))}</div>
            </div>
            <div class="duration-cell">
              <div class="duration-label">1 Year</div>
              <div class="duration-price">${escapeHtml(formatCurrency(pkg.prices["1y"]))}</div>
            </div>
          </div>
        </article>
      `;
    })
    .join("");
}

function renderServiceCheckboxes(selectedIds: string[]): void {
  const container = document.getElementById("pkg-services-checkboxes");
  if (!container) return;
  container.innerHTML = servicesList
    .map(
      (svc) => `
      <label class="checkbox-item">
        <input type="checkbox" name="serviceIds" value="${escapeHtml(svc.id)}" ${selectedIds.includes(svc.id) ? "checked" : ""} />
        <span>${escapeHtml(svc.name)}</span>
      </label>
    `,
    )
    .join("");
}

function openPackageModal(pkg?: PackageItem): void {
  editingPackageId = pkg?.id ?? null;
  const titleEl = document.getElementById("package-modal-title");
  const form = document.getElementById(
    "package-form",
  ) as HTMLFormElement | null;
  if (!form || !titleEl) return;

  titleEl.textContent = pkg
    ? `Edit Package — ${pkg.name}`
    : "Create Custom Package / Deal";
  (form.elements.namedItem("name") as HTMLInputElement).value = pkg?.name ?? "";
  (form.elements.namedItem("category") as HTMLSelectElement).value =
    pkg?.category ?? "custom_deal";
  (form.elements.namedItem("description") as HTMLTextAreaElement).value =
    pkg?.description ?? "";
  (form.elements.namedItem("isDeal") as HTMLInputElement).checked =
    pkg?.isDeal ?? true;
  (form.elements.namedItem("price1m") as HTMLInputElement).value = String(
    pkg?.prices["1m"] ?? 0,
  );
  (form.elements.namedItem("price3m") as HTMLInputElement).value = String(
    pkg?.prices["3m"] ?? 0,
  );
  (form.elements.namedItem("price6m") as HTMLInputElement).value = String(
    pkg?.prices["6m"] ?? 0,
  );
  (form.elements.namedItem("price1y") as HTMLInputElement).value = String(
    pkg?.prices["1y"] ?? 0,
  );

  renderServiceCheckboxes(pkg?.serviceIds ?? []);
  openModal("package-modal");
}

async function loadCatalog(): Promise<void> {
  try {
    const [services, packages] = await Promise.all([
      fetchServices(),
      fetchPackages(),
    ]);
    servicesList = services;
    packagesList = packages;
    renderServicesTable();
    renderPackagesGrid();
  } catch (err) {
    showToast(
      err instanceof Error ? err.message : "Failed to load packages catalog.",
      "error",
    );
  }
}

async function initPackagesPage(): Promise<void> {
  const user = await requireRole("admin");
  if (!user) return;

  initAppShell({
    user,
    activeNavKey: "packages",
    pageTitle: "Services, Subscription Plans & Custom Deals",
  });

  wireModalDismiss("service-modal");
  wireModalDismiss("package-modal");

  await loadCatalog();

  realtimeClient.subscribe((evt) => {
    if (evt.type === "package:updated" || evt.type === "service:updated") {
      void loadCatalog();
    }
  });

  document
    .getElementById("open-service-modal-btn")
    ?.addEventListener("click", () => {
      openModal("service-modal");
    });

  document
    .getElementById("open-package-modal-btn")
    ?.addEventListener("click", () => {
      openPackageModal();
    });

  const serviceForm = document.getElementById(
    "service-form",
  ) as HTMLFormElement | null;
  serviceForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(serviceForm);
    try {
      await createService(
        String(fd.get("name") || ""),
        String(fd.get("description") || ""),
      );
      showToast("Custom service created", "success");
      serviceForm.reset();
      closeModal("service-modal");
      await loadCatalog();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to create service.",
        "error",
      );
    }
  });

  document
    .getElementById("services-table-body")
    ?.addEventListener("click", async (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>(
        "[data-delete-service]",
      );
      if (!btn || !btn.dataset.deleteService) return;
      try {
        await deleteService(btn.dataset.deleteService);
        showToast("Service removed", "success");
        await loadCatalog();
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : "Unable to remove service.",
          "error",
        );
      }
    });

  document
    .getElementById("packages-catalog-grid")
    ?.addEventListener("click", async (e) => {
      const editBtn = (e.target as HTMLElement).closest<HTMLButtonElement>(
        "[data-edit-package]",
      );
      if (editBtn?.dataset.editPackage) {
        const pkg = packagesList.find(
          (p) => p.id === editBtn.dataset.editPackage,
        );
        if (pkg) openPackageModal(pkg);
        return;
      }

      const delBtn = (e.target as HTMLElement).closest<HTMLButtonElement>(
        "[data-delete-package]",
      );
      if (delBtn?.dataset.deletePackage) {
        try {
          await deletePackage(delBtn.dataset.deletePackage);
          showToast("Package removed or archived", "success");
          await loadCatalog();
        } catch (err) {
          showToast(
            err instanceof Error ? err.message : "Unable to delete package.",
            "error",
          );
        }
      }
    });

  const packageForm = document.getElementById(
    "package-form",
  ) as HTMLFormElement | null;
  packageForm?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fd = new FormData(packageForm);
    const serviceIds = fd.getAll("serviceIds").map(String);
    if (serviceIds.length === 0) {
      showToast("Select at least one gym service for this package.", "error");
      return;
    }

    const payload = {
      name: String(fd.get("name") || ""),
      category: String(fd.get("category") || "custom_deal") as PackageCategory,
      description: String(fd.get("description") || ""),
      isDeal: (packageForm.elements.namedItem("isDeal") as HTMLInputElement)
        .checked,
      serviceIds,
      prices: {
        "1m": Number(fd.get("price1m") || 0),
        "3m": Number(fd.get("price3m") || 0),
        "6m": Number(fd.get("price6m") || 0),
        "1y": Number(fd.get("price1y") || 0),
      },
    };

    try {
      if (editingPackageId) {
        await updatePackage(editingPackageId, { ...payload, isActive: true });
        showToast("Package pricing and services updated", "success");
      } else {
        await createPackage(payload);
        showToast("Custom package created", "success");
      }
      closeModal("package-modal");
      await loadCatalog();
    } catch (err) {
      showToast(
        err instanceof Error ? err.message : "Failed to save package.",
        "error",
      );
    }
  });
}

void initPackagesPage();
