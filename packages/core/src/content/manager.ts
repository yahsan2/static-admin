import * as fs from 'node:fs';
import * as path from 'node:path';
import matter from 'gray-matter';
import slugify from 'slugify';
import type {
  StaticAdminConfig,
  Collection,
  CollectionConfig,
} from '../types/config';
import type {
  Entry,
  EntryData,
  EntryList,
  EntryListOptions,
  ContentFile,
  FrontmatterData,
} from '../types/content';
import type { Schema } from '../types/fields';

export interface ContentManagerOptions {
  config: StaticAdminConfig;
  rootDir: string;
}

/**
 * ContentManager handles all file system operations for content
 */
export class ContentManager {
  private config: StaticAdminConfig;
  private rootDir: string;
  private contentDir: string;

  constructor(options: ContentManagerOptions) {
    this.config = options.config;
    this.rootDir = options.rootDir;
    this.contentDir = path.join(this.rootDir, this.config.storage.contentPath);
  }

  /**
   * Get the content directory path
   */
  getContentDir(): string {
    return this.contentDir;
  }

  /**
   * Get the full path for a collection's content directory
   */
  getCollectionDir(collectionName: string): string {
    const collection = this.config.collections?.[collectionName];
    if (!collection) {
      throw new Error(`Collection "${collectionName}" not found`);
    }

    // Parse path pattern (e.g., 'posts/*' -> 'posts')
    const basePath = collection.config.path.replace(/\/?\*$/, '');
    return path.join(this.contentDir, basePath);
  }

  /**
   * Get the full path for an entry
   */
  getEntryPath(collectionName: string, slug: string): string {
    const collectionDir = this.getCollectionDir(collectionName);
    return path.join(collectionDir, slug, 'index.md');
  }

  /**
   * Get the images directory for an entry
   */
  getEntryImagesDir(collectionName: string, slug: string): string {
    const collectionDir = this.getCollectionDir(collectionName);
    return path.join(collectionDir, slug, 'images');
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

    const collectionDir = this.getCollectionDir(collectionName);

    // Check if directory exists
    if (!fs.existsSync(collectionDir)) {
      return { entries: [], total: 0 };
    }

    // Read all subdirectories
    const dirs = fs
      .readdirSync(collectionDir, { withFileTypes: true })
      .filter((dirent) => dirent.isDirectory())
      .map((dirent) => dirent.name);

    // Read entries
    const allEntries: Entry<S>[] = [];
    for (const slug of dirs) {
      try {
        const entry = await this.getEntry<S>(collectionName, slug);
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

    if (!fs.existsSync(entryPath)) {
      return null;
    }

    const fileContent = fs.readFileSync(entryPath, 'utf-8');
    const { data: frontmatter, content } = matter(fileContent);

    const stats = fs.statSync(entryPath);

    return {
      slug,
      collection: collectionName,
      data: {
        fields: frontmatter as Entry<S>['data']['fields'],
        content,
      },
      filePath: path.relative(this.contentDir, entryPath),
      updatedAt: stats.mtime,
      createdAt: stats.birthtime,
    };
  }

  /**
   * Create a new entry
   */
  async createEntry<S extends Schema>(
    collectionName: string,
    data: EntryData<S>
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
    if (fs.existsSync(entryPath)) {
      throw new Error(`Entry "${slug}" already exists in "${collectionName}"`);
    }

    // Create directory structure
    const entryDir = path.dirname(entryPath);
    fs.mkdirSync(entryDir, { recursive: true });

    // Create images directory
    const imagesDir = this.getEntryImagesDir(collectionName, slug);
    fs.mkdirSync(imagesDir, { recursive: true });

    // Write markdown file
    const fileContent = this.serializeEntry(data);
    fs.writeFileSync(entryPath, fileContent, 'utf-8');

    const stats = fs.statSync(entryPath);

    return {
      slug,
      collection: collectionName,
      data,
      filePath: path.relative(this.contentDir, entryPath),
      updatedAt: stats.mtime,
      createdAt: stats.birthtime,
    };
  }

  /**
   * Update an existing entry
   */
  async updateEntry<S extends Schema>(
    collectionName: string,
    slug: string,
    data: EntryData<S>
  ): Promise<Entry<S>> {
    const entryPath = this.getEntryPath(collectionName, slug);

    if (!fs.existsSync(entryPath)) {
      throw new Error(`Entry "${slug}" not found in "${collectionName}"`);
    }

    // Get original stats for createdAt
    const originalStats = fs.statSync(entryPath);

    // Write updated content
    const fileContent = this.serializeEntry(data);
    fs.writeFileSync(entryPath, fileContent, 'utf-8');

    const newStats = fs.statSync(entryPath);

    return {
      slug,
      collection: collectionName,
      data,
      filePath: path.relative(this.contentDir, entryPath),
      updatedAt: newStats.mtime,
      createdAt: originalStats.birthtime,
    };
  }

  /**
   * Delete an entry
   */
  async deleteEntry(collectionName: string, slug: string): Promise<void> {
    const entryDir = path.dirname(this.getEntryPath(collectionName, slug));

    if (!fs.existsSync(entryDir)) {
      throw new Error(`Entry "${slug}" not found in "${collectionName}"`);
    }

    // Remove entire entry directory (including images)
    fs.rmSync(entryDir, { recursive: true, force: true });
  }

  /**
   * Save an uploaded image
   */
  async saveImage(
    collectionName: string,
    slug: string,
    filename: string,
    buffer: Buffer
  ): Promise<string> {
    const imagesDir = this.getEntryImagesDir(collectionName, slug);

    // Ensure images directory exists
    if (!fs.existsSync(imagesDir)) {
      fs.mkdirSync(imagesDir, { recursive: true });
    }

    // Generate unique filename
    const ext = path.extname(filename);
    const baseName = path.basename(filename, ext);
    const safeName = slugify(baseName, { lower: true, strict: true });
    const uniqueName = `${safeName}-${Date.now()}${ext}`;
    const imagePath = path.join(imagesDir, uniqueName);

    // Write file
    fs.writeFileSync(imagePath, buffer);

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
