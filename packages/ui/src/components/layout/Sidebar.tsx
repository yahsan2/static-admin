import React from 'react';
import { useLocation } from 'react-router-dom';
import { FileText, LogOut, ExternalLink, Users, LayoutDashboard } from 'lucide-react';
import { useConfig } from '../../hooks/useConfig';
import { useAdmin } from '../../context/AdminContext';
import { cn } from '../../lib/utils';
import { Menu, MenuTitle, MenuLink } from '../ui/Menu';

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
        <Menu size="sm" className="w-full">
          <MenuLink
            to="/"
            icon={<LayoutDashboard className="w-4 h-4" />}
            active={location.pathname === '/'}
          >
            Dashboard
          </MenuLink>
        </Menu>

        {/* Collections */}
        <Menu size="sm" className="w-full mt-4">
          <MenuTitle>Collections</MenuTitle>
          {collections.map((col) => (
            <MenuLink
              key={col.name}
              to={`/collections/${col.name}`}
              icon={<FileText className="w-4 h-4" />}
              active={isActive(`/collections/${col.name}`)}
            >
              {col.label}
            </MenuLink>
          ))}
        </Menu>

        {/* Settings - Only show for admin users */}
        {config.auth && user?.role === 'admin' && (
          <Menu size="sm" className="w-full mt-4">
            <MenuTitle>Settings</MenuTitle>
            <MenuLink
              to="/users"
              icon={<Users className="w-4 h-4" />}
              active={isActive('/users')}
            >
              Users
            </MenuLink>
          </Menu>
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
