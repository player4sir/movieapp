'use client';

/**
 * Agent Detail Page
 * Shows comprehensive info for a single agent
 */

import { use } from 'react';
import useSWR from 'swr';
import { useRouter } from 'next/navigation';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

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

export default function AgentDetailPage({ params }: { params: Promise<{ userId: string }> }) {
    const { userId } = use(params);
    const router = useRouter();
    const { getAccessToken } = useAdminAuth();

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
            <div className="p-6 text-center">
                <div className="text-red-400 mb-4">加载失败: {error.message}</div>
                <button onClick={() => router.back()} className="btn-secondary">
                    返回
                </button>
            </div>
        );
    }

    if (isLoading || !data) {
        return <div className="p-6 text-center text-foreground/40">加载中...</div>;
    }

    const { profile, stats, records, recentReferrals, recentSettlements } = data;

    return (
        <div className="p-4 lg:p-6">
            {/* Header */}
            <div className="flex items-center gap-4 mb-6">
                <button onClick={() => router.back()} className="text-foreground/60 hover:text-foreground">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </button>
                <div>
                    <h1 className="text-lg lg:text-xl font-semibold">{profile.realName}</h1>
                    <p className="text-sm text-foreground/60">{profile.contact}</p>
                </div>
                <span className={`ml-auto px-3 py-1 rounded-full text-sm ${profile.status === 'active' ? 'bg-green-500/20 text-green-400' :
                        profile.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400' :
                            'bg-red-500/20 text-red-400'
                    }`}>
                    {profile.status === 'active' ? '正常' : profile.status === 'pending' ? '待审核' : '已禁用'}
                </span>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                <StatCard title="等级" value={profile.level?.name || '-'} />
                <StatCard title="推广码" value={profile.agentCode || '-'} />
                <StatCard title="佣金比例" value={`${((profile.level?.commissionRate || 0) / 100).toFixed(1)}%`} />
                <StatCard title="推荐人数" value={stats.totalReferrals} />
                <StatCard title="总收益" value={`¥${(profile.totalIncome / 100).toFixed(2)}`} color="text-primary" />
                <StatCard title="待提现" value={`¥${(stats.pendingBalance / 100).toFixed(2)}`} color="text-orange-500" />
                <StatCard title="已结算" value={`¥${(stats.totalSettled / 100).toFixed(2)}`} color="text-green-500" />
                <StatCard title="结算次数" value={stats.settlementCount} />
            </div>

            <div className="grid md:grid-cols-2 gap-6">
                {/* Recent Records */}
                <div className="bg-surface rounded-lg border border-border/50 p-4">
                    <h2 className="font-semibold mb-3">月度业绩 (近6个月)</h2>
                    {records.length === 0 ? (
                        <div className="text-foreground/40 text-sm">暂无业绩记录</div>
                    ) : (
                        <div className="space-y-2">
                            {records.map(record => (
                                <div key={record.id} className="flex items-center justify-between py-2 border-b border-border/10 last:border-0">
                                    <div>
                                        <div className="font-medium">{record.month}</div>
                                        <div className="text-xs text-foreground/40">
                                            销售 ¥{record.totalSales} · 招募 {record.recruitCount}人
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="font-bold text-primary">¥{(record.totalEarnings / 100).toFixed(2)}</div>
                                        <div className={`text-xs ${record.status === 'settled' ? 'text-green-400' : 'text-yellow-400'}`}>
                                            {record.status === 'settled' ? '已结算' : '待结算'}
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Referrals */}
                <div className="bg-surface rounded-lg border border-border/50 p-4">
                    <h2 className="font-semibold mb-3">推荐用户 (最近10位)</h2>
                    {recentReferrals.length === 0 ? (
                        <div className="text-foreground/40 text-sm">暂无推荐用户</div>
                    ) : (
                        <div className="space-y-2">
                            {recentReferrals.map(user => (
                                <div key={user.id} className="flex items-center justify-between py-2 border-b border-border/10 last:border-0">
                                    <div>
                                        <div className="font-medium">{user.nickname || user.username}</div>
                                        <div className="text-xs text-foreground/40">
                                            {new Date(user.createdAt).toLocaleDateString()}
                                        </div>
                                    </div>
                                    <span className={`px-2 py-0.5 rounded text-xs ${user.memberLevel === 'svip' ? 'bg-purple-500/20 text-purple-400' :
                                            user.memberLevel === 'vip' ? 'bg-yellow-500/20 text-yellow-400' :
                                                'bg-gray-500/20 text-gray-400'
                                        }`}>
                                        {user.memberLevel.toUpperCase()}
                                    </span>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Recent Settlements */}
                <div className="bg-surface rounded-lg border border-border/50 p-4 md:col-span-2">
                    <h2 className="font-semibold mb-3">结算记录 (最近5笔)</h2>
                    {recentSettlements.length === 0 ? (
                        <div className="text-foreground/40 text-sm">暂无结算记录</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-foreground/60 text-xs">
                                    <tr>
                                        <th className="text-left py-2">时间</th>
                                        <th className="text-right py-2">金额</th>
                                        <th className="text-center py-2">方式</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {recentSettlements.map(s => (
                                        <tr key={s.id} className="border-t border-border/10">
                                            <td className="py-2 text-foreground/60">
                                                {new Date(s.createdAt).toLocaleString()}
                                            </td>
                                            <td className="py-2 text-right font-bold text-green-500">
                                                ¥{(s.amount / 100).toFixed(2)}
                                            </td>
                                            <td className="py-2 text-center">
                                                <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">
                                                    {s.method === 'alipay' ? '支付宝' : s.method === 'wechat' ? '微信' : s.method}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, color = 'text-foreground' }: { title: string; value: string | number; color?: string }) {
    return (
        <div className="bg-surface rounded-lg border border-border/50 p-3">
            <div className="text-xs text-foreground/60 mb-1">{title}</div>
            <div className={`text-lg font-bold ${color} truncate`}>{value}</div>
        </div>
    );
}
