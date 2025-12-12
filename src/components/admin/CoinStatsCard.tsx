'use client';


import useSWR from 'swr';

/**
 * Coin statistics response from API
 * Requirements: 7.1, 7.2
 */
export interface CoinStats {
  totalCirculation: number;
  totalEarned: number;
  totalSpent: number;
  dailyStats: DailyStat[];
  typeBreakdown: TypeBreakdown[];
}

interface DailyStat {
  date: string;
  earned: number;
  spent: number;
}

interface TypeBreakdown {
  type: string;
  count: number;
  totalAmount: number;
}

export interface CoinStatsCardProps {
  getAccessToken: () => string | null;
}

/**
 * Transaction type labels
 */
const TYPE_LABELS: Record<string, string> = {
  recharge: '充值',
  checkin: '签到',
  exchange: '兑换',
  consume: '消费',
  adjust: '调整',
};

/**
 * CoinStatsCard Component
 * Displays coin system statistics including total circulation and daily trends.
 * 
 * Requirements: 7.1, 7.2
 */
export function CoinStatsCard({ getAccessToken }: CoinStatsCardProps) {
  const fetcher = async (url: string) => {
    const token = getAccessToken();
    if (!token) throw new Error('No token');
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error('获取统计失败');
    return res.json();
  };

  // Get stats for the last 7 days
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - 7);

  const params = new URLSearchParams({
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  });

  const { data: stats, error, isLoading: loading, mutate: refresh } = useSWR<CoinStats>(
    `/api/admin/coins/stats?${params}`,
    fetcher,
    {
      dedupingInterval: 60000,
      revalidateOnFocus: false
    }
  );

  if (loading) {
    return (
      <div className="bg-surface rounded-lg p-4 lg:p-6">
        <div className="h-6 w-24 bg-surface-secondary/50 rounded animate-pulse mb-4" />
        <div className="grid grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
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
            <CoinIcon />
            金币统计
          </h3>
        </div>
        <div className="text-center py-4">
          <p className="text-red-500 text-sm mb-2">{error}</p>
          <button onClick={() => refresh()} className="text-primary text-sm hover:underline">
            重试
          </button>
        </div>
      </div>
    );
  }

  // Calculate recent trend
  const recentEarned = stats?.dailyStats?.reduce((sum: number, d: DailyStat) => sum + d.earned, 0) ?? 0;
  const recentSpent = stats?.dailyStats?.reduce((sum: number, d: DailyStat) => sum + d.spent, 0) ?? 0;

  return (
    <div className="bg-surface rounded-2xl p-6 border border-border/50">
      <div className="flex items-center justify-between mb-6">
        <h3 className="font-semibold flex items-center gap-2">
          <CoinIcon />
          <span>金币统计</span>
        </h3>
        <span className="text-xs text-foreground/40 bg-foreground/5 px-2 py-1 rounded-full">近7天</span>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="text-center p-3 rounded-xl bg-background/50">
          <p className="text-2xl font-bold text-yellow-500 tabular-nums">
            {formatNumber(stats?.totalCirculation ?? 0)}
          </p>
          <p className="text-xs text-foreground/50 mt-1">流通总量</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-background/50">
          <p className="text-xl font-medium text-green-500 tabular-nums">
            +{formatNumber(recentEarned)}
          </p>
          <p className="text-xs text-foreground/50 mt-1">近期发放</p>
        </div>
        <div className="text-center p-3 rounded-xl bg-background/50">
          <p className="text-xl font-medium text-red-500 tabular-nums">
            -{formatNumber(recentSpent)}
          </p>
          <p className="text-xs text-foreground/50 mt-1">近期消费</p>
        </div>
      </div>

      {/* Daily Trend Mini Chart */}
      {stats?.dailyStats && stats.dailyStats.length > 0 && (
        <div className="mb-6">
          <div className="flex items-end gap-1 h-16">
            {stats.dailyStats.slice(-7).map((day: DailyStat, index: number) => {
              const maxValue = Math.max(
                ...stats.dailyStats.map((d: DailyStat) => Math.max(d.earned, d.spent)),
                1
              );
              const earnedHeight = (day.earned / maxValue) * 100;
              const spentHeight = (day.spent / maxValue) * 100;

              return (
                <div key={index} className="flex-1 flex gap-0.5 items-end h-full group relative">
                  <div
                    className="flex-1 bg-green-500/40 rounded-t-sm transition-all group-hover:bg-green-500/60"
                    style={{ height: `${Math.max(earnedHeight, 5)}%` }}
                  />
                  <div
                    className="flex-1 bg-red-500/40 rounded-t-sm transition-all group-hover:bg-red-500/60"
                    style={{ height: `${Math.max(spentHeight, 5)}%` }}
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

      {/* Type Breakdown */}
      {stats?.typeBreakdown && stats.typeBreakdown.length > 0 && (
        <div>
          <p className="text-xs font-medium text-foreground/50 mb-3">类型分布</p>
          <div className="space-y-2">
            {stats.typeBreakdown.slice(0, 4).map((item: TypeBreakdown) => (
              <div key={item.type} className="flex items-center justify-between text-sm">
                <span className="text-foreground/70 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/50"></span>
                  {TYPE_LABELS[item.type] || item.type}
                </span>
                <span className="text-foreground/50 tabular-nums">
                  {item.count}笔 / <span className="text-foreground/70">{item.totalAmount > 0 ? '+' : ''}{formatNumber(item.totalAmount)}</span>
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
 * Coin icon for stats display
 */
function CoinIcon() {
  return (
    <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.31-8.86c-1.77-.45-2.34-.94-2.34-1.67 0-.84.79-1.43 2.1-1.43 1.38 0 1.9.66 1.94 1.64h1.71c-.05-1.34-.87-2.57-2.49-2.97V5H10.9v1.69c-1.51.32-2.72 1.3-2.72 2.81 0 1.79 1.49 2.69 3.66 3.21 1.95.46 2.34 1.15 2.34 1.87 0 .53-.39 1.39-2.1 1.39-1.6 0-2.23-.72-2.32-1.64H8.04c.1 1.7 1.36 2.66 2.86 2.97V19h2.34v-1.67c1.52-.29 2.72-1.16 2.73-2.77-.01-2.2-1.9-2.96-3.66-3.42z" />
    </svg>
  );
}
