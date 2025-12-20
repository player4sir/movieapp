'use client';

/**
 * Agent Center Page - Enhanced PWA Responsive Design
 * 
 * Features:
 * - Responsive layout for desktop and mobile
 * - Monthly stats display
 * - Referral list with pagination
 * - Settlement history
 * - Payment settings management
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import {
    ChevronLeft,
    Share2,
    TrendingUp,
    Users,
    Wallet,
    Crown,
    RefreshCw,
    Calendar,
    Settings,
    Copy,
    CheckCircle2,
    UsersRound
} from 'lucide-react';
import Link from 'next/link';

interface AgentProfile {
    status: 'pending' | 'active' | 'rejected' | 'disabled';
    realName: string;
    contact: string;
    totalIncome: number;
    balance: number;
    level: {
        name: string;
        commissionRate: number;
    };
    paymentMethod?: 'alipay' | 'wechat' | 'bank' | 'kangxun';
    paymentAccount?: string;
    // Multi-level referral fields
    parentAgentId?: string;
    commissionRate: number;
    subAgentRate: number;
    level2AgentId?: string;
    agentCode?: string;
}

interface MonthlyStats {
    currentMonth: string;
    thisMonth: {
        newReferrals: number;
        recruitCount: number;
        totalSales: number;
        commissionAmount: number;
        bonusAmount: number;
        totalEarnings: number;
        status: 'pending' | 'settled';
    };
    allTime: {
        totalReferrals: number;
        totalIncome: number;
        balance: number;
    };
    history: Array<{
        month: string;
        totalSales: number;
        totalEarnings: number;
        status: 'pending' | 'settled';
    }>;
}

interface ReferralUser {
    id: string;
    nickname: string;
    memberLevel: string;
    createdAt: string;
    hasPurchased: boolean;
}

interface SettlementRecord {
    id: string;
    amount: number;
    method: string;
    account: string;
    createdAt: string;
    note?: string;
}

type TabType = 'overview' | 'referrals' | 'settlements';

export default function AgentCenterPage() {
    const router = useRouter();
    const { user, isAuthenticated, loading, getAccessToken } = useAuth();
    const [profile, setProfile] = useState<AgentProfile | null>(null);
    const [fetching, setFetching] = useState(true);
    const [activeTab, setActiveTab] = useState<TabType>('overview');

    // Stats State
    const [stats, setStats] = useState<MonthlyStats | null>(null);
    const [loadingStats, setLoadingStats] = useState(false);

    // Referrals State
    const [referrals, setReferrals] = useState<ReferralUser[]>([]);
    const [referralsPagination, setReferralsPagination] = useState({ page: 1, total: 0, totalPages: 0 });
    const [loadingReferrals, setLoadingReferrals] = useState(false);

    // Settlement History State
    const [settlements, setSettlements] = useState<SettlementRecord[]>([]);
    const [loadingSettlements, setLoadingSettlements] = useState(false);

    // Payment Settings State
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [settingsForm, setSettingsForm] = useState({
        paymentMethod: 'alipay',
        paymentAccount: '',
        realName: ''
    });
    const [savingSettings, setSavingSettings] = useState(false);

    const headers = useCallback((): Record<string, string> => {
        const token = getAccessToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }, [getAccessToken]);

    // Fetch Profile
    useEffect(() => {
        if (!isAuthenticated) return;

        fetch('/api/user/agent', { headers: headers() })
            .then(res => res.json())
            .then(res => {
                if (res.data) {
                    setProfile(res.data);
                    setSettingsForm({
                        paymentMethod: res.data.paymentMethod || 'alipay',
                        paymentAccount: res.data.paymentAccount || '',
                        realName: res.data.realName || ''
                    });
                } else {
                    router.replace('/agent/apply');
                }
            })
            .catch(() => { })
            .finally(() => setFetching(false));
    }, [isAuthenticated, headers, router]);

    // Fetch Stats
    const fetchStats = useCallback(async () => {
        setLoadingStats(true);
        try {
            const res = await fetch('/api/user/agent/stats', { headers: headers() });
            const data = await res.json();
            if (data.data) {
                setStats(data.data);
            }
        } catch (e) {
            console.error('Failed to fetch stats:', e);
        } finally {
            setLoadingStats(false);
        }
    }, [headers]);

    // Fetch Referrals
    const fetchReferrals = useCallback(async (page = 1) => {
        setLoadingReferrals(true);
        try {
            const res = await fetch(`/api/user/agent/referrals?page=${page}&pageSize=20`, { headers: headers() });
            const data = await res.json();
            if (data.data) {
                setReferrals(data.data);
                setReferralsPagination(data.pagination);
            }
        } catch (e) {
            console.error('Failed to fetch referrals:', e);
        } finally {
            setLoadingReferrals(false);
        }
    }, [headers]);

    // Fetch Settlements
    const fetchSettlements = useCallback(async () => {
        setLoadingSettlements(true);
        try {
            const res = await fetch('/api/user/agent/settlements', { headers: headers() });
            const data = await res.json();
            if (data.data) {
                setSettlements(data.data);
            }
        } catch (e) {
            console.error('Failed to fetch settlements:', e);
        } finally {
            setLoadingSettlements(false);
        }
    }, [headers]);

    // Initial data fetch
    useEffect(() => {
        if (profile?.status === 'active') {
            fetchStats();
            fetchSettlements();
        }
    }, [profile, fetchStats, fetchSettlements]);

    // Fetch referrals when tab changes
    useEffect(() => {
        if (activeTab === 'referrals' && profile?.status === 'active' && referrals.length === 0) {
            fetchReferrals(1);
        }
    }, [activeTab, profile, referrals.length, fetchReferrals]);

    const handleSaveSettings = async () => {
        setSavingSettings(true);
        const token = getAccessToken();
        try {
            const res = await fetch('/api/user/agent/payment-info', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(settingsForm)
            });
            if (res.ok) {
                const data = await res.json();
                setProfile(prev => prev ? { ...prev, ...data.profile } : null);
                setShowSettingsModal(false);
            } else {
                alert('保存失败，请重试');
            }
        } catch (e) {
            alert('保存失败，请检查网络');
        } finally {
            setSavingSettings(false);
        }
    };

    const formatMonth = (month: string) => {
        const [year, m] = month.split('-');
        return `${year}年${parseInt(m)}月`;
    };

    const getMemberLevelLabel = (level: string) => {
        switch (level) {
            case 'svip': return { label: 'SVIP', color: 'text-purple-400 bg-purple-500/10' };
            case 'vip': return { label: 'VIP', color: 'text-amber-400 bg-amber-500/10' };
            default: return { label: '普通', color: 'text-foreground/60 bg-white/5' };
        }
    };

    const getPaymentMethodLabel = (method: string) => {
        switch (method) {
            case 'alipay': return '支付宝';
            case 'wechat': return '微信';
            case 'bank': return '银行卡';
            case 'kangxun': return '康讯号';
            default: return method;
        }
    };

    if (loading || fetching) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    if (!profile || profile.status !== 'active') {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
                <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-6">
                    <Users className="w-10 h-10 text-primary" />
                </div>
                <h2 className="text-xl font-bold mb-2">
                    {profile?.status === 'pending' ? '申请审核中' : '成为合伙人'}
                </h2>
                <p className="text-foreground/60 mb-6 text-center max-w-xs">
                    {profile?.status === 'pending'
                        ? '您的申请正在审核中，请耐心等待'
                        : '加入合伙人计划，推广赚取高额佣金'}
                </p>
                {profile?.status !== 'pending' && (
                    <Link href="/agent/apply" className="px-8 py-3 bg-primary text-white rounded-full font-medium active:scale-95 transition-transform">
                        立即申请
                    </Link>
                )}
                <button onClick={() => router.back()} className="mt-4 text-sm text-foreground/50">
                    返回
                </button>
            </div>
        );
    }

    return (
        <>
            <Sidebar />
            <div className="h-screen flex flex-col bg-background overflow-hidden lg:pl-64">
                {/* Header */}
                <header
                    className="flex-none px-4 py-3 flex items-center gap-3 border-b border-white/5 bg-background/80 backdrop-blur-xl z-20"
                    style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
                >
                    <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full active:bg-white/10 lg:hidden">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-lg font-bold flex-1">代理中心</h1>
                    <button
                        onClick={() => { fetchStats(); if (activeTab === 'referrals') fetchReferrals(); if (activeTab === 'settlements') fetchSettlements(); }}
                        className="p-2 rounded-full active:bg-white/10 hover:bg-white/5 transition-colors"
                        disabled={loadingStats}
                    >
                        <RefreshCw className={`w-5 h-5 ${loadingStats ? 'animate-spin' : ''}`} />
                    </button>
                </header>

                <main className="flex-1 overflow-auto">
                    {/* Content wrapper with max-width for large screens */}
                    <div className="max-w-4xl mx-auto">
                        {/* Hero Card */}
                        <div className="p-4 lg:p-6">
                            <div className="bg-gradient-to-br from-primary/20 via-purple-500/15 to-pink-500/10 rounded-2xl lg:rounded-3xl p-5 lg:p-8 border border-white/5 relative overflow-hidden">
                                {/* Background decoration */}
                                <div className="absolute -right-8 -top-8 w-32 h-32 bg-white/5 rounded-full blur-2xl" />
                                <div className="absolute -left-8 -bottom-8 w-24 h-24 bg-primary/10 rounded-full blur-2xl" />

                                <div className="relative">
                                    {/* Balance Section */}
                                    <div className="flex items-start justify-between mb-6">
                                        <div>
                                            <div className="text-sm text-foreground/60 mb-1">可提现余额</div>
                                            <div className="text-4xl lg:text-5xl font-bold tracking-tight">
                                                ¥{(profile.balance / 100).toFixed(2)}
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2 px-3 py-1.5 bg-white/10 rounded-full">
                                            <Crown className="w-4 h-4 text-amber-400" />
                                            <span className="text-sm font-medium">{profile.level?.name || 'V1'}</span>
                                        </div>
                                    </div>

                                    {/* Stats Grid - Responsive */}
                                    <div className="grid grid-cols-3 gap-2 lg:gap-4">
                                        <div className="bg-black/20 backdrop-blur-sm rounded-xl p-3 lg:p-4">
                                            <div className="text-xs text-foreground/50 mb-1">累计收益</div>
                                            <div className="text-base lg:text-xl font-bold">¥{(profile.totalIncome / 100).toFixed(2)}</div>
                                        </div>
                                        <div className="bg-black/20 backdrop-blur-sm rounded-xl p-3 lg:p-4">
                                            <div className="text-xs text-foreground/50 mb-1">佣金比例</div>
                                            <div className="text-base lg:text-xl font-bold text-green-400">
                                                {((profile.level?.commissionRate || 0) / 100).toFixed(0)}%
                                            </div>
                                        </div>
                                        <div className="bg-black/20 backdrop-blur-sm rounded-xl p-3 lg:p-4">
                                            <div className="text-xs text-foreground/50 mb-1">总推广</div>
                                            <div className="text-base lg:text-xl font-bold text-blue-400">
                                                {loadingStats ? '...' : (stats?.allTime.totalReferrals ?? 0)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Quick Actions - Responsive Grid */}
                        <div className="px-4 lg:px-6 pb-4">
                            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                                <Link
                                    href="/agent/share"
                                    className="bg-surface hover:bg-surface-secondary rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-all group"
                                >
                                    <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                                        <Share2 className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm">推广赚钱</div>
                                        <div className="text-xs text-foreground/50 truncate">分享推广码</div>
                                    </div>
                                </Link>

                                {/* Team management - only for agents who can invite */}
                                {!profile.level2AgentId && (
                                    <Link
                                        href="/agent/team"
                                        className="bg-surface hover:bg-surface-secondary rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-all group"
                                    >
                                        <div className="w-11 h-11 rounded-xl bg-purple-500/10 flex items-center justify-center text-purple-400 group-hover:scale-110 transition-transform">
                                            <UsersRound className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="font-medium text-sm">我的团队</div>
                                            <div className="text-xs text-foreground/50 truncate">
                                                发展下级代理
                                            </div>
                                        </div>
                                    </Link>
                                )}

                                <button
                                    onClick={() => setShowSettingsModal(true)}
                                    className="bg-surface hover:bg-surface-secondary rounded-2xl p-4 flex items-center gap-3 active:scale-[0.98] transition-all text-left group"
                                >
                                    <div className="w-11 h-11 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400 group-hover:scale-110 transition-transform">
                                        <Settings className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm">收款设置</div>
                                        <div className="text-xs text-foreground/50 truncate">
                                            {profile.paymentAccount ? '已设置' : '未设置'}
                                        </div>
                                    </div>
                                </button>

                                {/* Desktop only - additional quick stats */}
                                <div className="hidden lg:flex bg-surface rounded-2xl p-4 items-center gap-3">
                                    <div className="w-11 h-11 rounded-xl bg-orange-500/10 flex items-center justify-center text-orange-400">
                                        <Users className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm">本月新增</div>
                                        <div className="text-xs text-foreground/50">
                                            {loadingStats ? '...' : `${stats?.thisMonth.newReferrals ?? 0} 人`}
                                        </div>
                                    </div>
                                </div>

                                <div className="hidden lg:flex bg-surface rounded-2xl p-4 items-center gap-3">
                                    <div className="w-11 h-11 rounded-xl bg-red-500/10 flex items-center justify-center text-red-400">
                                        <TrendingUp className="w-5 h-5" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <div className="font-medium text-sm">本月佣金</div>
                                        <div className="text-xs text-foreground/50">
                                            {loadingStats ? '...' : `¥${((stats?.thisMonth.totalEarnings ?? 0) / 100).toFixed(2)}`}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Tabs - Sticky on mobile */}
                        <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-xl border-b border-white/5">
                            <div className="px-4 lg:px-6">
                                <div className="flex gap-1 lg:gap-2">
                                    {[
                                        { key: 'overview', label: '业绩概览', icon: TrendingUp },
                                        { key: 'referrals', label: '我的推广', icon: Users },
                                        { key: 'settlements', label: '结算记录', icon: Wallet },
                                    ].map((tab) => (
                                        <button
                                            key={tab.key}
                                            onClick={() => setActiveTab(tab.key as TabType)}
                                            className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all ${activeTab === tab.key
                                                ? 'text-primary border-primary'
                                                : 'text-foreground/60 border-transparent hover:text-foreground/80'
                                                }`}
                                        >
                                            <tab.icon className="w-4 h-4 hidden sm:block" />
                                            {tab.label}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Tab Content */}
                        <div className="p-4 lg:p-6 pb-24 lg:pb-8">
                            {/* Overview Tab */}
                            {activeTab === 'overview' && (
                                <div className="space-y-4 lg:space-y-6">
                                    {/* This Month Stats - Mobile visible, desktop in quick actions */}
                                    <div className="lg:hidden bg-surface rounded-2xl p-4">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-bold flex items-center gap-2">
                                                <Calendar className="w-4 h-4 text-primary" />
                                                {stats ? formatMonth(stats.currentMonth) : '本月'}数据
                                            </h3>
                                            {stats?.thisMonth.status === 'settled' && (
                                                <span className="text-xs px-2 py-0.5 bg-green-500/10 text-green-500 rounded-full">已结算</span>
                                            )}
                                        </div>

                                        <div className="grid grid-cols-2 gap-3">
                                            <div className="flex items-center gap-3 p-3 bg-background rounded-xl">
                                                <div className="w-10 h-10 rounded-lg bg-orange-500/10 flex items-center justify-center text-orange-400">
                                                    <Users className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="text-xs text-foreground/50">新增推广</div>
                                                    <div className="text-xl font-bold">
                                                        {loadingStats ? '...' : (stats?.thisMonth.newReferrals ?? 0)}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-3 p-3 bg-background rounded-xl">
                                                <div className="w-10 h-10 rounded-lg bg-red-500/10 flex items-center justify-center text-red-400">
                                                    <TrendingUp className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="text-xs text-foreground/50">预估佣金</div>
                                                    <div className="text-xl font-bold">
                                                        {loadingStats ? '...' : `¥${((stats?.thisMonth.totalEarnings ?? 0) / 100).toFixed(2)}`}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Historical Records */}
                                    {stats && stats.history.length > 0 && (
                                        <div className="bg-surface rounded-2xl p-4 lg:p-5">
                                            <h3 className="font-bold mb-4">历史收益</h3>
                                            <div className="space-y-1">
                                                {stats.history.slice(0, 6).map((record) => (
                                                    <div
                                                        key={record.month}
                                                        className="flex items-center justify-between py-3 px-3 -mx-1 rounded-xl hover:bg-background/50 transition-colors"
                                                    >
                                                        <span className="text-sm text-foreground/70">{formatMonth(record.month)}</span>
                                                        <div className="flex items-center gap-3">
                                                            <span className="font-semibold">
                                                                ¥{(record.totalEarnings / 100).toFixed(2)}
                                                            </span>
                                                            <span className={`text-xs px-2 py-0.5 rounded-full ${record.status === 'settled'
                                                                ? 'bg-green-500/10 text-green-500'
                                                                : 'bg-yellow-500/10 text-yellow-500'
                                                                }`}>
                                                                {record.status === 'settled' ? '已结算' : '待结算'}
                                                            </span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <p className="text-xs text-foreground/40 text-center py-2">
                                        佣金由管理员定期结算，结算后将打入您的收款账户
                                    </p>
                                </div>
                            )}

                            {/* Referrals Tab */}
                            {activeTab === 'referrals' && (
                                <div className="space-y-3">
                                    {loadingReferrals ? (
                                        <div className="flex justify-center py-16">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                                        </div>
                                    ) : referrals.length > 0 ? (
                                        <>
                                            <div className="flex items-center justify-between mb-4">
                                                <span className="text-sm text-foreground/60">
                                                    共 <span className="font-medium text-foreground">{referralsPagination.total}</span> 位推广用户
                                                </span>
                                            </div>

                                            {/* Responsive grid for desktop */}
                                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                                {referrals.map((referral) => {
                                                    const levelInfo = getMemberLevelLabel(referral.memberLevel);
                                                    return (
                                                        <div
                                                            key={referral.id}
                                                            className="bg-surface hover:bg-surface-secondary rounded-xl p-4 flex items-center justify-between transition-colors"
                                                        >
                                                            <div className="flex items-center gap-3 min-w-0">
                                                                <div className="w-11 h-11 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center text-foreground/70 font-medium flex-shrink-0">
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

                                            {/* Pagination */}
                                            {referralsPagination.totalPages > 1 && (
                                                <div className="flex justify-center gap-2 pt-6">
                                                    <button
                                                        onClick={() => fetchReferrals(referralsPagination.page - 1)}
                                                        disabled={referralsPagination.page <= 1 || loadingReferrals}
                                                        className="px-5 py-2.5 bg-surface hover:bg-surface-secondary rounded-xl text-sm font-medium disabled:opacity-50 transition-colors"
                                                    >
                                                        上一页
                                                    </button>
                                                    <span className="px-4 py-2.5 text-sm text-foreground/60">
                                                        {referralsPagination.page} / {referralsPagination.totalPages}
                                                    </span>
                                                    <button
                                                        onClick={() => fetchReferrals(referralsPagination.page + 1)}
                                                        disabled={referralsPagination.page >= referralsPagination.totalPages || loadingReferrals}
                                                        className="px-5 py-2.5 bg-surface hover:bg-surface-secondary rounded-xl text-sm font-medium disabled:opacity-50 transition-colors"
                                                    >
                                                        下一页
                                                    </button>
                                                </div>
                                            )}
                                        </>
                                    ) : (
                                        <div className="text-center py-16">
                                            <div className="w-20 h-20 rounded-full bg-surface mx-auto mb-4 flex items-center justify-center">
                                                <Users className="w-10 h-10 text-foreground/20" />
                                            </div>
                                            <p className="text-foreground/60 mb-2">暂无推广用户</p>
                                            <p className="text-sm text-foreground/40 mb-6">分享您的邀请码，开始推广赚钱</p>
                                            <Link
                                                href="/share"
                                                className="inline-flex items-center gap-2 px-6 py-3 bg-primary text-white rounded-full text-sm font-medium active:scale-95 transition-transform"
                                            >
                                                <Share2 className="w-4 h-4" />
                                                去推广
                                            </Link>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Settlements Tab */}
                            {activeTab === 'settlements' && (
                                <div className="space-y-3">
                                    {loadingSettlements ? (
                                        <div className="flex justify-center py-16">
                                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
                                        </div>
                                    ) : settlements.length > 0 ? (
                                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                                            {settlements.map(record => (
                                                <div
                                                    key={record.id}
                                                    className="bg-surface hover:bg-surface-secondary rounded-2xl p-4 lg:p-5 flex justify-between items-start transition-colors"
                                                >
                                                    <div>
                                                        <div className="font-bold text-xl text-green-400">
                                                            +¥{(record.amount / 100).toFixed(2)}
                                                        </div>
                                                        <div className="text-xs text-foreground/50 mt-1.5">
                                                            {new Date(record.createdAt).toLocaleDateString('zh-CN', {
                                                                year: 'numeric',
                                                                month: 'long',
                                                                day: 'numeric'
                                                            })}
                                                        </div>
                                                        {record.note && (
                                                            <div className="text-xs text-foreground/40 mt-2 max-w-[200px] truncate">
                                                                备注：{record.note}
                                                            </div>
                                                        )}
                                                    </div>
                                                    <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-500/10 text-green-500 rounded-full text-xs font-medium">
                                                        <CheckCircle2 className="w-3.5 h-3.5" />
                                                        已结算
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-16">
                                            <div className="w-20 h-20 rounded-full bg-surface mx-auto mb-4 flex items-center justify-center">
                                                <Wallet className="w-10 h-10 text-foreground/20" />
                                            </div>
                                            <p className="text-foreground/60 mb-2">暂无结算记录</p>
                                            <p className="text-sm text-foreground/40">佣金由管理员定期结算</p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </main>
            </div>

            {/* Bottom Nav - Mobile only */}
            <BottomNav />

            {/* Settings Modal */}
            {showSettingsModal && (
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
                    onClick={(e) => e.target === e.currentTarget && setShowSettingsModal(false)}
                >
                    <div
                        className="bg-surface w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-6 space-y-5 animate-in slide-in-from-bottom-10 sm:slide-in-from-bottom-0 sm:zoom-in-95 fade-in duration-200"
                        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
                    >
                        <div className="flex items-center justify-between">
                            <h3 className="text-lg font-bold">收款设置</h3>
                            <button
                                onClick={() => setShowSettingsModal(false)}
                                className="p-2 -mr-2 rounded-full hover:bg-white/5 transition-colors"
                            >
                                <ChevronLeft className="w-5 h-5 rotate-180 lg:hidden" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="text-sm text-foreground/60 mb-2 block">真实姓名</label>
                                <input
                                    value={settingsForm.realName}
                                    onChange={e => setSettingsForm({ ...settingsForm, realName: e.target.value })}
                                    className="w-full bg-background px-4 py-3 rounded-xl border border-white/5 outline-none focus:border-primary transition-colors"
                                    placeholder="与收款账号一致的姓名"
                                />
                            </div>
                            <div>
                                <label className="text-sm text-foreground/60 mb-2 block">收款方式</label>
                                <select
                                    value={settingsForm.paymentMethod}
                                    onChange={e => setSettingsForm({ ...settingsForm, paymentMethod: e.target.value })}
                                    className="w-full bg-background px-4 py-3 rounded-xl border border-white/5 outline-none focus:border-primary transition-colors appearance-none cursor-pointer"
                                >
                                    <option value="alipay">支付宝</option>
                                    <option value="wechat">微信</option>
                                    <option value="bank">银行卡</option>
                                    <option value="kangxun">康讯号</option>
                                </select>
                            </div>
                            <div>
                                <label className="text-sm text-foreground/60 mb-2 block">收款账号</label>
                                <input
                                    value={settingsForm.paymentAccount}
                                    onChange={e => setSettingsForm({ ...settingsForm, paymentAccount: e.target.value })}
                                    className="w-full bg-background px-4 py-3 rounded-xl border border-white/5 outline-none focus:border-primary transition-colors"
                                    placeholder="请输入账号"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setShowSettingsModal(false)}
                                className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 font-medium transition-colors"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleSaveSettings}
                                disabled={savingSettings || !settingsForm.realName || !settingsForm.paymentAccount}
                                className="flex-1 py-3 rounded-xl bg-primary hover:bg-primary/90 text-white font-medium disabled:opacity-50 transition-colors"
                            >
                                {savingSettings ? '保存中...' : '保存'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
