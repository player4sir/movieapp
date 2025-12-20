'use client';

/**
 * Agent Management Page - Unified view with tabs
 * Clean, responsive design for desktop and mobile
 */

import { useState } from 'react';
import Link from 'next/link';
import useSWR from 'swr';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useToast } from '@/components/admin';

interface AgentLevel {
    id: string;
    name: string;
    sortOrder: number;
    commissionRate: number;
}

interface AgentProfile {
    userId: string;
    realName: string;
    contact: string;
    status: 'pending' | 'active' | 'rejected' | 'disabled';
    totalIncome: number;
    balance: number;
    levelId: string;
    level: AgentLevel;
    agentCode: string | null;
    createdAt: string;
}

type TabType = 'list' | 'applications';

// Quick access menu items
const quickLinks = [
    { href: '/console-x9k2m/agents/records', label: '业绩管理', icon: '📊', desc: '查看月度业绩' },
    { href: '/console-x9k2m/agents/settlements', label: '结算管理', icon: '💰', desc: '发起结算打款' },
    { href: '/console-x9k2m/agents/settlement-history', label: '结算历史', icon: '📋', desc: '历史结算记录' },
    { href: '/console-x9k2m/agents/level-logs', label: '等级日志', icon: '📝', desc: '等级变更历史' },
    { href: '/console-x9k2m/settings/agent-config', label: '系统配置', icon: '⚙️', desc: '代理商系统配置' },
    { href: '/console-x9k2m/settings/agent-levels', label: '等级配置', icon: '🏆', desc: '代理等级设置' },
];

