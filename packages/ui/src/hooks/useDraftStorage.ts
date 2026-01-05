import { openDB, type IDBPDatabase } from 'idb';
import { useMemo } from 'react';
import {
  DRAFT_DB_NAME,
  DRAFT_DB_VERSION,
  DRAFT_STORE_NAME,
} from '../lib/constants';

export interface DraftData {
  key: string; // `${collectionName}/${slug}`
  collectionName: string;
  slug: string;
  fields: Record<string, unknown>;
  content: string;
  savedAt: Date;
}

type DraftDB = IDBPDatabase<{
  drafts: {
    key: string;
    value: DraftData;
  };
}>;

let dbPromise: Promise<DraftDB> | null = null;

function getDB(): Promise<DraftDB> {
  if (!dbPromise) {
    dbPromise = openDB<{
      drafts: {
        key: string;
        value: DraftData;
      };
    }>(DRAFT_DB_NAME, DRAFT_DB_VERSION, {
      upgrade(db) {
        if (!db.objectStoreNames.contains(DRAFT_STORE_NAME)) {
          db.createObjectStore(DRAFT_STORE_NAME, { keyPath: 'key' });
        }
      },
    });
  }
  return dbPromise;
}

function createKey(collectionName: string, slug: string): string {
  return `${collectionName}/${slug}`;
}

// Module-level functions for stable references
async function saveDraft(
  collectionName: string,
  slug: string,
  fields: Record<string, unknown>,
  content: string
): Promise<void> {
  const db = await getDB();
  const key = createKey(collectionName, slug);
  const draft: DraftData = {
    key,
    collectionName,
    slug,
    fields,
    content,
    savedAt: new Date(),
  };
  await db.put(DRAFT_STORE_NAME, draft);
}

async function loadDraft(
  collectionName: string,
  slug: string
): Promise<DraftData | null> {
  const db = await getDB();
  const key = createKey(collectionName, slug);
  const draft = await db.get(DRAFT_STORE_NAME, key);
  return draft ?? null;
}

async function deleteDraft(
  collectionName: string,
  slug: string
): Promise<void> {
  const db = await getDB();
  const key = createKey(collectionName, slug);
  await db.delete(DRAFT_STORE_NAME, key);
}

async function hasDraft(
  collectionName: string,
  slug: string
): Promise<boolean> {
  const db = await getDB();
  const key = createKey(collectionName, slug);
  const draft = await db.get(DRAFT_STORE_NAME, key);
  return draft !== undefined;
}

export interface UseDraftStorageResult {
  saveDraft: typeof saveDraft;
  loadDraft: typeof loadDraft;
  deleteDraft: typeof deleteDraft;
  hasDraft: typeof hasDraft;
}

// Stable object reference
const draftStorageApi: UseDraftStorageResult = {
  saveDraft,
  loadDraft,
  deleteDraft,
  hasDraft,
};

export function useDraftStorage(): UseDraftStorageResult {
  // Return the same object reference every time
  return useMemo(() => draftStorageApi, []);
}
