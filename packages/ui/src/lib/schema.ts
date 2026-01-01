import type { Schema } from '../types';

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
      case 'datetime':
        if (field.defaultValue === 'now') {
          // Format: YYYY-MM-DDTHH:MM (for datetime-local input)
          defaults[key] = new Date().toISOString().slice(0, 16);
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
