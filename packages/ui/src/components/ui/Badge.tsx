import React from 'react';
import { cn } from '../../lib/utils';

export interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'info' | 'success' | 'warning' | 'error';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  outline?: boolean;
}

export function Badge({ className, variant, size, outline, children, ...props }: BadgeProps) {
  return (
    <span
      className={cn(
        'badge',
        variant && `badge-${variant}`,
        size && `badge-${size}`,
        outline && 'badge-outline',
        className
      )}
      {...props}
    >
      {children}
    </span>
  );
}
