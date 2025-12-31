import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { FileText, Settings, LogOut } from 'lucide-react';
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
        'flex flex-col w-64 bg-gray-900 text-white h-screen',
        className
      )}
    >
      {/* Logo */}
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-xl font-bold">Static Admin</h1>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto p-4">
        <div className="space-y-1">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">
            Collections
          </p>
          {collections.map((col) => (
            <Link
              key={col.name}
              to={`/collections/${col.name}`}
              className={cn(
                'flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors',
                isActive(`/collections/${col.name}`)
                  ? 'bg-gray-800 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
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
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <p className="font-medium">{user.name || user.email}</p>
              <p className="text-gray-400 text-xs">{user.email}</p>
            </div>
            <button
              onClick={logout}
              className="p-2 text-gray-400 hover:text-white transition-colors"
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
