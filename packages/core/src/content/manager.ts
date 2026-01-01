import matter from 'gray-matter';
import slugify from 'slugify';
import type { StaticAdminConfig } from '../types/config';
import type {
  Entry,
  EntryData,
  EntryList,
  EntryListOptions,
} from '../types/content';
import type { Schema } from '../types/fields';
import type { StorageAdapter } from '../storage/adapters/types';

export interface ContentManagerOptions {
  config: StaticAdminConfig;
  storage: StorageAdapter;
}

/**
 * ContentManager handles all content operations using a StorageAdapter
 */
export class ContentManager {
  private config: StaticAdminConfig;
  private storage: StorageAdapter;

  constructor(options: ContentManagerOptions) {
    this.config = options.config;
    this.storage = options.storage;
  }

  /**
   * Get the relative path for a collection's content directory
   */
  private getCollectionPath(collectionName: string): string {
    const collection = this.config.collections?.[collectionName];
    if (!collection) {
      throw new Error(`Collection "${collectionName}" not found`);
    }

    // Parse path pattern (e.g., 'posts/*' -> 'posts')
    return collection.config.path.replace(/\/?\*$/, '');
  }

  /**
   * Get the relative path for an entry file
   */
  private getEntryPath(collectionName: string, slug: string): string {
    const collectionPath = this.getCollectionPath(collectionName);
    return `${collectionPath}/${slug}/index.md`;
  }

  /**
   * Get the relative path for an entry's images directory
   */
  private getEntryImagesPath(collectionName: string, slug: string): string {
    const collectionPath = this.getCollectionPath(collectionName);
    return `${collectionPath}/${slug}/images`;
  }

  /**
   * Get the relative path for an entry directory
   */
  private getEntryDirPath(collectionName: string, slug: string): string {
    const collectionPath = this.getCollectionPath(collectionName);
    return `${collectionPath}/${slug}`;
  }

  /**
   * List all entries in a collection
   */
  async listEntries<S extends Schema>(
    collectionName: string,
    options: EntryListOptions = {}
  ): Promise<EntryList<S>> {
    const collection = this.config.collections?.[collectionName];
    if (!collection) {
      throw new Error(`Collection "${collectionName}" not found`);
    }

    const collectionPath = this.getCollectionPath(collectionName);
    console.log('[ContentManager] listEntries:', { collectionName, collectionPath });

    // Read all subdirectories
    const entries = await this.storage.readDirectory(collectionPath);
    console.log('[ContentManager] readDirectory result:', { entriesCount: entries.length });
    const dirs = entries.filter((e) => e.isDirectory);
    console.log('[ContentManager] directories:', { dirsCount: dirs.length });

    // Read entries
    const allEntries: Entry<S>[] = [];
    for (const dir of dirs) {
      try {
        const entry = await this.getEntry<S>(collectionName, dir.name);
        if (entry) {
          allEntries.push(entry);
        }
      } catch {
        // Skip invalid entries
      }
    }

    // Apply search filter
    let filteredEntries = allEntries;
    if (options.search) {
      const searchLower = options.search.toLowerCase();
      filteredEntries = allEntries.filter((entry) => {
        const fields = entry.data.fields;
        return Object.values(fields).some((value) =>
          String(value).toLowerCase().includes(searchLower)
        );
      });
    }

    // Apply sorting
    const sortBy = options.sortBy || 'updatedAt';
    const sortOrder = options.sortOrder || 'desc';
    filteredEntries.sort((a, b) => {
      let aVal: unknown = a.data.fields[sortBy as keyof typeof a.data.fields];
      let bVal: unknown = b.data.fields[sortBy as keyof typeof b.data.fields];

      // Handle date fields
      if (sortBy === 'updatedAt') {
        aVal = a.updatedAt;
        bVal = b.updatedAt;
      } else if (sortBy === 'createdAt') {
        aVal = a.createdAt;
        bVal = b.createdAt;
      }

      if (aVal instanceof Date && bVal instanceof Date) {
        return sortOrder === 'asc'
          ? aVal.getTime() - bVal.getTime()
          : bVal.getTime() - aVal.getTime();
      }

      const aStr = String(aVal || '');
      const bStr = String(bVal || '');
      return sortOrder === 'asc'
        ? aStr.localeCompare(bStr)
        : bStr.localeCompare(aStr);
    });

    // Apply pagination
    const total = filteredEntries.length;
    const page = options.page || 1;
    const limit = options.limit || 20;
    const start = (page - 1) * limit;
    const paginatedEntries = filteredEntries.slice(start, start + limit);

    return {
      entries: paginatedEntries,
      total,
    };
  }

