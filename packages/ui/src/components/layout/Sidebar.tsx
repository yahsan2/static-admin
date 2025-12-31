import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileText, Settings, LogOut, Sun } from 'lucide-react';
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
        'flex flex-col w-56 border-r border-gray-200 bg-white',
        className
      )}
    >
      {/* Logo */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-gradient-to-br from-violet-500 to-purple-600 rounded flex items-center justify-center">
            <span className="text-white text-xs font-bold">S</span>
          </div>
          <span className="font-semibold text-gray-900">Static Admin</span>
        </div>
        <button className="p-1.5 text-gray-400 hover:text-gray-600 rounded-md hover:bg-gray-100">
          <Sun className="w-4 h-4" />
        </button>
      </div>

      {/* Dashboard link */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <Link
          to="/"
          className={cn(
            'flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors mb-4',
            location.pathname === '/'
              ? 'text-gray-900 bg-gray-100'
              : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
          )}
        >
          Dashboard
        </Link>

        {/* Collections */}
        <div className="space-y-1">
          <p className="px-3 text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Collections
          </p>
          {collections.map((col) => (
            <Link
              key={col.name}
              to={`/collections/${col.name}`}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                isActive(`/collections/${col.name}`)
                  ? 'bg-blue-50 text-blue-700 border-l-2 border-blue-600 -ml-0.5 pl-[calc(0.75rem+2px)]'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
              )}
            >
              <FileText className="w-4 h-4" />
              {col.label}
            </Link>
          ))}
        </div>
      </nav>

      {/* User section */}
      {config.auth && user && (
        <div className="px-3 py-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <p className="font-medium text-gray-900">{user.name || user.email}</p>
              <p className="text-gray-500 text-xs">{user.email}</p>
            </div>
            <button
              onClick={logout}
              className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
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
