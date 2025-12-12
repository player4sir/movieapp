/**
 * SWR Global Configuration
 * Centralized caching and fetching configuration
 * 
 * Cache Strategy Balance:
 * - Use Stale-While-Revalidate pattern for best UX
 * - Short cache times + background refresh = fresh data + fast loading
 * - Pull-to-refresh gives users control over updates
 */

import { SWRConfiguration } from 'swr';

// Global fetcher with error handling
export const globalFetcher = async (url: string) => {
  const res = await fetch(url);
  
  const contentType = res.headers.get('content-type');
  const isJson = contentType?.includes('application/json');

  if (!res.ok) {
    if (isJson) {
      const error = await res.json();
      throw new Error(error.message || `Request failed (${res.status})`);
    }
    throw new Error(`Request failed (${res.status})`);
  }

  if (!isJson) {
    throw new Error('Invalid response format: expected JSON');
  }

  return res.json();
};

/**
 * Cache time constants (in milliseconds)
 * 
 * Strategy:
 * - SWR dedupingInterval: prevents duplicate requests within this window
 * - HTTP Cache-Control: browser/CDN caching
 * - PWA runtimeCaching: offline support + performance
 * 
 * All three layers should be coordinated for consistency
 */
export const CACHE_TIME = {
  // For VOD list - updates frequently, need fresh data
  LIST: 2 * 60 * 1000,        // 2 minutes
  // For VOD detail - moderate updates
  DETAIL: 5 * 60 * 1000,      // 5 minutes  
  // For categories - rarely changes
  CATEGORIES: 30 * 60 * 1000, // 30 minutes
  // For search - always fresh
  SEARCH: 0,                  // No cache
} as const;

// HTTP Cache-Control header values (in seconds)
export const HTTP_CACHE = {
  LIST: 60,           // 1 minute - short cache, SWR handles revalidation
  DETAIL: 2 * 60,     // 2 minutes
  CATEGORIES: 5 * 60, // 5 minutes - HTTP cache shorter than SWR for freshness
  SEARCH: 0,          // No cache
} as const;

// Default SWR configuration
export const swrConfig: SWRConfiguration = {
  fetcher: globalFetcher,
  revalidateOnFocus: false,      // Don't refetch on tab focus (annoying)
  revalidateOnReconnect: true,   // Refetch when network reconnects
  errorRetryCount: 3,
  errorRetryInterval: 5000,
  shouldRetryOnError: true,
};

// Specific configurations for different data types
export const swrConfigs = {
  // For categories - rarely changes, long cache
  categories: {
    ...swrConfig,
    dedupingInterval: CACHE_TIME.CATEGORIES,
    revalidateIfStale: true,     // Background refresh when stale
    revalidateOnMount: true,     // Always fetch on mount (Next.js 15 compatibility)
  },
  // For VOD list - updates frequently
  list: {
    ...swrConfig,
    dedupingInterval: CACHE_TIME.LIST,
    revalidateIfStale: true,
    revalidateOnMount: true,     // Always check for updates
  },
  // For VOD detail pages
  detail: {
    ...swrConfig,
    dedupingInterval: CACHE_TIME.DETAIL,
    revalidateIfStale: true,
  },
  // For search - always fresh
  search: {
    ...swrConfig,
    dedupingInterval: CACHE_TIME.SEARCH,
    revalidateIfStale: false,
  },
} as const;
