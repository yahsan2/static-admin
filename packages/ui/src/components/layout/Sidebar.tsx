import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileText, LogOut, ExternalLink, Users, LayoutDashboard } from 'lucide-react';
import { useConfig } from '../../hooks/useConfig';
import { useAdmin } from '../../context/AdminContext';
import { cn } from '../../lib/utils';

export interface SidebarProps {
  className?: string;
}

export function Sidebar({ className }: SidebarProps) {
  const { collections } = useConfig();
  const { user, logout, config } = useAdmin();
  const location = useLocation();

  const isActive = (path: string) => location.pathname.startsWith(path);

  return (
    <aside
      className={cn(
        'flex flex-col w-64 min-h-full border-r border-base-200 bg-base-100',
        className
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-br from-violet-500 to-purple-600 rounded flex items-center justify-center">
            <span className="text-white text-xs font-bold">S</span>
          </div>
          <span className="font-semibold">Static Admin</span>
        </div>
        {config.publicSiteUrl && (
          <a
            href={config.publicSiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="btn btn-ghost btn-sm btn-square"
            title="View published site"
          >
            <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>

      {/* Dashboard link */}
      <nav className="flex-1 overflow-y-auto px-2 py-4">
        <ul className="menu menu-sm w-full">
          <li>
            <Link
              to="/"
              className={location.pathname === '/' ? 'active' : ''}
            >
              <LayoutDashboard className="w-4 h-4" />
              Dashboard
            </Link>
          </li>
        </ul>

        {/* Collections */}
        <ul className="menu menu-sm w-full mt-4">
          <li className="menu-title">Collections</li>
          {collections.map((col) => (
            <li key={col.name}>
              <Link
                to={`/collections/${col.name}`}
                className={isActive(`/collections/${col.name}`) ? 'active' : ''}
              >
                <FileText className="w-4 h-4" />
                {col.label}
              </Link>
            </li>
          ))}
        </ul>

        {/* Settings - Only show for admin users */}
        {config.auth && user?.role === 'admin' && (
          <ul className="menu menu-sm w-full mt-4">
            <li className="menu-title">Settings</li>
            <li>
              <Link
                to="/users"
                className={isActive('/users') ? 'active' : ''}
              >
                <Users className="w-4 h-4" />
                Users
              </Link>
            </li>
          </ul>
        )}
      </nav>

      {/* User section */}
      {config.auth && user && (
        <div className="px-3 py-4 border-t border-base-300">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <p className="font-medium">{user.name || user.email}</p>
              <p className="text-base-content/50 text-xs">{user.email}</p>
            </div>
            <button
              onClick={logout}
              className="btn btn-ghost btn-sm btn-square"
              title="Logout"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
