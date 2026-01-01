import React from 'react';
import type { TextField as TextFieldType } from '../../types';
import { cn } from '../../lib/utils';

export interface TextFieldProps {
  field: TextFieldType;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  className?: string;
}

export function TextField({
  field,
  value,
  onChange,
  error,
  className,
}: TextFieldProps) {
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
          'input input-bordered w-full',
          error && 'input-error'
        )}
        maxLength={field.validation?.maxLength}
        minLength={field.validation?.minLength}
      />
      {error && <p className="text-sm text-error mt-1">{error}</p>}
    </fieldset>
  );
}
