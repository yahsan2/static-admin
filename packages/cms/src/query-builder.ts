import type {
  ContentManager,
  Schema,
  Entry,
  EntryListOptions,
  InferSchemaType,
} from '@static-admin/core';
import type {
  IQueryBuilder,
  QueryOptions,
  FilterConditions,
  SortField,
  SortOrder,
  PaginatedResult,
  PaginationMeta,
} from './types';

/**
 * Default query options factory
 */
function createDefaultOptions<S extends Schema>(): QueryOptions<S> {
  return {
    filters: {} as FilterConditions<S>,
    sortOrder: 'desc',
    includeDrafts: false,
  };
}

/**
 * QueryBuilder provides a fluent API for querying content entries
 */
export class QueryBuilder<S extends Schema> implements IQueryBuilder<S> {
  private readonly contentManager: ContentManager;
  private readonly collectionName: string;
  private readonly options: QueryOptions<S>;
  private readonly isAuthenticated: boolean;

  constructor(
    contentManager: ContentManager,
    collectionName: string,
    options: QueryOptions<S> = createDefaultOptions<S>(),
    isAuthenticated: boolean = false
  ) {
    this.contentManager = contentManager;
    this.collectionName = collectionName;
    this.options = options;
    this.isAuthenticated = isAuthenticated;
  }

  /**
   * Create a new QueryBuilder with updated options (immutable pattern)
   */
  private clone(updates: Partial<QueryOptions<S>>): QueryBuilder<S> {
    return new QueryBuilder(
      this.contentManager,
      this.collectionName,
      { ...this.options, ...updates },
      this.isAuthenticated
    );
  }

  /**
   * Filter entries by field values
   */
  filter(conditions: FilterConditions<S>): QueryBuilder<S> {
    return this.clone({
      filters: { ...this.options.filters, ...conditions },
    });
  }

  /**
   * Sort entries by a field
   */
  sort(field: SortField<S>, order: SortOrder = 'desc'): QueryBuilder<S> {
    return this.clone({
      sortBy: field,
      sortOrder: order,
    });
  }

  /**
   * Limit the number of results
   */
  limit(n: number): QueryBuilder<S> {
    return this.clone({ limit: n });
  }

  /**
   * Set the page number for pagination
   */
  page(n: number): QueryBuilder<S> {
    return this.clone({ page: n });
  }

  /**
   * Search across text fields
   */
  search(query: string): QueryBuilder<S> {
    return this.clone({ search: query });
  }

  /**
   * Include draft entries in results
   * Note: This only takes effect when isAuthenticated is true
   */
  includeDrafts(): QueryBuilder<S> {
    return this.clone({ includeDrafts: true });
  }

  /**
   * Execute query and return all matching entries
   */
  async all(): Promise<Entry<S>[]> {
    const result = await this.execute();
    return result.entries;
  }

  /**
   * Execute query and return the first matching entry
   */
  async first(): Promise<Entry<S> | null> {
    const builder = this.clone({ limit: 1 });
    const result = await builder.execute();
    return result.entries[0] ?? null;
  }

  /**
   * Execute query and return paginated results
   */
  async paginate(pageSize: number = 20): Promise<PaginatedResult<S>> {
    const builder = this.clone({ limit: pageSize });
    return builder.execute();
  }

  /**
   * Get the count of matching entries
   */
  async count(): Promise<number> {
    const result = await this.execute();
    return result.pagination.total;
  }

  /**
   * Internal execution method
   */
  private async execute(): Promise<PaginatedResult<S>> {
    // Build options for ContentManager
    const listOptions: EntryListOptions = {
      page: this.options.page ?? 1,
      limit: this.options.limit ?? 100,
      sortBy: this.options.sortBy as string | undefined,
      sortOrder: this.options.sortOrder,
      search: this.options.search,
    };

    // Get entries from ContentManager
    const result = await this.contentManager.listEntries<S>(
      this.collectionName,
      listOptions
    );

    // Apply post-query filters
    let entries = result.entries;

    // Apply draft filtering
    entries = this.applyDraftFilter(entries);

    // Apply field filters
    entries = this.applyFieldFilters(entries);

    // Calculate pagination
    const total = entries.length;
    const page = this.options.page ?? 1;
    const limit = this.options.limit ?? 20;
    const totalPages = Math.ceil(total / limit);

    // Apply pagination to filtered results
    const start = (page - 1) * limit;
    const paginatedEntries = entries.slice(start, start + limit);

    const pagination: PaginationMeta = {
      page,
      limit,
      total,
      totalPages,
      hasNextPage: page < totalPages,
      hasPrevPage: page > 1,
    };

    return {
      entries: paginatedEntries,
      pagination,
    };
  }

  /**
   * Filter out draft entries unless authenticated and includeDrafts is true
   */
  private applyDraftFilter(entries: Entry<S>[]): Entry<S>[] {
    // If authenticated and includeDrafts is enabled, return all entries
    if (this.isAuthenticated && this.options.includeDrafts) {
      return entries;
    }

    // Otherwise, filter out drafts
    return entries.filter((entry) => {
      const fields = entry.data.fields as Record<string, unknown>;
      return fields['draft'] !== true;
    });
  }

  /**
   * Apply field filters to entries
   */
  private applyFieldFilters(entries: Entry<S>[]): Entry<S>[] {
    const filters = this.options.filters;
    const filterKeys = Object.keys(filters);

    if (filterKeys.length === 0) {
      return entries;
    }

    return entries.filter((entry) => {
      const fields = entry.data.fields as Record<string, unknown>;

      return filterKeys.every((key) => {
        const filterValue = filters[key as keyof typeof filters] as unknown;
        const fieldValue = fields[key];

        // Handle array fields (e.g., tags)
        if (Array.isArray(fieldValue)) {
          if (Array.isArray(filterValue)) {
            // Both are arrays - check if any filter value is in field value
            return filterValue.some((v) => fieldValue.includes(v));
          }
          // Filter is single value - check if it's in the array
          return fieldValue.includes(filterValue);
        }

        // Handle array filter value against single field
        if (Array.isArray(filterValue)) {
          return filterValue.includes(fieldValue);
        }

        // Simple equality check
        return fieldValue === filterValue;
      });
    });
  }
}
