'use client';

/**
 * Agent Center Page - Redesigned
 * 
 * Layout based on reference design:
 * - Top stats row: today's new, team count, yesterday earnings, commission rate
 * - Promo link with QR code
 * - Direct sub-agents list
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import {
    ChevronLeft,
    ChevronRight,
    RefreshCw,
    Settings,
    Copy,
    Check,
    QrCode,
    Users,
    TrendingUp,
    Wallet,
    Calendar,
    Crown
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
        totalEarnings: number;
    };
    allTime: {
        totalReferrals: number;
        totalIncome: number;
        balance: number;
    };
}

interface SubAgent {
    userId: string;
    realName: string;
    contact: string;
    commissionRate: number;
    totalIncome: number;
    createdAt: string;
}

interface TeamData {
    level1Agents: SubAgent[];
    level2Agents: SubAgent[];
    level3Agents: SubAgent[];
    teamCount: { direct: number; level2: number; level3: number; total: number };
    myCommissionRate: number;
    mySubAgentRate: number;
    canInvite: boolean;
    inviteCode: string;
}

export default function AgentCenterPage() {
    const router = useRouter();
    const { user, isAuthenticated, loading, getAccessToken } = useAuth();
    const [profile, setProfile] = useState<AgentProfile | null>(null);
    const [stats, setStats] = useState<MonthlyStats | null>(null);
    const [teamData, setTeamData] = useState<TeamData | null>(null);
    const [fetching, setFetching] = useState(true);
    const [copied, setCopied] = useState(false);
    const [showQrModal, setShowQrModal] = useState(false);
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

    // Fetch all data
    useEffect(() => {
        if (!isAuthenticated) return;

        const fetchData = async () => {
            setFetching(true);
            try {
                const [profileRes, statsRes, teamRes] = await Promise.all([
                    fetch('/api/user/agent', { headers: headers() }),
                    fetch('/api/user/agent/stats', { headers: headers() }),
                    fetch('/api/user/agent/team', { headers: headers() })
                ]);

                const profileData = await profileRes.json();
                if (profileData.data) {
                    setProfile(profileData.data);
                    setSettingsForm({
                        paymentMethod: profileData.data.paymentMethod || 'alipay',
                        paymentAccount: profileData.data.paymentAccount || '',
                        realName: profileData.data.realName || ''
                    });
                } else {
                    router.replace('/agent/apply');
                    return;
                }

                const statsData = await statsRes.json();
                if (statsData.data) setStats(statsData.data);

                if (teamRes.ok) {
                    const teamJson = await teamRes.json();
                    setTeamData(teamJson);
                }
            } catch (e) {
                console.error('Failed to fetch data:', e);
            } finally {
                setFetching(false);
            }
        };

        fetchData();
    }, [isAuthenticated, headers, router]);

    const copyPromoLink = () => {
        if (!profile?.agentCode) return;
        const link = `${window.location.origin}/?ref=${profile.agentCode}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    const handleSaveSettings = async () => {
        setSavingSettings(true);
        const token = getAccessToken();
        try {
            const res = await fetch('/api/user/agent/payment-info', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify(settingsForm)
            });
            if (res.ok) {
                const data = await res.json();
                setProfile(prev => prev ? { ...prev, ...data.profile } : null);
                setShowSettingsModal(false);
            } else {
                alert('保存失败');
            }
        } catch (e) {
            alert('网络错误');
        } finally {
            setSavingSettings(false);
        }
    };

    if (loading || fetching) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
                <p className="text-foreground/60 mb-4">未找到代理信息</p>
                <button onClick={() => router.push('/agent/apply')} className="text-primary">申请成为代理</button>
            </div>
        );
    }

    // Pending/rejected/disabled states
    if (profile.status !== 'active') {
        return (
            <>
                <Sidebar />
                <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 lg:pl-64">
                    <div className="w-20 h-20 rounded-full bg-yellow-500/10 flex items-center justify-center mb-4">
                        <Calendar className="w-10 h-10 text-yellow-500" />
                    </div>
                    <h2 className="text-xl font-bold mb-2">
                        {profile.status === 'pending' ? '审核中' : profile.status === 'rejected' ? '申请被拒绝' : '账号已禁用'}
                    </h2>
                    <p className="text-foreground/60 text-center max-w-sm">
                        {profile.status === 'pending'
                            ? '您的代理申请正在审核中，请耐心等待'
                            : profile.status === 'rejected'
                                ? '很抱歉，您的申请未通过审核'
                                : '您的代理账号已被禁用，如有疑问请联系客服'}
                    </p>
                </div>
                <BottomNav />
            </>
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
                    <h1 className="text-lg font-bold flex-1">代理中心</h1>
                    <button
                        onClick={() => setShowSettingsModal(true)}
                        className="p-2 rounded-full active:bg-white/10 hover:bg-white/5"
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                </header>

                <main className="max-w-2xl mx-auto px-4 py-4 space-y-4">
                    {/* Top Stats Row + Promo Link */}
                    <div className="flex gap-3">
                        {/* Stats Grid */}
                        <div className="flex-1 grid grid-cols-2 gap-2">
                            <div className="bg-surface rounded-xl p-3 text-center">
                                <div className="text-xl font-bold text-foreground">{stats?.thisMonth.newReferrals ?? 0}</div>
                                <div className="text-xs text-foreground/50">今日新增</div>
                            </div>
                            <div className="bg-surface rounded-xl p-3 text-center">
                                <div className="text-xl font-bold text-foreground">{teamData?.teamCount.total ?? 0}</div>
                                <div className="text-xs text-foreground/50">团队人数</div>
                            </div>
                            <div className="bg-surface rounded-xl p-3 text-center">
                                <div className="text-xl font-bold text-green-400">¥{((stats?.thisMonth.totalEarnings ?? 0) / 100).toFixed(0)}</div>
                                <div className="text-xs text-foreground/50">本月收益</div>
                            </div>
                            <div className="bg-surface rounded-xl p-3 text-center">
                                <div className="text-xl font-bold text-primary">{((profile.commissionRate ?? 0) / 100).toFixed(0)}%</div>
                                <div className="text-xs text-foreground/50">佣金比例</div>
                            </div>
                        </div>

                        {/* Promo Link Section */}
                        <div className="bg-surface rounded-xl p-3 flex flex-col items-center justify-center min-w-[100px]">
                            <button
                                onClick={() => setShowQrModal(true)}
                                className="w-16 h-16 bg-white rounded-lg flex items-center justify-center mb-2 active:scale-95 transition-transform"
                            >
                                <QrCode className="w-10 h-10 text-gray-800" />
                            </button>
                            <button
                                onClick={copyPromoLink}
                                className="text-xs text-primary flex items-center gap-1"
                            >
                                {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                                {copied ? '已复制' : '推广链接'}
                            </button>
                        </div>
                    </div>

                    {/* Balance Card */}
                    <div className="bg-gradient-to-r from-primary/20 to-purple-500/10 rounded-xl p-4 border border-primary/20">
                        <div className="flex items-center justify-between">
                            <div>
                                <div className="text-sm text-foreground/60 mb-1">可提现余额</div>
                                <div className="text-3xl font-bold">¥{(profile.balance / 100).toFixed(2)}</div>
                            </div>
                            <div className="text-right">
                                <div className="flex items-center gap-1.5 px-2.5 py-1 bg-white/10 rounded-full mb-1">
                                    <Crown className="w-4 h-4 text-amber-400" />
                                    <span className="text-sm font-medium">{profile.level?.name || 'V1'}</span>
                                </div>
                                <div className="text-xs text-foreground/50">累计 ¥{(profile.totalIncome / 100).toFixed(2)}</div>
                            </div>
                        </div>
                    </div>

                    {/* Quick Links */}
                    <div className="grid grid-cols-4 gap-2">
                        <Link href="/agent/share" className="bg-surface rounded-xl p-3 text-center group">
                            <div className="w-10 h-10 rounded-full bg-blue-500/10 mx-auto mb-1.5 flex items-center justify-center group-active:scale-95 transition-transform">
                                <TrendingUp className="w-5 h-5 text-blue-400" />
                            </div>
                            <div className="text-xs">推广赚钱</div>
                        </Link>
                        <Link href="/agent/referrals" className="bg-surface rounded-xl p-3 text-center group">
                            <div className="w-10 h-10 rounded-full bg-orange-500/10 mx-auto mb-1.5 flex items-center justify-center group-active:scale-95 transition-transform">
                                <Users className="w-5 h-5 text-orange-400" />
                            </div>
                            <div className="text-xs">我的用户</div>
                        </Link>
                        {!profile.level2AgentId && (
                            <Link href="/agent/team" className="bg-surface rounded-xl p-3 text-center group">
                                <div className="w-10 h-10 rounded-full bg-purple-500/10 mx-auto mb-1.5 flex items-center justify-center group-active:scale-95 transition-transform">
                                    <Users className="w-5 h-5 text-purple-400" />
                                </div>
                                <div className="text-xs">代理管理</div>
                            </Link>
                        )}
                        <Link href="/agent/settlements" className="bg-surface rounded-xl p-3 text-center group">
                            <div className="w-10 h-10 rounded-full bg-green-500/10 mx-auto mb-1.5 flex items-center justify-center group-active:scale-95 transition-transform">
                                <Wallet className="w-5 h-5 text-green-400" />
                            </div>
                            <div className="text-xs">结算记录</div>
                        </Link>
                    </div>

                    {/* Direct Sub-Agents Section */}
                    <div className="bg-surface rounded-xl overflow-hidden">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                            <h3 className="font-medium">直属下级</h3>
                            {!profile.level2AgentId && (
                                <Link href="/agent/team" className="text-xs text-primary flex items-center gap-0.5">
                                    查看全部 <ChevronRight className="w-4 h-4" />
                                </Link>
                            )}
                        </div>

                        {/* Table Header */}
                        <div className="grid grid-cols-4 px-4 py-2 bg-white/5 text-xs text-foreground/50">
                            <div>用户名</div>
                            <div className="text-right">收益</div>
                            <div className="text-right">团队人数</div>
                            <div className="text-right">注册时间</div>
                        </div>

                        {/* Table Body */}
                        {teamData && teamData.level1Agents.length > 0 ? (
                            <div className="divide-y divide-white/5">
                                {teamData.level1Agents.slice(0, 5).map((agent: SubAgent) => (
                                    <div key={agent.userId} className="grid grid-cols-4 px-4 py-3 text-sm items-center">
                                        <div className="truncate font-medium">{agent.realName || '代理'}</div>
                                        <div className="text-right text-green-400">¥{(agent.totalIncome / 100).toFixed(0)}</div>
                                        <div className="text-right text-foreground/60">-</div>
                                        <div className="text-right text-foreground/50 text-xs">
                                            {new Date(agent.createdAt).toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="py-12 text-center">
                                <div className="w-16 h-16 rounded-full bg-white/5 mx-auto mb-3 flex items-center justify-center">
                                    <Users className="w-8 h-8 text-foreground/20" />
                                </div>
                                <p className="text-foreground/50 text-sm">暂无下级代理</p>
                                {!profile.level2AgentId && (
                                    <p className="text-xs text-foreground/40 mt-1">分享推广链接发展团队</p>
                                )}
                            </div>
                        )}
                    </div>
                </main>
            </div>

            <BottomNav />

            {/* QR Code Modal */}
            {showQrModal && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    onClick={() => setShowQrModal(false)}
                >
                    <div className="bg-surface rounded-2xl p-6 max-w-sm w-full mx-4" onClick={e => e.stopPropagation()}>
                        <h3 className="text-lg font-bold text-center mb-4">我的推广码</h3>
                        <div className="bg-white rounded-xl p-4 mb-4">
                            {/* Placeholder for actual QR code - would need qrcode library */}
                            <div className="w-48 h-48 mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                                <div className="text-center">
                                    <QrCode className="w-16 h-16 text-gray-400 mx-auto mb-2" />
                                    <p className="text-xs text-gray-500">邀请码: {profile.agentCode}</p>
                                </div>
                            </div>
                        </div>
                        <p className="text-center text-sm text-foreground/60 mb-4">
                            扫码或复制链接邀请新用户注册
                        </p>
                        <button
                            onClick={copyPromoLink}
                            className="w-full py-3 bg-primary text-white rounded-xl font-medium flex items-center justify-center gap-2"
                        >
                            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                            {copied ? '链接已复制' : '复制推广链接'}
                        </button>
                    </div>
                </div>
            )}

            {/* Settings Modal */}
            {showSettingsModal && (
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
                    onClick={() => setShowSettingsModal(false)}
                >
                    <div
                        className="bg-surface w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-6"
                        onClick={e => e.stopPropagation()}
                        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
                    >
                        <h3 className="text-lg font-bold mb-4">收款设置</h3>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-foreground/60 mb-1">收款方式</label>
                                <select
                                    value={settingsForm.paymentMethod}
                                    onChange={e => setSettingsForm(f => ({ ...f, paymentMethod: e.target.value }))}
                                    className="w-full px-4 py-3 bg-background rounded-xl border border-white/10"
                                >
                                    <option value="kangxun">康讯支付</option>
                                    <option value="alipay">支付宝</option>
                                    <option value="wechat">微信</option>
                                    <option value="bank">银行卡</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm text-foreground/60 mb-1">收款账号</label>
                                <input
                                    type="text"
                                    value={settingsForm.paymentAccount}
                                    onChange={e => setSettingsForm(f => ({ ...f, paymentAccount: e.target.value }))}
                                    className="w-full px-4 py-3 bg-background rounded-xl border border-white/10"
                                    placeholder="请输入收款账号"
                                />
                            </div>
                            <div>
                                <label className="block text-sm text-foreground/60 mb-1">真实姓名</label>
                                <input
                                    type="text"
                                    value={settingsForm.realName}
                                    onChange={e => setSettingsForm(f => ({ ...f, realName: e.target.value }))}
                                    className="w-full px-4 py-3 bg-background rounded-xl border border-white/10"
                                    placeholder="请输入真实姓名"
                                />
                            </div>
                        </div>
                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setShowSettingsModal(false)}
                                className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleSaveSettings}
                                disabled={savingSettings}
                                className="flex-1 py-3 rounded-xl bg-primary text-white disabled:opacity-50"
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