export default function AgentManagementPage() {
    const { getAccessToken } = useAdminAuth();
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<TabType>('list');
    const [showQuickMenu, setShowQuickMenu] = useState(false);

    // Edit Modal State
    const [isEditOpen, setIsEditOpen] = useState(false);
    const [editingProfile, setEditingProfile] = useState<AgentProfile | null>(null);
    const [editFormData, setEditFormData] = useState({
        realName: '',
        contact: '',
        levelId: '',
        status: '' as AgentProfile['status'],
    });

    const fetcher = async (url: string) => {
        const token = getAccessToken();
        if (!token) throw new Error('未登录');
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('获取失败');
        return res.json();
    };

    const { data: pendingData, mutate: mutatePending } = useSWR<{ data: AgentProfile[] }>(
        '/api/admin/agent-profiles?status=pending',
        fetcher
    );

    const { data: activeData, mutate: mutateActive } = useSWR<{ data: AgentProfile[] }>(
        '/api/admin/agent-profiles?status=active',
        fetcher
    );

    const { data: levelsData } = useSWR<{ data: AgentLevel[] }>('/api/admin/agent-levels', fetcher);
    const levels = levelsData?.data || [];

    const pendingProfiles = pendingData?.data || [];
    const activeProfiles = activeData?.data || [];

    const handleAction = async (userId: string, action: 'approve' | 'reject') => {
        if (!confirm(`确定${action === 'approve' ? '通过' : '拒绝'}申请？`)) return;
        const token = getAccessToken();
        if (!token) return;
        try {
            const res = await fetch('/api/admin/agent-profiles', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ userId, action })
            });
            if (!res.ok) throw new Error('操作失败');
            showToast({ message: '操作成功', type: 'success' });
            mutatePending();
            mutateActive();
        } catch (e) {
            showToast({ message: e instanceof Error ? e.message : '操作失败', type: 'error' });
        }
    };

    const handleEdit = (profile: AgentProfile) => {
        setEditingProfile(profile);
        setEditFormData({
            realName: profile.realName,
            contact: profile.contact,
            levelId: profile.levelId,
            status: profile.status,
        });
        setIsEditOpen(true);
    };

    const handleUpdate = async () => {
        if (!editingProfile) return;
        const token = getAccessToken();
        if (!token) return;
        try {
            const res = await fetch('/api/admin/agent-profiles', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ userId: editingProfile.userId, ...editFormData })
            });
            if (!res.ok) throw new Error('更新失败');
            showToast({ message: '更新成功', type: 'success' });
            setIsEditOpen(false);
            mutateActive();
        } catch (e) {
            showToast({ message: e instanceof Error ? e.message : '更新失败', type: 'error' });
        }
    };

    const formatMoney = (cents: number) => `¥${(cents / 100).toFixed(2)}`;

    return (
        <div className="min-h-screen bg-background">
            {/* Header */}
            <div className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border/30">
                <div className="p-4 lg:px-6">
                    <div className="flex items-center justify-between">
                        <h1 className="text-lg font-semibold">代理商管理</h1>
                        <button
                            onClick={() => setShowQuickMenu(!showQuickMenu)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-surface-secondary/50 hover:bg-surface-secondary rounded-lg text-xs transition-colors"
                        >
                            <span>更多功能</span>
                            <svg className={`w-4 h-4 transition-transform ${showQuickMenu ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                    </div>

                    {/* Quick Menu Dropdown */}
                    {showQuickMenu && (
                        <div className="mt-3 grid grid-cols-2 lg:grid-cols-3 gap-2">
                            {quickLinks.map((link) => (
                                <Link
                                    key={link.href}
                                    href={link.href}
                                    className="flex items-center gap-2 p-3 bg-surface rounded-lg border border-border/30 hover:border-primary/50 transition-colors"
                                >
                                    <span className="text-xl">{link.icon}</span>
                                    <div className="min-w-0">
                                        <div className="text-sm font-medium truncate">{link.label}</div>
                                        <div className="text-xs text-foreground/40 truncate hidden lg:block">{link.desc}</div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    )}

                    {/* Tabs */}
                    <div className="flex gap-1 mt-4 p-1 bg-surface-secondary/30 rounded-lg">
                        <button
                            onClick={() => setActiveTab('list')}
                            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'list'
                                ? 'bg-surface text-foreground shadow-sm'
                                : 'text-foreground/60 hover:text-foreground'
                                }`}
                        >
                            代理商列表
                            <span className="ml-1 text-xs opacity-60">({activeProfiles.length})</span>
                        </button>
                        <button
                            onClick={() => setActiveTab('applications')}
                            className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors relative ${activeTab === 'applications'
                                ? 'bg-surface text-foreground shadow-sm'
                                : 'text-foreground/60 hover:text-foreground'
                                }`}
                        >
                            待审核
                            {pendingProfiles.length > 0 && (
                                <span className="absolute -top-1 -right-1 min-w-5 h-5 flex items-center justify-center text-xs bg-red-500 text-white rounded-full px-1">
                                    {pendingProfiles.length}
                                </span>
                            )}
                        </button>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="p-4 lg:px-6 pb-20">
                {activeTab === 'list' ? (
                    <AgentListContent
                        profiles={activeProfiles}
                        onEdit={handleEdit}
                        formatMoney={formatMoney}
                    />
                ) : (
                    <ApplicationsContent
                        profiles={pendingProfiles}
                        onAction={handleAction}
                    />
                )}
            </div>

            {/* Edit Modal */}
            {isEditOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end lg:items-center justify-center" onClick={() => setIsEditOpen(false)}>
                    <div
                        className="bg-background rounded-t-2xl lg:rounded-xl p-6 w-full lg:max-w-md max-h-[90vh] overflow-y-auto"
                        onClick={e => e.stopPropagation()}
                    >
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">编辑代理信息</h2>
                            <button onClick={() => setIsEditOpen(false)} className="p-1 text-foreground/40 hover:text-foreground">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">真实姓名</label>
                                <input
                                    value={editFormData.realName}
                                    onChange={e => setEditFormData(f => ({ ...f, realName: e.target.value }))}
                                    className="input w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">联系方式</label>
                                <input
                                    value={editFormData.contact}
                                    onChange={e => setEditFormData(f => ({ ...f, contact: e.target.value }))}
                                    className="input w-full"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">等级</label>
                                <select
                                    value={editFormData.levelId}
                                    onChange={(e) => setEditFormData(f => ({ ...f, levelId: e.target.value }))}
                                    className="input w-full"
                                >
                                    {levels.map(l => (
                                        <option key={l.id} value={l.id}>{l.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-medium mb-1">状态</label>
                                <select
                                    value={editFormData.status}
                                    onChange={(e) => setEditFormData(f => ({ ...f, status: e.target.value as AgentProfile['status'] }))}
                                    className="input w-full"
                                >
                                    <option value="active">正常</option>
                                    <option value="disabled">禁用</option>
                                </select>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setIsEditOpen(false)} className="flex-1 py-2.5 rounded-lg bg-surface-secondary text-foreground">取消</button>
                                <button onClick={handleUpdate} className="flex-1 py-2.5 rounded-lg bg-primary text-white">保存</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

// Agent List Content - Card layout for mobile, table for desktop
function AgentListContent({
    profiles,
    onEdit,
    formatMoney,
}: {
    profiles: AgentProfile[];
    onEdit: (profile: AgentProfile) => void;
    formatMoney: (cents: number) => string;
}) {
    if (profiles.length === 0) {
        return (
            <div className="py-16 text-center text-foreground/40">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface-secondary/50 flex items-center justify-center">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                </div>
                <div>暂无代理商</div>
            </div>
        );
    }

    return (
        <>
            {/* Mobile Card View - Compact */}
            <div className="lg:hidden space-y-2">
                {profiles.map(p => (
                    <div key={p.userId} className="bg-surface rounded-lg border border-border/30 p-3">
                        <div className="flex items-center justify-between gap-2">
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                    <span className="font-medium text-sm truncate">{p.realName}</span>
                                    <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-xs shrink-0">{p.level?.name || '-'}</span>
                                </div>
                                <div className="flex items-center gap-3 mt-1 text-xs text-foreground/50">
                                    <span>收益: <span className="text-primary font-medium">{formatMoney(p.totalIncome)}</span></span>
                                    <span>余额: <span className="text-orange-500 font-medium">{formatMoney(p.balance)}</span></span>
                                </div>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <Link href={`/console-x9k2m/agents/detail/${p.userId}`} className="px-2 py-1 text-xs text-foreground/60 hover:text-foreground">详情</Link>
                                <button onClick={() => onEdit(p)} className="px-2 py-1 text-xs text-primary">编辑</button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Desktop Table View */}
            <div className="hidden lg:block bg-surface rounded-xl border border-border/30 overflow-hidden">
                <table className="w-full text-sm">
                    <thead className="bg-surface-secondary/30 text-foreground/60 text-xs">
                        <tr>
                            <th className="px-4 py-3 text-left font-medium">代理商</th>
                            <th className="px-4 py-3 text-left font-medium">推广码</th>
                            <th className="px-4 py-3 text-left font-medium">等级</th>
                            <th className="px-4 py-3 text-right font-medium">总收益</th>
                            <th className="px-4 py-3 text-right font-medium">待提现</th>
                            <th className="px-4 py-3 text-center font-medium">状态</th>
                            <th className="px-4 py-3 text-right font-medium">操作</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/10">
                        {profiles.map(p => (
                            <tr key={p.userId} className="hover:bg-surface-secondary/20">
                                <td className="px-4 py-3">
                                    <div className="font-medium">{p.realName}</div>
                                    <div className="text-xs text-foreground/40">{p.contact}</div>
                                </td>
                                <td className="px-4 py-3">
                                    <code className="text-xs bg-surface-secondary px-2 py-0.5 rounded">{p.agentCode || '-'}</code>
                                </td>
                                <td className="px-4 py-3">
                                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">{p.level?.name || '-'}</span>
                                </td>
                                <td className="px-4 py-3 text-right font-medium text-primary">{formatMoney(p.totalIncome)}</td>
                                <td className="px-4 py-3 text-right font-medium text-orange-500">{formatMoney(p.balance)}</td>
                                <td className="px-4 py-3 text-center">
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs ${p.status === 'active' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${p.status === 'active' ? 'bg-green-500' : 'bg-red-500'}`}></span>
                                        {p.status === 'active' ? '正常' : '禁用'}
                                    </span>
                                </td>
                                <td className="px-4 py-3 text-right">
                                    <div className="flex justify-end gap-3">
                                        <Link href={`/console-x9k2m/agents/detail/${p.userId}`} className="text-foreground/60 hover:text-primary text-sm">详情</Link>
                                        <button onClick={() => onEdit(p)} className="text-primary hover:underline text-sm">编辑</button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}

