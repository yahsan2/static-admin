import { useAdmin } from '../context/AdminContext';
import type { StaticAdminConfig, Collection, Schema } from '../types';

export interface UseConfigResult {
  config: StaticAdminConfig;
  collections: Array<{
    name: string;
    label: string;
    description?: string;
  }>;
  getCollection: (name: string) => Collection | undefined;
}

export function useConfig(): UseConfigResult {
  const { config } = useAdmin();

  const collections = Object.entries(config.collections ?? {}).map(
    ([name, col]) => ({
      name,
      label: col.config.label,
      description: col.config.description,
    })
  );

  const getCollection = (name: string): Collection | undefined => {
    return config.collections?.[name];
  };

  return {
    config,
    collections,
    getCollection,
  };
}
