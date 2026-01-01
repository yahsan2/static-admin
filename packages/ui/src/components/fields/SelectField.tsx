import React from 'react';
import type { SelectField as SelectFieldType } from '../../types';
import { cn } from '../../lib/utils';

export interface SelectFieldProps {
  field: SelectFieldType;
  value: string | string[];
  onChange: (value: string | string[]) => void;
  error?: string;
  className?: string;
}

export function SelectField({
  field,
  value,
  onChange,
  error,
  className,
}: SelectFieldProps) {
  const handleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (field.multiple) {
      const selected = Array.from(e.target.selectedOptions, (opt) => opt.value);
      onChange(selected);
    } else {
      onChange(e.target.value);
    }
  };

  return (
    <fieldset className={cn('fieldset', className)}>
      <legend className="fieldset-legend">
        {field.label}
        {field.required && <span className="text-error ml-1">*</span>}
      </legend>
      {field.description && (
        <p className="text-sm text-base-content/70 mb-1">{field.description}</p>
      )}
      <select
        value={field.multiple ? (value as string[]) : (value as string)}
        onChange={handleChange}
        multiple={field.multiple}
        className={cn(
          'select select-bordered w-full',
          field.multiple && 'min-h-[120px]',
          error && 'select-error'
        )}
      >
        {!field.multiple && !field.required && (
          <option value="">Select...</option>
        )}
        {field.options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && <p className="text-sm text-error mt-1">{error}</p>}
    </fieldset>
  );
}
