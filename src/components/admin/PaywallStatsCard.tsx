'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

export interface PaywallStats {
  totalUnlocks: number;
  totalRevenue: number;
}

export interface PaywallStatsCardProps {
  getAccessToken: () => string | null;
}

/**
 * PaywallStatsCard - 简洁版
 * 只显示核心数据：总解锁次数和总收入
 */
export function PaywallStatsCard({ getAccessToken }: PaywallStatsCardProps) {
  const [stats, setStats] = useState<PaywallStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);

  const fetchStats = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 7);

      const params = new URLSearchParams({
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
      });

      const res = await fetch(`/api/admin/paywall/stats?${params}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('获取统计失败');
      const data = await res.json();
      setStats(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : '获取统计失败');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="bg-surface rounded-lg p-4 border border-border/50">
        <div className="h-5 w-20 bg-surface-secondary/50 rounded animate-pulse mb-3" />
        <div className="grid grid-cols-2 gap-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-12 bg-surface-secondary/50 rounded animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-surface rounded-lg p-4 border border-border/50">
        <p className="text-red-500 text-sm">{error}</p>
        <button onClick={fetchStats} className="text-primary text-xs hover:underline mt-1">重试</button>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-lg p-4 border border-border/50">
      <div className="flex items-center gap-2 mb-3">
        <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <span className="text-sm font-medium">付费解锁</span>
        <span className="text-xs text-foreground/40 ml-auto">近7天</span>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="p-3 rounded bg-background/50">
          <p className="text-xl font-bold text-primary tabular-nums">{stats?.totalUnlocks ?? 0}</p>
          <p className="text-xs text-foreground/50">解锁次数</p>
        </div>
        <div className="p-3 rounded bg-background/50">
          <p className="text-xl font-bold text-yellow-500 tabular-nums">{stats?.totalRevenue ?? 0}</p>
          <p className="text-xs text-foreground/50">金币收入</p>
        </div>
      </div>
    </div>
  );
}
