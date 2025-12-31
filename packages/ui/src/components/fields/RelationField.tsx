import React, { useState, useEffect } from 'react';
import type { RelationField as RelationFieldType } from '../../types';
import { useAdmin } from '../../context/AdminContext';
import { cn } from '../../lib/utils';

export interface RelationFieldProps {
  field: RelationFieldType;
  value: string | string[];
  onChange: (value: string | string[]) => void;
  error?: string;
  className?: string;
}

interface RelationOption {
  slug: string;
  label: string;
}

export function RelationField({
  field,
  value,
  onChange,
  error,
  className,
}: RelationFieldProps) {
  const { fetchApi } = useAdmin();
  const [options, setOptions] = useState<RelationOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRelations = async () => {
      setIsLoading(true);
      const result = await fetchApi<{
        items: Array<{ slug: string; data: { fields: Record<string, unknown> } }>;
      }>(`/entries/${field.collection}?limit=100`);

      if (result.success && result.data) {
        const displayField = field.displayField || 'title';
        setOptions(
          result.data.items.map((item) => ({
            slug: item.slug,
            label: String(item.data.fields[displayField] || item.slug),
          }))
        );
      }
      setIsLoading(false);
    };

    fetchRelations();
  }, [fetchApi, field.collection, field.displayField]);

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
        disabled={isLoading}
        className={cn(
          'block w-full rounded-md border-gray-300 shadow-sm',
          'focus:border-blue-500 focus:ring-blue-500 sm:text-sm',
          'px-3 py-2 border',
          field.multiple && 'min-h-[120px]',
          isLoading && 'opacity-50',
          error && 'border-red-500'
        )}
      >
        {!field.multiple && !field.required && (
          <option value="">Select...</option>
        )}
        {options.map((option) => (
          <option key={option.slug} value={option.slug}>
            {option.label}
          </option>
        ))}
      </select>
      <p className="text-xs text-gray-400">
        References: {field.collection}
      </p>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}
