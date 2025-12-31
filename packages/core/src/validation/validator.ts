import { z, type ZodSchema, type ZodType } from 'zod';
import type {
  Field,
  TextField,
  SlugField,
  TextareaField,
  DateField,
  CheckboxField,
  SelectField,
  RelationField,
  ImageField,
  ArrayField,
  MarkdocField,
  Schema,
} from '../types/fields';
import type { EntryData } from '../types/content';

/**
 * Create a Zod schema for a field
 */
function createFieldSchema(field: Field): ZodType {
  let schema: ZodType;

  switch (field.type) {
    case 'text': {
      let textSchema = z.string();
      if (field.validation?.minLength) {
        textSchema = textSchema.min(field.validation.minLength);
      }
      if (field.validation?.maxLength) {
        textSchema = textSchema.max(field.validation.maxLength);
      }
      if (field.validation?.pattern) {
        textSchema = textSchema.regex(new RegExp(field.validation.pattern));
      }
      schema = textSchema;
      break;
    }

    case 'slug': {
      schema = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, {
        message: 'Slug must be lowercase alphanumeric with hyphens',
      });
      break;
    }

    case 'textarea': {
      let textareaSchema = z.string();
      if (field.validation?.minLength) {
        textareaSchema = textareaSchema.min(field.validation.minLength);
      }
      if (field.validation?.maxLength) {
        textareaSchema = textareaSchema.max(field.validation.maxLength);
      }
      schema = textareaSchema;
      break;
    }

    case 'date': {
      schema = z.string().refine(
        (val) => {
          if (!val) return true;
          const date = new Date(val);
          return !isNaN(date.getTime());
        },
        { message: 'Invalid date format' }
      );
      break;
    }

    case 'checkbox': {
      schema = z.boolean();
      break;
    }

    case 'select': {
      const validValues = field.options.map((opt) => opt.value);
      if (field.multiple) {
        schema = z.array(z.enum(validValues as [string, ...string[]]));
      } else {
        schema = z.enum(validValues as [string, ...string[]]);
      }
      break;
    }

    case 'relation': {
      // Relation stores slug(s)
      if (field.multiple) {
        schema = z.array(z.string());
      } else {
        schema = z.string();
      }
      break;
    }

    case 'image': {
      // Image stores relative path or null
      schema = z.string().nullable();
      break;
    }

    case 'array': {
      const itemSchema = createFieldSchema(field.itemField);
      let arraySchema = z.array(itemSchema);
      if (field.minItems) {
        arraySchema = arraySchema.min(field.minItems);
      }
      if (field.maxItems) {
        arraySchema = arraySchema.max(field.maxItems);
      }
      schema = arraySchema;
      break;
    }

    case 'markdoc': {
      schema = z.string();
      break;
    }

    default:
      schema = z.unknown();
  }

  // Handle required/optional
  if (!field.required) {
    schema = schema.optional();
  }

  return schema;
}

/**
 * Create a Zod schema for an entire entry schema
 */
export function createValidator<S extends Schema>(
  schema: S
): ZodSchema<Record<string, unknown>> {
  const shape: Record<string, ZodType> = {};

  for (const [key, field] of Object.entries(schema)) {
    shape[key] = createFieldSchema(field);
  }

  return z.object(shape);
}

/**
 * Validate entry data against a schema
 */
export function validateEntry<S extends Schema>(
  schema: S,
  data: EntryData<S>
): { success: true; data: EntryData<S> } | { success: false; errors: z.ZodError } {
  const validator = createValidator(schema);

  const result = validator.safeParse(data.fields);

  if (result.success) {
    return { success: true, data };
  } else {
    return { success: false, errors: result.error };
  }
}

/**
 * Get default values for a schema
 */
export function getDefaultValues<S extends Schema>(
  schema: S
): Record<string, unknown> {
  const defaults: Record<string, unknown> = {};

  for (const [key, field] of Object.entries(schema)) {
    switch (field.type) {
      case 'text':
        defaults[key] = field.defaultValue ?? '';
        break;
      case 'slug':
        defaults[key] = '';
        break;
      case 'textarea':
        defaults[key] = field.defaultValue ?? '';
        break;
      case 'date':
        if (field.defaultValue === 'now') {
          defaults[key] = new Date().toISOString().split('T')[0];
        } else {
          defaults[key] = field.defaultValue ?? '';
        }
        break;
      case 'checkbox':
        defaults[key] = field.defaultValue ?? false;
        break;
      case 'select':
        defaults[key] = field.multiple
          ? []
          : field.defaultValue ?? field.options[0]?.value ?? '';
        break;
      case 'relation':
        defaults[key] = field.multiple ? [] : '';
        break;
      case 'image':
        defaults[key] = null;
        break;
      case 'array':
        defaults[key] = [];
        break;
      case 'markdoc':
        defaults[key] = field.defaultValue ?? '';
        break;
    }
  }

  return defaults;
}
