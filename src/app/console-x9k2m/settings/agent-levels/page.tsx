'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { PageHeader } from '@/components/admin';

interface AgentLevel {
    id: string;
    name: string;
    sortOrder: number;
    recruitRequirement: string;
    dailyPerformance: number;
    commissionRate: number;
    hasBonus: boolean;
    bonusRate: number;
    enabled: boolean;
    createdAt: string;
}

// Toast Component
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
    return (
        <div className={`fixed bottom-4 right-4 px-4 py-3 rounded-lg shadow-lg z-50 ${type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
            }`}>
            <div className="flex items-center gap-2">
                <span>{message}</span>
                <button onClick={onClose} className="ml-2 text-white/80 hover:text-white">&times;</button>
            </div>
        </div>
    );
}

export default function AgentLevelsPage() {
    const { getAccessToken } = useAdminAuth();
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Modal state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingLevel, setEditingLevel] = useState<AgentLevel | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        sortOrder: 0,
        recruitRequirement: '',
        dailyPerformance: 0,
        commissionRate: 1000,
        hasBonus: false,
        bonusRate: 0,
        enabled: true,
    });

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Fetcher
    const fetcher = async (url: string) => {
        const token = getAccessToken();
        if (!token) throw new Error('未登录');
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('获取失败');
        return res.json();
    };

    // Fetch levels
    const { data: levelsData, mutate, isLoading } = useSWR<{ data: AgentLevel[] }>('/api/admin/agent-levels', fetcher);
    const levels = levelsData?.data || [];

    const formatRate = (bps: number) => `${(bps / 100).toFixed(1)}%`;

    // Open form for create
    const handleCreate = () => {
        setEditingLevel(null);
        setFormData({
            name: '',
            sortOrder: levels.length,
            recruitRequirement: '',
            dailyPerformance: 0,
            commissionRate: 1000,
            hasBonus: false,
            bonusRate: 0,
            enabled: true,
        });
        setIsFormOpen(true);
    };

    // Open form for edit
    const handleEdit = (level: AgentLevel) => {
        setEditingLevel(level);
        setFormData({
            name: level.name,
            sortOrder: level.sortOrder,
            recruitRequirement: level.recruitRequirement,
            dailyPerformance: level.dailyPerformance,
            commissionRate: level.commissionRate,
            hasBonus: level.hasBonus,
            bonusRate: level.bonusRate,
            enabled: level.enabled,
        });
        setIsFormOpen(true);
    };

    // Save level
    const handleSave = async () => {
        const token = getAccessToken();
        if (!token) return;

        try {
            const url = editingLevel ? `/api/admin/agent-levels/${editingLevel.id}` : '/api/admin/agent-levels';
            const method = editingLevel ? 'PUT' : 'POST';

            const res = await fetch(url, {
                method,
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });

            if (!res.ok) {
                const err = await res.json();
                throw new Error(err.message || '保存失败');
            }

            showToast(editingLevel ? '更新成功' : '创建成功', 'success');
            setIsFormOpen(false);
            mutate();
        } catch (e) {
            showToast(e instanceof Error ? e.message : '保存失败', 'error');
        }
    };

    // Delete level
    const handleDelete = async (id: string) => {
        if (!confirm('确定删除此等级？正在使用的等级无法删除。')) return;
        const token = getAccessToken();
        if (!token) return;

        try {
            const res = await fetch(`/api/admin/agent-levels/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || '删除失败');
            showToast('删除成功', 'success');
            mutate();
        } catch (e) {
            showToast(e instanceof Error ? e.message : '删除失败', 'error');
        }
    };

    // Initialize default levels
    const handleInitLevels = async () => {
        const token = getAccessToken();
        if (!token) return;

        try {
            const res = await fetch('/api/admin/agent-levels', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ initializeDefaults: true }),
            });
            if (!res.ok) throw new Error('初始化失败');
            showToast('默认等级已初始化', 'success');
            mutate();
        } catch (e) {
            showToast(e instanceof Error ? e.message : '初始化失败', 'error');
        }
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            <PageHeader title="等级配置">
                <div className="flex gap-2">
                    {levels.length === 0 && (
                        <button onClick={handleInitLevels} className="btn-secondary px-3 py-1.5 text-sm">
                            初始化
                        </button>
                    )}
                    <button onClick={handleCreate} className="btn-primary px-3 py-1.5 text-sm">
                        新增
                    </button>
                </div>
            </PageHeader>
            <div className="px-4 lg:px-6">

                {/* Levels Table */}
                <div className="bg-surface rounded-lg overflow-hidden border border-border/50">
                    {isLoading ? (
                        <div className="p-8 text-center text-foreground/50">加载中...</div>
                    ) : levels.length === 0 ? (
                        <div className="p-8 text-center text-foreground/50">
                            <p className="mb-4">尚未配置代理等级</p>
                            <button onClick={handleInitLevels} className="btn-primary px-4 py-2">
                                初始化默认等级
                            </button>
                            <p className="text-xs mt-2">将按照标准模板创建7个等级</p>
                        </div>
                    ) : (
                        <>
                            {/* Mobile Card View */}
                            <div className="lg:hidden divide-y divide-border/20">
                                {levels.map(level => (
                                    <div key={level.id} className="p-3">
                                        <div className="flex items-center justify-between gap-2 mb-2">
                                            <div className="flex items-center gap-2">
                                                <span className={`w-2 h-2 rounded-full shrink-0 ${level.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                                                <span className="font-medium">{level.name}</span>
                                            </div>
                                            <div className="flex gap-1">
                                                <button onClick={() => handleEdit(level)} className="p-1.5 text-primary">编辑</button>
                                                <button onClick={() => handleDelete(level.id)} className="p-1.5 text-red-500">删除</button>
                                            </div>
                                        </div>
                                        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-foreground/60">
                                            <span>佣金 <span className="text-green-500 font-medium">{formatRate(level.commissionRate)}</span></span>
                                            {level.hasBonus && <span>分红 <span className="text-orange-500 font-medium">{formatRate(level.bonusRate)}</span></span>}
                                            {level.dailyPerformance > 0 && <span>日业绩 ¥{level.dailyPerformance.toLocaleString()}</span>}
                                            {level.recruitRequirement && <span>招代理 {level.recruitRequirement}</span>}
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Desktop Table View */}
                            <div className="hidden lg:block overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-surface-secondary/50 text-foreground/60 text-xs">
                                        <tr>
                                            <th className="px-3 py-2 text-left w-12">排序</th>
                                            <th className="px-3 py-2 text-left">等级名称</th>
                                            <th className="px-3 py-2 text-left">招代理要求</th>
                                            <th className="px-3 py-2 text-right">每天业绩</th>
                                            <th className="px-3 py-2 text-right">佣金比例</th>
                                            <th className="px-3 py-2 text-right">分红</th>
                                            <th className="px-3 py-2 text-center">状态</th>
                                            <th className="px-3 py-2 text-right">操作</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/20">
                                        {levels.map(level => (
                                            <tr key={level.id} className="hover:bg-surface-secondary/30">
                                                <td className="px-3 py-2 text-foreground/50">{level.sortOrder}</td>
                                                <td className="px-3 py-2 font-medium">{level.name}</td>
                                                <td className="px-3 py-2 text-foreground/70">{level.recruitRequirement || '无'}</td>
                                                <td className="px-3 py-2 text-right">
                                                    {level.dailyPerformance > 0 ? `¥${level.dailyPerformance.toLocaleString()}` : '无'}
                                                </td>
                                                <td className="px-3 py-2 text-right text-green-600 font-medium">
                                                    {formatRate(level.commissionRate)}
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    {level.hasBonus ? (
                                                        <span className="text-orange-600 font-medium">{formatRate(level.bonusRate)}</span>
                                                    ) : (
                                                        <span className="text-foreground/30">无</span>
                                                    )}
                                                </td>
                                                <td className="px-3 py-2 text-center">
                                                    <span className={`w-2 h-2 rounded-full inline-block ${level.enabled ? 'bg-green-500' : 'bg-gray-400'}`} />
                                                </td>
                                                <td className="px-3 py-2 text-right">
                                                    <div className="flex justify-end gap-1">
                                                        <button onClick={() => handleEdit(level)} className="px-2 py-1 text-xs text-primary">编辑</button>
                                                        <button onClick={() => handleDelete(level.id)} className="px-2 py-1 text-xs text-red-500">删除</button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}
                </div>

                {/* Create/Edit Modal - Bottom sheet on mobile, centered on desktop */}
                {isFormOpen && (
                    <div className="fixed inset-0 bg-black/50 z-50 flex items-end lg:items-center justify-center" onClick={() => setIsFormOpen(false)}>
                        <div
                            className="bg-background rounded-t-2xl lg:rounded-xl w-full lg:max-w-md max-h-[85vh] overflow-y-auto animate-in slide-in-from-bottom lg:slide-in-from-bottom-0 lg:zoom-in-95"
                            onClick={e => e.stopPropagation()}
                        >
                            {/* Header */}
                            <div className="sticky top-0 bg-background border-b border-border/20 px-4 py-3 flex items-center justify-between">
                                <h2 className="text-lg font-semibold">
                                    {editingLevel ? '编辑等级' : '新增等级'}
                                </h2>
                                <button onClick={() => setIsFormOpen(false)} className="p-1 text-foreground/40">✕</button>
                            </div>

                            {/* Form Body */}
                            <div className="p-4 space-y-4">
                                {/* Name */}
                                <div>
                                    <label className="block text-xs text-foreground/60 mb-1">等级名称 *</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                                        className="input w-full text-sm"
                                        placeholder="如：一级代理"
                                    />
                                </div>

                                {/* Row: Sort + Daily Performance */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-foreground/60 mb-1">排序</label>
                                        <input
                                            type="number"
                                            value={formData.sortOrder}
                                            onChange={(e) => setFormData(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                                            className="input w-full text-sm"
                                            min="0"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-foreground/60 mb-1">日业绩(元)</label>
                                        <input
                                            type="number"
                                            value={formData.dailyPerformance}
                                            onChange={(e) => setFormData(f => ({ ...f, dailyPerformance: parseInt(e.target.value) || 0 }))}
                                            className="input w-full text-sm"
                                            min="0"
                                        />
                                    </div>
                                </div>

                                {/* Recruit Requirement */}
                                <div>
                                    <label className="block text-xs text-foreground/60 mb-1">招代理要求</label>
                                    <input
                                        type="text"
                                        value={formData.recruitRequirement}
                                        onChange={(e) => setFormData(f => ({ ...f, recruitRequirement: e.target.value }))}
                                        className="input w-full text-sm"
                                        placeholder="如：5人、无"
                                    />
                                </div>

                                {/* Row: Commission + Bonus */}
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs text-foreground/60 mb-1">佣金比例 (%)</label>
                                        <input
                                            type="number"
                                            value={formData.commissionRate / 100}
                                            onChange={(e) => setFormData(f => ({ ...f, commissionRate: Math.round(parseFloat(e.target.value) * 100) || 0 }))}
                                            className="input w-full text-sm"
                                            min="0" max="100" step="0.1"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs text-foreground/60 mb-1">分红比例 (%)</label>
                                        <input
                                            type="number"
                                            value={formData.bonusRate / 100}
                                            onChange={(e) => setFormData(f => ({ ...f, bonusRate: Math.round(parseFloat(e.target.value) * 100) || 0, hasBonus: parseFloat(e.target.value) > 0 }))}
                                            className="input w-full text-sm"
                                            min="0" max="100" step="0.1"
                                            placeholder="0 = 无分红"
                                        />
                                    </div>
                                </div>

                                {/* Enable toggle */}
                                <div className="flex items-center justify-between py-2 border-t border-border/10">
                                    <span className="text-sm">启用此等级</span>
                                    <label className="relative inline-flex cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={formData.enabled}
                                            onChange={(e) => setFormData(f => ({ ...f, enabled: e.target.checked }))}
                                            className="sr-only peer"
                                        />
                                        <div className="w-10 h-6 bg-gray-600 peer-checked:bg-primary rounded-full transition-colors after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-4"></div>
                                    </label>
                                </div>
                            </div>

                            {/* Footer Actions */}
                            <div className="sticky bottom-0 bg-background border-t border-border/20 p-4 flex gap-3">
                                <button
                                    onClick={() => setIsFormOpen(false)}
                                    className="flex-1 py-2.5 rounded-lg bg-surface-secondary text-sm font-medium"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleSave}
                                    className="flex-1 py-2.5 rounded-lg bg-primary text-white text-sm font-medium disabled:opacity-50"
                                    disabled={!formData.name}
                                >
                                    保存
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Toast */}
                {toast && (
                    <Toast message={toast.message} type={toast.type} onClose={() => setToast(null)} />
                )}
            </div>
        </div>
    );
}
