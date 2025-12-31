import type { ApiHandlers, ApiContext, ApiRequest } from './types';
import * as content from './content';
import * as upload from './upload';
import * as auth from './auth';

export type { ApiHandlers, ApiContext, ApiRequest, ApiResponse } from './types';

/**
 * Create all API handlers
 */
export function createApiHandlers(): ApiHandlers {
  return {
    // Schema
    getSchema: content.getSchema,

    // Collections
    listCollections: content.listCollections,
    getCollection: content.getCollection,

    // Entries
    listEntries: content.listEntries,
    getEntry: content.getEntry,
    createEntry: content.createEntry,
    updateEntry: content.updateEntry,
    deleteEntry: content.deleteEntry,

    // Upload
    uploadImage: upload.uploadImage,

    // Auth
    login: auth.login,
    logout: auth.logout,
    getMe: auth.getMe,
  };
}
