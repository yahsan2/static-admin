import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { StaticAdminConfig, Collection, Schema } from '../types';

export type UserRole = 'admin' | 'editor';

export interface User {
  id: number;
  email: string;
  name: string | null;
  role: UserRole;
  createdAt?: Date | string;
}

export interface AdminContextValue {
  config: StaticAdminConfig;
  apiBasePath: string;
  user: User | null;
  isLoading: boolean;
  error: string | null;
  needsSetup: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setupAdmin: (email: string, password: string, name?: string) => Promise<void>;
  fetchApi: <T = unknown>(
    endpoint: string,
    options?: RequestInit
  ) => Promise<{ success: boolean; data?: T; error?: string }>;
}

const AdminContext = createContext<AdminContextValue | null>(null);

export interface AdminProviderProps {
  config?: StaticAdminConfig;
  apiBasePath?: string;
  children: React.ReactNode;
}

export function AdminProvider({
  config: initialConfig,
  apiBasePath = '/admin/api',
  children,
}: AdminProviderProps) {
  const [config, setConfig] = useState<StaticAdminConfig | null>(initialConfig ?? null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [needsSetup, setNeedsSetup] = useState(false);

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

  // Fetch config from API if not provided
  useEffect(() => {
    if (initialConfig) return; // Config was provided as prop

    const fetchConfig = async () => {
      const result = await fetchApi<StaticAdminConfig>('/schema');
      if (result.success && result.data) {
        setConfig(result.data);
      } else {
        setError(result.error || 'Failed to load config');
        setIsLoading(false);
      }
    };

    fetchConfig();
  }, [initialConfig, fetchApi]);

  // Check current session and install status on mount
  useEffect(() => {
    if (!config) return; // Wait for config to be loaded

    const checkSession = async () => {
      if (!config.auth) {
        setIsLoading(false);
        return;
      }

      try {
        // First check if installation is needed
        const installResult = await fetchApi<{ installed: boolean; needsSetup: boolean }>('/install/check');
        if (installResult.success && installResult.data?.needsSetup) {
          setNeedsSetup(true);
          setIsLoading(false);
          return;
        }

        // Then check current session
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
  }, [config, fetchApi]);

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

  // Setup admin (initial installation)
  const setupAdmin = useCallback(
    async (email: string, password: string, name?: string) => {
      setError(null);
      setIsLoading(true);

      try {
        const result = await fetchApi<{ user: User }>('/install/setup', {
          method: 'POST',
          body: JSON.stringify({ email, password, name }),
        });

        if (result.success && result.data) {
          setUser(result.data.user);
          setNeedsSetup(false);
        } else {
          setError(result.error || 'Setup failed');
          throw new Error(result.error || 'Setup failed');
        }
      } finally {
        setIsLoading(false);
      }
    },
    [fetchApi]
  );

  // Show loading state while config is being fetched
  if (!config) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        {error ? <p style={{ color: 'red' }}>{error}</p> : <p>Loading...</p>}
      </div>
    );
  }

  const value: AdminContextValue = {
    config,
    apiBasePath,
    user,
    isLoading,
    error,
    needsSetup,
    login,
    logout,
    setupAdmin,
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
