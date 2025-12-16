'use client';

import useSWR from 'swr';
import Link from 'next/link';

export interface OrdersStatsCardProps {
    getAccessToken: () => string | null;
}

interface OrdersStats {
    pendingOrders: { membership: number; coin: number; total: number; };
    paidOrders: { membership: number; coin: number; total: number; };
    needsAttention: number;
}

/**
 * OrdersStatsCard Component
 * 显示待处理订单计数和快捷入口
 */
export function OrdersStatsCard({ getAccessToken }: OrdersStatsCardProps) {
    const fetcher = async (url: string) => {
        const token = getAccessToken();
        if (!token) throw new Error('No token');
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('获取订单统计失败');
        return res.json();
    };

    const { data: stats, error, isLoading } = useSWR<OrdersStats>(
        '/api/admin/orders/stats',
        fetcher,
        { dedupingInterval: 30000, revalidateOnFocus: true }
    );

    if (isLoading) {
        return (
            <div className="bg-surface rounded-2xl p-6 border border-border/50">
                <div className="h-6 w-24 bg-surface-secondary/50 rounded animate-pulse mb-4" />
                <div className="grid grid-cols-2 gap-4">
                    {[1, 2].map((i) => (
                        <div key={i} className="h-16 bg-surface-secondary/50 rounded animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-surface rounded-2xl p-6 border border-border/50">
                <div className="flex items-center gap-2 mb-4">
                    <OrderIcon />
                    <h3 className="font-semibold">待处理订单</h3>
                </div>
                <p className="text-red-500 text-sm">{error.message}</p>
            </div>
        );
    }

    const hasAttention = (stats?.needsAttention ?? 0) > 0;

    return (
        <div className={`bg-surface rounded-2xl p-6 border ${hasAttention ? 'border-amber-500/30' : 'border-border/50'}`}>
            <div className="flex items-center justify-between mb-6">
                <h3 className="font-semibold flex items-center gap-2">
                    <OrderIcon />
                    <span>待处理订单</span>
                </h3>
                {hasAttention && (
                    <span className="text-xs text-amber-500 bg-amber-500/10 px-2 py-1 rounded-full font-medium animate-pulse">
                        {stats?.needsAttention} 待处理
                    </span>
                )}
            </div>

            {/* Order Categories */}
            <div className="grid grid-cols-2 gap-4">
                {/* Membership Orders */}
                <Link
                    href="/console-x9k2m/membership"
                    className="p-4 rounded-xl bg-background/50 hover:bg-background/80 transition-colors group"
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-foreground/50">会员订单</span>
                        <svg className="w-4 h-4 text-foreground/30 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-foreground tabular-nums">
                            {((stats?.pendingOrders.membership ?? 0) + (stats?.paidOrders.membership ?? 0))}
                        </span>
                        {(stats?.paidOrders.membership ?? 0) > 0 && (
                            <span className="text-xs text-amber-500">
                                {stats?.paidOrders.membership} 已付款
                            </span>
                        )}
                    </div>
                </Link>

                {/* Coin Orders */}
                <Link
                    href="/console-x9k2m/settings/coins"
                    className="p-4 rounded-xl bg-background/50 hover:bg-background/80 transition-colors group"
                >
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-foreground/50">金币充值</span>
                        <svg className="w-4 h-4 text-foreground/30 group-hover:text-primary transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-bold text-foreground tabular-nums">
                            {((stats?.pendingOrders.coin ?? 0) + (stats?.paidOrders.coin ?? 0))}
                        </span>
                        {(stats?.paidOrders.coin ?? 0) > 0 && (
                            <span className="text-xs text-amber-500">
                                {stats?.paidOrders.coin} 已付款
                            </span>
                        )}
                    </div>
                </Link>
            </div>

            {/* Quick Status */}
            {!hasAttention && (
                <div className="mt-4 text-center text-sm text-foreground/40">
                    ✓ 暂无待处理订单
                </div>
            )}
        </div>
    );
}

function OrderIcon() {
    return (
        <svg className="w-5 h-5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
    );
}
