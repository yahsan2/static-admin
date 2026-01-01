import React from 'react';
import { cn } from '../../lib/utils';

export interface BreadcrumbsProps extends React.HTMLAttributes<HTMLDivElement> {}

export function Breadcrumbs({ className, children, ...props }: BreadcrumbsProps) {
  return (
    <div className={cn('breadcrumbs text-sm', className)} {...props}>
      <ul>{children}</ul>
    </div>
  );
}

export interface BreadcrumbItemProps extends React.LiHTMLAttributes<HTMLLIElement> {}

export function BreadcrumbItem({ className, children, ...props }: BreadcrumbItemProps) {
  return (
    <li className={cn(className)} {...props}>
      {children}
    </li>
  );
}
