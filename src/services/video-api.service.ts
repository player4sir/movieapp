/**
 * Video API Proxy Service
 * 
 * Provides methods to interact with the external Video API with:
 * - Retry logic with exponential backoff
 * - Redis caching layer
 * - Error handling and fallback
 * - Stale data indicator support
 * - Source category support (normal/adult)
 * 
 * Requirements: 1.1, 2.1, 3.1, 3.4, 8.3
 */

import {
  VODListResponse,
  VODDetailResponse,
  VODItem,
  VODDetail,
  Category,
  PlaySource,
  PaginatedResponse,
} from '@/types';
import { parsePlayUrl } from '@/lib/play-url-parser';
import { getEnabledSourcesByCategory, type SourceCategory } from './video-source.service';

/**
 * Configuration for the Video API proxy
 */
interface VideoAPIConfig {
  baseUrl: string;
  timeout: number;
  maxRetries: number;
  cacheTTL: number;
  staleCacheTTL: number; // Extended TTL for stale cache fallback
}

/**
 * Default configuration
 */
const DEFAULT_CONFIG: VideoAPIConfig = {
  baseUrl: process.env.VIDEO_API_URL || 'http://caiji.dyttzyapi.com/api.php/provide/vod',
  timeout: 30000, // Increased to 30 seconds for slow external APIs
  maxRetries: 2, // Reduced retries to avoid long waits
  cacheTTL: 300, // 5 minutes
  staleCacheTTL: 3600, // 1 hour for stale cache
};

/**
 * Cache entry with metadata for stale data tracking
 */
interface CacheEntry<T> {
  data: T;
  expiry: number;
  staleExpiry: number;
  cachedAt: number;
}

/**
 * Result wrapper that includes stale data indicator
 */
export interface CacheResult<T> {
  data: T;
  isStale: boolean;
  cachedAt?: number;
}

/**
 * Simple in-memory cache with stale data support (can be replaced with Redis)
 * 
 * Requirements: 3.4, 8.3 - Cache fallback on API failure
 */
class CacheService {
  private cache: Map<string, CacheEntry<unknown>> = new Map();

  /**
   * Get cached data, returns null if not found or completely expired
   */
  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiry) {
      // Don't delete - keep for stale fallback
      return null;
    }
    return entry.data as T;
  }

  /**
   * Get cached data even if stale, for fallback scenarios
   */
  async getStale<T>(key: string): Promise<CacheResult<T> | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();

    // Completely expired (past stale expiry)
    if (now > entry.staleExpiry) {
      this.cache.delete(key);
      return null;
    }

    const isStale = now > entry.expiry;

    return {
      data: entry.data as T,
      isStale,
      cachedAt: entry.cachedAt,
    };
  }

  async set<T>(key: string, data: T, ttlSeconds: number, staleTTLSeconds?: number): Promise<void> {
    const now = Date.now();
    this.cache.set(key, {
      data,
      expiry: now + ttlSeconds * 1000,
      staleExpiry: now + (staleTTLSeconds || ttlSeconds * 2) * 1000,
      cachedAt: now,
    });
  }

  async delete(key: string): Promise<void> {
    this.cache.delete(key);
  }

  /**
   * Clear all cache entries
   */
  clear(): void {
    this.cache.clear();
  }
}

/**
 * Video API Proxy Service
 * 
 * Requirements: 3.4, 8.3 - Cache fallback on API failure
 */
export class VideoAPIProxy {
  private config: VideoAPIConfig;
  private cache: CacheService;

  constructor(config: Partial<VideoAPIConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
    this.cache = new CacheService();
  }

