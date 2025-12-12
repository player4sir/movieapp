'use client';

import useSWR from 'swr';
import useSWRInfinite from 'swr/infinite';
import { useState, useCallback, useMemo } from 'react';
import type { VODItem, Category } from '@/types/vod';
import { globalFetcher, swrConfigs } from '@/lib/swr-config';


type SourceCategory = 'normal' | 'adult';

interface UseVODListOptions {
  pageSize?: number;
  typeId?: number;
  hours?: number;
  sourceCategory?: SourceCategory;
}

interface UseVODListResult {
  data: VODItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  } | null;
  loading: boolean;
  error: string | null;
  loadMore: () => void;
  refresh: () => Promise<void>;
  hasMore: boolean;
}

// Build URL for VOD list with params
function buildVODListUrl(pageIndex: number, pageSize: number, typeId?: number, hours?: number, sourceCategory?: SourceCategory) {
  const params = new URLSearchParams({
    page: (pageIndex + 1).toString(),
    pageSize: pageSize.toString(),
  });
  if (typeId !== undefined) params.set('typeId', typeId.toString());
  if (hours !== undefined) params.set('hours', hours.toString());
  if (sourceCategory !== undefined) params.set('sourceCategory', sourceCategory);
  return `/api/vod/list?${params}`;
}

export function useVODList(options: UseVODListOptions = {}): UseVODListResult {
  const { pageSize = 20, typeId, hours, sourceCategory } = options;

  // Use SWR Infinite for pagination with caching
  const getKey = useCallback((pageIndex: number, previousPageData: { list?: VODItem[]; data?: VODItem[] } | null) => {
    // Reached the end - check both 'list' and 'data' fields as API response format varies
    if (previousPageData) {
      const items = previousPageData.list || previousPageData.data;
      if (!items || items.length === 0) {
        return null;
      }
    }
    return buildVODListUrl(pageIndex, pageSize, typeId, hours, sourceCategory);
  }, [pageSize, typeId, hours, sourceCategory]);

  const { data: pages, error, isLoading, isValidating, size, setSize, mutate } = useSWRInfinite(
    getKey,
    globalFetcher,
    {
      ...swrConfigs.list,
      revalidateFirstPage: false,
      persistSize: true,
    }
  );

  // Flatten all pages into single array
  const data = useMemo(() => {
    if (!pages) return [];
    return pages.flatMap(page => page?.list || page?.data || []);
  }, [pages]);

  // Get pagination info from last page
  const pagination = useMemo(() => {
    if (!pages || pages.length === 0) return null;
    const lastPage = pages[pages.length - 1];
    const paginationData = lastPage?.pagination || {};
    const total = paginationData.total || lastPage?.total || 0;
    const totalPages = paginationData.totalPages || lastPage?.pagecount || 1;
    return {
      page: size,
      pageSize,
      total: Number(total),
      totalPages: Number(totalPages),
    };
  }, [pages, size, pageSize]);

  const hasMore = pagination ? size < pagination.totalPages : false;

  const loadMore = useCallback(() => {
    if (!isLoading && !isValidating && hasMore) {
      setSize(size + 1);
    }
  }, [isLoading, isValidating, hasMore, setSize, size]);

  const refresh = useCallback(async () => {
    await mutate();
  }, [mutate]);

  return {
    data,
    pagination,
    loading: isLoading,
    error: error ? (error instanceof Error ? error.message : 'An error occurred') : null,
    loadMore,
    refresh,
    hasMore,
  };
}

interface UseCategoriesOptions {
  sourceCategory?: SourceCategory;
}

