import { ReactNode, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Link, NavLink, Outlet, useLocation } from "react-router-dom";
import {
  HiOutlineArrowLeftOnRectangle,
  HiOutlineBars3,
  HiOutlineChartBarSquare,
  HiOutlineChevronDown,
  HiOutlineCog6Tooth,
  HiOutlineFolder,
  HiOutlinePhoto,
  HiOutlineRectangleStack,
  HiOutlineShoppingBag,
  HiOutlineSparkles,
  HiOutlineSquares2X2,
  HiOutlineTag,
  HiOutlineUsers,
  HiOutlineXMark,
} from "react-icons/hi2";
import clsx from "clsx";
import { useAuth } from "@/features/auth/AuthProvider";
import { initials } from "@/utils/format";
import { Badge, Button } from "./ui";

const SIDEBAR_KEY = "lurevo.sidebar.collapsed";
const SIDEBAR_WIDTH = 252;
const SIDEBAR_COLLAPSED_WIDTH = 72;

const routeMeta = [
  { match: /^\/app\/dashboard$/, title: "Dashboard" },
  { match: /^\/app\/analytics$/, title: "Analytics" },
  { match: /^\/app\/orders\/new$/, title: "Create Order" },
  { match: /^\/app\/orders\/[^/]+\/edit$/, title: "Order Details" },
  { match: /^\/app\/orders\/[^/]+$/, title: "Order Details" },
  { match: /^\/app\/orders$/, title: "Orders" },
  { match: /^\/app\/design-library$/, title: "Design Library" },
  { match: /^\/app\/listings\/new$/, title: "Create Listing" },
  { match: /^\/app\/listings\/[^/]+\/edit$/, title: "Edit Listing" },
  { match: /^\/app\/listings\/[^/]+$/, title: "Listing Details" },
  { match: /^\/app\/listings$/, title: "Listings" },
  { match: /^\/app\/categories$/, title: "Categories" },
  { match: /^\/app\/listing-statuses$/, title: "Listing Statuses" },
  { match: /^\/app\/settings\/prompts$/, title: "Prompt Library" },
  { match: /^\/app\/shops$/, title: "Etsy Shops" },
  { match: /^\/app\/collaborators$/, title: "Collaborators" },
  { match: /^\/app\/account\/change-password$/, title: "Change Password" },
  { match: /^\/app\/account$/, title: "Account Settings" },
  { match: /^\/app\/unauthorized$/, title: "Access Denied" },
];

function titleForPath(pathname: string) {
  return routeMeta.find((item) => item.match.test(pathname))?.title || "Lurevo";
}

const navigationGroups = [
  {
    label: "Overview",
    items: [
      { to: "/app/dashboard", label: "Dashboard", icon: HiOutlineSquares2X2 },
      {
        to: "/app/analytics",
        label: "Analytics",
        icon: HiOutlineChartBarSquare,
      },
    ],
  },
  {
    label: "Store",
    items: [
      { to: "/app/listings", label: "Listings", icon: HiOutlineRectangleStack },
      { to: "/app/orders", label: "Orders", icon: HiOutlineShoppingBag },
      { to: "/app/design-library", label: "Design Library", icon: HiOutlinePhoto },
    ],
  },
  {
    label: "Settings",
    items: [
      { to: "/app/categories", label: "Categories", icon: HiOutlineFolder },
      { to: "/app/listing-statuses", label: "Statuses", icon: HiOutlineTag },
      { to: "/app/settings/prompts", label: "Prompt Library", icon: HiOutlineSparkles },
      { to: "/app/shops", label: "Etsy Shops", icon: HiOutlineShoppingBag },
      {
        to: "/app/collaborators",
        label: "Collaborators",
        icon: HiOutlineUsers,
        ownerOnly: true,
      },
    ],
  },
];

function SidebarContent({
  collapsed,
  onToggle,
  onNavigate,
}: {
  collapsed: boolean;
  onToggle: () => void;
  onNavigate?: () => void;
}) {
  const { isOwner } = useAuth();
  return (
    <div className="flex h-full flex-col border-r border-border bg-white">
      <div
        className={clsx(
          "flex h-16 items-center border-b border-border px-4",
          collapsed ? "justify-center" : "justify-between",
        )}
      >
        <Link
          to="/app/dashboard"
          className="flex min-w-0 items-center gap-2"
          onClick={onNavigate}
          aria-label="Lurevo dashboard"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-blue-900 text-sm font-bold text-white">
            L
          </span>
          {!collapsed ? (
            <span className="min-w-0">
              <span className="block text-base font-bold leading-5 text-foreground">
                Lurevo
              </span>
              <span className="block truncate text-[11px] font-medium text-muted">
                Listing management
              </span>
            </span>
          ) : null}
        </Link>
        {!collapsed ? (
          <Button
            variant="icon"
            size="sm"
            aria-label="Collapse sidebar"
            onClick={onToggle}
          >
            <HiOutlineXMark className="h-4 w-4" />
          </Button>
        ) : null}
      </div>
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        {navigationGroups.map((group) => {
          const visible = group.items.filter(
            (item) => !item.ownerOnly || isOwner,
          );
          if (!visible.length) return null;
          return (
            <div key={group.label} className="mb-5">
              {!collapsed ? (
                <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-normal text-muted">
                  {group.label}
                </p>
              ) : null}
              <div className="space-y-1">
                {visible.map((item) => {
                  const Icon = item.icon;
                  return (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      onClick={onNavigate}
                      title={collapsed ? item.label : undefined}
                      className={({ isActive }) =>
                        clsx(
                          "group relative flex h-10 items-center rounded-xl text-sm font-semibold transition duration-200",
                          collapsed ? "justify-center px-0" : "gap-3 px-3",
                          isActive
                            ? "bg-blue-900 text-white shadow-sm"
                            : "text-slate-600 hover:bg-slate-100 hover:text-foreground",
                        )
                      }
                    >
                      <Icon className="h-5 w-5 shrink-0" />
                      {!collapsed ? (
                        <span className="truncate">{item.label}</span>
                      ) : null}
                    </NavLink>
                  );
                })}
              </div>
            </div>
          );
        })}
      </nav>
      <div className="border-t border-border p-3">
        <Button
          variant="ghost"
          className={clsx("w-full", collapsed ? "px-0" : "justify-start")}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={onToggle}
        >
          <HiOutlineBars3 className="h-5 w-5" />
          {!collapsed ? "Collapse" : null}
        </Button>
      </div>
    </div>
  );
}

