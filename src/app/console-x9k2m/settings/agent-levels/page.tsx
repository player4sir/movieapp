'use client';

import { useState } from 'react';
import useSWR from 'swr';
import { useAdminAuth } from '@/contexts/AdminAuthContext';

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
        <div className="p-4 lg:p-6">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-xl font-semibold">代理等级配置</h1>
                    <p className="text-sm text-foreground/60 mt-1">配置代理商等级的佣金比例和分红规则</p>
                </div>
                <div className="flex gap-2">
                    {levels.length === 0 && (
                        <button onClick={handleInitLevels} className="btn-secondary px-3 py-1.5 text-sm">
                            初始化默认等级
                        </button>
                    )}
                    <button onClick={handleCreate} className="btn-primary px-3 py-1.5 text-sm flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        新增等级
                    </button>
                </div>
            </div>

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
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-surface-secondary/50 text-foreground/60 text-xs">
                                <tr>
                                    <th className="px-3 py-2 text-left w-12">排序</th>
                                    <th className="px-3 py-2 text-left">等级名称</th>
                                    <th className="px-3 py-2 text-left">招代理要求</th>
                                    <th className="px-3 py-2 text-right">每天业绩(元)</th>
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
                                                <button
                                                    onClick={() => handleEdit(level)}
                                                    className="p-1 text-foreground/40 hover:text-primary"
                                                    title="编辑"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                    </svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(level.id)}
                                                    className="p-1 text-foreground/40 hover:text-red-500"
                                                    title="删除"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Create/Edit Modal */}
            {isFormOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-background rounded-lg p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
                        <h2 className="text-lg font-semibold mb-4">
                            {editingLevel ? '编辑等级' : '新增等级'}
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">等级名称 *</label>
                                <input
                                    type="text"
                                    value={formData.name}
                                    onChange={(e) => setFormData(f => ({ ...f, name: e.target.value }))}
                                    className="input w-full"
                                    placeholder="如：一级代理"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium mb-1">排序</label>
                                    <input
                                        type="number"
                                        value={formData.sortOrder}
                                        onChange={(e) => setFormData(f => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                                        className="input w-full"
                                        min="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">每天业绩(元)</label>
                                    <input
                                        type="number"
                                        value={formData.dailyPerformance}
                                        onChange={(e) => setFormData(f => ({ ...f, dailyPerformance: parseInt(e.target.value) || 0 }))}
                                        className="input w-full"
                                        min="0"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">招代理数量要求</label>
                                <input
                                    type="text"
                                    value={formData.recruitRequirement}
                                    onChange={(e) => setFormData(f => ({ ...f, recruitRequirement: e.target.value }))}
                                    className="input w-full"
                                    placeholder="如：5人、无"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">佣金比例 (%)</label>
                                <input
                                    type="number"
                                    value={formData.commissionRate / 100}
                                    onChange={(e) => setFormData(f => ({ ...f, commissionRate: Math.round(parseFloat(e.target.value) * 100) || 0 }))}
                                    className="input w-full"
                                    min="0"
                                    max="100"
                                    step="0.1"
                                />
                                <p className="text-xs text-foreground/50 mt-1">如：10% 表示业绩的10%作为佣金</p>
                            </div>

                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.hasBonus}
                                        onChange={(e) => setFormData(f => ({ ...f, hasBonus: e.target.checked, bonusRate: e.target.checked ? f.bonusRate : 0 }))}
                                        className="w-4 h-4 rounded border-foreground/30 text-primary focus:ring-primary"
                                    />
                                    <span className="text-sm">开启分红</span>
                                </label>
                            </div>

                            {formData.hasBonus && (
                                <div>
                                    <label className="block text-sm font-medium mb-1">分红比例 (%)</label>
                                    <input
                                        type="number"
                                        value={formData.bonusRate / 100}
                                        onChange={(e) => setFormData(f => ({ ...f, bonusRate: Math.round(parseFloat(e.target.value) * 100) || 0 }))}
                                        className="input w-full"
                                        min="0"
                                        max="100"
                                        step="0.1"
                                    />
                                </div>
                            )}

                            <div className="flex items-center gap-3">
                                <label className="flex items-center gap-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={formData.enabled}
                                        onChange={(e) => setFormData(f => ({ ...f, enabled: e.target.checked }))}
                                        className="w-4 h-4 rounded border-foreground/30 text-primary focus:ring-primary"
                                    />
                                    <span className="text-sm">启用此等级</span>
                                </label>
                            </div>
                        </div>

                        <div className="flex justify-end gap-3 mt-6">
                            <button
                                onClick={() => setIsFormOpen(false)}
                                className="btn-secondary px-4 py-2"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleSave}
                                className="btn-primary px-4 py-2"
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
    );
}
