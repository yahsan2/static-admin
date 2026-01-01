import React from 'react';
import type { CheckboxField as CheckboxFieldType } from '../../types';
import { cn } from '../../lib/utils';

export interface CheckboxFieldProps {
  field: CheckboxFieldType;
  value: boolean;
  onChange: (value: boolean) => void;
  error?: string;
  className?: string;
}

export function CheckboxField({
  field,
  value,
  onChange,
  error,
  className,
}: CheckboxFieldProps) {
  return (
    <fieldset className={cn('fieldset', className)}>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
          className={cn(
            'checkbox checkbox-primary',
            error && 'checkbox-error'
          )}
        />
        <span className="label-text">
          {field.label}
          {field.required && <span className="text-error ml-1">*</span>}
        </span>
      </label>
      {field.description && (
        <p className="text-sm text-base-content/70 ml-6">{field.description}</p>
      )}
      {error && <p className="text-sm text-error mt-1">{error}</p>}
    </fieldset>
  );
}
