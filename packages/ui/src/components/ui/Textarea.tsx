import React from 'react';
import { cn } from '../../lib/utils';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  error?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, error, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        className={cn(
          'textarea textarea-bordered w-full',
          error && 'textarea-error',
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = 'Textarea';
