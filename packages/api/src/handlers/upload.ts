import { ContentManager } from '@static-admin/core';
import type { ApiHandler } from './types';

/**
 * Upload an image to an entry
 */
export const uploadImage: ApiHandler = async (ctx, req) => {
  const { config, storage } = ctx;
  const { collection: collectionName, slug } = req.params;
  const body = req.body as { filename: string; data: string };

  if (!body.filename || !body.data) {
    return { success: false, error: 'Missing filename or data' };
  }

  const contentManager = new ContentManager({ config, storage });

  try {
    // Decode base64 data
    const base64Data = body.data.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');

    const relativePath = await contentManager.saveImage(
      collectionName,
      slug,
      body.filename,
      buffer,
      `Upload image to ${collectionName}/${slug}`
    );

    return {
      success: true,
      data: {
        path: relativePath,
        url: `/${config.storage.contentPath}/${collectionName}/${slug}/${relativePath}`,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to upload image',
    };
  }
};
