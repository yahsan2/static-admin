import { useState, useEffect, useCallback } from 'react';
import { useAdmin, type User } from '../context/AdminContext';

export interface UseUsersOptions {
  page?: number;
  limit?: number;
}

export interface UseUsersResult {
  users: User[];
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

export function useUsers(options: UseUsersOptions = {}): UseUsersResult {
  const { fetchApi } = useAdmin();
  const [users, setUsers] = useState<User[]>([]);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { page = 1, limit = 20 } = options;

  const fetchUsers = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', String(limit));

    const result = await fetchApi<{
      items: User[];
      pagination: { total: number };
    }>(`/users?${params.toString()}`);

    if (result.success && result.data) {
      setUsers(result.data.items);
      setTotal(result.data.pagination.total);
    } else {
      setError(result.error || 'Failed to fetch users');
    }

    setIsLoading(false);
  }, [fetchApi, page, limit]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  return {
    users,
    total,
    isLoading,
    error,
    refetch: fetchUsers,
    pagination: {
      page,
      limit,
      totalPages: Math.ceil(total / limit),
    },
  };
}
