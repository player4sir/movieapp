'use client';

import useSWR from 'swr';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { PaywallStatsCard } from '@/components/admin/PaywallStatsCard';
import { MembershipStatsCard } from '@/components/admin/MembershipStatsCard';
import { OrdersStatsCard } from '@/components/admin/OrdersStatsCard';

interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  newUsersToday: number;
  newUsersThisWeek: number;
  memberLevelCounts: {
    free: number;
    vip: number;
    svip: number;
  };
}

interface APIStatus {
  isAvailable: boolean;
  responseTime: number;
}

/**
 * Admin Dashboard Page - 简洁版
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
    { refreshInterval: 60000 }
  );

  const { data: apiStatus, isLoading: statusLoading } = useSWR<APIStatus>(
    '/api/admin/api-status',
    statsFetcher,
    { refreshInterval: 30000 }
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
    <div className="space-y-4 p-4 lg:p-6 max-w-6xl mx-auto">
      {/* Header & API Status */}
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">仪表盘</h1>
        {apiStatus && (
          <div className={`flex items-center gap-2 px-2 py-1 rounded text-xs ${apiStatus.isAvailable
            ? 'bg-green-500/10 text-green-500'
            : 'bg-red-500/10 text-red-500'
            }`}>
            <span className={`w-1.5 h-1.5 rounded-full ${apiStatus.isAvailable ? 'bg-green-500' : 'bg-red-500'}`} />
            <span>API {apiStatus.responseTime}ms</span>
          </div>
        )}
      </div>

      {/* 核心指标 - 紧凑行 */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard label="总用户" value={stats?.totalUsers ?? 0} primary />
        <StatCard label="今日新增" value={stats?.newUsersToday ?? 0} trend />
        <StatCard label="本周新增" value={stats?.newUsersThisWeek ?? 0} trend />
        <StatCard label="7天活跃" value={stats?.activeUsers ?? 0} />
      </div>

      {/* 会员分布 + 待处理订单 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <MembershipStatsCard getAccessToken={getAccessToken} />
        <OrdersStatsCard getAccessToken={getAccessToken} />
      </div>

      {/* 付费墙统计 */}
      <PaywallStatsCard getAccessToken={getAccessToken} />
    </div>
  );
}

function StatCard({ label, value, primary, trend }: {
  label: string;
  value: number;
  primary?: boolean;
  trend?: boolean;
}) {
  return (
    <div className={`p-3 rounded-lg border ${primary ? 'bg-primary/5 border-primary/20' : 'bg-surface border-border/50'}`}>
      <p className="text-xs text-foreground/50 mb-1">{label}</p>
      <div className="flex items-baseline gap-1">
        <span className={`text-xl font-bold ${primary ? 'text-primary' : ''}`}>
          {value.toLocaleString()}
        </span>
        {trend && value > 0 && <span className="text-xs text-green-500">↑</span>}
      </div>
    </div>
  );
}
