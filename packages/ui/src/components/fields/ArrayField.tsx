import React from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import type { ArrayField as ArrayFieldType, Field } from '@static-admin/core';
import { FieldRenderer } from './FieldRenderer';
import { cn } from '../../lib/utils';

export interface ArrayFieldProps {
  field: ArrayFieldType;
  value: unknown[];
  onChange: (value: unknown[]) => void;
  collectionName: string;
  slug: string;
  error?: string;
  className?: string;
}

export function ArrayField({
  field,
  value,
  onChange,
  collectionName,
  slug,
  error,
  className,
}: ArrayFieldProps) {
  const items = value || [];

  const addItem = () => {
    if (field.maxItems && items.length >= field.maxItems) return;
    onChange([...items, getDefaultValue(field.itemField)]);
  };

  const removeItem = (index: number) => {
    if (field.minItems && items.length <= field.minItems) return;
    onChange(items.filter((_, i) => i !== index));
  };

  const updateItem = (index: number, newValue: unknown) => {
    const newItems = [...items];
    newItems[index] = newValue;
    onChange(newItems);
  };

  return (
    <div className={cn('space-y-2', className)}>
      <label className="block text-sm font-medium text-gray-700">
        {field.label}
        {field.required && <span className="text-red-500 ml-1">*</span>}
      </label>
      {field.description && (
        <p className="text-sm text-gray-500">{field.description}</p>
      )}

      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex items-start gap-2 p-3 bg-gray-50 rounded-md"
          >
            <GripVertical className="w-4 h-4 text-gray-400 mt-2 cursor-move" />
            <div className="flex-1">
              <FieldRenderer
                field={field.itemField}
                value={item}
                onChange={(newValue) => updateItem(index, newValue)}
                collectionName={collectionName}
                slug={slug}
              />
            </div>
            <button
              type="button"
              onClick={() => removeItem(index)}
              disabled={field.minItems ? items.length <= field.minItems : false}
              className="p-1 text-gray-400 hover:text-red-500 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addItem}
        disabled={field.maxItems ? items.length >= field.maxItems : false}
        className={cn(
          'flex items-center gap-1 px-3 py-1.5 text-sm',
          'border border-dashed border-gray-300 rounded-md',
          'text-gray-600 hover:border-gray-400 hover:text-gray-700',
          'disabled:opacity-50 disabled:cursor-not-allowed'
        )}
      >
        <Plus className="w-4 h-4" />
        Add item
      </button>

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

function getDefaultValue(field: Field): unknown {
  switch (field.type) {
    case 'text':
    case 'slug':
    case 'textarea':
    case 'markdoc':
      return '';
    case 'date':
      return '';
    case 'checkbox':
      return false;
    case 'select':
      return field.multiple ? [] : '';
    case 'relation':
      return field.multiple ? [] : '';
    case 'image':
      return null;
    case 'array':
      return [];
    default:
      return '';
  }
}
