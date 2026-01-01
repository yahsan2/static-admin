import React from 'react';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import type { ArrayField as ArrayFieldType, Field } from '../../types';
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
    <fieldset className={cn('fieldset', className)}>
      <legend className="fieldset-legend">
        {field.label}
        {field.required && <span className="text-error ml-1">*</span>}
      </legend>
      {field.description && (
        <p className="text-sm text-base-content/70 mb-1">{field.description}</p>
      )}

      <div className="space-y-2">
        {items.map((item, index) => (
          <div
            key={index}
            className="flex items-start gap-2 p-3 bg-base-300 rounded-lg"
          >
            <GripVertical className="w-4 h-4 text-base-content/50 mt-2 cursor-move" />
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
              className="btn btn-ghost btn-sm btn-square text-base-content/50 hover:text-error"
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
        className="btn btn-outline btn-sm gap-1"
      >
        <Plus className="w-4 h-4" />
        Add item
      </button>

      {error && <p className="text-sm text-error mt-1">{error}</p>}
    </fieldset>
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
