import { useCallback } from 'react';
import { useAdmin } from '../context/AdminContext';

/**
 * Hook to temporarily block Vite HMR full-reload events.
 * Notifies the server to ignore file change events for a short period.
 */
export function useHmrBlock() {
  const { fetchApi } = useAdmin();

  const blockHmr = useCallback(
    async (durationMs: number = 2000) => {
      try {
        await fetchApi('/hmr-block', {
          method: 'POST',
          body: JSON.stringify({ duration: durationMs }),
        });
      } catch {
        // Ignore errors - HMR blocking is optional
      }
    },
    [fetchApi]
  );

  return { blockHmr };
}
