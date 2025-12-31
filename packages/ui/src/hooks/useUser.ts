import { useState, useEffect, useCallback } from 'react';
import { useAdmin, type User } from '../context/AdminContext';

export interface UserFormData {
  email: string;
  name?: string;
  password?: string;
}

export interface UseUserResult {
  user: User | null;
  isLoading: boolean;
  error: string | null;
  save: (data: UserFormData) => Promise<User | null>;
  remove: () => Promise<boolean>;
  refetch: () => Promise<void>;
}

export function useUser(userId?: string): UseUserResult {
  const { fetchApi } = useAdmin();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(!!userId);
  const [error, setError] = useState<string | null>(null);

  const fetchUser = useCallback(async () => {
    if (!userId) {
      setUser(null);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    setError(null);

    const result = await fetchApi<User>(`/users/${userId}`);

    if (result.success && result.data) {
      setUser(result.data);
    } else {
      setError(result.error || 'Failed to fetch user');
    }

    setIsLoading(false);
  }, [fetchApi, userId]);

  useEffect(() => {
    fetchUser();
  }, [fetchUser]);

  const save = useCallback(
    async (data: UserFormData): Promise<User | null> => {
      setIsLoading(true);
      setError(null);

      const isCreate = !userId;
      const endpoint = isCreate ? '/users' : `/users/${userId}`;

      const result = await fetchApi<User>(endpoint, {
        method: isCreate ? 'POST' : 'PUT',
        body: JSON.stringify(data),
      });

      setIsLoading(false);

      if (result.success && result.data) {
        setUser(result.data);
        return result.data;
      } else {
        setError(result.error || 'Failed to save user');
        return null;
      }
    },
    [fetchApi, userId]
  );

  const remove = useCallback(async (): Promise<boolean> => {
    if (!userId) return false;

    setIsLoading(true);
    setError(null);

    const result = await fetchApi(`/users/${userId}`, {
      method: 'DELETE',
    });

    setIsLoading(false);

    if (result.success) {
      setUser(null);
      return true;
    } else {
      setError(result.error || 'Failed to delete user');
      return false;
    }
  }, [fetchApi, userId]);

  return {
    user,
    isLoading,
    error,
    save,
    remove,
    refetch: fetchUser,
  };
}
