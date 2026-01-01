import React from 'react';
import { Link } from 'react-router-dom';
import { ChevronRight } from 'lucide-react';
import { cn } from '../../lib/utils';

export interface BreadcrumbItem {
  label: string;
  href?: string;
}

export interface HeaderProps {
  title: string;
  breadcrumbs?: BreadcrumbItem[];
  actions?: React.ReactNode;
  className?: string;
}

export function Header({ title, breadcrumbs, actions, className }: HeaderProps) {
  return (
    <header className={cn('bg-base-100 border-b border-base-300 px-6 py-3', className)}>
      {/* Title and Breadcrumbs */}
      <div className="flex items-center justify-between">
        {breadcrumbs && breadcrumbs.length > 0 && (
          <div className="breadcrumbs text-sm">
            <ul>
              {breadcrumbs.map((item, index) => (
                <li key={index}>
                  {item.href ? (
                    <Link to={item.href}>{item.label}</Link>
                  ) : (
                    <span className="font-bold">{item.label}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
        {actions && <div className="flex items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}
