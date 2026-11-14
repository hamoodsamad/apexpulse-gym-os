import {
  ClipboardCheck,
  CreditCard,
  Fingerprint,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  UserCheck,
  Users,
  createElement,
} from "lucide";
import type { AuthUser } from "../types.ts";
import { logoutAccount } from "../services/authService.ts";
import { realtimeClient } from "../services/realtimeClient.ts";
import { escapeHtml } from "../utils/formatters.ts";

interface NavLinkDef {
  href: string;
  label: string;
  key: string;
  icon: typeof LayoutDashboard;
}

const ADMIN_NAV_LINKS: NavLinkDef[] = [
  {
    href: "/index-dashboard.html",
    label: "Dashboard",
    key: "dashboard",
    icon: LayoutDashboard,
  },
  {
    href: "/index-members.html",
    label: "Members",
    key: "members",
    icon: Users,
  },
  {
    href: "/index-scanner.html",
    label: "Scanner Terminal",
    key: "scanner",
    icon: Fingerprint,
  },
  {
    href: "/index-packages.html",
    label: "Plans & Deals",
    key: "packages",
    icon: Package,
  },
  {
    href: "/index-payments.html",
    label: "Payments",
    key: "payments",
    icon: CreditCard,
  },
  {
    href: "/index-attendance.html",
    label: "Attendance",
    key: "attendance",
    icon: ClipboardCheck,
  },
];

const MEMBER_NAV_LINKS: NavLinkDef[] = [
  {
    href: "/index-member-portal.html",
    label: "My Membership",
    key: "member-portal",
    icon: UserCheck,
  },
];

export function initAppShell(options: {
  user: AuthUser;
  activeNavKey: string;
  pageTitle: string;
}): void {
  const sidebar = document.getElementById("app-sidebar");
  const backdrop = document.getElementById("sidebar-backdrop");
  const topbarLeft = document.getElementById("topbar-left");

  if (sidebar) {
    const links =
      options.user.role === "admin" ? ADMIN_NAV_LINKS : MEMBER_NAV_LINKS;

    sidebar.innerHTML = "";

    const topGroup = document.createElement("div");
    const brand = document.createElement("div");
    brand.className = "sidebar-brand";
    brand.textContent = "ApexPulse Gym OS";
    topGroup.appendChild(brand);

    const nav = document.createElement("nav");
    nav.className = "sidebar-nav";
    nav.setAttribute("aria-label", "Primary navigation");

    for (const item of links) {
      const anchor = document.createElement("a");
      anchor.href = item.href;
      anchor.className = `nav-link${item.key === options.activeNavKey ? " active" : ""}`;
      const iconEl = createElement(item.icon, {
        class: "nav-icon",
        "aria-hidden": "true",
      });
      const labelSpan = document.createElement("span");
      labelSpan.textContent = item.label;
      anchor.appendChild(iconEl);
      anchor.appendChild(labelSpan);
      nav.appendChild(anchor);
    }

    topGroup.appendChild(nav);
    sidebar.appendChild(topGroup);

    const footer = document.createElement("div");
    footer.className = "sidebar-footer";
    footer.innerHTML = `
      <div class="sidebar-user">
        <div class="sidebar-user-name">${escapeHtml(options.user.fullName)}</div>
        <div class="sidebar-user-meta">${escapeHtml(options.user.role === "admin" ? "Administrator" : "Member Account")}</div>
      </div>
    `;

    const logoutBtn = document.createElement("button");
    logoutBtn.type = "button";
    logoutBtn.className = "btn btn-ghost btn-sm";
    logoutBtn.appendChild(
      createElement(LogOut, { class: "nav-icon", "aria-hidden": "true" }),
    );
    const btnText = document.createElement("span");
    btnText.textContent = "Sign Out";
    logoutBtn.appendChild(btnText);
    logoutBtn.addEventListener("click", () => {
      void logoutAccount();
    });

    footer.appendChild(logoutBtn);
    sidebar.appendChild(footer);
  }

  if (topbarLeft) {
    topbarLeft.innerHTML = "";
    const menuBtn = document.createElement("button");
    menuBtn.type = "button";
    menuBtn.className = "mobile-menu-btn";
    menuBtn.setAttribute("aria-label", "Open navigation menu");
    menuBtn.appendChild(
      createElement(Menu, { class: "nav-icon", "aria-hidden": "true" }),
    );

    menuBtn.addEventListener("click", () => {
      sidebar?.classList.toggle("open");
      backdrop?.classList.toggle("open");
    });

    backdrop?.addEventListener("click", () => {
      sidebar?.classList.remove("open");
      backdrop?.classList.remove("open");
    });

    const titleEl = document.createElement("h1");
    titleEl.className = "topbar-title";
    titleEl.textContent = options.pageTitle;

    topbarLeft.appendChild(menuBtn);
    topbarLeft.appendChild(titleEl);
  }

  realtimeClient.connect();
}
