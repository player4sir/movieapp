'use client';

/**
 * Agent Records Page - Performance management
 * Tab-based design with compact stats for mobile
 */

import { useState, useEffect, useRef } from 'react';
import useSWR from 'swr';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useToast, PageHeader } from '@/components/admin';

interface AgentLevel {
    id: string;
    name: string;
    commissionRate: number;
}

interface AgentRecord {
    id: string;
    agentName: string;
    agentContact: string;
    levelId: string;
    month: string;
    recruitCount: number;
    dailySales: number;
    totalSales: number;
    commissionAmount: number;
    bonusAmount: number;
    totalEarnings: number;
    status: 'pending' | 'settled';
    note: string;
    level: AgentLevel;
    userId?: string;
}

interface AgentProfile {
    userId: string;
    realName: string;
    contact: string;
    levelId: string;
    status: string;
}

type TabType = 'pending' | 'settled';

export default function AgentRecordsPage() {
    const { getAccessToken } = useAdminAuth();
    const { showToast } = useToast();

    const [activeTab, setActiveTab] = useState<TabType>('pending');
    const [month, setMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<AgentRecord | null>(null);
    const [formData, setFormData] = useState({
        agentName: '', agentContact: '', levelId: '', month: '',
        recruitCount: 0, dailySales: 0, totalSales: 0, note: '', userId: '',
    });

    useEffect(() => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => setDebouncedSearch(search), 300);
        return () => { if (debounceTimer.current) clearTimeout(debounceTimer.current); };
    }, [search]);

    const fetcher = async (url: string) => {
        const token = getAccessToken();
        if (!token) throw new Error('未登录');
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('获取失败');
        return res.json();
    };

    const { data: levelsData } = useSWR<{ data: AgentLevel[] }>('/api/admin/agent-levels', fetcher);
    const levels = levelsData?.data || [];

    const { data: agentsData } = useSWR<{ data: AgentProfile[] }>('/api/admin/agent-profiles', fetcher);
    const allAgents = agentsData?.data?.filter(a => a.status === 'active') || [];

    const queryParams = new URLSearchParams({ pageSize: '100' });
    if (month) queryParams.set('month', month);
    if (debouncedSearch) queryParams.set('search', debouncedSearch);

    const { data: recordsData, mutate: mutateRecords } = useSWR<{ data: AgentRecord[] }>(
        `/api/admin/agents?${queryParams}`, fetcher
    );

    const allRecords = recordsData?.data || [];
    const pendingRecords = allRecords.filter(r => r.status === 'pending');
    const settledRecords = allRecords.filter(r => r.status === 'settled');
    const records = activeTab === 'pending' ? pendingRecords : settledRecords;

    // Calculate totals
    const totalSales = allRecords.reduce((sum, r) => sum + r.totalSales, 0);
    const totalEarnings = allRecords.reduce((sum, r) => sum + r.totalEarnings, 0);
    const formatMoney = (fen: number) => `¥${(fen / 100).toFixed(2)}`;

    const handleCreate = () => {
        setEditingRecord(null);
        setFormData({
            agentName: '', agentContact: '', levelId: levels[0]?.id || '',
            month, recruitCount: 0, dailySales: 0, totalSales: 0, note: '', userId: '',
        });
        setIsFormOpen(true);
    };

    const handleEdit = (record: AgentRecord) => {
        setEditingRecord(record);
        setFormData({
            agentName: record.agentName, agentContact: record.agentContact,
            levelId: record.levelId, month: record.month, recruitCount: record.recruitCount,
            dailySales: record.dailySales, totalSales: record.totalSales, note: record.note,
            userId: record.userId || '',
        });
        setIsFormOpen(true);
    };

    const handleAgentSelect = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const agent = allAgents.find(a => a.userId === e.target.value);
        if (agent) {
            setFormData(prev => ({
                ...prev, userId: agent.userId, agentName: agent.realName,
                agentContact: agent.contact, levelId: agent.levelId,
            }));
        } else {
            setFormData(prev => ({ ...prev, userId: '' }));
        }
    };

    const handleSave = async () => {
        const token = getAccessToken();
        if (!token) return;
        try {
            const url = editingRecord ? `/api/admin/agents/${editingRecord.id}` : '/api/admin/agents';
            const res = await fetch(url, {
                method: editingRecord ? 'PUT' : 'POST',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify(formData),
            });
            if (!res.ok) throw new Error((await res.json()).message || '保存失败');
            showToast({ message: '保存成功', type: 'success' });
            setIsFormOpen(false);
            mutateRecords();
        } catch (e) {
            showToast({ message: e instanceof Error ? e.message : '保存失败', type: 'error' });
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('确定删除？')) return;
        const token = getAccessToken();
        if (!token) return;
        try {
            await fetch(`/api/admin/agents/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
            showToast({ message: '已删除', type: 'success' });
            mutateRecords();
        } catch {
            showToast({ message: '删除失败', type: 'error' });
        }
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            <PageHeader title="业绩管理">
                <button onClick={handleCreate} className="px-3 py-1.5 text-sm bg-primary text-white rounded-lg">
                    新增
                </button>
            </PageHeader>

            <div className="px-4 lg:px-6">
                {/* Month Picker & Search */}
                <div className="flex items-center gap-2 mb-3">
                    <input
                        type="month"
                        value={month}
                        onChange={(e) => setMonth(e.target.value)}
                        className="input px-3 py-2 text-sm w-32 shrink-0"
                    />
                    <input
                        type="text"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        placeholder="搜索..."
                        className="input px-3 py-2 text-sm flex-1 min-w-0"
                    />
                </div>

                {/* Compact Stats - 4 columns */}
                <div className="grid grid-cols-4 gap-2 mb-4">
                    <div className="bg-surface rounded-lg border border-border/20 px-3 py-2">
                        <div className="text-[10px] text-foreground/40 uppercase">代理人数</div>
                        <div className="text-sm font-semibold">{allRecords.length}</div>
                    </div>
                    <div className="bg-surface rounded-lg border border-border/20 px-3 py-2">
                        <div className="text-[10px] text-foreground/40 uppercase">月销售额</div>
                        <div className="text-sm font-semibold">¥{totalSales.toLocaleString()}</div>
                    </div>
                    <div className="bg-surface rounded-lg border border-border/20 px-3 py-2">
                        <div className="text-[10px] text-foreground/40 uppercase">佣金</div>
                        <div className="text-sm font-semibold text-primary">{formatMoney(totalEarnings)}</div>
                    </div>
                    <div className="bg-surface rounded-lg border border-border/20 px-3 py-2">
                        <div className="text-[10px] text-foreground/40 uppercase">待结算</div>
                        <div className="text-sm font-semibold text-yellow-500">{pendingRecords.length}</div>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex gap-1 p-1 bg-surface-secondary/30 rounded-lg mb-4">
                    <button
                        onClick={() => setActiveTab('pending')}
                        className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'pending'
                            ? 'bg-surface text-foreground shadow-sm'
                            : 'text-foreground/60 hover:text-foreground'
                            }`}
                    >
                        待结算
                        {pendingRecords.length > 0 && (
                            <span className="ml-1 px-1.5 py-0.5 bg-yellow-500/20 text-yellow-500 text-xs rounded">
                                {pendingRecords.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('settled')}
                        className={`flex-1 px-4 py-2 text-sm font-medium rounded-md transition-colors ${activeTab === 'settled'
                            ? 'bg-surface text-foreground shadow-sm'
                            : 'text-foreground/60 hover:text-foreground'
                            }`}
                    >
                        已结算
                        <span className="ml-1 text-xs text-foreground/40">({settledRecords.length})</span>
                    </button>
                </div>

                {/* Records List */}
                <div className="space-y-2">
                    {records.map(record => (
                        <div key={record.id} className="bg-surface rounded-lg border border-border/30 p-3">
                            <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center gap-2">
                                        <span className="font-medium text-sm truncate">{record.agentName}</span>
                                        <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-xs shrink-0">
                                            {record.level?.name}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-1 text-xs text-foreground/50">
                                        <span>业绩 <span className="text-foreground">¥{record.totalSales.toLocaleString()}</span></span>
                                        <span>收益 <span className="text-primary">{formatMoney(record.totalEarnings)}</span></span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0 text-xs">
                                    <button onClick={() => handleEdit(record)} className="px-2 py-1 text-primary">编辑</button>
                                    <button onClick={() => handleDelete(record.id)} className="px-2 py-1 text-red-500">删除</button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {records.length === 0 && (
                        <div className="py-12 text-center text-foreground/40">
                            {activeTab === 'pending' ? '暂无待结算记录' : '暂无已结算记录'}
                        </div>
                    )}
                </div>
            </div>

            {/* Form Modal */}
            {isFormOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end lg:items-center justify-center" onClick={() => setIsFormOpen(false)}>
                    <div className="bg-background rounded-t-2xl lg:rounded-xl p-5 w-full lg:max-w-md max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h2 className="text-lg font-semibold">{editingRecord ? '编辑记录' : '新增记录'}</h2>
                            <button onClick={() => setIsFormOpen(false)} className="p-1 text-foreground/40">✕</button>
                        </div>
                        <div className="space-y-3">
                            <div>
                                <label className="block text-xs text-foreground/60 mb-1">绑定代理商</label>
                                <select value={formData.userId} onChange={handleAgentSelect} className="input w-full text-sm">
                                    <option value="">手动录入</option>
                                    {allAgents.map(a => <option key={a.userId} value={a.userId}>{a.realName}</option>)}
                                </select>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-foreground/60 mb-1">姓名</label>
                                    <input value={formData.agentName} onChange={e => setFormData(f => ({ ...f, agentName: e.target.value }))} className="input w-full text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs text-foreground/60 mb-1">等级</label>
                                    <select value={formData.levelId} onChange={e => setFormData(f => ({ ...f, levelId: e.target.value }))} className="input w-full text-sm">
                                        {levels.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                                    </select>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-xs text-foreground/60 mb-1">月份</label>
                                    <input type="month" value={formData.month} onChange={e => setFormData(f => ({ ...f, month: e.target.value }))} className="input w-full text-sm" />
                                </div>
                                <div>
                                    <label className="block text-xs text-foreground/60 mb-1">月业绩 (元)</label>
                                    <input type="number" value={formData.totalSales} onChange={e => setFormData(f => ({ ...f, totalSales: parseInt(e.target.value) || 0 }))} className="input w-full text-sm" />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-2">
                                <button onClick={() => setIsFormOpen(false)} className="flex-1 py-2.5 rounded-lg bg-surface-secondary">取消</button>
                                <button onClick={handleSave} className="flex-1 py-2.5 rounded-lg bg-primary text-white">保存</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
