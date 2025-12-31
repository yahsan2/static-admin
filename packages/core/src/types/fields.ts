import type { z } from 'zod';

/** Base field configuration */
export interface BaseFieldConfig {
  label: string;
  description?: string;
  required?: boolean;
}

/** Text field */
export interface TextField extends BaseFieldConfig {
  type: 'text';
  defaultValue?: string;
  multiline?: false;
  validation?: {
    minLength?: number;
    maxLength?: number;
    pattern?: string;
  };
}

/** Slug field - auto-generated from another field */
export interface SlugField extends BaseFieldConfig {
  type: 'slug';
  from: string;
}

/** Textarea field */
export interface TextareaField extends BaseFieldConfig {
  type: 'textarea';
  defaultValue?: string;
  validation?: {
    minLength?: number;
    maxLength?: number;
  };
}

/** Date field */
export interface DateField extends BaseFieldConfig {
  type: 'date';
  defaultValue?: string | 'now';
}

/** Checkbox field */
export interface CheckboxField extends BaseFieldConfig {
  type: 'checkbox';
  defaultValue?: boolean;
}

/** Select option */
export interface SelectOption {
  value: string;
  label: string;
}

/** Select field */
export interface SelectField extends BaseFieldConfig {
  type: 'select';
  options: SelectOption[];
  defaultValue?: string;
  multiple?: boolean;
}

/** Relation field - reference to another collection */
export interface RelationField extends BaseFieldConfig {
  type: 'relation';
  collection: string;
  displayField?: string;
  multiple?: boolean;
}

/** Image field */
export interface ImageField extends BaseFieldConfig {
  type: 'image';
  directory?: string;
  accept?: string[];
  maxSize?: number;
}

/** Array field */
export interface ArrayField extends BaseFieldConfig {
  type: 'array';
  itemField: Field;
  minItems?: number;
  maxItems?: number;
}

/** Markdoc field - rich text content */
export interface MarkdocField extends BaseFieldConfig {
  type: 'markdoc';
  defaultValue?: string;
}

/** Union of all field types */
export type Field =
  | TextField
  | SlugField
  | TextareaField
  | DateField
  | CheckboxField
  | SelectField
  | RelationField
  | ImageField
  | ArrayField
  | MarkdocField;

/** Field type string literal */
export type FieldType = Field['type'];

/** Schema definition (key-value pairs of fields) */
export type Schema = Record<string, Field>;

/** Infer TypeScript type from field */
export type InferFieldType<F extends Field> = F extends TextField
  ? string
  : F extends SlugField
    ? string
    : F extends TextareaField
      ? string
      : F extends DateField
        ? string
        : F extends CheckboxField
          ? boolean
          : F extends SelectField
            ? F['multiple'] extends true
              ? string[]
              : string
            : F extends RelationField
              ? F['multiple'] extends true
                ? string[]
                : string
              : F extends ImageField
                ? string | null
                : F extends ArrayField
                  ? InferFieldType<F['itemField']>[]
                  : F extends MarkdocField
                    ? string
                    : never;

/** Infer TypeScript type from schema */
export type InferSchemaType<S extends Schema> = {
  [K in keyof S]: InferFieldType<S[K]>;
};
