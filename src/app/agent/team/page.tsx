'use client';

/**
 * Agent Team Management Page - Redesigned
 * 
 * Features:
 * - Tab navigation: Level 1, Level 2, Level 3
 * - Card-based sub-agent display
 * - Individual commission rate setting
 * - Copy invite link
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
    Edit2,
    X
} from 'lucide-react';

interface SubAgent {
    userId: string;
    realName: string;
    contact: string;
    commissionRate: number;
    totalIncome: number;
    createdAt: string;
    parentAgentId?: string;
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

type TabLevel = 'level1' | 'level2' | 'level3';

export default function AgentTeamPage() {
    const router = useRouter();
    const { isAuthenticated, loading, getAccessToken } = useAuth();
    const [teamData, setTeamData] = useState<TeamData | null>(null);
    const [fetching, setFetching] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<TabLevel>('level1');

    // Settings modal for editing specific agent's rate
    const [editingAgent, setEditingAgent] = useState<SubAgent | null>(null);
    const [newRate, setNewRate] = useState(0);
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

    const openEditModal = (agent: SubAgent) => {
        setEditingAgent(agent);
        setNewRate(agent.commissionRate);
    };

    const handleSaveRate = async () => {
        if (!editingAgent) return;
        setSaving(true);
        try {
            const res = await fetch('/api/user/agent/team', {
                method: 'PUT',
                headers: {
                    ...headers(),
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    targetUserId: editingAgent.userId,
                    newRate
                }),
            });
            const data = await res.json();
            if (res.ok) {
                // Update local state
                setTeamData(prev => {
                    if (!prev) return null;
                    return {
                        ...prev,
                        level1Agents: prev.level1Agents.map(a =>
                            a.userId === editingAgent.userId ? { ...a, commissionRate: newRate } : a
                        ),
                    };
                });
                setEditingAgent(null);
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

    const tabs = [
        { key: 'level1' as TabLevel, label: '第一级', count: teamData.teamCount.direct },
        { key: 'level2' as TabLevel, label: '第二级', count: teamData.teamCount.level2 },
        { key: 'level3' as TabLevel, label: '第三级', count: teamData.teamCount.level3 },
    ];

    const getCurrentAgents = (): SubAgent[] => {
        switch (activeTab) {
            case 'level1': return teamData.level1Agents;
            case 'level2': return teamData.level2Agents;
            case 'level3': return teamData.level3Agents;
            default: return [];
        }
    };

    const agents = getCurrentAgents();

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
                    <h1 className="text-lg font-bold flex-1">下级用户</h1>
                </header>

                {/* Tab Navigation */}
                <div className="sticky top-[57px] z-10 bg-background px-4 pt-2 pb-3 border-b border-white/5">
                    <div className="flex bg-surface rounded-full p-1">
                        {tabs.map(tab => (
                            <button
                                key={tab.key}
                                onClick={() => setActiveTab(tab.key)}
                                className={`flex-1 py-2 px-3 rounded-full text-sm font-medium transition-all ${activeTab === tab.key
                                        ? 'bg-primary text-white'
                                        : 'text-foreground/60 hover:text-foreground'
                                    }`}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>
                </div>

                <main className="max-w-2xl mx-auto px-4 py-4 space-y-3">
                    {/* Invite Link - Only show for canInvite users */}
                    {teamData.canInvite && activeTab === 'level1' && (
                        <div className="bg-gradient-to-r from-primary/10 to-blue-500/10 rounded-xl p-4 border border-primary/20">
                            <div className="flex items-center justify-between">
                                <div>
                                    <div className="text-sm font-medium mb-1">我的邀请链接</div>
                                    <div className="text-xs text-foreground/60">
                                        新下级佣金: {(teamData.mySubAgentRate / 100).toFixed(1)}%
                                    </div>
                                </div>
                                <button
                                    onClick={copyInviteLink}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${copied
                                            ? 'bg-green-500 text-white'
                                            : 'bg-primary text-white active:scale-95'
                                        }`}
                                >
                                    {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                                    {copied ? '已复制' : '复制链接'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Agents List */}
                    {agents.length > 0 ? (
                        <div className="space-y-3">
                            {agents.map(agent => (
                                <div key={agent.userId} className="bg-surface rounded-xl p-4">
                                    <div className="flex items-start gap-3">
                                        {/* Avatar */}
                                        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center text-lg font-bold text-primary flex-shrink-0">
                                            {agent.realName?.[0]?.toUpperCase() || 'A'}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center justify-between mb-1">
                                                <div className="font-medium truncate">
                                                    {agent.realName || '代理'}
                                                    <span className="text-foreground/40 text-sm ml-1">
                                                        (ID:{agent.userId.slice(-4)})
                                                    </span>
                                                </div>
                                                {/* Edit button - only for level 1 */}
                                                {activeTab === 'level1' && (
                                                    <button
                                                        onClick={() => openEditModal(agent)}
                                                        className="text-primary text-sm flex items-center gap-1 ml-2 shrink-0"
                                                    >
                                                        <Edit2 className="w-3.5 h-3.5" />
                                                        设置
                                                    </button>
                                                )}
                                            </div>

                                            <div className="text-sm text-foreground/60 space-y-0.5">
                                                <div>
                                                    返佣比例：<span className="text-primary font-medium">{(agent.commissionRate / 100).toFixed(1)}%</span>
                                                </div>
                                                <div className="text-xs text-foreground/40">
                                                    {new Date(agent.createdAt).toLocaleDateString('zh-CN')} 加入
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="py-16 text-center">
                            <div className="w-20 h-20 rounded-full bg-surface mx-auto mb-4 flex items-center justify-center">
                                <Users className="w-10 h-10 text-foreground/20" />
                            </div>
                            <p className="text-foreground/50 text-sm">
                                {activeTab === 'level1'
                                    ? '暂无下级代理'
                                    : activeTab === 'level2'
                                        ? '暂无二级下级'
                                        : '暂无三级下级'}
                            </p>
                            {activeTab === 'level1' && teamData.canInvite && (
                                <p className="text-xs text-foreground/40 mt-1">分享邀请链接发展团队</p>
                            )}
                        </div>
                    )}
                </main>
            </div>

            <BottomNav />

            {/* Edit Commission Rate Modal */}
            {editingAgent && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
                    onClick={() => setEditingAgent(null)}
                >
                    <div
                        className="bg-surface w-full max-w-sm mx-4 rounded-2xl p-6"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold">
                                设置{editingAgent.realName || '代理'}的佣金比例
                            </h3>
                            <button onClick={() => setEditingAgent(null)} className="p-1 rounded-full hover:bg-white/10">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm text-foreground/60 mb-2">佣金比例 (%)</label>
                                <input
                                    type="number"
                                    value={(newRate / 100).toFixed(1)}
                                    onChange={(e) => setNewRate(Math.round(parseFloat(e.target.value || '0') * 100))}
                                    className="w-full px-4 py-3 bg-background rounded-xl border border-white/10 text-center text-2xl font-bold"
                                    step="0.1"
                                    min="0"
                                    max={((teamData?.myCommissionRate || 0) / 100 - 0.1).toFixed(1)}
                                />
                            </div>

                            <div className="text-sm text-foreground/50 text-center">
                                范围: 0% ~ {((teamData?.myCommissionRate || 0) / 100 - 0.1).toFixed(1)}%
                            </div>

                            {newRate >= (teamData?.myCommissionRate || 0) && (
                                <div className="bg-red-500/10 text-red-400 px-3 py-2 rounded-lg text-sm text-center">
                                    不能高于或等于您的佣金率 ({((teamData?.myCommissionRate || 0) / 100).toFixed(1)}%)
                                </div>
                            )}
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setEditingAgent(null)}
                                className="flex-1 py-3 rounded-xl bg-white/5 hover:bg-white/10 font-medium"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleSaveRate}
                                disabled={saving || newRate >= (teamData?.myCommissionRate || 0) || newRate < 0}
                                className="flex-1 py-3 rounded-xl bg-primary text-white font-medium disabled:opacity-50"
                            >
                                {saving ? '保存中...' : '确认'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
