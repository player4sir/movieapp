'use client';

/**
 * Agent List Page - Shows active/approved agents only
 * For managing existing agents (editing, viewing details, etc.)
 */

import { useState } from 'react';
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

export default function AgentListPage() {
    const { getAccessToken } = useAdminAuth();
    const { showToast } = useToast();

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

    // Only fetch active agents
    const { data, mutate } = useSWR<{ data: AgentProfile[] }>(
        '/api/admin/agent-profiles?status=active',
        fetcher
    );

    // Fetch levels for dropdown
    const { data: levelsData } = useSWR<{ data: AgentLevel[] }>('/api/admin/agent-levels', fetcher);
    const levels = levelsData?.data || [];

    const profiles = data?.data || [];

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
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: editingProfile.userId,
                    ...editFormData
                })
            });
            if (!res.ok) throw new Error('更新失败');
            showToast({ message: '更新成功', type: 'success' });
            setIsEditOpen(false);
            mutate();
        } catch (e) {
            showToast({ message: e instanceof Error ? e.message : '更新失败', type: 'error' });
        }
    };

    const formatMoney = (cents: number) => `¥${(cents / 100).toFixed(2)}`;

    return (
        <div className="p-4 lg:p-6 pb-20">
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-lg lg:text-xl font-semibold">代理商列表</h1>
                <span className="text-sm text-foreground/40">共 {profiles.length} 位代理商</span>
            </div>

            <div className="bg-surface rounded-lg border border-border/50 flex flex-col h-[calc(100vh-140px)]">
                <div className="flex-1 overflow-auto relative">
                    <table className="w-full text-sm relative border-separate border-spacing-0">
                        <thead className="bg-[#121212] text-foreground/60 text-xs sticky top-0 z-10 shadow-sm">
                            <tr>
                                <th className="px-4 py-3 text-left border-b border-white/10 bg-[#121212] whitespace-nowrap">姓名/联系方式</th>
                                <th className="px-4 py-3 text-left border-b border-white/10 bg-[#121212] whitespace-nowrap">推广码</th>
                                <th className="px-4 py-3 text-left border-b border-white/10 bg-[#121212] whitespace-nowrap">等级</th>
                                <th className="px-4 py-3 text-right border-b border-white/10 bg-[#121212] whitespace-nowrap">总收益</th>
                                <th className="px-4 py-3 text-right border-b border-white/10 bg-[#121212] whitespace-nowrap">待提现</th>
                                <th className="px-4 py-3 text-center border-b border-white/10 bg-[#121212] whitespace-nowrap">状态</th>
                                <th className="px-4 py-3 text-right border-b border-white/10 bg-[#121212] whitespace-nowrap">操作</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border/10 bg-surface">
                            {profiles.map(p => (
                                <tr key={p.userId} className="hover:bg-surface-secondary/30">
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <div className="font-medium text-sm">{p.realName}</div>
                                        <div className="text-xs text-foreground/40">{p.contact}</div>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <code className="text-xs bg-surface-secondary px-2 py-1 rounded">
                                            {p.agentCode || '-'}
                                        </code>
                                    </td>
                                    <td className="px-4 py-3 whitespace-nowrap">
                                        <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs select-none">
                                            {p.level?.name || '-'}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium whitespace-nowrap text-primary">
                                        {formatMoney(p.totalIncome)}
                                    </td>
                                    <td className="px-4 py-3 text-right font-medium whitespace-nowrap text-orange-500">
                                        {formatMoney(p.balance)}
                                    </td>
                                    <td className="px-4 py-3 text-center whitespace-nowrap">
                                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${p.status === 'active' ? 'bg-green-500/10 text-green-500' :
                                                p.status === 'disabled' ? 'bg-red-500/10 text-red-500' :
                                                    'bg-gray-500/10 text-gray-500'
                                            }`}>
                                            <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${p.status === 'active' ? 'bg-green-500' :
                                                    p.status === 'disabled' ? 'bg-red-500' : 'bg-gray-500'
                                                }`}></span>
                                            {p.status === 'active' ? '正常' : p.status === 'disabled' ? '禁用' : p.status}
                                        </span>
                                    </td>
                                    <td className="px-4 py-3 text-right whitespace-nowrap">
                                        <div className="flex justify-end gap-2">
                                            <a
                                                href={`/console-x9k2m/agents/detail/${p.userId}`}
                                                className="text-foreground/60 hover:text-primary text-xs"
                                            >
                                                详情
                                            </a>
                                            <button
                                                onClick={() => handleEdit(p)}
                                                className="text-primary hover:underline text-xs"
                                            >
                                                编辑
                                            </button>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                            {profiles.length === 0 && (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center text-foreground/40">
                                        <div className="flex flex-col items-center justify-center space-y-3">
                                            <div className="w-12 h-12 rounded-full bg-surface-secondary/50 flex items-center justify-center">
                                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                                                </svg>
                                            </div>
                                            <span>暂无代理商</span>
                                        </div>
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Edit Modal */}
            {isEditOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center">
                    <div className="bg-background rounded-lg p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
                        <h2 className="text-lg font-semibold mb-4">编辑代理信息</h2>
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
                            <div className="flex gap-2 pt-2">
                                <button onClick={() => setIsEditOpen(false)} className="btn-secondary flex-1 py-2">取消</button>
                                <button onClick={handleUpdate} className="btn-primary flex-1 py-2">保存</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
