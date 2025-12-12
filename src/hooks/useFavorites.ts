'use client';

/**
 * Favorites Hook
 * Manages user favorites with API integration
 * 
 * Requirements: 6.1, 6.2
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

export interface Favorite {
  id: string;
  userId: string;
  vodId: number;
  vodName: string;
  vodPic: string;
  typeName: string;
  createdAt: string;
}

interface UseFavoritesReturn {
  favorites: Favorite[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  removeFavorite: (vodId: number) => Promise<void>;
  isFavorite: (vodId: number) => boolean;
  addFavorite: (vod: { vodId: number; vodName: string; vodPic?: string; typeName?: string }) => Promise<void>;
}

export function useFavorites(): UseFavoritesReturn {
  const { getAccessToken, isAuthenticated } = useAuth();
  const [favorites, setFavorites] = useState<Favorite[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchFavorites = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setFavorites([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/user/favorites', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('获取收藏列表失败');
      }

      const data = await response.json();
      setFavorites(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取收藏列表失败');
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchFavorites();
    } else {
      setFavorites([]);
      setLoading(false);
    }
  }, [isAuthenticated, fetchFavorites]);

  const removeFavorite = useCallback(async (vodId: number) => {
    const token = getAccessToken();
    if (!token) return;

    try {
      const response = await fetch(`/api/user/favorites/${vodId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('移除收藏失败');
      }

      // Update local state
      setFavorites((prev) => prev.filter((f) => f.vodId !== vodId));
    } catch (err) {
      throw err;
    }
  }, [getAccessToken]);

  const addFavorite = useCallback(async (vod: { vodId: number; vodName: string; vodPic?: string; typeName?: string }) => {
    const token = getAccessToken();
    if (!token) return;

    try {
      const response = await fetch('/api/user/favorites', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(vod),
      });

      if (!response.ok) {
        throw new Error('添加收藏失败');
      }

      const data = await response.json();
      setFavorites((prev) => [data.data, ...prev.filter((f) => f.vodId !== vod.vodId)]);
    } catch (err) {
      throw err;
    }
  }, [getAccessToken]);

  const isFavorite = useCallback((vodId: number) => {
    return favorites.some((f) => f.vodId === vodId);
  }, [favorites]);

  return {
    favorites,
    loading,
    error,
    refresh: fetchFavorites,
    removeFavorite,
    isFavorite,
    addFavorite,
  };
}
