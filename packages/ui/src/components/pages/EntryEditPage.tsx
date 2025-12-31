import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Save, Trash2, Copy, Eye, ChevronRight } from 'lucide-react';
import { useEntry } from '../../hooks/useEntry';
import { useConfig } from '../../hooks/useConfig';
import { getDefaultValues } from '../../lib/schema';
import { FieldRenderer } from '../fields/FieldRenderer';
import { TipTapEditor } from '../editor/TipTapEditor';
import { cn } from '../../lib/utils';

export function EntryEditPage() {
  const { collection: collectionName, slug } = useParams<{
    collection: string;
    slug?: string;
  }>();
  const navigate = useNavigate();
  const { getCollection } = useConfig();

  const collection = collectionName ? getCollection(collectionName) : undefined;
  const isNew = !slug;

  const { entry, isLoading, error, save, remove } = useEntry(
    collectionName || '',
    slug
  );

  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [content, setContent] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Initialize form data
  useEffect(() => {
    if (collection) {
      if (entry) {
        setFormData(entry.data.fields as Record<string, unknown>);
        setContent(entry.data.content || '');
      } else if (isNew) {
        setFormData(getDefaultValues(collection.config.schema));
        setContent('');
      }
    }
  }, [collection, entry, isNew]);

  if (!collection) {
    return (
      <div className="p-6">
        <p className="text-red-500">Collection not found</p>
      </div>
    );
  }

  const handleFieldChange = (fieldName: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));

    // Auto-generate slug from title
    const slugField = Object.entries(collection.config.schema).find(
      ([_, f]) => f.type === 'slug'
    );
    if (slugField) {
      const [slugFieldName, slugFieldConfig] = slugField;
      if (slugFieldConfig.type === 'slug' && fieldName === slugFieldConfig.from) {
        const slugValue = String(value)
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '');
        setFormData((prev) => ({ ...prev, [slugFieldName]: slugValue }));
      }
    }
  };

  const handleSave = async () => {
    setIsSaving(true);
    setSaveError(null);

    // Find markdoc field
    const markdocField = Object.entries(collection.config.schema).find(
      ([_, f]) => f.type === 'markdoc'
    );

    const dataToSave = { ...formData };
    if (markdocField) {
      dataToSave[markdocField[0]] = content;
    }

    const result = await save({
      fields: dataToSave as Record<string, unknown>,
      content,
    });

    setIsSaving(false);

    if (result) {
      if (isNew) {
        navigate(`/collections/${collectionName}/${result.slug}`);
      }
    } else {
      setSaveError('Failed to save entry');
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this entry?')) {
      return;
    }

    const success = await remove();
    if (success) {
      navigate(`/collections/${collectionName}`);
    }
  };

  // Separate fields into regular and markdoc
  const allFields = Object.entries(collection.config.schema);
  const markdocField = allFields.find(([_, f]) => f.type === 'markdoc');
  const regularFields = allFields.filter(([_, f]) => f.type !== 'markdoc');

  return (
    <div className="flex flex-col h-full">
      {/* Header with breadcrumbs */}
      <header className="flex items-center justify-between px-6 py-3 border-b border-gray-200 bg-white">
        <nav className="flex items-center gap-2 text-sm">
          <Link
            to={`/collections/${collectionName}`}
            className="text-gray-600 hover:text-gray-900 font-medium"
          >
            {collection.config.label}
          </Link>
          <ChevronRight className="w-4 h-4 text-gray-400" />
          <span className="text-gray-900 font-medium">
            {isNew ? 'New' : entry?.slug || ''}
          </span>
        </nav>

        <div className="flex items-center gap-2">
          <button
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            title="Preview"
          >
            <Eye className="w-4 h-4" />
          </button>
          {!isNew && (
            <button
              onClick={handleDelete}
              className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-md transition-colors"
            title="Copy"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="flex items-center gap-2 px-4 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </header>

      {/* Main content area */}
      <div className="flex flex-1 overflow-hidden">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600" />
          </div>
        ) : error ? (
          <div className="flex-1 p-6 text-red-500">{error}</div>
        ) : (
          <>
            {/* Center: Editor */}
            <div className="flex-1 overflow-y-auto">
              {saveError && (
                <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600 text-sm">
                  {saveError}
                </div>
              )}

              {/* Content editor */}
              {markdocField ? (
                <TipTapEditor value={content} onChange={setContent} />
              ) : (
                <div className="p-6 text-gray-500 text-center">
                  <p>No content editor configured for this collection.</p>
                </div>
              )}
            </div>

            {/* Right sidebar: Metadata fields */}
            <aside className="w-72 border-l border-gray-200 bg-gray-50/50 overflow-y-auto">
              <div className="p-4 space-y-5">
                {regularFields.map(([name, field]) => (
                  <FieldRenderer
                    key={name}
                    field={field}
                    value={formData[name]}
                    onChange={(value) => handleFieldChange(name, value)}
                    collectionName={collectionName || ''}
                    slug={slug || formData['slug'] as string || 'new'}
                  />
                ))}
              </div>
            </aside>
          </>
        )}
      </div>
    </div>
  );
}
