import React from 'react';
import type { SlugField as SlugFieldType } from '@static-admin/core';
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
    <div className={cn('space-y-1', className)}>
      <label className="block text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.description && (
        <p className="text-sm text-gray-500">{field.description}</p>
      )}
      <div className="flex items-center gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            'block w-full rounded-md border-gray-300 shadow-sm',
            'focus:border-blue-500 focus:ring-blue-500 sm:text-sm',
            'px-3 py-2 border font-mono',
            error && 'border-red-500'
          )}
          pattern="^[a-z0-9]+(?:-[a-z0-9]+)*$"
        />
      </div>
      <p className="text-xs text-gray-400">
        Auto-generated from {field.from}. Lowercase letters, numbers, and hyphens only.
      </p>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