  /**
   * Get a single entry by slug
   */
  async getEntry<S extends Schema>(
    collectionName: string,
    slug: string
  ): Promise<Entry<S> | null> {
    const entryPath = this.getEntryPath(collectionName, slug);

    const file = await this.storage.readFile(entryPath);
    if (!file) {
      return null;
    }

    const { data: frontmatter, content } = matter(file.content);

    return {
      slug,
      collection: collectionName,
      data: {
        fields: frontmatter as Entry<S>['data']['fields'],
        content,
      },
      filePath: entryPath,
      updatedAt: file.metadata.updatedAt,
      createdAt: file.metadata.createdAt,
    };
  }

  /**
   * Create a new entry
   */
  async createEntry<S extends Schema>(
    collectionName: string,
    data: EntryData<S>,
    commitMessage?: string
  ): Promise<Entry<S>> {
    const collection = this.config.collections?.[collectionName];
    if (!collection) {
      throw new Error(`Collection "${collectionName}" not found`);
    }

    // Get slug from slugField
    const slugField = collection.config.slugField;
    const titleValue = data.fields[slugField as keyof typeof data.fields];
    if (!titleValue) {
      throw new Error(`Slug field "${slugField}" is required`);
    }

    const slug = this.generateSlug(String(titleValue));

    // Check if entry already exists
    const entryPath = this.getEntryPath(collectionName, slug);
    if (await this.storage.exists(entryPath)) {
      throw new Error(`Entry "${slug}" already exists in "${collectionName}"`);
    }

    // Serialize and write markdown file
    const fileContent = this.serializeEntry(data);
    const message = commitMessage || `Create ${collectionName}/${slug}`;
    const result = await this.storage.writeFile(entryPath, fileContent, message);

    // Create images directory (no-op for GitHub)
    const imagesPath = this.getEntryImagesPath(collectionName, slug);
    await this.storage.createDirectory(imagesPath);

    return {
      slug,
      collection: collectionName,
      data,
      filePath: entryPath,
      updatedAt: new Date(),
      createdAt: new Date(),
    };
  }

  /**
   * Update an existing entry
   */
  async updateEntry<S extends Schema>(
    collectionName: string,
    slug: string,
    data: EntryData<S>,
    commitMessage?: string
  ): Promise<Entry<S>> {
    const entryPath = this.getEntryPath(collectionName, slug);

    // Get original entry for createdAt
    const existing = await this.storage.readFile(entryPath);
    if (!existing) {
      throw new Error(`Entry "${slug}" not found in "${collectionName}"`);
    }

    // Write updated content
    const fileContent = this.serializeEntry(data);
    const message = commitMessage || `Update ${collectionName}/${slug}`;
    await this.storage.writeFile(entryPath, fileContent, message);

    return {
      slug,
      collection: collectionName,
      data,
      filePath: entryPath,
      updatedAt: new Date(),
      createdAt: existing.metadata.createdAt,
    };
  }

  /**
   * Delete an entry
   */
  async deleteEntry(
    collectionName: string,
    slug: string,
    commitMessage?: string
  ): Promise<void> {
    const entryPath = this.getEntryPath(collectionName, slug);

    if (!(await this.storage.exists(entryPath))) {
      throw new Error(`Entry "${slug}" not found in "${collectionName}"`);
    }

    // Remove entire entry directory (including images)
    const entryDirPath = this.getEntryDirPath(collectionName, slug);
    const message = commitMessage || `Delete ${collectionName}/${slug}`;
    await this.storage.deleteDirectory(entryDirPath, message);
  }

  /**
   * Save an uploaded image
   */
  async saveImage(
    collectionName: string,
    slug: string,
    filename: string,
    buffer: Buffer,
    commitMessage?: string
  ): Promise<string> {
    // Generate unique filename
    const ext = filename.includes('.') ? filename.substring(filename.lastIndexOf('.')) : '';
    const baseName = filename.includes('.') ? filename.substring(0, filename.lastIndexOf('.')) : filename;
    const safeName = slugify(baseName, { lower: true, strict: true });
    const uniqueName = `${safeName}-${Date.now()}${ext}`;

    const imagePath = `${this.getEntryImagesPath(collectionName, slug)}/${uniqueName}`;
    const message = commitMessage || `Upload image ${uniqueName}`;

    await this.storage.writeBinaryFile(imagePath, buffer, message);

    // Return relative path from entry
    return `images/${uniqueName}`;
  }

  /**
   * Generate a URL-safe slug from text
   */
  private generateSlug(text: string): string {
    return slugify(text, {
      lower: true,
      strict: true,
      locale: 'ja',
    });
  }

  /**
   * Serialize entry data to markdown with frontmatter
   */
  private serializeEntry<S extends Schema>(data: EntryData<S>): string {
    const frontmatter = { ...data.fields };
    const content = data.content || '';

    return matter.stringify(content, frontmatter);
  }
}
