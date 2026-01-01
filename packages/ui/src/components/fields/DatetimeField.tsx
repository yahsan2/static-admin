import React from 'react';
import type { DatetimeField as DatetimeFieldType } from '../../types';
import { cn } from '../../lib/utils';

export interface DatetimeFieldProps {
  field: DatetimeFieldType;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  className?: string;
}

// Convert date-only value (YYYY-MM-DD) to datetime format (YYYY-MM-DDTHH:MM)
function normalizeToDatetime(value: string): string {
  if (!value) return '';
  // If value is date-only format (YYYY-MM-DD), append T00:00
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return `${value}T00:00`;
  }
  return value;
}

export function DatetimeField({
  field,
  value,
  onChange,
  error,
  className,
}: DatetimeFieldProps) {
  const normalizedValue = normalizeToDatetime(value);

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
        type="datetime-local"
        value={normalizedValue}
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
