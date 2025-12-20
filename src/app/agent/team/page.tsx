'use client';

/**
 * Agent Team Management Page
 * - View and manage sub-agents
 * - Set sub-agent commission rate
 * - Generate invite link
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import {
    ChevronLeft,
    Users,
    Copy,
    Check,
    Settings,
    Link as LinkIcon,
    Info
} from 'lucide-react';

interface TeamData {
    subAgents: Array<{
        userId: string;
        realName: string;
        contact: string;
        commissionRate: number;
        totalIncome: number;
        createdAt: string;
    }>;
    teamCount: { direct: number; total: number };
    myCommissionRate: number;
    mySubAgentRate: number;
    canInvite: boolean;
    inviteCode: string;
}

export default function AgentTeamPage() {
    const router = useRouter();
    const { isAuthenticated, loading, getAccessToken } = useAuth();
    const [teamData, setTeamData] = useState<TeamData | null>(null);
    const [fetching, setFetching] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Settings modal
    const [showSettingsModal, setShowSettingsModal] = useState(false);
    const [newSubAgentRate, setNewSubAgentRate] = useState(0);
    const [saving, setSaving] = useState(false);

    // Copy state
    const [copied, setCopied] = useState(false);

    const headers = useCallback((): Record<string, string> => {
        const token = getAccessToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }, [getAccessToken]);

    // Fetch team data
    const fetchTeam = useCallback(async () => {
        setFetching(true);
        try {
            const res = await fetch('/api/user/agent/team', { headers: headers() });
            const data = await res.json();
            if (res.ok) {
                setTeamData(data);
                setNewSubAgentRate(data.mySubAgentRate);
            } else {
                setError(data.error || '获取团队信息失败');
            }
        } catch (e) {
            setError('网络错误');
        } finally {
            setFetching(false);
        }
    }, [headers]);

    useEffect(() => {
        if (isAuthenticated) {
            fetchTeam();
        }
    }, [isAuthenticated, fetchTeam]);

    const handleSaveRate = async () => {
        setSaving(true);
        try {
            const res = await fetch('/api/user/agent/team', {
                method: 'PUT',
                headers: {
                    ...headers(),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ subAgentRate: newSubAgentRate }),
            });
            const data = await res.json();
            if (res.ok) {
                setTeamData(prev => prev ? { ...prev, mySubAgentRate: newSubAgentRate, canInvite: newSubAgentRate > 0 } : null);
                setShowSettingsModal(false);
                alert(data.message);
            } else {
                alert(data.error || '设置失败');
            }
        } catch (e) {
            alert('网络错误');
        } finally {
            setSaving(false);
        }
    };

    const copyInviteLink = () => {
        if (!teamData?.inviteCode) return;
        const link = `${window.location.origin}/agent/apply?invite=${teamData.inviteCode}`;
        navigator.clipboard.writeText(link);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    if (loading || fetching) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
                <p className="text-foreground/60 mb-4">{error}</p>
                <button onClick={() => router.back()} className="text-primary">返回</button>
            </div>
        );
    }

    if (!teamData) return null;

    const myEarningRate = teamData.myCommissionRate - teamData.mySubAgentRate;

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
                    <h1 className="text-lg font-bold flex-1">我的团队</h1>
                    <button
                        onClick={() => setShowSettingsModal(true)}
                        className="p-2 rounded-full active:bg-white/10 hover:bg-white/5"
                    >
                        <Settings className="w-5 h-5" />
                    </button>
                </header>

                <main className="max-w-2xl mx-auto p-4 space-y-4">
                    {/* Stats Cards */}
                    <div className="grid grid-cols-2 gap-3">
                        <div className="bg-surface rounded-xl p-4">
                            <div className="text-xs text-foreground/50 mb-1">我的佣金率</div>
                            <div className="text-2xl font-bold text-green-400">
                                {(teamData.myCommissionRate / 100).toFixed(1)}%
                            </div>
                        </div>
                        <div className="bg-surface rounded-xl p-4">
                            <div className="text-xs text-foreground/50 mb-1">团队成员</div>
                            <div className="text-2xl font-bold text-blue-400">
                                {teamData.teamCount.total}
                            </div>
                        </div>
                    </div>

                    {/* Commission Split Info */}
                    <div className="bg-gradient-to-r from-primary/10 to-purple-500/10 rounded-xl p-4 border border-primary/20">
                        <div className="flex items-start gap-3">
                            <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                            <div className="text-sm">
                                <p className="text-foreground/80 mb-2">
                                    您的佣金率为 <span className="font-bold text-primary">{(teamData.myCommissionRate / 100).toFixed(1)}%</span>
                                </p>
                                {teamData.mySubAgentRate > 0 ? (
                                    <p className="text-foreground/60">
                                        您让利给下级 {(teamData.mySubAgentRate / 100).toFixed(1)}%，
                                        自己保留 <span className="text-green-400 font-medium">{(myEarningRate / 100).toFixed(1)}%</span>
                                    </p>
                                ) : (
                                    <p className="text-foreground/60">
                                        您还未设置下级佣金率，无法邀请下级代理
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Invite Section */}
                    {teamData.canInvite && teamData.inviteCode && (
                        <div className="bg-surface rounded-xl p-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-medium">邀请下级代理</h3>
                                <span className="text-xs px-2 py-0.5 bg-green-500/10 text-green-500 rounded-full">
                                    可邀请
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="flex-1 bg-background rounded-lg px-3 py-2 text-sm text-foreground/60 truncate">
                                    {window?.location?.origin}/agent/apply?invite={teamData.inviteCode}
                                </div>
                                <button
                                    onClick={copyInviteLink}
                                    className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium flex items-center gap-2 shrink-0 active:scale-95 transition-transform"
                                >
                                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    {copied ? '已复制' : '复制'}
                                </button>
                            </div>
                            <p className="text-xs text-foreground/40 mt-2">
                                分享此链接，通过此链接申请的代理将成为您的下级
                            </p>
                        </div>
                    )}

                    {/* Sub Agents List */}
                    <div className="bg-surface rounded-xl p-4">
                        <h3 className="font-medium mb-4">下级代理 ({teamData.subAgents.length})</h3>
                        {teamData.subAgents.length > 0 ? (
                            <div className="space-y-3">
                                {teamData.subAgents.map(agent => (
                                    <div key={agent.userId} className="flex items-center justify-between p-3 bg-background rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-primary font-medium">
                                                {agent.realName?.[0] || 'A'}
                                            </div>
                                            <div>
                                                <div className="font-medium text-sm">{agent.realName || '代理商'}</div>
                                                <div className="text-xs text-foreground/50">
                                                    佣金率 {(agent.commissionRate / 100).toFixed(1)}%
                                                </div>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <div className="text-sm font-medium text-green-400">
                                                ¥{(agent.totalIncome / 100).toFixed(2)}
                                            </div>
                                            <div className="text-xs text-foreground/40">累计收入</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8">
                                <Users className="w-12 h-12 text-foreground/20 mx-auto mb-3" />
                                <p className="text-foreground/50 text-sm">暂无下级代理</p>
                                {teamData.canInvite && (
                                    <p className="text-xs text-foreground/40 mt-1">分享邀请链接发展团队</p>
                                )}
                            </div>
                        )}
                    </div>
                </main>
            </div>

            <BottomNav />

            {/* Settings Modal */}
            {showSettingsModal && (
                <div
                    className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm"
                    onClick={(e) => e.target === e.currentTarget && setShowSettingsModal(false)}
                >
                    <div
                        className="bg-surface w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl p-6 space-y-5"
                        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
                    >
                        <h3 className="text-lg font-bold">设置下级佣金率</h3>

                        <div className="space-y-4">
                            <div className="bg-background rounded-xl p-4">
                                <div className="flex items-center justify-between mb-3">
                                    <span className="text-sm text-foreground/60">我的佣金率</span>
                                    <span className="font-bold">{(teamData.myCommissionRate / 100).toFixed(1)}%</span>
                                </div>
                                <div className="flex items-center justify-between">
                                    <span className="text-sm text-foreground/60">给下级的佣金率</span>
                                    <div className="flex items-center gap-2">
                                        <input
                                            type="number"
                                            value={(newSubAgentRate / 100).toFixed(1)}
                                            onChange={(e) => setNewSubAgentRate(Math.round(parseFloat(e.target.value) * 100))}
                                            className="w-20 text-right bg-surface-secondary px-2 py-1 rounded border border-white/10 text-sm"
                                            step="0.1"
                                            min="0"
                                            max={(teamData.myCommissionRate / 100 - 0.1).toFixed(1)}
                                        />
                                        <span className="text-sm">%</span>
                                    </div>
                                </div>
                            </div>

                            {newSubAgentRate > 0 && (
                                <div className="bg-green-500/10 rounded-xl p-3 text-sm text-green-400">
                                    我保留：{((teamData.myCommissionRate - newSubAgentRate) / 100).toFixed(1)}%
                                </div>
                            )}

                            {newSubAgentRate >= teamData.myCommissionRate && (
                                <div className="bg-red-500/10 rounded-xl p-3 text-sm text-red-400">
                                    下级佣金率必须小于您的佣金率
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 pt-2">
                            <button
                                onClick={() => setShowSettingsModal(false)}
                                className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 font-medium"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleSaveRate}
                                disabled={saving || newSubAgentRate >= teamData.myCommissionRate}
                                className="flex-1 py-3 rounded-xl bg-primary text-white font-medium disabled:opacity-50"
                            >
                                {saving ? '保存中...' : '保存'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
