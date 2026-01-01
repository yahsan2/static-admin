import React from 'react';
import type { SlugField as SlugFieldType } from '../../types';
import { cn } from '../../lib/utils';

export interface SlugFieldProps {
  field: SlugFieldType;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  className?: string;
}

export function SlugField({
  field,
  value,
  onChange,
  error,
  className,
}: SlugFieldProps) {
  return (
    <fieldset className={cn('fieldset', className)}>
      <legend className="fieldset-legend">
        {field.label}
        {field.required && <span className="text-error ml-1">*</span>}
      </legend>
      {field.description && (
        <p className="text-sm text-base-content/70 mb-1">{field.description}</p>
      )}
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'input input-bordered w-full font-mono',
          error && 'input-error'
        )}
        pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
      />
      <p className="text-xs text-base-content/50 mt-1">
        Auto-generated from {field.from}. Lowercase letters, numbers, and hyphens only.
      </p>
      {error && <p className="text-sm text-error mt-1">{error}</p>}
    </fieldset>
  );
}
