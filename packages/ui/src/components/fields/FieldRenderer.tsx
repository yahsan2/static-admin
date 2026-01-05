import React from 'react';
import type { Field } from '../../types';
import { TextField } from './TextField';
import { SlugField } from './SlugField';
import { TextareaField } from './TextareaField';
import { DateField } from './DateField';
import { DatetimeField } from './DatetimeField';
import { CheckboxField } from './CheckboxField';
import { SelectField } from './SelectField';
import { RelationField } from './RelationField';
import { ImageField } from './ImageField';
import { ArrayField } from './ArrayField';

export interface FieldRendererProps {
  field: Field;
  value: unknown;
  onChange: (value: unknown) => void;
  collectionName: string;
  slug: string;
  error?: string;
  className?: string;
}

interface FieldComponentProps {
  field: Field;
  value: unknown;
  onChange: (value: unknown) => void;
  collectionName?: string;
  slug?: string;
  error?: string;
  className?: string;
}

type FieldComponent = React.ComponentType<FieldComponentProps>;

interface FieldConfig {
  component: FieldComponent;
  getDefaultValue: (field: Field) => unknown;
  needsCollectionContext?: boolean;
}

/**
 * Field Registry - Maps field types to their configurations
 * This pattern allows for easy extensibility and cleaner code
 */
const fieldRegistry: Record<string, FieldConfig> = {
  text: {
    component: TextField as FieldComponent,
    getDefaultValue: () => '',
  },
  slug: {
    component: SlugField as FieldComponent,
    getDefaultValue: () => '',
  },
  textarea: {
    component: TextareaField as FieldComponent,
    getDefaultValue: () => '',
  },
  date: {
    component: DateField as FieldComponent,
    getDefaultValue: () => '',
  },
  datetime: {
    component: DatetimeField as FieldComponent,
    getDefaultValue: () => '',
  },
  checkbox: {
    component: CheckboxField as FieldComponent,
    getDefaultValue: () => false,
  },
  select: {
    component: SelectField as FieldComponent,
    getDefaultValue: (field) => ('multiple' in field && field.multiple ? [] : ''),
  },
  relation: {
    component: RelationField as FieldComponent,
    getDefaultValue: (field) => ('multiple' in field && field.multiple ? [] : ''),
  },
  image: {
    component: ImageField as FieldComponent,
    getDefaultValue: () => null,
    needsCollectionContext: true,
  },
  array: {
    component: ArrayField as FieldComponent,
    getDefaultValue: () => [],
    needsCollectionContext: true,
  },
  markdoc: {
    // TipTap editor - uses TextareaField as fallback
    component: TextareaField as FieldComponent,
    getDefaultValue: () => '',
  },
};

/**
 * Get default value for a field type
 */
export function getFieldDefaultValue(field: Field): unknown {
  const config = fieldRegistry[field.type];
  if (config) {
    return config.getDefaultValue(field);
  }
  return '';
}

export function FieldRenderer({
  field,
  value,
  onChange,
  collectionName,
  slug,
  error,
  className,
}: FieldRendererProps) {
  const config = fieldRegistry[field.type];

  if (!config) {
    return (
      <div className="text-error">Unknown field type: {field.type}</div>
    );
  }

  const Component = config.component;

  // Handle markdoc field type transformation
  const fieldToPass = field.type === 'markdoc' ? { ...field, type: 'textarea' as const } : field;

  // Get appropriate default value
  const defaultValue = config.getDefaultValue(field);
  const valueToPass = value ?? defaultValue;

  // Build props based on whether collection context is needed
  const props: FieldComponentProps = {
    field: fieldToPass,
    value: valueToPass,
    onChange,
    error,
    className,
  };

  if (config.needsCollectionContext) {
    props.collectionName = collectionName;
    props.slug = slug;
  }

  return <Component {...props} />;
}
