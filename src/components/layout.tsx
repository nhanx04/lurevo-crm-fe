import { ReactNode, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  HiOutlineArrowRightOnRectangle,
  HiOutlineBars3,
  HiOutlineCog6Tooth,
  HiOutlineFolder,
  HiOutlineRectangleStack,
  HiOutlineSquares2X2,
  HiOutlineTag,
  HiOutlineUsers,
  HiOutlineXMark,
} from 'react-icons/hi2';
import clsx from 'clsx';
import { useAuth } from '@/features/auth/AuthProvider';
import { initials } from '@/utils/format';
import { Badge, Button } from './ui';

const navItems = [
  { to: '/app/dashboard', label: 'Dashboard', icon: HiOutlineSquares2X2 },
  { to: '/app/listings', label: 'Listings', icon: HiOutlineRectangleStack },
  { to: '/app/categories', label: 'Categories', icon: HiOutlineFolder },
  { to: '/app/listing-statuses', label: 'Listing Statuses', icon: HiOutlineTag },
  { to: '/app/collaborators', label: 'Collaborators', icon: HiOutlineUsers, ownerOnly: true },
  { to: '/app/account', label: 'Account Settings', icon: HiOutlineCog6Tooth },
];

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, isOwner, logout } = useAuth();
  const visible = navItems.filter((item) => !item.ownerOnly || isOwner);
  return (
    <div className="flex h-full flex-col bg-slate-950 text-white">
      <div className="px-5 py-5">
        <div className="text-xl font-bold">Lurevo</div>
        <div className="mt-1 text-xs text-slate-400">Listing management</div>
      </div>
      <nav className="flex-1 space-y-1 px-3">
        {visible.map((item) => {
          const Icon = item.icon;
          return (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onNavigate}
              className={({ isActive }) =>
                clsx(
                  'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition',
                  isActive ? 'bg-white text-slate-950' : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                )
              }
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </NavLink>
          );
        })}
      </nav>
      <div className="border-t border-slate-800 p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-md bg-slate-800 text-sm font-semibold">{initials(user?.full_name || user?.email || 'U')}</div>
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">{user?.full_name || 'User'}</p>
            <p className="truncate text-xs text-slate-400">{user?.email}</p>
          </div>
        </div>
        <div className="mt-3 flex items-center justify-between">
          <Badge tone={isOwner ? 'primary' : 'neutral'}>{user?.role}</Badge>
          <button className="rounded-md p-2 text-slate-300 hover:bg-slate-800 hover:text-white" aria-label="Log out" onClick={() => void logout()}>
            <HiOutlineArrowRightOnRectangle className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}

function Breadcrumbs() {
  const location = useLocation();
  const parts = location.pathname
    .replace('/app', '')
    .split('/')
    .filter(Boolean);
  return (
    <div className="text-xs font-medium text-muted">
      App {parts.map((part) => ` / ${part.replace(/-/g, ' ')}`).join('')}
    </div>
  );
}

export function AppShell() {
  const [open, setOpen] = useState(false);
  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[280px_1fr]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[280px] lg:block">
        <SidebarContent />
      </aside>
      {open ? (
        <div className="fixed inset-0 z-40 lg:hidden">
          <button className="absolute inset-0 bg-slate-950/50" aria-label="Close navigation" onClick={() => setOpen(false)} />
          <div className="relative h-full w-[280px]">
            <SidebarContent onNavigate={() => setOpen(false)} />
          </div>
        </div>
      ) : null}
      <main className="min-w-0 lg:col-start-2">
        <header className="sticky top-0 z-20 border-b border-border bg-background/95 px-4 py-3 backdrop-blur sm:px-6">
          <div className="flex items-center gap-3">
            <Button variant="secondary" className="px-3 lg:hidden" aria-label="Open navigation" onClick={() => setOpen(true)}>
              <HiOutlineBars3 className="h-5 w-5" />
            </Button>
            <div className="min-w-0">
              <Breadcrumbs />
            </div>
          </div>
        </header>
        <div className="mx-auto w-full max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <Outlet />
        </div>
      </main>
    </div>
  );
}

export function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-slate-950/40 p-4" role="dialog" aria-modal="true">
      <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg border border-border bg-surface shadow-soft">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-lg font-semibold">{title}</h2>
          <button aria-label="Close dialog" className="rounded-md p-2 hover:bg-slate-100" onClick={onClose}>
            <HiOutlineXMark className="h-5 w-5" />
          </button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}
