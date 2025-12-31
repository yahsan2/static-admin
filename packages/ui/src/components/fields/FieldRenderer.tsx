import React from 'react';
import type { Field } from '../../types';
import { TextField } from './TextField';
import { SlugField } from './SlugField';
import { TextareaField } from './TextareaField';
import { DateField } from './DateField';
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

export function FieldRenderer({
  field,
  value,
  onChange,
  collectionName,
  slug,
  error,
  className,
}: FieldRendererProps) {
  switch (field.type) {
    case 'text':
      return (
        <TextField
          field={field}
          value={(value as string) || ''}
          onChange={onChange as (v: string) => void}
          error={error}
          className={className}
        />
      );

    case 'slug':
      return (
        <SlugField
          field={field}
          value={(value as string) || ''}
          onChange={onChange as (v: string) => void}
          error={error}
          className={className}
        />
      );

    case 'textarea':
      return (
        <TextareaField
          field={field}
          value={(value as string) || ''}
          onChange={onChange as (v: string) => void}
          error={error}
          className={className}
        />
      );

    case 'date':
      return (
        <DateField
          field={field}
          value={(value as string) || ''}
          onChange={onChange as (v: string) => void}
          error={error}
          className={className}
        />
      );

    case 'checkbox':
      return (
        <CheckboxField
          field={field}
          value={(value as boolean) || false}
          onChange={onChange as (v: boolean) => void}
          error={error}
          className={className}
        />
      );

    case 'select':
      return (
        <SelectField
          field={field}
          value={(value as string | string[]) || (field.multiple ? [] : '')}
          onChange={onChange as (v: string | string[]) => void}
          error={error}
          className={className}
        />
      );

    case 'relation':
      return (
        <RelationField
          field={field}
          value={(value as string | string[]) || (field.multiple ? [] : '')}
          onChange={onChange as (v: string | string[]) => void}
          error={error}
          className={className}
        />
      );

    case 'image':
      return (
        <ImageField
          field={field}
          value={(value as string | null) || null}
          onChange={onChange as (v: string | null) => void}
          collectionName={collectionName}
          slug={slug}
          error={error}
          className={className}
        />
      );

    case 'array':
      return (
        <ArrayField
          field={field}
          value={(value as unknown[]) || []}
          onChange={onChange as (v: unknown[]) => void}
          collectionName={collectionName}
          slug={slug}
          error={error}
          className={className}
        />
      );

    case 'markdoc':
      // TipTap editor - will be implemented in Phase 6
      return (
        <TextareaField
          field={{ ...field, type: 'textarea' }}
          value={(value as string) || ''}
          onChange={onChange as (v: string) => void}
          error={error}
          className={className}
        />
      );

    default:
      return (
        <div className="text-red-500">
          Unknown field type: {(field as Field).type}
        </div>
      );
  }
}