// Applications Content - Card layout for both mobile and desktop
function ApplicationsContent({
    profiles,
    onAction,
}: {
    profiles: AgentProfile[];
    onAction: (userId: string, action: 'approve' | 'reject') => void;
}) {
    if (profiles.length === 0) {
        return (
            <div className="py-16 text-center text-foreground/40">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
                    <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                </div>
                <div>暂无待审核申请</div>
            </div>
        );
    }

    return (
        <div className="grid gap-3 lg:grid-cols-2">
            {profiles.map(p => (
                <div key={p.userId} className="bg-surface rounded-xl border border-border/30 p-4">
                    <div className="flex items-start justify-between mb-3">
                        <div>
                            <div className="font-medium">{p.realName}</div>
                            <div className="text-xs text-foreground/40">{p.contact}</div>
                        </div>
                        <span className="px-2 py-0.5 bg-yellow-500/10 text-yellow-500 rounded text-xs">待审核</span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-foreground/60 mb-4">
                        <div>申请等级: <span className="text-primary">{p.level?.name || '-'}</span></div>
                        <div>申请时间: {new Date(p.createdAt).toLocaleDateString()}</div>
                    </div>
                    <div className="flex gap-2">
                        <button
                            onClick={() => onAction(p.userId, 'reject')}
                            className="flex-1 py-2 text-center text-sm bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition-colors"
                        >
                            拒绝
                        </button>
                        <button
                            onClick={() => onAction(p.userId, 'approve')}
                            className="flex-1 py-2 text-center text-sm bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors"
                        >
                            通过
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
}
