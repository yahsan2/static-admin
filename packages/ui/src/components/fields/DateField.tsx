import React from 'react';
import type { DateField as DateFieldType } from '../../types';
import { cn } from '../../lib/utils';

export interface DateFieldProps {
  field: DateFieldType;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  className?: string;
}

export function DateField({
  field,
  value,
  onChange,
  error,
  className,
}: DateFieldProps) {
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
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'input input-bordered w-full',
          error && 'input-error'
        )}
      />
      {error && <p className="text-sm text-error mt-1">{error}</p>}
    </fieldset>
  );
}
