import React from 'react';
import { cn } from '../../lib/utils';

export interface MenuProps extends React.HTMLAttributes<HTMLUListElement> {
  size?: 'xs' | 'sm' | 'md' | 'lg';
  horizontal?: boolean;
}

export function Menu({ className, size, horizontal, children, ...props }: MenuProps) {
  return (
    <ul
      className={cn(
        'menu',
        size && `menu-${size}`,
        horizontal && 'menu-horizontal',
        className
      )}
      {...props}
    >
      {children}
    </ul>
  );
}

export interface MenuItemProps extends React.LiHTMLAttributes<HTMLLIElement> {
  disabled?: boolean;
}

export function MenuItem({ className, disabled, children, ...props }: MenuItemProps) {
  return (
    <li className={cn(disabled && 'disabled', className)} {...props}>
      {children}
    </li>
  );
}

export interface MenuTitleProps extends React.LiHTMLAttributes<HTMLLIElement> {}

export function MenuTitle({ className, children, ...props }: MenuTitleProps) {
  return (
    <li className={cn('menu-title', className)} {...props}>
      {children}
    </li>
  );
}
