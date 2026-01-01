import React from 'react';
import { cn } from '../../lib/utils';

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'outline' | 'link';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  shape?: 'square' | 'circle';
  loading?: boolean;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, shape, loading, disabled, children, ...props }, ref) => {
    return (
      <button
        ref={ref}
        disabled={disabled || loading}
        className={cn(
          'btn',
          variant && `btn-${variant}`,
          size && `btn-${size}`,
          shape && `btn-${shape}`,
          loading && 'loading',
          className
        )}
        {...props}
      >
        {loading ? <span className="loading loading-spinner loading-xs" /> : children}
      </button>
    );
  }
);

Button.displayName = 'Button';
