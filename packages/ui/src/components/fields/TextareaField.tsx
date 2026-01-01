import React from 'react';
import type { TextareaField as TextareaFieldType } from '../../types';
import { cn } from '../../lib/utils';

export interface TextareaFieldProps {
  field: TextareaFieldType;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  className?: string;
}

export function TextareaField({
  field,
  value,
  onChange,
  error,
  className,
}: TextareaFieldProps) {
  return (
    <fieldset className={cn('fieldset', className)}>
      <legend className="fieldset-legend">
        {field.label}
        {field.required && <span className="text-error ml-1">*</span>}
      </legend>
      {field.description && (
        <p className="text-sm text-base-content/70 mb-1">{field.description}</p>
      )}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className={cn(
          'textarea textarea-bordered w-full resize-y',
          error && 'textarea-error'
        )}
        maxLength={field.validation?.maxLength}
        minLength={field.validation?.minLength}
      />
      {error && <p className="text-sm text-error mt-1">{error}</p>}
    </fieldset>
  );
}
