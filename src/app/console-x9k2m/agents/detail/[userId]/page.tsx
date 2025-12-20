'use client';

/**
 * Agent Detail Page
 * Shows comprehensive info for a single agent
 */

import { use, useState } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { PageHeader } from '@/components/admin';

interface AgentProfile {
    userId: string;
    realName: string;
    contact: string;
    totalIncome: number;
    balance: number;
    status: string;
    agentCode: string | null;
    createdAt: string;
    level: { name: string; commissionRate: number };
    user?: { nickname: string; username: string; createdAt: string };
}

interface AgentRecord {
    id: string;
    month: string;
    totalSales: number;
    commissionAmount: number;
    bonusAmount: number;
    totalEarnings: number;
    recruitCount: number;
    status: string;
}

interface Referral {
    id: string;
    nickname: string;
    username: string;
    memberLevel: string;
    createdAt: string;
}

interface Settlement {
    id: string;
    amount: number;
    method: string;
    createdAt: string;
}

interface AgentDetailData {
    profile: AgentProfile;
    stats: {
        totalReferrals: number;
        totalSettled: number;
        settlementCount: number;
        pendingBalance: number;
    };
    records: AgentRecord[];
    recentReferrals: Referral[];
    recentSettlements: Settlement[];
}

type TabType = 'records' | 'referrals' | 'settlements';

