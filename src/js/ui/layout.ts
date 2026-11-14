import {
  ArrowLeft,
  ClipboardCheck,
  CreditCard,
  Fingerprint,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  Shield,
  User,
  UserCheck,
  Users,
  createElement,
} from "lucide";
import type { AuthUser } from "../types.ts";
import { logoutAccount, switchViewMode } from "../services/authService.ts";
import { realtimeClient } from "../services/realtimeClient.ts";
import { escapeHtml } from "../utils/formatters.ts";

const PORTFOLIO_URL =
  "https://my-portfolio-czuhuqnne-hamoodsamad0321-6526.vercel.app";

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

    const backLink = document.createElement("a");
    backLink.href = PORTFOLIO_URL;
    backLink.className = "portfolio-back-link";
    backLink.appendChild(
      createElement(ArrowLeft, { class: "nav-icon", "aria-hidden": "true" }),
    );
    const backLabel = document.createElement("span");
    backLabel.textContent = "Back to Portfolio";
    backLink.appendChild(backLabel);
    topGroup.appendChild(backLink);

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
        <div class="sidebar-user-meta">${escapeHtml(options.user.role === "admin" ? "Administrator View" : "Member Portal View")}</div>
      </div>
    `;

    const logoutBtn = document.createElement("button");
    logoutBtn.type = "button";
    logoutBtn.className = "btn btn-ghost btn-sm";
    logoutBtn.appendChild(
      createElement(LogOut, { class: "nav-icon", "aria-hidden": "true" }),
    );
    const btnText = document.createElement("span");
    btnText.textContent = "Account Sign In";
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

    const roleSwitcher = document.createElement("div");
    roleSwitcher.className = "role-switcher-group";
    roleSwitcher.setAttribute("role", "group");
    roleSwitcher.setAttribute("aria-label", "Switch portal view");

    const adminSwitchBtn = document.createElement("button");
    adminSwitchBtn.type = "button";
    adminSwitchBtn.className = `role-switch-btn${options.user.role === "admin" ? " active" : ""}`;
    adminSwitchBtn.appendChild(
      createElement(Shield, { class: "nav-icon", "aria-hidden": "true" }),
    );
    adminSwitchBtn.appendChild(document.createTextNode("Admin View"));
    adminSwitchBtn.addEventListener("click", () => {
      if (options.user.role !== "admin") {
        void switchViewMode("admin");
      }
    });

    const memberSwitchBtn = document.createElement("button");
    memberSwitchBtn.type = "button";
    memberSwitchBtn.className = `role-switch-btn${options.user.role === "member" ? " active" : ""}`;
    memberSwitchBtn.appendChild(
      createElement(User, { class: "nav-icon", "aria-hidden": "true" }),
    );
    memberSwitchBtn.appendChild(document.createTextNode("Member View"));
    memberSwitchBtn.addEventListener("click", () => {
      if (options.user.role !== "member") {
        void switchViewMode("member");
      }
    });

    roleSwitcher.appendChild(adminSwitchBtn);
    roleSwitcher.appendChild(memberSwitchBtn);

    const topPortfolioBtn = document.createElement("a");
    topPortfolioBtn.href = PORTFOLIO_URL;
    topPortfolioBtn.className = "topbar-portfolio-btn";
    topPortfolioBtn.appendChild(
      createElement(ArrowLeft, { class: "nav-icon", "aria-hidden": "true" }),
    );
    topPortfolioBtn.appendChild(document.createTextNode("Portfolio"));

    topbarLeft.appendChild(menuBtn);
    topbarLeft.appendChild(titleEl);
    topbarLeft.appendChild(roleSwitcher);
    topbarLeft.appendChild(topPortfolioBtn);
  }

  realtimeClient.connect();
}
