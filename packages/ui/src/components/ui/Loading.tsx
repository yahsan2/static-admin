import React from 'react';
import { cn } from '../../lib/utils';

export interface LoadingProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'spinner' | 'dots' | 'ring' | 'ball' | 'bars' | 'infinity';
  size?: 'xs' | 'sm' | 'md' | 'lg';
}

export function Loading({ className, variant = 'spinner', size, ...props }: LoadingProps) {
  return (
    <span
      className={cn(
        'loading',
        `loading-${variant}`,
        size && `loading-${size}`,
        className
      )}
      {...props}
    />
  );
}
