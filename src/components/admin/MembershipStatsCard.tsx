'use client';

import useSWR from 'swr';

export interface MembershipStatsCardProps {
    getAccessToken: () => string | null;
}

interface MemberLevelCounts {
    free: number;
    vip: number;
    svip: number;
}

interface StatsData {
    memberLevelCounts: MemberLevelCounts;
}

/**
 * MembershipStatsCard - 简洁版
 * 只显示核心数据：会员级别分布
 */
export function MembershipStatsCard({ getAccessToken }: MembershipStatsCardProps) {
    const fetcher = async (url: string) => {
        const token = getAccessToken();
        if (!token) throw new Error('No token');
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('获取统计失败');
        return res.json();
    };

    const { data: stats, error, isLoading } = useSWR<StatsData>(
        '/api/admin/stats',
        fetcher,
        { dedupingInterval: 60000, revalidateOnFocus: false }
    );

    if (isLoading) {
        return (
            <div className="bg-surface rounded-lg p-4 border border-border/50">
                <div className="h-5 w-20 bg-surface-secondary/50 rounded animate-pulse mb-3" />
                <div className="grid grid-cols-3 gap-2">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="h-12 bg-surface-secondary/50 rounded animate-pulse" />
                    ))}
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="bg-surface rounded-lg p-4 border border-border/50">
                <p className="text-red-500 text-sm">{error.message}</p>
            </div>
        );
    }

    const { memberLevelCounts } = stats || { memberLevelCounts: { free: 0, vip: 0, svip: 0 } };
    const total = memberLevelCounts.free + memberLevelCounts.vip + memberLevelCounts.svip;

    return (
        <div className="bg-surface rounded-lg p-4 border border-border/50">
            <div className="flex items-center gap-2 mb-3">
                <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span className="text-sm font-medium">会员分布</span>
            </div>

            {/* 分布条 */}
            {total > 0 && (
                <div className="h-2 rounded-full bg-background/50 overflow-hidden flex mb-3">
                    <div className="bg-slate-400/60" style={{ width: `${(memberLevelCounts.free / total) * 100}%` }} />
                    <div className="bg-amber-500/80" style={{ width: `${(memberLevelCounts.vip / total) * 100}%` }} />
                    <div className="bg-purple-500/80" style={{ width: `${(memberLevelCounts.svip / total) * 100}%` }} />
                </div>
            )}

            {/* 数据 */}
            <div className="grid grid-cols-3 gap-2">
                <div className="p-2 rounded bg-background/50 text-center">
                    <p className="text-lg font-bold text-slate-400 tabular-nums">{memberLevelCounts.free}</p>
                    <p className="text-xs text-foreground/50">普通</p>
                </div>
                <div className="p-2 rounded bg-background/50 text-center">
                    <p className="text-lg font-bold text-amber-500 tabular-nums">{memberLevelCounts.vip}</p>
                    <p className="text-xs text-foreground/50">VIP</p>
                </div>
                <div className="p-2 rounded bg-background/50 text-center">
                    <p className="text-lg font-bold text-purple-500 tabular-nums">{memberLevelCounts.svip}</p>
                    <p className="text-xs text-foreground/50">SVIP</p>
                </div>
            </div>
        </div>
    );
}
