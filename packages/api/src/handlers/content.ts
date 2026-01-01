import {
  ContentManager,
  GitManager,
  validateEntry,
  getDefaultValues,
  type EntryData,
  type Schema,
} from '@static-admin/core';
import type { ApiContext, ApiRequest, ApiResponse, ApiHandler } from './types';

/**
 * Get schema definition
 * Returns full config in UI-compatible format
 */
export const getSchema: ApiHandler = async (ctx) => {
  const { config } = ctx;

  // Transform collections to UI format: { name: { kind, config } }
  const collections: Record<string, { kind: 'collection'; config: unknown }> = {};
  for (const [name, col] of Object.entries(config.collections ?? {})) {
    collections[name] = {
      kind: 'collection',
      config: {
        label: col.config.label,
        description: col.config.description,
        path: col.config.path,
        slugField: col.config.slugField,
        schema: col.config.schema,
      },
    };
  }

  // Transform singletons to UI format: { name: { kind, config } }
  const singletons: Record<string, { kind: 'singleton'; config: unknown }> = {};
  for (const [name, single] of Object.entries(config.singletons ?? {})) {
    singletons[name] = {
      kind: 'singleton',
      config: {
        label: single.config.label,
        description: single.config.description,
        path: single.config.path,
        schema: single.config.schema,
      },
    };
  }

  const schema = {
    storage: config.storage,
    collections,
    singletons,
    publicSiteUrl: process.env.PUBLIC_SITE_URL,
    auth: !!config.auth, // Send boolean indicating if auth is enabled
  };

  return { success: true, data: schema };
};

/**
 * List all collections
 */
export const listCollections: ApiHandler = async (ctx) => {
  const { config } = ctx;

  const collections = Object.entries(config.collections ?? {}).map(([name, col]) => ({
    name,
    label: col.config.label,
    description: col.config.description,
  }));

  return { success: true, data: collections };
};

/**
 * Get a single collection definition
 */
export const getCollection: ApiHandler = async (ctx, req) => {
  const { config } = ctx;
  const { collection: collectionName } = req.params;

  const collection = config.collections?.[collectionName];
  if (!collection) {
    return { success: false, error: `Collection "${collectionName}" not found` };
  }

  return {
    success: true,
    data: {
      name: collectionName,
      label: collection.config.label,
      description: collection.config.description,
      path: collection.config.path,
      slugField: collection.config.slugField,
      schema: collection.config.schema,
    },
  };
};

/**
 * List entries in a collection
 */
export const listEntries: ApiHandler = async (ctx, req) => {
  const { config, storage } = ctx;
  const { collection: collectionName } = req.params;
  const { page, limit, sortBy, sortOrder, search } = req.query;

  console.log('[API] listEntries:', { collectionName, hasStorage: !!storage });

  const contentManager = new ContentManager({ config, storage });

  try {
    const result = await contentManager.listEntries(collectionName, {
      page: page ? parseInt(String(page), 10) : undefined,
      limit: limit ? parseInt(String(limit), 10) : undefined,
      sortBy: sortBy as string | undefined,
      sortOrder: sortOrder as 'asc' | 'desc' | undefined,
      search: search as string | undefined,
    });

    const pageNum = page ? parseInt(String(page), 10) : 1;
    const limitNum = limit ? parseInt(String(limit), 10) : 20;

    return {
      success: true,
      data: {
        items: result.entries,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: result.total,
          totalPages: Math.ceil(result.total / limitNum),
        },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to list entries',
    };
  }
};

/**
 * Get a single entry
 */
export const getEntry: ApiHandler = async (ctx, req) => {
  const { config, storage } = ctx;
  const { collection: collectionName, slug } = req.params;

  const contentManager = new ContentManager({ config, storage });

  try {
    const entry = await contentManager.getEntry(collectionName, slug);

    if (!entry) {
      return { success: false, error: `Entry "${slug}" not found` };
    }

    return { success: true, data: entry };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to get entry',
    };
  }
};

/**
 * Create a new entry
 */
