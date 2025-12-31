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
    <div className={cn('space-y-1', className)}>
      <label className="block text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.description && (
        <p className="text-sm text-gray-500">{field.description}</p>
      )}
      <input
        type="date"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={cn(
          'block w-full rounded-md border-gray-300 shadow-sm',
          'focus:border-blue-500 focus:ring-blue-500 sm:text-sm',
          'px-3 py-2 border',
          error && 'border-red-500'
        )}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
