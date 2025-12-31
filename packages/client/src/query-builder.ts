import type { Schema } from '@static-admin/core';
import type {
  Entry,
  ListApiResponse,
  Filters,
  SortOrder,
  ClientQueryBuilder as IClientQueryBuilder,
  ApiErrorResponse,
} from './types';

/**
 * Query state for building API requests
 */
interface QueryState<S extends Schema> {
  filters: Filters<S>;
  sortField?: string;
  sortOrder?: SortOrder;
  limitCount?: number;
  pageNum?: number;
  searchQuery?: string;
  previewMode: boolean;
}

/**
 * Options for creating a query builder
 */
export interface QueryBuilderOptions {
  baseUrl: string;
  collection: string;
  fetchFn: typeof fetch;
  headers: Record<string, string>;
}

/**
 * Client-side query builder for making API requests
 * Immutable - each method returns a new instance
 */
export class ClientQueryBuilder<S extends Schema = Schema>
  implements IClientQueryBuilder<S>
{
  private readonly options: QueryBuilderOptions;
  private readonly state: QueryState<S>;

  constructor(options: QueryBuilderOptions, state?: QueryState<S>) {
    this.options = options;
    this.state = state ?? {
      filters: {},
      previewMode: false,
    };
  }

  /**
   * Create a new instance with updated state
   */
  private clone(updates: Partial<QueryState<S>>): ClientQueryBuilder<S> {
    return new ClientQueryBuilder(this.options, {
      ...this.state,
      ...updates,
    });
  }

  /**
   * Build query string from current state
   */
  private buildQueryString(): string {
    const params = new URLSearchParams();

    // Add filters
    for (const [key, value] of Object.entries(this.state.filters)) {
      if (value !== undefined && value !== null) {
        params.set(`filter[${key}]`, String(value));
      }
    }

    // Add sort
    if (this.state.sortField) {
      params.set('sort', this.state.sortField);
      params.set('order', this.state.sortOrder ?? 'desc');
    }

    // Add pagination
    if (this.state.pageNum !== undefined) {
      params.set('page', String(this.state.pageNum));
    }
    if (this.state.limitCount !== undefined) {
      params.set('limit', String(this.state.limitCount));
    }

    // Add search
    if (this.state.searchQuery) {
      params.set('search', this.state.searchQuery);
    }

    // Add preview mode
    if (this.state.previewMode) {
      params.set('preview', 'true');
    }

    const queryString = params.toString();
    return queryString ? `?${queryString}` : '';
  }

  /**
   * Make a fetch request to the API
   */
  private async request<T>(path: string): Promise<T> {
    const url = `${this.options.baseUrl}/${path}`;
    const response = await this.options.fetchFn(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
        ...this.options.headers,
      },
      credentials: 'include', // Include cookies for authentication
    });

    if (!response.ok) {
      const error = (await response.json()) as ApiErrorResponse;
      throw new Error(error.error ?? `HTTP ${response.status}`);
    }

    return response.json() as Promise<T>;
  }

  // Query building methods (return new instance)

  filter(filters: Filters<S>): ClientQueryBuilder<S> {
    return this.clone({
      filters: { ...this.state.filters, ...filters },
    });
  }

  sort(field: keyof S | string, order: SortOrder = 'desc'): ClientQueryBuilder<S> {
    return this.clone({
      sortField: String(field),
      sortOrder: order,
    });
  }

  limit(count: number): ClientQueryBuilder<S> {
    return this.clone({
      limitCount: count,
    });
  }

  page(num: number): ClientQueryBuilder<S> {
    return this.clone({
      pageNum: num,
    });
  }

  search(query: string): ClientQueryBuilder<S> {
    return this.clone({
      searchQuery: query,
    });
  }

  preview(): ClientQueryBuilder<S> {
    return this.clone({
      previewMode: true,
    });
  }

  // Execution methods

  /**
   * Get a single entry by slug
   */
  async get(slug: string): Promise<Entry<S> | null> {
    try {
      const queryString = this.state.previewMode ? '?preview=true' : '';
      const result = await this.request<{ data: Entry<S> }>(
        `${this.options.collection}/${slug}${queryString}`
      );
      return result.data;
    } catch (error) {
      if (error instanceof Error && error.message.includes('404')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Get all entries matching the query
   */
  async all(): Promise<Entry<S>[]> {
    const queryString = this.buildQueryString();
    const result = await this.request<ListApiResponse<S>>(
      `${this.options.collection}${queryString}`
    );
    return result.data;
  }

  /**
   * Get paginated results
   */
  async paginate(limit?: number): Promise<ListApiResponse<S>> {
    let builder: ClientQueryBuilder<S> = this;
    if (limit !== undefined) {
      builder = builder.limit(limit);
    }
    const queryString = builder.buildQueryString();
    return this.request<ListApiResponse<S>>(
      `${this.options.collection}${queryString}`
    );
  }

  /**
   * Get the first entry matching the query
   */
  async first(): Promise<Entry<S> | null> {
    const entries = await this.limit(1).all();
    return entries[0] ?? null;
  }
}
