'use client';

import { } from 'react';
import useSWR from 'swr';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { CoinStatsCard } from '@/components/admin/CoinStatsCard';
import { PaywallStatsCard } from '@/components/admin/PaywallStatsCard';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
}

interface APIStatus {
  isAvailable: boolean;
  responseTime: number;
  lastSuccessfulSync: string | null;
  errorRate: number;
}

/**
 * Admin Dashboard Page
 */
export default function AdminDashboardPage() {
  const { getAccessToken } = useAdminAuth();

  const statsFetcher = async (url: string) => {
    const token = getAccessToken();
    if (!token) throw new Error('No token');
    const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
    if (!res.ok) throw new Error('Failed to fetch');
    return res.json();
  };

  const { data: stats, isLoading: statsLoading } = useSWR<DashboardStats>(
    '/api/admin/stats',
    statsFetcher,
    { refreshInterval: 60000 } // Refresh every minute
  );

  const { data: apiStatus, isLoading: statusLoading } = useSWR<APIStatus>(
    '/api/admin/api-status',
    statsFetcher,
    { refreshInterval: 30000 } // Check status every 30s
  );

  const loading = statsLoading || statusLoading;

  if (loading) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header & API Status */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">仪表盘</h1>
          <p className="text-sm text-foreground/50 mt-1">
            {new Date().toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'long' })}
          </p>
        </div>

        {/* Compact API Status Badge */}
        {apiStatus && (
          <div className={`flex items-center gap-3 px-3 py-1.5 rounded-full text-xs font-medium border ${apiStatus.isAvailable
            ? 'bg-green-500/10 text-green-500 border-green-500/20'
            : 'bg-red-500/10 text-red-500 border-red-500/20'
            }`}>
            <span className={`w-2 h-2 rounded-full ${apiStatus.isAvailable ? 'bg-green-500' : 'bg-red-500'}`} />
            <span>API: {apiStatus.isAvailable ? '正常' : '异常'}</span>
            <span className="opacity-50">|</span>
            <span>{apiStatus.responseTime}ms</span>
          </div>
        )}
      </div>

      {/* Main Stats Overview - Grouped Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Primary Stat: Users */}
        <div className="lg:col-span-2 bg-gradient-to-br from-primary/10 to-transparent rounded-2xl p-6 border border-primary/10">
          <div className="flex flex-col h-full justify-between">
            <div>
              <p className="text-sm font-medium text-primary mb-1">平台总用户</p>
              <h2 className="text-4xl font-bold">{stats?.totalUsers.toLocaleString() ?? 0}</h2>
            </div>

            <div className="grid grid-cols-3 gap-4 mt-8">
              <MiniStat label="今日新增" value={stats?.newUsersToday ?? 0} change={true} />
              <MiniStat label="本周新增" value={stats?.newUsersThisWeek ?? 0} change={true} />
              <MiniStat label="活跃用户 (7天)" value={stats?.activeUsers ?? 0} />
            </div>
          </div>
        </div>

        {/* Placeholder for Quick Actions or System Health in future */}
        <div className="bg-surface rounded-2xl p-6 border border-border/50 flex flex-col justify-center items-center text-center text-foreground/50">
          <p className="text-sm">系统正常运行中</p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <CoinStatsCard getAccessToken={getAccessToken} />
        <PaywallStatsCard getAccessToken={getAccessToken} />
      </div>

    </div>
  );
}

function MiniStat({ label, value, change }: { label: string; value: number; change?: boolean }) {
  return (
    <div>
      <p className="text-xs text-foreground/50 mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className="text-xl font-semibold">{value.toLocaleString()}</span>
        {change && value > 0 && (
          <span className="text-[10px] text-green-500 font-medium">↑</span>
        )}
      </div>
    </div>
  );
}
