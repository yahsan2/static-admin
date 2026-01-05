import { useState, useEffect, useRef, useCallback } from 'react';
import { useHmrBlock } from './useHmrBlock';
import { useDraftStorage } from './useDraftStorage';
import {
  AUTO_SAVE_DELAY_MS,
  HMR_BLOCK_DURATION_MS,
  SAVE_LOADING_DELAY_MS,
} from '../lib/constants';

export interface SaveOptions {
  commit: boolean;
  fieldsOverride?: Record<string, unknown>;
}

export interface AutoSaveData {
  formData: Record<string, unknown>;
  content: string;
}

export interface UseAutoSaveOptions {
  collectionName: string;
  slug: string;
  data: AutoSaveData;
  onSave: (data: AutoSaveData, options: SaveOptions) => Promise<boolean>;
  enabled: boolean;
}

export interface UseAutoSaveResult {
  isAutoSaving: boolean;
  isSaving: boolean;
  hasUnsavedChanges: boolean;
  lastSavedAt: Date | null;
  saveError: string | null;
  markAsChanged: () => void;
  saveWithCommit: (fieldsOverride?: Record<string, unknown>) => Promise<boolean>;
}

export function useAutoSave({
  collectionName,
  slug,
  data,
  onSave,
  enabled,
}: UseAutoSaveOptions): UseAutoSaveResult {
  const { blockHmr } = useHmrBlock();
  const { saveDraft, deleteDraft } = useDraftStorage();

  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  const autoSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const dataRef = useRef(data);

  // Keep data ref updated
  useEffect(() => {
    dataRef.current = data;
  }, [data]);

  // Auto-save function - saves to IndexedDB only
  const performAutoSave = useCallback(async () => {
    if (!enabled || !hasUnsavedChanges || !slug) return;

    setIsAutoSaving(true);
    setSaveError(null);

    try {
      await saveDraft(
        collectionName,
        slug,
        dataRef.current.formData,
        dataRef.current.content
      );
      setHasUnsavedChanges(false);
      setLastSavedAt(new Date());
    } catch (error) {
      setSaveError('Auto-save failed');
      console.error('Auto-save to IndexedDB failed:', error);
    } finally {
      setIsAutoSaving(false);
    }
  }, [enabled, hasUnsavedChanges, collectionName, slug, saveDraft]);

  // Debounced auto-save effect
  useEffect(() => {
    if (!enabled) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    if (hasUnsavedChanges) {
      autoSaveTimerRef.current = setTimeout(() => {
        performAutoSave();
      }, AUTO_SAVE_DELAY_MS);
    }

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [data, hasUnsavedChanges, enabled, performAutoSave]);

  const markAsChanged = useCallback(() => {
    setHasUnsavedChanges(true);
  }, []);

  // Save with commit - calls API and deletes from IndexedDB
  const saveWithCommit = useCallback(
    async (fieldsOverride?: Record<string, unknown>) => {
      // Cancel any pending auto-save
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }

      setSaveError(null);
      blockHmr(HMR_BLOCK_DURATION_MS);

      const loadingTimer = setTimeout(() => setIsSaving(true), SAVE_LOADING_DELAY_MS);

      const success = await onSave(dataRef.current, { commit: true, fieldsOverride });

      clearTimeout(loadingTimer);
      setIsSaving(false);

      if (success) {
        setHasUnsavedChanges(false);
        setLastSavedAt(new Date());
        // Delete draft from IndexedDB after successful commit
        if (slug) {
          try {
            await deleteDraft(collectionName, slug);
          } catch (error) {
            console.error('Failed to delete draft from IndexedDB:', error);
          }
        }
      } else {
        setSaveError('Failed to save entry');
      }

      return success;
    },
    [onSave, blockHmr, collectionName, slug, deleteDraft]
  );

  return {
    isAutoSaving,
    isSaving,
    hasUnsavedChanges,
    lastSavedAt,
    saveError,
    markAsChanged,
    saveWithCommit,
  };
}
