import { useState, useEffect, useRef, useCallback } from 'react';
import { useHmrBlock } from './useHmrBlock';

const AUTO_SAVE_DELAY = 5000;

export interface SaveOptions {
  commit: boolean;
  fieldsOverride?: Record<string, unknown>;
}

export interface UseAutoSaveOptions<T> {
  data: T;
  onSave: (data: T, options: SaveOptions) => Promise<boolean>;
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

export function useAutoSave<T>({
  data,
  onSave,
  enabled,
}: UseAutoSaveOptions<T>): UseAutoSaveResult {
  const { blockHmr } = useHmrBlock();

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

  // Auto-save function (without commit)
  const performAutoSave = useCallback(async () => {
    if (!enabled || !hasUnsavedChanges) return;

    setIsAutoSaving(true);
    setSaveError(null);
    blockHmr(2000);

    const success = await onSave(dataRef.current, { commit: false });

    setIsAutoSaving(false);
    if (success) {
      setHasUnsavedChanges(false);
      setLastSavedAt(new Date());
    } else {
      setSaveError('Auto-save failed');
    }
  }, [enabled, hasUnsavedChanges, onSave, blockHmr]);

  // Debounced auto-save effect
  useEffect(() => {
    if (!enabled) return;

    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    if (hasUnsavedChanges) {
      autoSaveTimerRef.current = setTimeout(() => {
        performAutoSave();
      }, AUTO_SAVE_DELAY);
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

  const saveWithCommit = useCallback(
    async (fieldsOverride?: Record<string, unknown>) => {
      // Cancel any pending auto-save
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
        autoSaveTimerRef.current = null;
      }

      setSaveError(null);
      blockHmr(2000);

      const loadingTimer = setTimeout(() => setIsSaving(true), 200);

      const success = await onSave(dataRef.current, { commit: true, fieldsOverride });

      clearTimeout(loadingTimer);
      setIsSaving(false);

      if (success) {
        setHasUnsavedChanges(false);
        setLastSavedAt(new Date());
      } else {
        setSaveError('Failed to save entry');
      }

      return success;
    },
    [onSave, blockHmr]
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
