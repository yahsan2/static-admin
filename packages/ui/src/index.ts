// @static-admin/ui
// React admin UI components

// Types (re-exported for client-side use)
export type {
  StaticAdminConfig,
  Collection,
  Schema,
  Field,
  Entry,
  EntryData,
} from './types';

// Main App
export { StaticAdminApp } from './components/App';
export { AdminProvider, useAdmin } from './context/AdminContext';

// Layout
export { AdminLayout } from './components/layout/AdminLayout';
export { Sidebar } from './components/layout/Sidebar';
export { Header } from './components/layout/Header';

// Fields
export { TextField } from './components/fields/TextField';
export { SlugField } from './components/fields/SlugField';
export { TextareaField } from './components/fields/TextareaField';
export { DateField } from './components/fields/DateField';
export { CheckboxField } from './components/fields/CheckboxField';
export { SelectField } from './components/fields/SelectField';
export { RelationField } from './components/fields/RelationField';
export { ImageField } from './components/fields/ImageField';
export { ArrayField } from './components/fields/ArrayField';
export { FieldRenderer } from './components/fields/FieldRenderer';

// Editor
export { TipTapEditor } from './components/editor/TipTapEditor';

// Hooks
export { useCollection } from './hooks/useCollection';
export { useEntry } from './hooks/useEntry';
export { useConfig } from './hooks/useConfig';

// UI Components
export * from './components/ui';
