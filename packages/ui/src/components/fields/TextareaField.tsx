import React from 'react';
import type { TextareaField as TextareaFieldType } from '@static-admin/core';
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
    <div className={cn('space-y-1', className)}>
      <label className="block text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.description && (
        <p className="text-sm text-gray-500">{field.description}</p>
      )}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        rows={4}
        className={cn(
          'block w-full rounded-md border-gray-300 shadow-sm',
          'focus:border-blue-500 focus:ring-blue-500 sm:text-sm',
          'px-3 py-2 border resize-y',
          error && 'border-red-500'
        )}
        maxLength={field.validation?.maxLength}
        minLength={field.validation?.minLength}
      />
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