export const createEntry: ApiHandler = async (ctx, req) => {
  const { config, storage, rootDir } = ctx;
  const { collection: collectionName } = req.params;
  const body = req.body as { fields?: Record<string, unknown>; content?: string; commit?: boolean };

  const collection = config.collections?.[collectionName];
  if (!collection) {
    return { success: false, error: `Collection "${collectionName}" not found` };
  }

  // Merge with defaults
  const defaults = getDefaultValues(collection.config.schema);
  const fields = { ...defaults, ...body.fields };

  // Validate
  const validation = validateEntry(collection.config.schema, {
    fields: fields as EntryData<Schema>['fields'],
    content: body.content,
  });

  if (!validation.success) {
    return {
      success: false,
      error: `Validation failed: ${validation.errors.issues.map((i) => i.message).join(', ')}`,
    };
  }

  const contentManager = new ContentManager({ config, storage });

  try {
    // Generate commit message if git is enabled
    const commitMessage = config.git?.autoCommit
      ? config.git.commitMessage?.('create', collectionName, 'new') ||
        `Create ${collectionName} entry`
      : undefined;

    const entry = await contentManager.createEntry(
      collectionName,
      {
        fields: fields as EntryData<Schema>['fields'],
        content: body.content,
      },
      commitMessage
    );

    // Commit if requested (only for local storage with git enabled)
    if (body.commit && config.storage.kind !== 'github') {
      const gitManager = new GitManager({ rootDir, config: config.git });
      await gitManager.add('.');
      await gitManager.commit(`create: ${collectionName}/${entry.slug}`);
    }

    return { success: true, data: entry };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to create entry',
    };
  }
};

/**
 * Update an existing entry
 */
export const updateEntry: ApiHandler = async (ctx, req) => {
  const { config, storage, rootDir } = ctx;
  const { collection: collectionName, slug } = req.params;
  const body = req.body as { fields?: Record<string, unknown>; content?: string; commit?: boolean };

  const collection = config.collections?.[collectionName];
  if (!collection) {
    return { success: false, error: `Collection "${collectionName}" not found` };
  }

  const contentManager = new ContentManager({ config, storage });

  // Get existing entry
  const existing = await contentManager.getEntry(collectionName, slug);
  if (!existing) {
    return { success: false, error: `Entry "${slug}" not found` };
  }

  // Merge with existing
  const fields = { ...existing.data.fields, ...body.fields };
  const content = body.content ?? existing.data.content;

  // Validate
  const validation = validateEntry(collection.config.schema, {
    fields: fields as EntryData<Schema>['fields'],
    content,
  });

  if (!validation.success) {
    return {
      success: false,
      error: `Validation failed: ${validation.errors.issues.map((i) => i.message).join(', ')}`,
    };
  }

  try {
    // Generate commit message
    const commitMessage = config.git?.autoCommit
      ? config.git.commitMessage?.('update', collectionName, slug) ||
        `Update ${collectionName}/${slug}`
      : undefined;

    const entry = await contentManager.updateEntry(
      collectionName,
      slug,
      {
        fields: fields as EntryData<Schema>['fields'],
        content,
      },
      commitMessage
    );

    // Commit if requested (only for local storage with git enabled)
    if (body.commit && config.storage.kind !== 'github') {
      const gitManager = new GitManager({ rootDir, config: config.git });
      await gitManager.add('.');
      await gitManager.commit(`update: ${collectionName}/${slug}`);
    }

    return { success: true, data: entry };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to update entry',
    };
  }
};

/**
 * Delete an entry
 */
export const deleteEntry: ApiHandler = async (ctx, req) => {
  const { config, storage } = ctx;
  const { collection: collectionName, slug } = req.params;

  const contentManager = new ContentManager({ config, storage });

  try {
    // Generate commit message
    const commitMessage = config.git?.autoCommit
      ? config.git.commitMessage?.('delete', collectionName, slug) ||
        `Delete ${collectionName}/${slug}`
      : undefined;

    await contentManager.deleteEntry(collectionName, slug, commitMessage);
    return { success: true, data: { deleted: true } };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete entry',
    };
  }
};
