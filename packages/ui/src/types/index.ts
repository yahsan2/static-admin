// UI-specific type definitions
// These mirror @static-admin/core types for browser compatibility

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

/** Datetime field */
export interface DatetimeField extends BaseFieldConfig {
  type: 'datetime';
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
  | DatetimeField
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
        : F extends DatetimeField
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

/** Local filesystem storage configuration */
export interface LocalStorageConfig {
  /** Storage kind (optional, defaults to 'local') */
  kind?: 'local';
  /** Path to content directory relative to project root */
  contentPath: string;
}

/** GitHub API storage configuration */
export interface GitHubStorageConfig {
  /** Storage kind */
  kind: 'github';
  /** Path to content directory within repository */
  contentPath: string;
  /** GitHub repository owner */
  owner: string;
  /** GitHub repository name */
  repo: string;
  /** Branch name (default: 'main') */
  branch?: string;
}

/** Storage configuration union */
export type StorageConfig = LocalStorageConfig | GitHubStorageConfig;

/** Git configuration */
export interface GitConfig {
  autoCommit?: boolean;
  commitMessage?: (action: 'create' | 'update' | 'delete', collection: string, slug: string) => string;
}

/** Auth configuration */
export interface AuthConfig {
  database: string;
  sessionExpiry?: number;
}

/** Collection configuration */
export interface CollectionConfig<S extends Schema = Schema> {
  label: string;
  path: string;
  slugField: keyof S & string;
  schema: S;
  description?: string;
}

/** Singleton configuration */
export interface SingletonConfig<S extends Schema = Schema> {
  label: string;
  path: string;
  schema: S;
  description?: string;
}

/** Collection instance */
export interface Collection<S extends Schema = Schema> {
  kind: 'collection';
  config: CollectionConfig<S>;
}

/** Singleton instance */
export interface Singleton<S extends Schema = Schema> {
  kind: 'singleton';
  config: SingletonConfig<S>;
}

/** Main configuration */
export interface StaticAdminConfig {
  storage: StorageConfig;
  git?: GitConfig;
  auth?: AuthConfig | boolean;
  collections?: Record<string, Collection>;
  singletons?: Record<string, Singleton>;
  /** Public site URL for preview links */
  publicSiteUrl?: string;
}

/** Entry data with typed fields */
export interface EntryData<S extends Schema = Schema> {
  fields: InferSchemaType<S>;
  content?: string;
}

/** A single content entry */
export interface Entry<S extends Schema = Schema> {
  slug: string;
  collection: string;
  data: EntryData<S>;
  filePath: string;
  updatedAt: Date;
  createdAt: Date;
}
