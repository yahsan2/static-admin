import type {
  TextField,
  SlugField,
  TextareaField,
  DateField,
  CheckboxField,
  SelectField,
  SelectOption,
  RelationField,
  ImageField,
  ArrayField,
  MarkdocField,
  Field,
  BaseFieldConfig,
} from '../types/fields';

type Omit<T, K extends keyof T> = Pick<T, Exclude<keyof T, K>>;

/** Field builder functions */
export const fields = {
  /**
   * Single-line text field
   */
  text(config: Omit<TextField, 'type'>): TextField {
    return { type: 'text', ...config };
  },

  /**
   * Slug field - auto-generated from another field
   */
  slug(config: Omit<SlugField, 'type'>): SlugField {
    return { type: 'slug', ...config };
  },

  /**
   * Multi-line textarea field
   */
  textarea(config: Omit<TextareaField, 'type'>): TextareaField {
    return { type: 'textarea', ...config };
  },

  /**
   * Date field
   */
  date(config: Omit<DateField, 'type'>): DateField {
    return { type: 'date', ...config };
  },

  /**
   * Checkbox (boolean) field
   */
  checkbox(config: Omit<CheckboxField, 'type'>): CheckboxField {
    return { type: 'checkbox', ...config };
  },

  /**
   * Select dropdown field
   */
  select(config: Omit<SelectField, 'type'>): SelectField {
    return { type: 'select', ...config };
  },

  /**
   * Relation field - reference to another collection
   */
  relation(config: Omit<RelationField, 'type'>): RelationField {
    return { type: 'relation', ...config };
  },

  /**
   * Image upload field
   */
  image(config: Omit<ImageField, 'type'>): ImageField {
    return { type: 'image', ...config };
  },

  /**
   * Array field - repeatable items
   */
  array(config: Omit<ArrayField, 'type'>): ArrayField {
    return { type: 'array', ...config };
  },

  /**
   * Markdoc field - rich text content (TipTap)
   */
  markdoc(config: Omit<MarkdocField, 'type'>): MarkdocField {
    return { type: 'markdoc', ...config };
  },
};
