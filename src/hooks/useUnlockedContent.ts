'use client';

/**
 * Unlocked Content Hook
 * Manages fetching and filtering user's unlocked content
 * 
 * Requirements: 7.1, 7.4
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

// Types
export type SourceCategory = 'normal' | 'adult';
export type UnlockType = 'purchase' | 'vip';

export interface UnlockedContentItem {
  id: string;
  userId: string;
  vodId: number;
  episodeIndex: number;
  sourceCategory: SourceCategory;
  unlockType: UnlockType;
  coinsSpent: number;
  createdAt: string;
}

export interface UnlockedContentPagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface UnlockedContentFilters {
  category?: SourceCategory;
}

interface UseUnlockedContentReturn {
  // Data
  unlockedContent: UnlockedContentItem[];
  pagination: UnlockedContentPagination | null;
  
  // State
  loading: boolean;
  error: string | null;
  
  // Actions
  fetchUnlockedContent: (page?: number, filters?: UnlockedContentFilters) => Promise<void>;
  refresh: () => Promise<void>;
  
  // Filters
  currentFilters: UnlockedContentFilters;
  setFilters: (filters: UnlockedContentFilters) => void;
  
  // Helpers
  isUnlocked: (vodId: number, episodeIndex: number) => boolean;
}

/**
 * Hook for managing user's unlocked content list
 * Supports pagination and filtering by category
 * 
 * Requirements:
 * - 7.1: Display section for unlocked content in profile
 * - 7.4: Support filtering by content category
 */
export function useUnlockedContent(): UseUnlockedContentReturn {
  const { getAccessToken, isAuthenticated } = useAuth();
  
  // Data state
  const [unlockedContent, setUnlockedContent] = useState<UnlockedContentItem[]>([]);
  const [pagination, setPagination] = useState<UnlockedContentPagination | null>(null);
  
  // Loading state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Filter state
  const [currentFilters, setCurrentFilters] = useState<UnlockedContentFilters>({});
  const [currentPage, setCurrentPage] = useState(1);

  /**
   * Fetch unlocked content from API
   */
  const fetchUnlockedContent = useCallback(async (
    page: number = 1,
    filters: UnlockedContentFilters = {}
  ) => {
    const token = getAccessToken();
    if (!token) {
      setUnlockedContent([]);
      setPagination(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      params.set('page', page.toString());
      params.set('pageSize', '20');
      
      if (filters.category) {
        params.set('category', filters.category);
      }

      const response = await fetch(`/api/user/unlocked?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || '获取已解锁内容失败');
      }

      const data = await response.json();
      setUnlockedContent(data.data || []);
      setPagination(data.pagination || null);
      setCurrentPage(page);
      setCurrentFilters(filters);
    } catch (err) {
      const message = err instanceof Error ? err.message : '获取已解锁内容失败';
      setError(message);
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  /**
   * Refresh current page with current filters
   */
  const refresh = useCallback(async () => {
    await fetchUnlockedContent(currentPage, currentFilters);
  }, [fetchUnlockedContent, currentPage, currentFilters]);

  /**
   * Update filters and refetch
   */
  const setFilters = useCallback((filters: UnlockedContentFilters) => {
    setCurrentFilters(filters);
    // Reset to page 1 when filters change
    fetchUnlockedContent(1, filters);
  }, [fetchUnlockedContent]);

  /**
   * Check if specific content is unlocked
   * Useful for UI indicators
   */
  const isUnlocked = useCallback((vodId: number, episodeIndex: number): boolean => {
    return unlockedContent.some(
      item => item.vodId === vodId && item.episodeIndex === episodeIndex
    );
  }, [unlockedContent]);

  // Initial fetch when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchUnlockedContent(1, currentFilters);
    } else {
      setUnlockedContent([]);
      setPagination(null);
      setLoading(false);
    }
  }, [isAuthenticated]); // eslint-disable-line react-hooks/exhaustive-deps

  return {
    unlockedContent,
    pagination,
    loading,
    error,
    fetchUnlockedContent,
    refresh,
    currentFilters,
    setFilters,
    isUnlocked,
  };
}
