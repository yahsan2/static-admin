import React from 'react';
import type { CheckboxField as CheckboxFieldType } from '@static-admin/core';
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
    <div className={cn('space-y-1', className)}>
      <label className="flex items-center gap-2 cursor-pointer">
        <input
          type="checkbox"
          checked={value}
          onChange={(e) => onChange(e.target.checked)}
          className={cn(
            'rounded border-gray-300 text-blue-600',
            'focus:ring-blue-500 h-4 w-4',
            error && 'border-red-500'
          )}
        />
        <span className="text-sm font-medium text-gray-700">
          {field.label}
          {field.required && <span className="text-red-500 ml-1">*</span>}
        </span>
      </label>
      {field.description && (
        <p className="text-sm text-gray-500 ml-6">{field.description}</p>
      )}
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
