import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Trash2, Copy, Eye } from 'lucide-react';
import { useEntry } from '../../hooks/useEntry';
import { useConfig } from '../../hooks/useConfig';
import { useAutoSave, type SaveOptions } from '../../hooks/useAutoSave';
import { useDraftStorage, type DraftData } from '../../hooks/useDraftStorage';
import { getDefaultValues } from '../../lib/schema';
import { FieldRenderer } from '../fields/FieldRenderer';
import { TipTapEditor } from '../editor/TipTapEditor';
import { SaveStatus } from './entry/SaveStatus';
import { PublishButtons } from './entry/PublishButtons';
import { DraftRecoveryAlert } from './entry/DraftRecoveryAlert';
import type { EntryData, Schema } from '../../types';

export function EntryEditPage() {
  const { collection: collectionName, slug } = useParams<{
    collection: string;
    slug?: string;
  }>();
  const navigate = useNavigate();
  const { getCollection } = useConfig();
  const { loadDraft, deleteDraft } = useDraftStorage();

  const collection = collectionName ? getCollection(collectionName) : undefined;
  const isNew = !slug;

  const { entry, isLoading, error, save, remove } = useEntry(
    collectionName || '',
    slug
  );

  const [formData, setFormData] = useState<Record<string, unknown>>({});
  const [content, setContent] = useState('');

  // Draft recovery state
  const [pendingDraft, setPendingDraft] = useState<DraftData | null>(null);
  const [draftChecked, setDraftChecked] = useState(false);

  const isDraft = formData.draft === true;

  // Check for existing draft on mount
  useEffect(() => {
    if (!collectionName || !slug || draftChecked) return;

    const checkDraft = async () => {
      try {
        const draft = await loadDraft(collectionName, slug);
        if (draft) {
          setPendingDraft(draft);
        }
      } catch (error) {
        console.error('Failed to check for draft:', error);
      } finally {
        setDraftChecked(true);
      }
    };

    checkDraft();
  }, [collectionName, slug, draftChecked, loadDraft]);

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

  // Handle draft recovery
  const handleRestoreDraft = useCallback(() => {
    if (pendingDraft) {
      setFormData(pendingDraft.fields);
      setContent(pendingDraft.content);
      setPendingDraft(null);
    }
  }, [pendingDraft]);

  const handleDiscardDraft = useCallback(async () => {
    if (collectionName && slug) {
      try {
        await deleteDraft(collectionName, slug);
      } catch (error) {
        console.error('Failed to delete draft:', error);
      }
    }
    setPendingDraft(null);
  }, [collectionName, slug, deleteDraft]);

  // Prepare save data
  const getSaveData = useCallback(
    (fieldsOverride?: Record<string, unknown>): EntryData<Schema> => {
      if (!collection) return { fields: formData, content } as EntryData<Schema>;

      const markdocFieldName = Object.entries(collection.config.schema).find(
        ([_, f]) => f.type === 'markdoc'
      )?.[0];

      // Exclude markdoc field from frontmatter (it goes in content body)
      const dataToSave = { ...formData, ...fieldsOverride };
      if (markdocFieldName && markdocFieldName in dataToSave) {
        delete dataToSave[markdocFieldName];
      }

      return {
        fields: dataToSave,
        content,
      } as EntryData<Schema>;
    },
    [collection, formData, content]
  );

  // Handle save
  const handleSave = useCallback(
    async (_data: unknown, options: SaveOptions) => {
      const saveData = getSaveData(options.fieldsOverride);
      const result = await save(saveData, { commit: options.commit });
      if (result && options.fieldsOverride) {
        setFormData((prev) => ({ ...prev, ...options.fieldsOverride }));
      }
      return !!result;
    },
    [getSaveData, save]
  );

  const {
    isAutoSaving,
    isSaving,
    hasUnsavedChanges,
    lastSavedAt,
    saveError,
    markAsChanged,
    saveWithCommit,
  } = useAutoSave({
    collectionName: collectionName || '',
    slug: slug || '',
    data: { formData, content },
    onSave: handleSave,
    enabled: !isNew && !!collection,
  });

  if (!collection) {
    return (
      <div className="p-6">
        <p className="text-error">Collection not found</p>
      </div>
    );
  }

  const handleFieldChange = (fieldName: string, value: unknown) => {
    setFormData((prev) => ({ ...prev, [fieldName]: value }));
    markAsChanged();

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

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    markAsChanged();
  };

  const handleCommit = async (fieldsOverride?: Record<string, unknown>) => {
    const success = await saveWithCommit(fieldsOverride);
    if (success && isNew) {
      const saveData = getSaveData(fieldsOverride);
      const slugValue = saveData.fields.slug as string;
      if (slugValue) {
        navigate(`/collections/${collectionName}/${slugValue}`);
      }
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

  const isDisabled = isSaving || isAutoSaving;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
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

        <div className="flex items-center gap-2">
          <SaveStatus
            isAutoSaving={isAutoSaving}
            hasUnsavedChanges={hasUnsavedChanges}
            lastSavedAt={lastSavedAt}
            isNew={isNew}
          />
          <button className="btn btn-ghost btn-sm btn-square" title="Preview">
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
          <button className="btn btn-ghost btn-sm btn-square" title="Copy">
            <Copy className="w-4 h-4" />
          </button>

          <PublishButtons
            isDraft={isDraft}
            isNew={isNew}
            isDisabled={isDisabled}
            isSaving={isSaving}
            onCommit={handleCommit}
          />
        </div>
      </header>

      {/* Draft Recovery Alert */}
      {pendingDraft && (
        <DraftRecoveryAlert
          draft={pendingDraft}
          onRestore={handleRestoreDraft}
          onDiscard={handleDiscardDraft}
        />
      )}

      {/* Main content */}
      <div className="flex flex-1 bg-base-100 overflow-hidden">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center">
            <span className="loading loading-spinner loading-md"></span>
          </div>
        ) : error ? (
          <div className="flex-1 p-6 text-error">{error}</div>
        ) : (
          <>
            {/* Editor */}
            <div className="flex-1 overflow-y-auto">
              {saveError && (
                <div className="alert alert-error mx-6 mt-4">
                  <span>{saveError}</span>
                </div>
              )}

              {markdocField ? (
                <TipTapEditor value={content} onChange={handleContentChange} />
              ) : (
                <div className="p-6 text-base-content/70 text-center">
                  <p>No content editor configured for this collection.</p>
                </div>
              )}
            </div>

            {/* Sidebar */}
            <aside className="w-72 border-l border-base-100 bg-base-200 overflow-y-auto">
              <div className="p-4 space-y-5">
                {regularFields.map(([name, field]) => (
                  <FieldRenderer
                    key={name}
                    field={field}
                    value={formData[name]}
                    onChange={(value) => handleFieldChange(name, value)}
                    collectionName={collectionName || ''}
                    slug={slug || (formData['slug'] as string) || 'new'}
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
