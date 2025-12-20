'use client';

/**
 * Agent Referrals Page - View promoted users
 * Shows users who registered via this agent's referral link
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import {
    ChevronLeft,
    Users,
    Crown,
    RefreshCw,
    Search
} from 'lucide-react';

interface ReferralUser {
    id: string;
    nickname: string;
    memberLevel: string;
    createdAt: string;
    hasPurchased: boolean;
}

export default function AgentReferralsPage() {
    const router = useRouter();
    const { isAuthenticated, loading, getAccessToken } = useAuth();
    const [referrals, setReferrals] = useState<ReferralUser[]>([]);
    const [pagination, setPagination] = useState({ page: 1, total: 0, totalPages: 0 });
    const [fetching, setFetching] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const headers = useCallback((): Record<string, string> => {
        const token = getAccessToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }, [getAccessToken]);

    const fetchReferrals = useCallback(async (page = 1) => {
        setFetching(true);
        try {
            const res = await fetch(`/api/user/agent/referrals?page=${page}&pageSize=20`, { headers: headers() });
            const data = await res.json();
            if (data.data) {
                setReferrals(data.data);
                setPagination(data.pagination);
            }
        } catch (e) {
            console.error('Failed to fetch referrals:', e);
        } finally {
            setFetching(false);
        }
    }, [headers]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchReferrals(1);
        }
    }, [isAuthenticated, fetchReferrals]);

    const getMemberLevelLabel = (level: string) => {
        switch (level) {
            case 'svip': return { label: 'SVIP', color: 'text-purple-400 bg-purple-500/10' };
            case 'vip': return { label: 'VIP', color: 'text-amber-400 bg-amber-500/10' };
            default: return { label: '普通', color: 'text-foreground/60 bg-white/5' };
        }
    };

    const filteredReferrals = searchQuery
        ? referrals.filter(r => r.nickname?.toLowerCase().includes(searchQuery.toLowerCase()))
        : referrals;

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    return (
        <>
            <Sidebar />
            <div className="min-h-screen bg-background pb-20 lg:pl-64">
                {/* Header */}
                <header
                    className="sticky top-0 z-20 px-4 py-3 flex items-center gap-3 border-b border-white/5 bg-background/80 backdrop-blur-xl"
                    style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
                >
                    <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full active:bg-white/10 lg:hidden">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-lg font-bold flex-1">我的用户</h1>
                    <button
                        onClick={() => fetchReferrals(pagination.page)}
                        className="p-2 rounded-full active:bg-white/10 hover:bg-white/5"
                        disabled={fetching}
                    >
                        <RefreshCw className={`w-5 h-5 ${fetching ? 'animate-spin' : ''}`} />
                    </button>
                </header>

                <main className="max-w-2xl mx-auto p-4 space-y-4">
                    {/* Summary */}
                    <div className="bg-gradient-to-r from-orange-500/10 to-amber-500/10 rounded-xl p-4 border border-orange-500/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm text-foreground/60">推广用户总数</div>
                                <div className="text-3xl font-bold text-orange-400">{pagination.total}</div>
                            </div>
                            <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center">
                                <Users className="w-6 h-6 text-orange-400" />
                            </div>
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="搜索用户昵称..."
                            className="w-full pl-10 pr-4 py-2.5 bg-surface rounded-xl border border-white/5 text-sm outline-none focus:border-primary/50"
                        />
                    </div>

                    {/* User List */}
                    {fetching ? (
                        <div className="flex justify-center py-16">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                        </div>
                    ) : filteredReferrals.length > 0 ? (
                        <div className="bg-surface rounded-xl divide-y divide-white/5">
                            {filteredReferrals.map((referral) => {
                                const levelInfo = getMemberLevelLabel(referral.memberLevel);
                                return (
                                    <div
                                        key={referral.id}
                                        className="p-4 flex items-center justify-between"
                                    >
                                        <div className="flex items-center gap-3 min-w-0">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center text-foreground/70 font-medium flex-shrink-0">
                                                {referral.nickname?.[0]?.toUpperCase() || 'U'}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="font-medium text-sm flex items-center gap-2 flex-wrap">
                                                    <span className="truncate">{referral.nickname || '用户'}</span>
                                                    <span className={`text-xs px-1.5 py-0.5 rounded-full flex-shrink-0 ${levelInfo.color}`}>
                                                        {levelInfo.label}
                                                    </span>
                                                </div>
                                                <div className="text-xs text-foreground/50 mt-0.5">
                                                    {new Date(referral.createdAt).toLocaleDateString('zh-CN')} 注册
                                                </div>
                                            </div>
                                        </div>
                                        {referral.hasPurchased && (
                                            <div className="flex items-center gap-1.5 text-xs text-amber-400 bg-amber-500/10 px-2 py-1 rounded-full flex-shrink-0">
                                                <Crown className="w-3.5 h-3.5" />
                                                已购买
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="text-center py-16">
                            <div className="w-20 h-20 rounded-full bg-surface mx-auto mb-4 flex items-center justify-center">
                                <Users className="w-10 h-10 text-foreground/20" />
                            </div>
                            <p className="text-foreground/60 mb-2">
                                {searchQuery ? '未找到匹配的用户' : '暂无推广用户'}
                            </p>
                            {!searchQuery && (
                                <p className="text-sm text-foreground/40">分享您的邀请码，开始推广赚钱</p>
                            )}
                        </div>
                    )}

                    {/* Pagination */}
                    {pagination.totalPages > 1 && (
                        <div className="flex justify-center gap-2 pt-4">
                            <button
                                onClick={() => fetchReferrals(pagination.page - 1)}
                                disabled={pagination.page <= 1 || fetching}
                                className="px-5 py-2.5 bg-surface hover:bg-surface-secondary rounded-xl text-sm font-medium disabled:opacity-50"
                            >
                                上一页
                            </button>
                            <span className="px-4 py-2.5 text-sm text-foreground/60">
                                {pagination.page} / {pagination.totalPages}
                            </span>
                            <button
                                onClick={() => fetchReferrals(pagination.page + 1)}
                                disabled={pagination.page >= pagination.totalPages || fetching}
                                className="px-5 py-2.5 bg-surface hover:bg-surface-secondary rounded-xl text-sm font-medium disabled:opacity-50"
                            >
                                下一页
                            </button>
                        </div>
                    )}
                </main>
            </div>

            <BottomNav />
        </>
    );
}
