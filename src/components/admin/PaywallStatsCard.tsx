'use client';

import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Paywall statistics response from API
 * Requirements: 8.1, 8.2
 */
export interface PaywallStats {
  totalUnlocks: number;
  totalRevenue: number;
  dailyStats: DailyStat[];
  categoryBreakdown: CategoryStat[];
  topContent: TopContent[];
}

interface DailyStat {
  date: string;
  unlocks: number;
  revenue: number;
}

interface CategoryStat {
  category: string;
  unlocks: number;
  revenue: number;
}

interface TopContent {
  vodId: number;
  vodName: string;
  unlocks: number;
  revenue: number;
}

export interface PaywallStatsCardProps {
  getAccessToken: () => string | null;
}

/**
 * Category labels
 */
const CATEGORY_LABELS: Record<string, string> = {
  normal: '普通内容',
  adult: '成人内容',
};

/**
 * PaywallStatsCard Component
 * Displays paywall unlock statistics including total unlocks, revenue, and daily trends.
 * 
 * Requirements: 8.1, 8.2
 */
export function PaywallStatsCard({ getAccessToken }: PaywallStatsCardProps) {
  const [stats, setStats] = useState<PaywallStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const hasFetched = useRef(false);


  /**
   * Fetch paywall statistics
   * Requirements: 8.1, 8.2
   */
  const fetchStats = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;

    setLoading(true);
    setError(null);
    try {
      // Get stats for the last 7 days
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;
    fetchStats();
  }, [fetchStats]);

  if (loading) {
    return (
      <div className="bg-surface rounded-lg p-4 lg:p-6">
        <div className="h-6 w-24 bg-surface-secondary/50 rounded animate-pulse mb-4" />
        <div className="grid grid-cols-2 gap-4">
          {[1, 2].map((i) => (
            <div key={i} className="text-center">
              <div className="h-8 w-16 bg-surface-secondary/50 rounded animate-pulse mx-auto mb-2" />
              <div className="h-4 w-12 bg-surface-secondary/50 rounded animate-pulse mx-auto" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-surface rounded-lg p-4 lg:p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <PaywallIcon />
            付费墙统计
          </h3>
        </div>
        <div className="text-center py-4">
          <p className="text-red-500 text-sm mb-2">{error}</p>
          <button onClick={fetchStats} className="text-primary text-sm hover:underline">
            重试
          </button>
        </div>
      </div>
    );
  }

  // Calculate recent trend
  const recentUnlocks = stats?.dailyStats?.reduce((sum, d) => sum + d.unlocks, 0) ?? 0;
  const recentRevenue = stats?.dailyStats?.reduce((sum, d) => sum + d.revenue, 0) ?? 0;

  return (
    <div className="bg-surface rounded-2xl p-6 border border-border/50">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold flex items-center gap-2">
          <PaywallIcon />
          <span>付费墙统计</span>
        </h3>
        <span className="text-xs text-foreground/40 bg-foreground/5 px-2 py-1 rounded-full">近7天</span>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="text-center p-4 rounded-xl bg-background/50">
          <p className="text-2xl font-bold text-primary tabular-nums">
            {formatNumber(stats?.totalUnlocks ?? 0)}
          </p>
          <div className="flex items-center justify-center gap-2 mt-1">
            <p className="text-xs text-foreground/50">总解锁</p>
            {recentUnlocks > 0 && <span className="text-[10px] text-green-500">+{recentUnlocks}</span>}
          </div>
        </div>
        <div className="text-center p-4 rounded-xl bg-background/50">
          <p className="text-2xl font-bold text-yellow-500 tabular-nums">
            {formatNumber(stats?.totalRevenue ?? 0)}
          </p>
          <div className="flex items-center justify-center gap-2 mt-1">
            <p className="text-xs text-foreground/50">总收入</p>
            {recentRevenue > 0 && <span className="text-[10px] text-green-500">+{recentRevenue}</span>}
          </div>
        </div>
      </div>

      {/* Daily Trend Mini Chart */}
      {stats?.dailyStats && stats.dailyStats.length > 0 && (
        <div className="mb-6">
          <div className="flex items-end gap-1 h-16">
            {stats.dailyStats.slice(-7).map((day, index) => {
              const maxValue = Math.max(
                ...stats.dailyStats.map(d => Math.max(d.unlocks, d.revenue / 10)),
                1
              );
              const unlocksHeight = (day.unlocks / maxValue) * 100;
              const revenueHeight = ((day.revenue / 10) / maxValue) * 100;

              return (
                <div key={index} className="flex-1 flex gap-0.5 items-end h-full group relative">
                  <div
                    className="flex-1 bg-primary/40 rounded-t-sm transition-all group-hover:bg-primary/60"
                    style={{ height: `${Math.max(unlocksHeight, 5)}%` }}
                  />
                  <div
                    className="flex-1 bg-yellow-500/40 rounded-t-sm transition-all group-hover:bg-yellow-500/60"
                    style={{ height: `${Math.max(revenueHeight, 5)}%` }}
                  />
                </div>
              );
            })}
          </div>
          <div className="flex justify-between text-[10px] text-foreground/30 mt-2">
            <span>7天前</span>
            <span>今天</span>
          </div>
        </div>
      )}

      {/* Category Breakdown */}
      {stats?.categoryBreakdown && stats.categoryBreakdown.length > 0 && (
        <div className="mb-6">
          <p className="text-xs font-medium text-foreground/50 mb-3">分类分布</p>
          <div className="space-y-2">
            {stats.categoryBreakdown.map((item) => (
              <div key={item.category} className="flex items-center justify-between text-sm">
                <span className="text-foreground/70 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/50"></span>
                  {CATEGORY_LABELS[item.category] || item.category}
                </span>
                <span className="text-foreground/50 tabular-nums">
                  {item.unlocks}次 <span className="opacity-30">/</span> <span className="text-yellow-500/80">{item.revenue}币</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Top Content */}
      {stats?.topContent && stats.topContent.length > 0 && (
        <div>
          <p className="text-xs font-medium text-foreground/50 mb-3">热门内容</p>
          <div className="space-y-3">
            {stats.topContent.slice(0, 3).map((item, index) => (
              <div key={item.vodId} className="flex items-center gap-3 text-sm group">
                <span className={`w-5 h-5 rounded flex items-center justify-center text-[10px] font-bold ${index === 0 ? 'bg-yellow-500/10 text-yellow-500' :
                    index === 1 ? 'bg-foreground/5 text-foreground/50' :
                      'bg-foreground/5 text-foreground/50'
                  }`}>
                  {index + 1}
                </span>
                <span className="flex-1 truncate text-foreground/70 group-hover:text-foreground transition-colors">
                  {item.vodName}
                </span>
                <span className="text-foreground/50 text-xs tabular-nums">
                  {item.unlocks}次
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Format large numbers for display
 */
function formatNumber(num: number): string {
  if (num >= 10000) {
    return (num / 10000).toFixed(1) + '万';
  }
  if (num >= 1000) {
    return (num / 1000).toFixed(1) + 'k';
  }
  return num.toString();
}

/**
 * Paywall icon for stats display
 */
function PaywallIcon() {
  return (
    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
    </svg>
  );
}
