import { useState, useEffect, useCallback } from 'react';
import { useAdmin } from '../context/AdminContext';
import type { Entry, EntryData, Schema } from '../types';

export interface UseEntryResult<S extends Schema = Schema> {
  entry: Entry<S> | null;
  isLoading: boolean;
  error: string | null;
  save: (data: EntryData<S>) => Promise<Entry<S> | null>;
  remove: () => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useEntry<S extends Schema = Schema>(
  collectionName: string,
  slug?: string
): UseEntryResult<S> {
  const { fetchApi } = useAdmin();
  const [entry, setEntry] = useState<Entry<S> | null>(null);
  const [isLoading, setIsLoading] = useState(!!slug);
  const [error, setError] = useState<string | null>(null);

  const fetchEntry = useCallback(async () => {
    if (!slug) {
      setEntry(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await fetchApi<Entry<S>>(
      `/entries/${collectionName}/${slug}`
    );

    if (result.success && result.data) {
      setEntry(result.data);
    } else {
      setError(result.error || 'Failed to fetch entry');
    }

    setIsLoading(false);
  }, [fetchApi, collectionName, slug]);

  useEffect(() => {
    fetchEntry();
  }, [fetchEntry]);

  const save = useCallback(
    async (data: EntryData<S>): Promise<Entry<S> | null> => {
      setIsLoading(true);
      setError(null);

      const isCreate = !slug;
      const endpoint = isCreate
        ? `/entries/${collectionName}`
        : `/entries/${collectionName}/${slug}`;

      const result = await fetchApi<Entry<S>>(endpoint, {
        method: isCreate ? 'POST' : 'PUT',
        body: JSON.stringify(data),
      });

      setIsLoading(false);

      if (result.success && result.data) {
        setEntry(result.data);
        return result.data;
      } else {
        setError(result.error || 'Failed to save entry');
        return null;
      }
    },
    [fetchApi, collectionName, slug]
  );

  const remove = useCallback(async (): Promise<boolean> => {
    if (!slug) return false;

    setIsLoading(true);
    setError(null);

    const result = await fetchApi(`/entries/${collectionName}/${slug}`, {
      method: 'DELETE',
    });

    setIsLoading(false);

    if (result.success) {
      setEntry(null);
      return true;
    } else {
      setError(result.error || 'Failed to delete entry');
      return false;
    }
  }, [fetchApi, collectionName, slug]);

  return {
    entry,
    isLoading,
    error,
    save,
    remove,
    refetch: fetchEntry,
  };
}
