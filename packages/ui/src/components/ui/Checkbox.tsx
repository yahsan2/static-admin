import React from 'react';
import { cn } from '../../lib/utils';

export interface CheckboxProps extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'size'> {
  variant?: 'primary' | 'secondary' | 'accent' | 'success' | 'warning' | 'info' | 'error';
  inputSize?: 'xs' | 'sm' | 'md' | 'lg';
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, variant, inputSize, ...props }, ref) => {
    return (
      <input
        ref={ref}
        type="checkbox"
        className={cn(
          'checkbox',
          variant && `checkbox-${variant}`,
          inputSize && `checkbox-${inputSize}`,
          className
        )}
        {...props}
      />
    );
  }
);

Checkbox.displayName = 'Checkbox';