function AccountMenu() {
  const { user, isOwner, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (ref.current && !ref.current.contains(event.target as Node))
        setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        className="flex items-center gap-2 rounded-full border border-border bg-white py-1 pl-1 pr-2 transition hover:bg-slate-50"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-900 text-xs font-bold text-white">
          {initials(user?.full_name || user?.email || "U")}
        </span>
        <span className="hidden max-w-[160px] truncate text-sm font-semibold text-foreground md:block">
          {user?.full_name || "User"}
        </span>
        <HiOutlineChevronDown className="h-4 w-4 text-muted" />
      </button>
      {open ? (
        <div className="absolute right-0 mt-2 w-[min(280px,calc(100vw-2rem))] origin-top-right rounded-xl border border-border bg-white p-2 shadow-soft animate-in fade-in zoom-in-95">
          <div className="px-3 py-2">
            <p className="truncate text-sm font-semibold text-foreground">
              {user?.full_name || "User"}
            </p>
            <p className="truncate text-xs text-muted">{user?.email}</p>
            <div className="mt-2">
              <Badge tone={isOwner ? "primary" : "neutral"}>{user?.role}</Badge>
            </div>
          </div>
          <div className="my-1 border-t border-border" />
          <Link
            className="flex h-9 items-center gap-2 rounded-lg px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
            to="/app/account"
            onClick={() => setOpen(false)}
          >
            <HiOutlineCog6Tooth className="h-4 w-4" /> View account settings
          </Link>
          <button
            className="flex h-9 w-full items-center gap-2 rounded-lg px-3 text-left text-sm font-medium text-danger hover:bg-red-50"
            onClick={() => void logout()}
          >
            <HiOutlineArrowLeftOnRectangle className="h-4 w-4" /> Log out
          </button>
        </div>
      ) : null}
    </div>
  );
}

export function AppShell() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(
    () => localStorage.getItem(SIDEBAR_KEY) === "true",
  );
  const location = useLocation();
  const pageTitle = titleForPath(location.pathname);

  useEffect(() => {
    localStorage.setItem(SIDEBAR_KEY, String(collapsed));
  }, [collapsed]);

  return (
    <div
      className="min-h-screen bg-background transition-[grid-template-columns] duration-200 lg:grid"
      style={{
        gridTemplateColumns: `var(--sidebar-current-width) minmax(0,1fr)`,
        ["--sidebar-current-width" as string]: `${collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH}px`,
      }}
    >
      <aside
        className="fixed inset-y-0 left-0 z-30 hidden lg:block"
        style={{ width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH }}
      >
        <SidebarContent
          collapsed={collapsed}
          onToggle={() => setCollapsed((value) => !value)}
        />
      </aside>
      {mobileOpen ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button
            className="absolute inset-0 bg-slate-950/45"
            aria-label="Close navigation"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative h-full w-[280px]">
            <SidebarContent
              collapsed={false}
              onToggle={() => setMobileOpen(false)}
              onNavigate={() => setMobileOpen(false)}
            />
          </div>
        </div>
      ) : null}
      <main className="min-w-0 lg:col-start-2">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between gap-3 border-b border-border bg-white/95 px-4 backdrop-blur sm:px-6">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {/* <Button variant="icon" aria-label="Open navigation" onClick={() => setMobileOpen(true)} className="lg:hidden">
              <HiOutlineBars3 className="h-5 w-5" />
            </Button>
            <Button variant="icon" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => setCollapsed((value) => !value)} className="hidden lg:inline-flex">
              <HiOutlineBars3 className="h-5 w-5" />
            </Button> */}
            <h1 className="truncate text-lg font-semibold text-foreground">
              {pageTitle}
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <AccountMenu />
          </div>
        </header>
        <div className="w-full px-4 py-4 sm:px-6 lg:px-7">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export function Modal({
  title,
  children,
  onClose,
  description,
  width = "max-w-2xl",
}: {
  title: string;
  children: ReactNode;
  onClose: () => void;
  description?: string;
  width?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key === "Tab") {
        const focusable = panelRef.current?.querySelectorAll<HTMLElement>(
          'button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])',
        );
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    }
    document.addEventListener("keydown", onKeyDown);
    window.setTimeout(() => panelRef.current?.querySelector<HTMLElement>("[autofocus],button,input,select,textarea")?.focus(), 0);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-3"
      role="dialog"
      aria-modal="true"
    >
      <div
        ref={panelRef}
        className={clsx(
          "flex max-h-[90vh] w-full flex-col overflow-hidden rounded-xl border border-border bg-surface shadow-soft",
          width,
        )}
      >
        <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
          <div>
            <h2 className="text-base font-bold text-foreground">{title}</h2>
            {description ? (
              <p className="mt-1 text-sm text-muted">{description}</p>
            ) : null}
          </div>
          <button
            aria-label="Close dialog"
            className="rounded-full p-2 text-muted hover:bg-slate-100"
            onClick={onClose}
          >
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto p-5">
          {children}
        </div>
      </div>
    </div>,
    document.body,
  );
}