export default function AgentDetailPage({ params }: { params: Promise<{ userId: string }> }) {
    const { userId } = use(params);
    const router = useRouter();
    const { getAccessToken } = useAdminAuth();
    const [activeTab, setActiveTab] = useState<TabType>('records');

    const fetcher = async (url: string) => {
        const token = getAccessToken();
        if (!token) throw new Error('未登录');
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('获取失败');
        return res.json();
    };

    const { data, error, isLoading } = useSWR<AgentDetailData>(
        `/api/admin/agent-detail/${userId}`,
        fetcher
    );

    if (error) {
        return (
            <div className="min-h-screen bg-background">
                <PageHeader title="代理商详情" />
                <div className="p-6 text-center">
                    <div className="text-red-400 mb-4">加载失败: {error.message}</div>
                    <button onClick={() => router.back()} className="btn-secondary">返回</button>
                </div>
            </div>
        );
    }

    if (isLoading || !data) {
        return (
            <div className="min-h-screen bg-background">
                <PageHeader title="代理商详情" />
                <div className="p-6 text-center text-foreground/40">加载中...</div>
            </div>
        );
    }

    const { profile, stats, records, recentReferrals, recentSettlements } = data;
    const statusColors = {
        active: 'bg-green-500/20 text-green-400',
        pending: 'bg-yellow-500/20 text-yellow-400',
        disabled: 'bg-red-500/20 text-red-400'
    };

    const tabs: { key: TabType; label: string; count?: number }[] = [
        { key: 'records', label: '月度业绩', count: records.length },
        { key: 'referrals', label: '推荐用户', count: stats.totalReferrals },
        { key: 'settlements', label: '结算记录', count: stats.settlementCount },
    ];

    return (
        <div className="min-h-screen bg-background pb-20">
            <PageHeader title="代理商详情" />

            <div className="px-4 lg:px-6">
                {/* Profile Card */}
                <div className="bg-surface rounded-xl border border-border/30 p-4 mb-4">
                    <div className="flex items-start gap-3">
                        <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-lg shrink-0">
                            {(profile.realName || '?')[0]}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                                <h2 className="font-semibold text-lg">{profile.realName}</h2>
                                <span className={`px-2 py-0.5 rounded-full text-xs ${statusColors[profile.status as keyof typeof statusColors] || 'bg-gray-500/20 text-gray-400'}`}>
                                    {profile.status === 'active' ? '正常' : profile.status === 'pending' ? '待审核' : '已禁用'}
                                </span>
                            </div>
                            <div className="text-sm text-foreground/60">{profile.contact}</div>
                            <div className="flex items-center gap-3 mt-2 text-xs text-foreground/50">
                                <span className="px-2 py-0.5 bg-primary/10 text-primary rounded">{profile.level?.name}</span>
                                <span>佣金 {((profile.level?.commissionRate || 0) / 100).toFixed(1)}%</span>
                                {profile.agentCode && <span>推广码: {profile.agentCode}</span>}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Stats Grid - Compact */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                    <div className="bg-surface rounded-lg border border-border/20 p-2.5 text-center">
                        <div className="text-[10px] text-foreground/40 uppercase">推荐</div>
                        <div className="text-sm font-bold">{stats.totalReferrals}</div>
                    </div>
                    <div className="bg-surface rounded-lg border border-border/20 p-2.5 text-center">
                        <div className="text-[10px] text-foreground/40 uppercase">总收益</div>
                        <div className="text-sm font-bold text-primary">¥{(profile.totalIncome / 100).toFixed(0)}</div>
                    </div>
                    <div className="bg-surface rounded-lg border border-border/20 p-2.5 text-center">
                        <div className="text-[10px] text-foreground/40 uppercase">待提现</div>
                        <div className="text-sm font-bold text-orange-500">¥{(stats.pendingBalance / 100).toFixed(0)}</div>
                    </div>
                    <div className="bg-surface rounded-lg border border-border/20 p-2.5 text-center">
                        <div className="text-[10px] text-foreground/40 uppercase">已结算</div>
                        <div className="text-sm font-bold text-green-500">¥{(stats.totalSettled / 100).toFixed(0)}</div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="bg-surface rounded-xl border border-border/30 overflow-hidden">
                    {/* Tab Bar */}
                    <div className="flex border-b border-border/20">
                        {tabs.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex-1 px-3 py-3 text-sm font-medium transition-colors relative ${activeTab === tab.key
                                        ? 'text-primary'
                                        : 'text-foreground/50 hover:text-foreground/80'
                                    }`}
                            >
                                {tab.label}
                                {tab.count !== undefined && tab.count > 0 && (
                                    <span className="ml-1 text-xs text-foreground/40">({tab.count})</span>
                                )}
                                {activeTab === tab.key && (
                                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-primary" />
                                )}
                            </button>
                        ))}
                    </div>

                    {/* Tab Content */}
                    <div className="min-h-[200px]">
                        {/* Records Tab */}
                        {activeTab === 'records' && (
                            records.length === 0 ? (
                                <div className="p-8 text-center text-foreground/40 text-sm">暂无业绩记录</div>
                            ) : (
                                <div className="divide-y divide-border/10">
                                    {records.map(record => (
                                        <div key={record.id} className="px-4 py-3 flex items-center justify-between">
                                            <div>
                                                <div className="font-medium text-sm">{record.month}</div>
                                                <div className="text-xs text-foreground/40">
                                                    销售 ¥{record.totalSales.toLocaleString()} · 招募 {record.recruitCount}人
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <div className="font-bold text-primary text-sm">¥{(record.totalEarnings / 100).toFixed(2)}</div>
                                                <div className={`text-xs ${record.status === 'settled' ? 'text-green-400' : 'text-yellow-400'}`}>
                                                    {record.status === 'settled' ? '已结算' : '待结算'}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )
                        )}

                        {/* Referrals Tab */}
                        {activeTab === 'referrals' && (
                            recentReferrals.length === 0 ? (
                                <div className="p-8 text-center text-foreground/40 text-sm">暂无推荐用户</div>
                            ) : (
                                <div className="divide-y divide-border/10">
                                    {recentReferrals.map(user => (
                                        <div key={user.id} className="px-4 py-2.5 flex items-center justify-between">
                                            <div className="min-w-0">
                                                <div className="text-sm font-medium truncate">{user.nickname || user.username}</div>
                                                <div className="text-xs text-foreground/40">{new Date(user.createdAt).toLocaleDateString()}</div>
                                            </div>
                                            <span className={`px-2 py-0.5 rounded text-xs shrink-0 ${user.memberLevel === 'svip' ? 'bg-purple-500/20 text-purple-400' :
                                                    user.memberLevel === 'vip' ? 'bg-yellow-500/20 text-yellow-400' :
                                                        'bg-gray-500/20 text-gray-400'
                                                }`}>
                                                {user.memberLevel.toUpperCase()}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )
                        )}

                        {/* Settlements Tab */}
                        {activeTab === 'settlements' && (
                            recentSettlements.length === 0 ? (
                                <div className="p-8 text-center text-foreground/40 text-sm">暂无结算记录</div>
                            ) : (
                                <div className="divide-y divide-border/10">
                                    {recentSettlements.map(s => (
                                        <div key={s.id} className="px-4 py-2.5 flex items-center justify-between">
                                            <div>
                                                <div className="font-bold text-green-500 text-sm">¥{(s.amount / 100).toFixed(2)}</div>
                                                <div className="text-xs text-foreground/40">{new Date(s.createdAt).toLocaleDateString()}</div>
                                            </div>
                                            <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">
                                                {s.method === 'alipay' ? '支付宝' : s.method === 'wechat' ? '微信' : s.method === 'kangxun' ? '康讯' : s.method}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            )
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
