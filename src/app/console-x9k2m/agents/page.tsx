'use client';

import { useState, useEffect, useRef } from 'react';
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
    createdAt: string;
}

interface AgentReportSummary {
    totalAgents: number;
    totalSales: number;
    totalCommission: number;
    totalBonus: number;
    totalEarnings: number;
    byLevel: {
        levelId: string;
        levelName: string;
        count: number;
        sales: number;
        commission: number;
        bonus: number;
    }[];
}

// Toast Component
function Toast({ message, type, onClose }: { message: string; type: 'success' | 'error'; onClose: () => void }) {
    return (
        <div className={`fixed bottom-20 left-4 right-4 lg:left-auto lg:right-4 lg:w-80 px-4 py-3 rounded-lg shadow-lg z-50 ${type === 'success' ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
            }`}>
            <div className="flex items-center justify-between">
                <span className="text-sm">{message}</span>
                <button onClick={onClose} className="ml-2 text-white/80 hover:text-white">&times;</button>
            </div>
        </div>
    );
}

export default function AgentsPage() {
    const { getAccessToken } = useAdminAuth();
    const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

    // Filter state
    const [month, setMonth] = useState(() => {
        const now = new Date();
        return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    });
    const [levelId, setLevelId] = useState('');
    const [search, setSearch] = useState('');
    const [debouncedSearch, setDebouncedSearch] = useState('');
    const [page, setPage] = useState(1);
    const debounceTimer = useRef<NodeJS.Timeout | null>(null);

    // UI state
    const [showReport, setShowReport] = useState(false);
    const [detailRecord, setDetailRecord] = useState<AgentRecord | null>(null);
    const [isSettling, setIsSettling] = useState(false);

    // Modal state
    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingRecord, setEditingRecord] = useState<AgentRecord | null>(null);
    const [formData, setFormData] = useState({
        agentName: '',
        agentContact: '',
        levelId: '',
        month: '',
        recruitCount: 0,
        dailySales: 0,
        totalSales: 0,
        note: '',
    });

    // Debounce search
    useEffect(() => {
        if (debounceTimer.current) {
            clearTimeout(debounceTimer.current);
        }
        debounceTimer.current = setTimeout(() => {
            setDebouncedSearch(search);
            setPage(1);
        }, 300);
        return () => {
            if (debounceTimer.current) {
                clearTimeout(debounceTimer.current);
            }
        };
    }, [search]);

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
    const { data: levelsData } = useSWR<{ data: AgentLevel[] }>('/api/admin/agent-levels', fetcher);
    const levels = levelsData?.data || [];

    // Build query with debounced search
    const queryParams = new URLSearchParams({ page: page.toString(), pageSize: '20' });
    if (month) queryParams.set('month', month);
    if (levelId) queryParams.set('levelId', levelId);
    if (debouncedSearch) queryParams.set('search', debouncedSearch);

    // Fetch records
    const { data: recordsData, mutate: mutateRecords, isLoading } = useSWR<{
        data: AgentRecord[];
        pagination: { page: number; pageSize: number; total: number; totalPages: number };
    }>(`/api/admin/agents?${queryParams}`, fetcher);

    const records = recordsData?.data || [];
    const pagination = recordsData?.pagination || { page: 1, total: 0, totalPages: 0 };

    // Fetch report
    const { data: reportData, mutate: mutateReport } = useSWR<{
        data: { month: string; summary: AgentReportSummary; availableMonths: string[] };
    }>(`/api/admin/agents/report?month=${month}`, fetcher);
    const report = reportData?.data;

    // Count pending records
    const pendingCount = records.filter(r => r.status === 'pending').length;

    // Format helpers
    const formatMoney = (fen: number) => `¥${(fen / 100).toFixed(2)}`;
    const formatMoneyShort = (fen: number) => {
        const yuan = fen / 100;
        if (yuan >= 10000) return `¥${(yuan / 10000).toFixed(1)}万`;
        if (yuan >= 1000) return `¥${(yuan / 1000).toFixed(1)}k`;
        return `¥${yuan.toFixed(0)}`;
    };


    // Open form for create
    const handleCreate = () => {
        setEditingRecord(null);
        setFormData({
            agentName: '',
            agentContact: '',
            levelId: levels[0]?.id || '',
            month,
            recruitCount: 0,
            dailySales: 0,
            totalSales: 0,
            note: '',
        });
        setIsFormOpen(true);
    };

    // Open form for edit
    const handleEdit = (record: AgentRecord) => {
        setEditingRecord(record);
        setFormData({
            agentName: record.agentName,
            agentContact: record.agentContact,
            levelId: record.levelId,
            month: record.month,
            recruitCount: record.recruitCount,
            dailySales: record.dailySales,
            totalSales: record.totalSales,
            note: record.note,
        });
        setIsFormOpen(true);
        setDetailRecord(null);
    };

    // Save record
    const handleSave = async () => {
        const token = getAccessToken();
        if (!token) return;

        try {
            const url = editingRecord ? `/api/admin/agents/${editingRecord.id}` : '/api/admin/agents';
            const method = editingRecord ? 'PUT' : 'POST';

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

            showToast(editingRecord ? '更新成功' : '创建成功', 'success');
            setIsFormOpen(false);
            mutateRecords();
            mutateReport();
        } catch (e) {
            showToast(e instanceof Error ? e.message : '保存失败', 'error');
        }
    };

    // Delete record
    const handleDelete = async (id: string) => {
        if (!confirm('确定删除此代理记录？')) return;
        const token = getAccessToken();
        if (!token) return;

        try {
            const res = await fetch(`/api/admin/agents/${id}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('删除失败');
            showToast('删除成功', 'success');
            setDetailRecord(null);
            mutateRecords();
            mutateReport();
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
            showToast('等级初始化成功', 'success');
            window.location.reload();
        } catch (e) {
            showToast(e instanceof Error ? e.message : '初始化失败', 'error');
        }
    };

    // Export to CSV
    const handleExport = async () => {
        const token = getAccessToken();
        if (!token) return;

        try {
            const res = await fetch(`/api/admin/agents/export?month=${month}`, {
                headers: { Authorization: `Bearer ${token}` },
            });
            if (!res.ok) throw new Error('导出失败');

            const blob = await res.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `agents_${month}.csv`;
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            showToast('导出成功', 'success');
        } catch (e) {
            showToast(e instanceof Error ? e.message : '导出失败', 'error');
        }
    };

    // Batch settle all pending records
    const handleBatchSettle = async () => {
        if (!confirm(`确定将本月所有待结算记录标记为已结算？`)) return;
        const token = getAccessToken();
        if (!token) return;

        setIsSettling(true);
        try {
            const res = await fetch('/api/admin/agents/batch', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({ operation: 'settle', month }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message || '结算失败');
            showToast(`已结算 ${data.affected} 条记录`, 'success');
            mutateRecords();
            mutateReport();
        } catch (e) {
            showToast(e instanceof Error ? e.message : '结算失败', 'error');
        } finally {
            setIsSettling(false);
        }
    };

    return (
        <div className="p-4 lg:p-6 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between mb-4">
                <h1 className="text-lg lg:text-xl font-semibold">代理商管理</h1>
                <div className="flex gap-1.5 lg:gap-2">
                    {levels.length === 0 && (
                        <button onClick={handleInitLevels} className="btn-secondary px-2 py-1 text-xs">
                            初始化
                        </button>
                    )}
                    {/* Export button */}
                    <button
                        onClick={handleExport}
                        className="btn-secondary px-2 py-1.5 text-xs lg:text-sm flex items-center gap-1"
                        title="导出 CSV"
                    >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <span className="hidden sm:inline">导出</span>
                    </button>
                    {/* Batch settle button */}
                    {pendingCount > 0 && (
                        <button
                            onClick={handleBatchSettle}
                            disabled={isSettling}
                            className="btn-secondary px-2 py-1.5 text-xs lg:text-sm flex items-center gap-1 text-green-600 border-green-600/30 hover:bg-green-600/10"
                            title="批量结算"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="hidden sm:inline">{isSettling ? '处理中...' : `结算(${pendingCount})`}</span>
                            <span className="sm:hidden">{pendingCount}</span>
                        </button>
                    )}
                    {/* Create button */}
                    <button onClick={handleCreate} className="btn-primary px-2.5 py-1.5 text-sm flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        <span className="hidden sm:inline">新增</span>
                    </button>
                </div>
            </div>

            {/* Quick Stats Bar (Mobile-friendly) */}
            {report && (
                <div className="mb-4">
                    {/* Compact summary row */}
                    <div className="flex items-center gap-2 mb-2">
                        <input
                            type="month"
                            value={month}
                            onChange={(e) => { setMonth(e.target.value); setPage(1); }}
                            className="input px-2 py-1 text-sm w-32"
                        />
                        <div className="flex-1 flex items-center gap-3 text-sm overflow-x-auto">
                            <span className="whitespace-nowrap text-foreground/60">{report.summary.totalAgents}人</span>
                            <span className="whitespace-nowrap font-medium">¥{report.summary.totalSales.toLocaleString()}</span>
                            <span className="whitespace-nowrap text-green-600">{formatMoneyShort(report.summary.totalCommission)}</span>
                            {report.summary.totalBonus > 0 && (
                                <span className="whitespace-nowrap text-orange-600">{formatMoneyShort(report.summary.totalBonus)}</span>
                            )}
                        </div>
                        <button
                            onClick={() => setShowReport(!showReport)}
                            className="p-1.5 text-foreground/50 hover:text-foreground"
                            title={showReport ? '收起报表' : '展开报表'}
                        >
                            <svg className={`w-4 h-4 transition-transform ${showReport ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                        </button>
                    </div>

                    {/* Expandable detailed report */}
                    {showReport && (
                        <div className="bg-surface rounded-lg p-3 border border-border/50 space-y-3">
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-sm">
                                <div className="bg-surface-secondary/50 rounded p-2">
                                    <div className="text-foreground/50 text-xs">总业绩</div>
                                    <div className="font-bold">¥{report.summary.totalSales.toLocaleString()}</div>
                                </div>
                                <div className="bg-surface-secondary/50 rounded p-2">
                                    <div className="text-foreground/50 text-xs">总佣金</div>
                                    <div className="font-bold text-green-600">{formatMoney(report.summary.totalCommission)}</div>
                                </div>
                                <div className="bg-surface-secondary/50 rounded p-2">
                                    <div className="text-foreground/50 text-xs">总分红</div>
                                    <div className="font-bold text-orange-600">{formatMoney(report.summary.totalBonus)}</div>
                                </div>
                                <div className="bg-surface-secondary/50 rounded p-2">
                                    <div className="text-foreground/50 text-xs">总支出</div>
                                    <div className="font-bold text-primary">{formatMoney(report.summary.totalEarnings)}</div>
                                </div>
                            </div>
                            {/* Level breakdown - horizontal scroll on mobile */}
                            {report.summary.byLevel.filter(l => l.count > 0).length > 0 && (
                                <div className="overflow-x-auto -mx-3 px-3">
                                    <div className="flex gap-2 min-w-max">
                                        {report.summary.byLevel.filter(l => l.count > 0).map(level => (
                                            <div key={level.levelId} className="bg-surface-secondary/30 rounded px-2 py-1 text-xs whitespace-nowrap">
                                                <span className="font-medium">{level.levelName}</span>
                                                <span className="text-foreground/50 ml-1">{level.count}人</span>
                                                <span className="text-green-600 ml-1">{formatMoneyShort(level.commission)}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Filters Row */}
            <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                <select
                    value={levelId}
                    onChange={(e) => { setLevelId(e.target.value); setPage(1); }}
                    className="input px-2 py-1 text-sm min-w-[90px]"
                >
                    <option value="">全部等级</option>
                    {levels.map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                    ))}
                </select>
                <input
                    type="text"
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                    placeholder="搜索..."
                    className="input px-2 py-1 text-sm flex-1 min-w-[100px]"
                />
            </div>

            {/* Records List */}
            <div className="bg-surface rounded-lg overflow-hidden border border-border/50">
                {isLoading ? (
                    <div className="p-8 text-center text-foreground/50">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary mx-auto"></div>
                    </div>
                ) : records.length === 0 ? (
                    <div className="p-8 text-center text-foreground/50">
                        <svg className="w-12 h-12 mx-auto mb-2 text-foreground/20" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <p className="mb-2 text-sm">暂无代理记录</p>
                        <button onClick={handleCreate} className="text-primary text-sm">+ 添加代理</button>
                    </div>
                ) : (
                    <>
                        {/* Mobile Card View */}
                        <div className="lg:hidden divide-y divide-border/30">
                            {records.map(record => (
                                <div
                                    key={record.id}
                                    onClick={() => setDetailRecord(record)}
                                    className="p-3 hover:bg-surface-secondary/30 active:bg-surface-secondary/50 cursor-pointer"
                                >
                                    <div className="flex items-start justify-between mb-1">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium truncate">{record.agentName}</span>
                                                <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-[10px] flex-shrink-0">
                                                    {record.level?.name}
                                                </span>
                                            </div>
                                            {record.agentContact && (
                                                <div className="text-xs text-foreground/40 truncate">{record.agentContact}</div>
                                            )}
                                        </div>
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] flex-shrink-0 ${record.status === 'settled' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {record.status === 'settled' ? '已结' : '待结'}
                                        </span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <div className="flex items-center gap-3 text-foreground/60">
                                            <span>业绩 ¥{record.totalSales.toLocaleString()}</span>
                                        </div>
                                        <div className="font-medium text-primary">{formatMoney(record.totalEarnings)}</div>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-surface-secondary/50 text-foreground/60 text-xs">
                                    <tr>
                                        <th className="px-3 py-2 text-left">代理员</th>
                                        <th className="px-3 py-2 text-left">等级</th>
                                        <th className="px-3 py-2 text-right">月业绩</th>
                                        <th className="px-3 py-2 text-right">佣金</th>
                                        <th className="px-3 py-2 text-right">分红</th>
                                        <th className="px-3 py-2 text-right">总收入</th>
                                        <th className="px-3 py-2 text-center">状态</th>
                                        <th className="px-3 py-2 text-right">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/20">
                                    {records.map(record => (
                                        <tr key={record.id} className="hover:bg-surface-secondary/30">
                                            <td className="px-3 py-2">
                                                <div className="font-medium">{record.agentName}</div>
                                                {record.agentContact && (
                                                    <div className="text-xs text-foreground/50">{record.agentContact}</div>
                                                )}
                                            </td>
                                            <td className="px-3 py-2">
                                                <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">
                                                    {record.level?.name || '-'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-right font-medium">¥{record.totalSales.toLocaleString()}</td>
                                            <td className="px-3 py-2 text-right text-green-600">{formatMoney(record.commissionAmount)}</td>
                                            <td className="px-3 py-2 text-right text-orange-600">{formatMoney(record.bonusAmount)}</td>
                                            <td className="px-3 py-2 text-right font-medium text-primary">{formatMoney(record.totalEarnings)}</td>
                                            <td className="px-3 py-2 text-center">
                                                <span className={`px-2 py-0.5 rounded text-xs ${record.status === 'settled' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                                    }`}>
                                                    {record.status === 'settled' ? '已结算' : '待结算'}
                                                </span>
                                            </td>
                                            <td className="px-3 py-2 text-right">
                                                <div className="flex justify-end gap-1">
                                                    <button onClick={() => handleEdit(record)} className="p-1 text-foreground/40 hover:text-primary" title="编辑">
                                                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                    </button>
                                                    <button onClick={() => handleDelete(record.id)} className="p-1 text-foreground/40 hover:text-red-500" title="删除">
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
                    </>
                )}
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
                <div className="flex items-center justify-between mt-3 text-sm">
                    <span className="text-foreground/50 text-xs">
                        {pagination.page}/{pagination.totalPages}页
                    </span>
                    <div className="flex gap-2">
                        <button
                            onClick={() => setPage(p => p - 1)}
                            disabled={page <= 1}
                            className="btn-secondary px-3 py-1 text-sm disabled:opacity-50"
                        >
                            上一页
                        </button>
                        <button
                            onClick={() => setPage(p => p + 1)}
                            disabled={page >= pagination.totalPages}
                            className="btn-secondary px-3 py-1 text-sm disabled:opacity-50"
                        >
                            下一页
                        </button>
                    </div>
                </div>
            )}

            {/* Mobile Detail Sheet */}
            {detailRecord && (
                <div className="fixed inset-0 bg-black/50 z-50 lg:hidden" onClick={() => setDetailRecord(null)}>
                    <div
                        className="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl p-4 pb-8 max-h-[80vh] overflow-y-auto"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Handle bar */}
                        <div className="w-10 h-1 bg-foreground/20 rounded-full mx-auto mb-4" />

                        {/* Header */}
                        <div className="flex items-start justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-semibold">{detailRecord.agentName}</h3>
                                <div className="flex items-center gap-2 mt-1">
                                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">
                                        {detailRecord.level?.name}
                                    </span>
                                    <span className={`px-2 py-0.5 rounded text-xs ${detailRecord.status === 'settled' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                        }`}>
                                        {detailRecord.status === 'settled' ? '已结算' : '待结算'}
                                    </span>
                                </div>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-3 mb-4">
                            <div className="bg-surface rounded-lg p-3">
                                <div className="text-xs text-foreground/50">月总业绩</div>
                                <div className="text-lg font-bold">¥{detailRecord.totalSales.toLocaleString()}</div>
                            </div>
                            <div className="bg-surface rounded-lg p-3">
                                <div className="text-xs text-foreground/50">总收入</div>
                                <div className="text-lg font-bold text-primary">{formatMoney(detailRecord.totalEarnings)}</div>
                            </div>
                            <div className="bg-surface rounded-lg p-3">
                                <div className="text-xs text-foreground/50">佣金</div>
                                <div className="font-medium text-green-600">{formatMoney(detailRecord.commissionAmount)}</div>
                            </div>
                            <div className="bg-surface rounded-lg p-3">
                                <div className="text-xs text-foreground/50">分红</div>
                                <div className="font-medium text-orange-600">{formatMoney(detailRecord.bonusAmount)}</div>
                            </div>
                        </div>

                        {/* Details */}
                        <div className="space-y-2 text-sm mb-6">
                            {detailRecord.agentContact && (
                                <div className="flex justify-between">
                                    <span className="text-foreground/50">联系方式</span>
                                    <span>{detailRecord.agentContact}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-foreground/50">月份</span>
                                <span>{detailRecord.month}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-foreground/50">招代理数量</span>
                                <span>{detailRecord.recruitCount}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-foreground/50">每天业绩</span>
                                <span>¥{detailRecord.dailySales.toLocaleString()}</span>
                            </div>
                            {detailRecord.note && (
                                <div className="pt-2 border-t border-border/30">
                                    <div className="text-foreground/50 mb-1">备注</div>
                                    <div className="text-foreground/80">{detailRecord.note}</div>
                                </div>
                            )}
                        </div>

                        {/* Actions */}
                        <div className="flex gap-3">
                            <button
                                onClick={() => handleEdit(detailRecord)}
                                className="flex-1 btn-primary py-2.5"
                            >
                                编辑
                            </button>
                            <button
                                onClick={() => handleDelete(detailRecord.id)}
                                className="px-4 py-2.5 border border-red-500 text-red-500 rounded-lg"
                            >
                                删除
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Create/Edit Modal */}
            {isFormOpen && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-end lg:items-center justify-center">
                    <div
                        className="bg-background rounded-t-2xl lg:rounded-lg p-4 lg:p-6 w-full lg:max-w-md max-h-[90vh] overflow-y-auto"
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Handle bar (mobile) */}
                        <div className="w-10 h-1 bg-foreground/20 rounded-full mx-auto mb-4 lg:hidden" />

                        <h2 className="text-lg font-semibold mb-4">
                            {editingRecord ? '编辑代理' : '新增代理'}
                        </h2>

                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium mb-1">代理商名称 *</label>
                                <input
                                    type="text"
                                    value={formData.agentName}
                                    onChange={(e) => setFormData(f => ({ ...f, agentName: e.target.value }))}
                                    className="input w-full"
                                    placeholder="请输入代理商名称"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">联系方式</label>
                                <input
                                    type="text"
                                    value={formData.agentContact}
                                    onChange={(e) => setFormData(f => ({ ...f, agentContact: e.target.value }))}
                                    className="input w-full"
                                    placeholder="电话/微信"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium mb-1">等级 *</label>
                                    <select
                                        value={formData.levelId}
                                        onChange={(e) => setFormData(f => ({ ...f, levelId: e.target.value }))}
                                        className="input w-full"
                                    >
                                        <option value="">选择</option>
                                        {levels.map(l => (
                                            <option key={l.id} value={l.id}>{l.name}</option>
                                        ))}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">月份 *</label>
                                    <input
                                        type="month"
                                        value={formData.month}
                                        onChange={(e) => setFormData(f => ({ ...f, month: e.target.value }))}
                                        className="input w-full"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">月总业绩(元) *</label>
                                <input
                                    type="number"
                                    value={formData.totalSales}
                                    onChange={(e) => setFormData(f => ({ ...f, totalSales: parseInt(e.target.value) || 0 }))}
                                    className="input w-full text-lg"
                                    min="0"
                                    placeholder="输入业绩，佣金自动计算"
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <label className="block text-sm font-medium mb-1">招代理数</label>
                                    <input
                                        type="number"
                                        value={formData.recruitCount}
                                        onChange={(e) => setFormData(f => ({ ...f, recruitCount: parseInt(e.target.value) || 0 }))}
                                        className="input w-full"
                                        min="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium mb-1">每天业绩</label>
                                    <input
                                        type="number"
                                        value={formData.dailySales}
                                        onChange={(e) => setFormData(f => ({ ...f, dailySales: parseInt(e.target.value) || 0 }))}
                                        className="input w-full"
                                        min="0"
                                    />
                                </div>
                            </div>

                            <div>
                                <label className="block text-sm font-medium mb-1">备注</label>
                                <textarea
                                    value={formData.note}
                                    onChange={(e) => setFormData(f => ({ ...f, note: e.target.value }))}
                                    className="input w-full"
                                    rows={2}
                                    placeholder="可选"
                                />
                            </div>
                        </div>

                        <div className="flex gap-3 mt-6">
                            <button
                                onClick={() => setIsFormOpen(false)}
                                className="flex-1 btn-secondary py-2.5"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleSave}
                                className="flex-1 btn-primary py-2.5"
                                disabled={!formData.agentName || !formData.levelId || !formData.month}
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