interface UseCategoriesResult {
  categories: Category[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useCategories(options: UseCategoriesOptions = {}): UseCategoriesResult {
  const { sourceCategory } = options;
  const params = new URLSearchParams();
  if (sourceCategory !== undefined) params.set('sourceCategory', sourceCategory);

  const queryString = params.toString();
  const url = `/api/vod/categories${queryString ? `?${queryString}` : ''}`;

  // Categories rarely change - use long cache with background refresh
  const { data, error, isLoading, mutate } = useSWR<{ data: Category[] }>(url, globalFetcher, swrConfigs.categories);

  const refresh = useCallback(async () => {
    await mutate();
  }, [mutate]);

  return {
    categories: data?.data || [],
    loading: isLoading,
    error: error ? (error instanceof Error ? error.message : 'An error occurred') : null,
    refresh,
  };
}

interface UseSearchOptions {
  debounceMs?: number;
  sourceCategory?: SourceCategory;
}

interface UseSearchResult {
  data: VODItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  } | null;
  loading: boolean;
  error: string | null;
  suggestions: string[];
  search: (keyword: string) => void;
  loadMore: () => void;
  hasMore: boolean;
  keyword: string;
}

export function useSearch(options: UseSearchOptions | number = {}): UseSearchResult {
  const { debounceMs = 300, sourceCategory } = typeof options === 'number'
    ? { debounceMs: options, sourceCategory: undefined }
    : options;

  const [keyword, setKeyword] = useState('');
  const [debouncedKeyword, setDebouncedKeyword] = useState('');

  // Debounce keyword changes
  const search = useCallback((newKeyword: string) => {
    setKeyword(newKeyword);
  }, []);

  // Debounce effect
  useMemo(() => {
    const timer = setTimeout(() => {
      setDebouncedKeyword(keyword);
    }, debounceMs);
    return () => clearTimeout(timer);
  }, [keyword, debounceMs]);

  // Build search URL
  const getKey = useCallback((pageIndex: number, previousPageData: { data?: VODItem[] } | null) => {
    if (!debouncedKeyword.trim()) return null;
    if (previousPageData && (!previousPageData.data || previousPageData.data.length === 0)) return null;

    const params = new URLSearchParams({
      keyword: debouncedKeyword.trim(),
      page: (pageIndex + 1).toString(),
      pageSize: '20',
    });
    if (sourceCategory) params.set('sourceCategory', sourceCategory);
    return `/api/vod/search?${params}`;
  }, [debouncedKeyword, sourceCategory]);

  const { data: pages, error, isLoading, size, setSize, mutate } = useSWRInfinite(
    getKey,
    globalFetcher,
    {
      ...swrConfigs.search,
      revalidateFirstPage: false,
    }
  );

  const data = useMemo(() => {
    if (!pages) return [];
    return pages.flatMap(page => page?.data || []);
  }, [pages]);

  const suggestions = useMemo(() => {
    if (!pages || pages.length === 0) return [];
    return pages[0]?.suggestions || [];
  }, [pages]);

  const pagination = useMemo(() => {
    if (!pages || pages.length === 0) return null;
    const lastPage = pages[pages.length - 1];
    return {
      page: size,
      pageSize: 20,
      total: lastPage?.pagination?.total || 0,
      totalPages: lastPage?.pagination?.totalPages || 1,
    };
  }, [pages, size]);

  const hasMore = pagination ? size < pagination.totalPages : false;

  const loadMore = useCallback(() => {
    if (!isLoading && hasMore) {
      setSize(size + 1);
    }
  }, [isLoading, hasMore, setSize, size]);

  // Clear when keyword is empty
  useMemo(() => {
    if (!debouncedKeyword.trim()) {
      mutate([], false);
    }
  }, [debouncedKeyword, mutate]);

  return {
    data,
    pagination,
    loading: isLoading,
    error: error ? (error instanceof Error ? error.message : 'An error occurred') : null,
    suggestions,
    search,
    loadMore,
    hasMore,
    keyword,
  };
}

interface VODDetailWithSources {
  vod_id: number;
  vod_name: string;
  type_id: number;
  type_name: string;
  vod_en: string;
  vod_time: string;
  vod_remarks: string;
  vod_play_from: string;
  vod_sub: string;
  vod_pic: string;
  vod_actor: string;
  vod_director: string;
  vod_blurb: string;
  vod_content: string;
  vod_area: string;
  vod_lang: string;
  vod_year: string;
  vod_score: string;
  vod_douban_score: string;
  vod_play_url: string;
  vod_play_server: string;
  vod_class: string;
  vod_isend: number;
  vod_total: number;
  playSources: Array<{
    name: string;
    episodes: Array<{
      name: string;
      url: string;
    }>;
  }>;
}

interface UseVODDetailOptions {
  sourceCategory?: SourceCategory;
}

interface UseVODDetailResult {
  data: VODDetailWithSources | null;
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

export function useVODDetail(id: string | number, options: UseVODDetailOptions = {}): UseVODDetailResult {
  const { sourceCategory } = options;

  const params = new URLSearchParams();
  if (sourceCategory) params.set('sourceCategory', sourceCategory);

  const queryString = params.toString();
  const url = id ? `/api/vod/${id}${queryString ? `?${queryString}` : ''}` : null;

  const { data, error, isLoading, mutate } = useSWR<VODDetailWithSources>(url, globalFetcher, swrConfigs.detail);

  const refresh = useCallback(async () => {
    if (url) await mutate();
  }, [mutate, url]);

  return {
    data: data || null,
    loading: isLoading,
    error: error ? (error instanceof Error ? error.message : 'An error occurred') : null,
    refresh
  };
}
