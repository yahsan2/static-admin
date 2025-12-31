import { useState, useEffect, useCallback } from 'react';
import { useAdmin } from '../context/AdminContext';
import type { Entry, Schema } from '@static-admin/core';

export interface UseCollectionOptions {
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  search?: string;
}

export interface UseCollectionResult<S extends Schema = Schema> {
  entries: Entry<S>[];
  total: number;
  isLoading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  pagination: {
    page: number;
    limit: number;
    totalPages: number;
  };
}

export function useCollection<S extends Schema = Schema>(
  collectionName: string,
  options: UseCollectionOptions = {}
): UseCollectionResult<S> {
  const { fetchApi } = useAdmin();
  const [entries, setEntries] = useState<Entry<S>[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { page = 1, limit = 20, sortBy, sortOrder, search } = options;

  const fetchEntries = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));
    if (sortBy) params.set('sortBy', sortBy);
    if (sortOrder) params.set('sortOrder', sortOrder);
    if (search) params.set('search', search);

    const result = await fetchApi<{
      items: Entry<S>[];
      pagination: { total: number };
    }>(`/entries/${collectionName}?${params.toString()}`);

    if (result.success && result.data) {
      setEntries(result.data.items);
      setTotal(result.data.pagination.total);
    } else {
      setError(result.error || 'Failed to fetch entries');
    }

    setIsLoading(false);
  }, [fetchApi, collectionName, page, limit, sortBy, sortOrder, search]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  return {
    entries,
    total,
    isLoading,
    error,
    refetch: fetchEntries,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}