  /**
   * Delays execution for exponential backoff
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Fetches data with automatic failover to the next available source
   * 
   * @param sourceCategory - The category of sources to use
   * @param buildUrlFn - Function to build URL for a specific base URL
   * @param options - Fetch options
   */
  /**
   * Fetches data with automatic failover to the next available source
   * 
   * @param sourceCategory - The category of sources to use
   * @param buildUrlFn - Function to build URL for a specific base URL
   * @param options - Fetch options
   */
  private async fetchWithFailover<T>(
    sourceCategory: SourceCategory | undefined,
    buildUrlFn: (baseUrl: string) => string,
    options: {
      ac?: 'list' | 'detail';
      validate?: (data: T) => boolean;
    } = {}
  ): Promise<T> {
    // 1. Get all enabled sources for this category
    let sources: { name: string; apiUrl: string; timeout?: number }[] = [];

    if (sourceCategory) {
      try {
        const enabledSources = await getEnabledSourcesByCategory(sourceCategory);
        if (enabledSources.length > 0) {
          sources = enabledSources;
        }
      } catch (err) {
        console.warn(`[VideoAPI] Failed to get sources for category ${sourceCategory}`, err);
      }
    }

    // Default fallback ONLY if no category provided (to avoid cross-category bleeding)
    if (sources.length === 0 && !sourceCategory) {
      sources = [{
        name: 'Default',
        apiUrl: this.config.baseUrl,
        timeout: this.config.timeout
      }];
    }

    if (sources.length === 0) {
      throw new Error(`No enabled video sources found${sourceCategory ? ` for category '${sourceCategory}'` : ''}`);
    }

    let lastError: Error | null = null;
    const errors: string[] = [];

    // 2. Iterate through sources
    for (const source of sources) {
      const url = buildUrlFn(source.apiUrl);
      const timeout = source.timeout || this.config.timeout;

      console.log(`[VideoAPI] Trying source: ${source.name} (${url})`);

      try {
        // Try to fetch from this source with retries
        const result = await this.fetchWithRetry<T>(url, timeout, this.config.maxRetries);

        // Validate content if validator provided
        if (options.validate && !options.validate(result)) {
          throw new Error('Response validation failed (e.g. empty data)');
        }

        return result;
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn(`[VideoAPI] Source ${source.name} failed: ${errorMessage}`);
        errors.push(`${source.name}: ${errorMessage}`);
        lastError = error instanceof Error ? error : new Error(errorMessage);

        // Continue to next source...
      }
    }

    // 3. If all failed (including validation failures)
    // Return last error to be helpful, or a generic one
    throw lastError || new Error(`All sources failed. Errors: ${errors.join('; ')}`);
  }

