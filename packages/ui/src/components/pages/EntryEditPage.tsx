import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Save, Trash2, Copy, Eye, ChevronRight } from 'lucide-react';
import { useEntry } from '../../hooks/useEntry';
import { useConfig } from '../../hooks/useConfig';
import { useHmrBlock } from '../../hooks/useHmrBlock';
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
  const { blockHmr } = useHmrBlock();

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
        <p className="text-error">Collection not found</p>
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
    setSaveError(null);
    blockHmr(2000); // Block HMR reload for 2 seconds after save

    // Show loading spinner only if save takes more than 200ms
    const loadingTimer = setTimeout(() => setIsSaving(true), 200);

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

    clearTimeout(loadingTimer);
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
      <header className="flex items-center justify-between px-6 py-3 border-b border-base-300 bg-base-100">
        <div className="breadcrumbs text-sm">
          <ul>
            <li>
              <Link to={`/collections/${collectionName}`}>
                {collection.config.label}
              </Link>
            </li>
            <li>{isNew ? 'New' : entry?.slug || ''}</li>
          </ul>
        </div>

        <div className="flex items-center gap-1">
          <button
            className="btn btn-ghost btn-sm btn-square"
            title="Preview"
          >
            <Eye className="w-4 h-4" />
          </button>
          {!isNew && (
            <button
              onClick={handleDelete}
              className="btn btn-ghost btn-sm btn-square hover:text-error"
              title="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
          <button
            className="btn btn-ghost btn-sm btn-square"
            title="Copy"
          >
            <Copy className="w-4 h-4" />
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="btn btn-primary btn-sm"
          >
            {isSaving ? <span className="loading loading-spinner loading-xs"></span> : 'Save'}
          </button>
        </div>
      </header>

      {/* Main content area */}
      <div className="flex flex-1 bg-base-100 overflow-hidden">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="loading loading-spinner loading-md"></span>
          </div>
        ) : error ? (
          <div className="flex-1 p-6 text-error">{error}</div>
        ) : (
          <>
            {/* Center: Editor */}
            <div className="flex-1 overflow-y-auto">
              {saveError && (
                <div className="alert alert-error mx-6 mt-4">
                  <span>{saveError}</span>
                </div>
              )}

              {/* Content editor */}
              {markdocField ? (
                <TipTapEditor value={content} onChange={setContent} />
              ) : (
                <div className="p-6 text-base-content/70 text-center">
                  <p>No content editor configured for this collection.</p>
                </div>
              )}
            </div>

            {/* Right sidebar: Metadata fields */}
            <aside className="w-72 border-l border-base-100 bg-base-200 overflow-y-auto">
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
