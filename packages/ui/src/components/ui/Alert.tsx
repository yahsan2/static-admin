import React from 'react';
import { cn } from '../../lib/utils';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'error';
}

export function Alert({ className, variant, children, ...props }: AlertProps) {
  return (
    <div
      role="alert"
      className={cn('alert', variant && `alert-${variant}`, className)}
      {...props}
    >
      {children}
    </div>
  );
}