  /**
   * Fetches data from a specific URL with retry logic
   */
  private async fetchWithRetry<T>(url: string, timeout: number, retries: number): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= retries + 1; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
          },
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          throw new Error(`API returned ${response.status}: ${response.statusText}`);
        }

        // Handle text/html responses that might occur on error pages
        const text = await response.text();
        try {
          return JSON.parse(text) as T;
        } catch {
          throw new Error('Invalid JSON response');
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt <= retries) {
          // Exponential backoff
          const backoffMs = Math.pow(2, attempt - 1) * 1000;
          await this.delay(backoffMs);
        }
      }
    }

    throw lastError || new Error('Failed to fetch after retries');
  }

  /**
   * Fetches with cache support and stale fallback
   * 
   * Requirements: 3.4, 8.3 - Serve cached content when API unavailable
   */
  private async fetchWithCache<T>(
    cacheKey: string,
    fetchFn: () => Promise<T>
  ): Promise<CacheResult<T>> {
    // Try fresh cache first
    const cached = await this.cache.get<T>(cacheKey);
    if (cached) {
      return { data: cached, isStale: false };
    }

    try {
      const data = await fetchFn();
      await this.cache.set(cacheKey, data, this.config.cacheTTL, this.config.staleCacheTTL);
      return { data, isStale: false };
    } catch (error) {
      // Try to return stale cache on error (cache fallback)
      const staleResult = await this.cache.getStale<T>(cacheKey);
      if (staleResult) {
        console.warn(`Using stale cache for ${cacheKey} due to API error`);
        return {
          data: staleResult.data,
          isStale: true,
          cachedAt: staleResult.cachedAt,
        };
      }
      throw error;
    }
  }

  /**
   * Legacy method for backward compatibility - returns data without stale indicator
   */
  private async fetchWithCacheLegacy<T>(
    cacheKey: string,
    fetchFn: () => Promise<T>
  ): Promise<T> {
    const result = await this.fetchWithCache(cacheKey, fetchFn);
    return result.data;
  }


  /**
   * Builds URL with query parameters
   * @param params - Query parameters
   * @param ac - API action type: 'list' for basic info, 'detail' for full info including vod_pic
   */
  private buildUrl(params: Record<string, string | number | undefined>, ac: 'list' | 'detail' = 'list'): string {
    return this.buildUrlWithBase(this.config.baseUrl, params, ac);
  }

  /**
   * Builds URL with a specific base URL and query parameters
   * @param baseUrl - The base URL to use
   * @param params - Query parameters
   * @param ac - API action type: 'list' for basic info, 'detail' for full info including vod_pic
   */
  private buildUrlWithBase(baseUrl: string, params: Record<string, string | number | undefined>, ac: 'list' | 'detail' = 'list'): string {
    const url = new URL(baseUrl);
    url.searchParams.set('ac', ac);

    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null && value !== '') {
        url.searchParams.set(key, String(value));
      }
    }

    return url.toString();
  }

  /**
   * Fetches VOD list with optional filtering
   * 
   * @param params - Query parameters
   * @returns Paginated VOD list response with stale indicator
   * 
   * Requirements: 3.4, 8.3 - Cache fallback on API failure
   */
  async fetchVODList(params: {
    page?: number;
    typeId?: number;
    hours?: number;
    sourceCategory?: SourceCategory;
  } = {}): Promise<PaginatedResponse<VODItem> & { isStale?: boolean; cachedAt?: number }> {
    const { page = 1, typeId, hours, sourceCategory } = params;

    const cacheKey = `vod:detail-list:${sourceCategory || 'default'}:${page}:${typeId || 'all'}:${hours || 'all'}`;

    // Use failover strategy
    const result = await this.fetchWithCache<VODListResponse>(cacheKey, () => {
      return this.fetchWithFailover<VODListResponse>(
        sourceCategory,
        (baseUrl) => this.buildUrlWithBase(baseUrl, {
          pg: page,
          t: typeId,
          h: hours,
        }, 'detail'),
        {
          validate: (data) => !!(data && data.list && data.list.length > 0)
        }
      );
    });

    return {
      data: result.data.list || [],
      pagination: {
        page: result.data.page,
        pageSize: parseInt(result.data.limit) || 20,
        total: result.data.total,
        totalPages: result.data.pagecount,
      },
      isStale: result.isStale,
      cachedAt: result.cachedAt,
    };
  }

  /**
   * Fetches VOD detail by ID(s)
   * 
   * @param ids - Single ID or array of IDs
   * @returns VOD detail(s) with stale indicator
   * 
   * Requirements: 3.4 - Cache fallback on API failure
   */
  async fetchVODDetail(ids: number | number[]): Promise<VODDetail[]> {
    const idArray = Array.isArray(ids) ? ids : [ids];
    const idsStr = idArray.join(',');

    const cacheKey = `vod:detail:${idsStr}`;

    // For plain fetchVODDetail, we might want to guess category or try both?
    // For now, let's assume 'default' (or check all if we had a way)
    // Since we don't have sourceCategory here, we might miss some content if it's split.
    // However, usually detailed fetch comes from a known ID. 
    // Ideally we should pass category here too.

    const result = await this.fetchWithCache<VODDetailResponse>(cacheKey, () => {
      return this.fetchWithFailover<VODDetailResponse>(
        undefined, // Try default/all sources? Or maybe we should loop all categories?
        // Current implementation of fetchWithFailover with undefined category tries default config
        // which might be sufficient for simple setups.
        // Better: Try to find which source has this ID? No efficient way without category.
        (baseUrl) => {
          const url = new URL(baseUrl);
          url.searchParams.set('ac', 'detail');
          url.searchParams.set('ids', idsStr);
          return url.toString();
        }
      );
    });

    return result.data.list || [];
  }

  /**
   * Fetches VOD detail by ID(s) with stale indicator
   * 
   * @param ids - Single ID or array of IDs
   * @param sourceCategory - Optional source category to use specific API
   * @returns VOD detail(s) with stale indicator
   * 
   * Requirements: 3.4 - Cache fallback on API failure
   */
  async fetchVODDetailWithStale(ids: number | number[], sourceCategory?: SourceCategory): Promise<{ data: VODDetail[]; isStale?: boolean; cachedAt?: number }> {
    const idArray = Array.isArray(ids) ? ids : [ids];
    const idsStr = idArray.join(',');

    const cacheKey = `vod:detail:${sourceCategory || 'default'}:${idsStr}`;

    const result = await this.fetchWithCache<VODDetailResponse>(cacheKey, () => {
      return this.fetchWithFailover<VODDetailResponse>(
        sourceCategory,
        (baseUrl) => {
          const url = new URL(baseUrl);
          url.searchParams.set('ac', 'detail');
          url.searchParams.set('ids', idsStr);
          return url.toString();
        },
        {
          validate: (data) => !!(data && data.list && data.list.length > 0)
        }
      );
    });

    return {
      data: result.data.list || [],
      isStale: result.isStale,
      cachedAt: result.cachedAt,
    };
  }

  /**
   * Searches VODs by keyword
   * 
   * @param keyword - Search keyword
   * @param page - Page number
   * @param sourceCategory - Optional source category to use specific API
   * @returns Paginated search results with stale indicator
   * 
   * Requirements: 3.4, 8.3 - Cache fallback on API failure
   */
  async searchVOD(keyword: string, page: number = 1, sourceCategory?: SourceCategory): Promise<PaginatedResponse<VODItem> & { isStale?: boolean; cachedAt?: number }> {
    if (!keyword || !keyword.trim()) {
      throw new Error('Search keyword cannot be empty');
    }

    const trimmedKeyword = keyword.trim();
    const cacheKey = `vod:search:${sourceCategory || 'default'}:${trimmedKeyword}:${page}`;

    // Use failover strategy
    const result = await this.fetchWithCache<VODListResponse>(cacheKey, () => {
      return this.fetchWithFailover<VODListResponse>(
        sourceCategory,
        (baseUrl) => this.buildUrlWithBase(baseUrl, {
          pg: page,
          wd: trimmedKeyword,
        }, 'detail'),
        {
          validate: (data) => !!(data && data.list && data.list.length > 0)
        }
      );
    });

    return {
      data: result.data.list || [],
      pagination: {
        page: result.data.page,
        pageSize: parseInt(result.data.limit) || 20,
        total: result.data.total,
        totalPages: result.data.pagecount,
      },
      isStale: result.isStale,
      cachedAt: result.cachedAt,
    };
  }


  /**
   * Fetches all categories
   * 
   * @param sourceCategory - Optional source category to filter by
   * @returns Array of categories with stale indicator
   * 
   * Requirements: 8.3 - Cache fallback on API failure
   */
  async fetchCategories(sourceCategory?: SourceCategory): Promise<Category[]> {
    const cacheKey = `vod:categories:${sourceCategory || 'default'}`;
    // Use failover strategy
    const result = await this.fetchWithCache<VODListResponse>(cacheKey, () => {
      return this.fetchWithFailover<VODListResponse>(
        sourceCategory,
        (baseUrl) => this.buildUrlWithBase(baseUrl, { pg: 1 })
      );
    });

    return result.data.class || [];
  }

  /**
   * Fetches all categories with stale indicator
   * 
   * @param sourceCategory - Optional source category to filter by
   * @returns Array of categories with stale indicator
   * 
   * Requirements: 8.3 - Cache fallback on API failure
   */
  async fetchCategoriesWithStale(sourceCategory?: SourceCategory): Promise<{ data: Category[]; isStale?: boolean; cachedAt?: number }> {
    const cacheKey = `vod:categories:${sourceCategory || 'default'}`;
    const result = await this.fetchWithCache<VODListResponse>(cacheKey, () => {
      return this.fetchWithFailover<VODListResponse>(
        sourceCategory,
        (baseUrl) => this.buildUrlWithBase(baseUrl, { pg: 1 })
      );
    });

    return {
      data: result.data.class || [],
      isStale: result.isStale,
      cachedAt: result.cachedAt,
    };
  }

  /**
   * Parses play URLs from VOD detail into structured format
   * 
   * @param vodDetail - VOD detail object
   * @returns Array of play sources with episodes
   */
  parsePlayUrls(vodDetail: VODDetail): PlaySource[] {
    return parsePlayUrl(vodDetail.vod_play_url, vodDetail.vod_play_from);
  }

  /**
   * Fetches data explicitly from a specific source ID (for admin audit/browse)
   */
  async fetchFromSource(
    sourceId: string,
    params: {
      ac?: 'list' | 'detail';
      pg?: number;
      t?: number;
      h?: number;
      wd?: string;
    }
  ): Promise<VODListResponse> {
    const { getSourceById } = await import('./video-source.service');
    const source = await getSourceById(sourceId);

    if (!source) {
      throw new Error('Source not found');
    }

    const { ac = 'list', ...restParams } = params;
    const url = this.buildUrlWithBase(source.apiUrl, restParams, ac);

    // Use extended timeout for manual admin operations if needed, or default
    const timeout = source.timeout || this.config.timeout;

    // We don't use cache for direct source browsing (we want fresh data)
    // We also don't use failover (we want to test THIS source)
    return this.fetchWithRetry<VODListResponse>(url, timeout, 1);
  }

  /**
   * Clears all cached data
   */
  async clearCache(): Promise<void> {
    // In a real implementation, this would clear Redis cache
    this.cache.clear();
  }
}

/**
 * Singleton instance of the Video API proxy
 */
let videoAPIInstance: VideoAPIProxy | null = null;

/**
 * Gets the singleton Video API proxy instance
 */
export function getVideoAPI(): VideoAPIProxy {
  if (!videoAPIInstance) {
    videoAPIInstance = new VideoAPIProxy();
  }
  return videoAPIInstance;
}

/**
 * Creates a new Video API proxy instance with custom config
 */
export function createVideoAPI(config: Partial<VideoAPIConfig>): VideoAPIProxy {
  return new VideoAPIProxy(config);
}
