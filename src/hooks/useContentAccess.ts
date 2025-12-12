'use client';

/**
 * Content Access Hook
 * Manages content access checking and unlocking with caching
 * 
 * Requirements: 2.1, 4.1
 */

import { useState, useCallback, useRef } from 'react';
import { useAuth } from './useAuth';
import { useCoins } from './useCoins';

// Types
export type SourceCategory = 'normal' | 'adult';
export type AccessType = 'free' | 'vip' | 'purchased' | 'locked';

export interface AccessResult {
  hasAccess: boolean;
  accessType: AccessType;
  price?: number;
  unlockedAt?: string;
}

export interface UnlockResult {
  success: boolean;
  coinsSpent: number;
  newBalance: number;
  accessRecord: {
    id: string;
    vodId: number;
    episodeIndex: number;
    sourceCategory: SourceCategory;
    unlockType: 'purchase' | 'vip';
    coinsSpent: number;
    createdAt: string;
  };
}

interface CacheEntry {
  result: AccessResult;
  timestamp: number;
}

interface UseContentAccessReturn {
  // Access check
  checkAccess: (vodId: number, episodeIndex: number, sourceCategory: SourceCategory) => Promise<AccessResult | null>;
  accessLoading: boolean;
  accessError: string | null;
  
  // Unlock
  unlockContent: (vodId: number, episodeIndex: number, sourceCategory: SourceCategory) => Promise<UnlockResult | null>;
  unlockLoading: boolean;
  unlockError: string | null;
  
  // Cache management
  clearCache: () => void;
  invalidateCache: (vodId: number, episodeIndex: number) => void;
}

// Cache TTL: 5 minutes
const CACHE_TTL = 5 * 60 * 1000;

/**
 * Hook for checking and managing content access
 * Implements caching to reduce API calls
 */
export function useContentAccess(): UseContentAccessReturn {
  const { getAccessToken, isAuthenticated } = useAuth();
  const { refreshBalance } = useCoins();
  
  // Access check state
  const [accessLoading, setAccessLoading] = useState(false);
  const [accessError, setAccessError] = useState<string | null>(null);
  
  // Unlock state
  const [unlockLoading, setUnlockLoading] = useState(false);
  const [unlockError, setUnlockError] = useState<string | null>(null);
  
  // Cache for access results
  const cacheRef = useRef<Map<string, CacheEntry>>(new Map());

  /**
   * Generate cache key for content access
   */
  const getCacheKey = (vodId: number, episodeIndex: number): string => {
    return `${vodId}:${episodeIndex}`;
  };

  /**
   * Check if cache entry is still valid
   */
  const isCacheValid = (entry: CacheEntry): boolean => {
    return Date.now() - entry.timestamp < CACHE_TTL;
  };

  /**
   * Check user's access to specific content
   * Uses caching to reduce API calls
   * 
   * Requirements: 2.1 - Display unlock price based on content category
   */
  const checkAccess = useCallback(async (
    vodId: number,
    episodeIndex: number,
    sourceCategory: SourceCategory
  ): Promise<AccessResult | null> => {
    const token = getAccessToken();
    if (!token || !isAuthenticated) {
      // Return locked status for unauthenticated users
      return {
        hasAccess: false,
        accessType: 'locked',
      };
    }

    const cacheKey = getCacheKey(vodId, episodeIndex);
    
    // Check cache first
    const cached = cacheRef.current.get(cacheKey);
    if (cached && isCacheValid(cached)) {
      return cached.result;
    }

    setAccessLoading(true);
    setAccessError(null);

    try {
      const params = new URLSearchParams({
        vodId: vodId.toString(),
        episodeIndex: episodeIndex.toString(),
        sourceCategory,
      });

      const response = await fetch(`/api/content/access?${params.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || '检查访问权限失败');
      }

      const result: AccessResult = await response.json();
      
      // Cache the result
      cacheRef.current.set(cacheKey, {
        result,
        timestamp: Date.now(),
      });

      return result;
    } catch (err) {
      const message = err instanceof Error ? err.message : '检查访问权限失败';
      setAccessError(message);
      return null;
    } finally {
      setAccessLoading(false);
    }
  }, [getAccessToken, isAuthenticated]);

  /**
   * Unlock content with coins
   * 
   * Requirements: 4.1 - Verify user's coin balance is sufficient
   */
  const unlockContent = useCallback(async (
    vodId: number,
    episodeIndex: number,
    sourceCategory: SourceCategory
  ): Promise<UnlockResult | null> => {
    const token = getAccessToken();
    if (!token) {
      setUnlockError('请先登录');
      return null;
    }

    setUnlockLoading(true);
    setUnlockError(null);

    try {
      const response = await fetch('/api/content/unlock', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          vodId,
          episodeIndex,
          sourceCategory,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle specific error codes
        if (data.code === 'INSUFFICIENT_BALANCE') {
          throw new Error(data.suggestion || data.message || '金币余额不足');
        }
        throw new Error(data.message || '解锁内容失败');
      }

      // Invalidate cache for this content
      const cacheKey = getCacheKey(vodId, episodeIndex);
      cacheRef.current.delete(cacheKey);

      // Refresh coin balance after successful unlock
      await refreshBalance();

      return data as UnlockResult;
    } catch (err) {
      const message = err instanceof Error ? err.message : '解锁内容失败';
      setUnlockError(message);
      return null;
    } finally {
      setUnlockLoading(false);
    }
  }, [getAccessToken, refreshBalance]);

  /**
   * Clear all cached access results
   */
  const clearCache = useCallback(() => {
    cacheRef.current.clear();
  }, []);

  /**
   * Invalidate cache for specific content
   */
  const invalidateCache = useCallback((vodId: number, episodeIndex: number) => {
    const cacheKey = getCacheKey(vodId, episodeIndex);
    cacheRef.current.delete(cacheKey);
  }, []);

  return {
    checkAccess,
    accessLoading,
    accessError,
    unlockContent,
    unlockLoading,
    unlockError,
    clearCache,
    invalidateCache,
  };
}
