'use client';

/**
 * Watch History Hook
 * Manages user watch history with API integration
 * 
 * Requirements: 6.3, 6.4
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from './useAuth';

export interface WatchHistoryItem {
  id: string;
  userId: string;
  vodId: number;
  vodName: string;
  vodPic: string;
  episodeIndex: number;
  episodeName: string;
  position: number;
  duration: number;
  sourceIndex: number;
  sourceCategory: 'normal' | 'adult';
  watchedAt: string;
}

interface UseWatchHistoryReturn {
  history: WatchHistoryItem[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  clearHistory: () => Promise<void>;
  getProgress: (vodId: number) => WatchHistoryItem | undefined;
}

export function useWatchHistory(): UseWatchHistoryReturn {
  const { getAccessToken, isAuthenticated } = useAuth();
  const [history, setHistory] = useState<WatchHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    const token = getAccessToken();
    if (!token) {
      setHistory([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/user/history', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('获取观看历史失败');
      }

      const data = await response.json();
      setHistory(data.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取观看历史失败');
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchHistory();
    } else {
      setHistory([]);
      setLoading(false);
    }
  }, [isAuthenticated, fetchHistory]);

  const clearHistory = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;

    try {
      const response = await fetch('/api/user/history', {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        throw new Error('清除历史失败');
      }

      setHistory([]);
    } catch (err) {
      throw err;
    }
  }, [getAccessToken]);

  const getProgress = useCallback((vodId: number) => {
    return history.find((h) => h.vodId === vodId);
  }, [history]);

  return {
    history,
    loading,
    error,
    refresh: fetchHistory,
    clearHistory,
    getProgress,
  };
}
