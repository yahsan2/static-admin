import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Save, Trash2, ArrowLeft } from 'lucide-react';
import { useEntry } from '../../hooks/useEntry';
import { useConfig } from '../../hooks/useConfig';
import { getDefaultValues, type Schema } from '@static-admin/core';
import { Header } from '../layout/Header';
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

  const title = isNew ? `New ${collection.config.label}` : `Edit ${entry?.slug || ''}`;

  // Separate fields into regular and markdoc
  const regularFields = Object.entries(collection.config.schema).filter(
    ([_, f]) => f.type !== 'markdoc'
  );
  const markdocField = Object.entries(collection.config.schema).find(
    ([_, f]) => f.type === 'markdoc'
  );

  return (
    <div>
      <Header
        title={title}
        breadcrumbs={[
          { label: 'Dashboard', href: '/' },
          { label: collection.config.label, href: `/collections/${collectionName}` },
          { label: isNew ? 'New' : entry?.slug || '' },
        ]}
        actions={
          <div className="flex items-center gap-2">
            {!isNew && (
              <button
                onClick={handleDelete}
                className="flex items-center gap-2 px-4 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50 transition-colors"
              >
                <Trash2 className="w-4 h-4" />
                Delete
              </button>
            )}
            <button
              onClick={handleSave}
              disabled={isSaving}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Save className="w-4 h-4" />
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        }
      />

      <div className="p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900" />
          </div>
        ) : error ? (
          <div className="text-red-500">{error}</div>
        ) : (
          <div className="max-w-4xl">
            {saveError && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-600">
                {saveError}
              </div>
            )}

            <div className="bg-white rounded-lg border border-gray-200 p-6 space-y-6">
              {/* Regular fields */}
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

              {/* Markdoc/Content field */}
              {markdocField && (
                <div className="space-y-1">
                  <label className="block text-sm font-medium text-gray-700">
                    {markdocField[1].label}
                  </label>
                  {markdocField[1].description && (
                    <p className="text-sm text-gray-500">
                      {markdocField[1].description}
                    </p>
                  )}
                  <TipTapEditor value={content} onChange={setContent} />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
