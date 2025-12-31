import React from 'react';
import type { SelectField as SelectFieldType } from '@static-admin/core';
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
    <div className={cn('space-y-1', className)}>
      <label className="block text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.description && (
        <p className="text-sm text-gray-500">{field.description}</p>
      )}
      <select
        value={field.multiple ? (value as string[]) : (value as string)}
        onChange={handleChange}
        multiple={field.multiple}
        className={cn(
          'block w-full rounded-md border-gray-300 shadow-sm',
          'focus:border-blue-500 focus:ring-blue-500 sm:text-sm',
          'px-3 py-2 border',
          field.multiple && 'min-h-[120px]',
          error && 'border-red-500'
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
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
