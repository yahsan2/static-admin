import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { StaticAdminConfig, Collection, Schema } from '@static-admin/core';

export interface User {
  id: number;
  email: string;
  name: string | null;
}

export interface AdminContextValue {
  config: StaticAdminConfig;
  apiBasePath: string;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  fetchApi: <T = unknown>(
    endpoint: string,
    options?: RequestInit
  ) => Promise<{ success: boolean; data?: T; error?: string }>;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export interface AdminProviderProps {
  config: StaticAdminConfig;
  apiBasePath?: string;
  children: React.ReactNode;
}

export function AdminProvider({
  config,
  apiBasePath = '/admin/api',
  children,
}: AdminProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch wrapper with base path
  const fetchApi = useCallback(
    async <T = unknown>(
      endpoint: string,
      options?: RequestInit
    ): Promise<{ success: boolean; data?: T; error?: string }> => {
      try {
        const response = await fetch(`${apiBasePath}${endpoint}`, {
          ...options,
          headers: {
            'Content-Type': 'application/json',
            ...options?.headers,
          },
          credentials: 'include',
        });

        const result = await response.json();
        return result as { success: boolean; data?: T; error?: string };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : 'Network error',
        };
      }
    },
    [apiBasePath]
  );

  // Check current session on mount
  useEffect(() => {
    const checkSession = async () => {
      if (!config.auth) {
        setIsLoading(false);
        return;
      }

      try {
        const result = await fetchApi<User>('/auth/me');
        if (result.success && result.data) {
          setUser(result.data);
        }
      } catch {
        // Not logged in
      } finally {
        setIsLoading(false);
      }
    };

    checkSession();
  }, [config.auth, fetchApi]);

  // Login
  const login = useCallback(
    async (email: string, password: string) => {
      setError(null);
      setIsLoading(true);

      try {
        const result = await fetchApi<{ user: User }>('/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });

        if (result.success && result.data) {
          setUser(result.data.user);
        } else {
          setError(result.error || 'Login failed');
          throw new Error(result.error || 'Login failed');
        }
      } finally {
        setIsLoading(false);
      }
    },
    [fetchApi]
  );

  // Logout
  const logout = useCallback(async () => {
    setIsLoading(true);

    try {
      await fetchApi('/auth/logout', { method: 'POST' });
      setUser(null);
    } finally {
      setIsLoading(false);
    }
  }, [fetchApi]);

  const value: AdminContextValue = {
    config,
    apiBasePath,
    user,
    isLoading,
    error,
    login,
    logout,
    fetchApi,
  };

  return (
    <AdminContext.Provider value={value}>{children}</AdminContext.Provider>
  );
}

export function useAdmin(): AdminContextValue {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}
