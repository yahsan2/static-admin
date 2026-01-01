import React from 'react';
import { Outlet } from 'react-router-dom';
import { Menu } from 'lucide-react';
import { Sidebar } from './Sidebar';
import { cn } from '../../lib/utils';

export interface AdminLayoutProps {
  children?: React.ReactNode;
  className?: string;
}

export function AdminLayout({ children, className }: AdminLayoutProps) {
  return (
    <div className={cn('drawer lg:drawer-open', className)}>
      <input id="admin-drawer" type="checkbox" className="drawer-toggle" />

      {/* Main content */}
      <div className="drawer-content flex flex-col bg-base-100">
        {/* Mobile header with menu button */}
        <header className="sticky top-0 z-10 flex items-center gap-2 px-4 py-2 bg-base-100 border-b border-base-300 lg:hidden">
          <label
            htmlFor="admin-drawer"
            className="btn btn-ghost btn-sm btn-square"
            aria-label="Open menu"
          >
            <Menu className="w-5 h-5" />
          </label>
          <span className="font-semibold">Static Admin</span>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-y-auto">
          {children || <Outlet />}
        </main>
      </div>

      {/* Sidebar */}
      <div className="drawer-side z-20">
        <label
          htmlFor="admin-drawer"
          aria-label="Close menu"
          className="drawer-overlay"
        />
        <Sidebar />
      </div>
    </div>
  );
}
