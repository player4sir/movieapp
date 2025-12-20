'use client';

/**
 * Settlement History Page
 * Shows all historical settlement records with filtering
 */

import { useState } from 'react';
import useSWR from 'swr';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { PageHeader } from '@/components/admin';

interface SettlementRecord {
    id: string;
    userId: string;
    amount: number;
    method: string;
    account: string;
    transactionId: string | null;
    note: string | null;
    settledBy: string | null;
    createdAt: string;
    agent?: { realName: string; contact: string };
    admin?: { nickname: string; username: string };
}

interface SummaryData {
    totalAmount: number;
    totalCount: number;
}

const METHOD_LABELS: Record<string, string> = {
    alipay: '支付宝',
    wechat: '微信',
    bank: '银行卡',
};

export default function SettlementHistoryPage() {
    const { getAccessToken } = useAdminAuth();
    const [page, setPage] = useState(1);
    const [startDate, setStartDate] = useState('');
    const [endDate, setEndDate] = useState('');

    const fetcher = async (url: string) => {
        const token = getAccessToken();
        if (!token) throw new Error('未登录');
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('获取失败');
        return res.json();
    };

    const buildUrl = () => {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('pageSize', '20');
        if (startDate) params.set('startDate', startDate);
        if (endDate) params.set('endDate', endDate);
        return `/api/admin/settlement-history?${params.toString()}`;
    };

    const { data, error, isLoading } = useSWR<{
        data: SettlementRecord[];
        total: number;
        summary: SummaryData;
    }>(buildUrl(), fetcher);

    const records = data?.data || [];
    const total = data?.total || 0;
    const summary = data?.summary || { totalAmount: 0, totalCount: 0 };
    const totalPages = Math.ceil(total / 20);

    const handleFilter = () => {
        setPage(1);
    };

    const handleClearFilter = () => {
        setStartDate('');
        setEndDate('');
        setPage(1);
    };

    if (error) {
        return <div className="p-6 text-center text-red-400">加载失败: {error.message}</div>;
    }

    return (
        <div className="min-h-screen bg-background pb-20">
            <PageHeader title="结算历史" />
            <div className="px-4 lg:px-6">

                {/* Summary Cards - Compact */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                    <div className="bg-surface rounded-lg border border-border/30 px-3 py-2">
                        <div className="text-[10px] text-foreground/40 uppercase">结算笔数</div>
                        <div className="text-lg font-bold text-primary">{summary.totalCount}</div>
                    </div>
                    <div className="bg-surface rounded-lg border border-border/30 px-3 py-2">
                        <div className="text-[10px] text-foreground/40 uppercase">结算金额</div>
                        <div className="text-lg font-bold text-green-500">
                            ¥{(summary.totalAmount / 100).toFixed(2)}
                        </div>
                    </div>
                </div>

                {/* Filters - Compact inline */}
                <div className="flex items-center gap-2 mb-3">
                    <input
                        type="date"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        className="input px-2 py-1.5 text-xs flex-1 min-w-0"
                    />
                    <span className="text-foreground/30 text-xs shrink-0">至</span>
                    <input
                        type="date"
                        value={endDate}
                        onChange={(e) => setEndDate(e.target.value)}
                        className="input px-2 py-1.5 text-xs flex-1 min-w-0"
                    />
                    <button
                        onClick={handleFilter}
                        className="px-3 py-1.5 bg-primary text-white text-xs rounded-lg shrink-0"
                    >
                        筛选
                    </button>
                    {(startDate || endDate) && (
                        <button
                            onClick={handleClearFilter}
                            className="px-2 py-1.5 text-xs text-foreground/50 hover:text-foreground shrink-0"
                        >
                            清除
                        </button>
                    )}
                </div>

                {/* Table */}
                <div className="bg-surface rounded-lg border border-border/50">
                    {isLoading ? (
                        <div className="p-8 text-center text-foreground/40">加载中...</div>
                    ) : records.length === 0 ? (
                        <div className="p-8 text-center text-foreground/40">暂无结算记录</div>
                    ) : (
                        <>
                            {/* Mobile Card View */}
                            <div className="lg:hidden divide-y divide-border/10">
                                {records.map(record => (
                                    <div key={record.id} className="p-3">
                                        <div className="flex items-center justify-between gap-2 mb-1">
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="font-medium text-sm truncate">{record.agent?.realName || '-'}</span>
                                                <span className="px-1.5 py-0.5 bg-green-500/10 text-green-500 rounded text-xs shrink-0">
                                                    已结算
                                                </span>
                                            </div>
                                            <span className="font-bold text-green-500 shrink-0">¥{(record.amount / 100).toFixed(2)}</span>
                                        </div>
                                        <div className="flex items-center justify-between gap-2 text-xs text-foreground/50">
                                            <span>{new Date(record.createdAt).toLocaleDateString()}</span>
                                            <span className="truncate">
                                                <span className="text-blue-400 mr-1">{METHOD_LABELS[record.method] || record.method}</span>
                                                {record.account}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Desktop Table View */}
                            <div className="hidden lg:block overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="bg-surface-secondary/50 text-foreground/60 text-xs">
                                        <tr>
                                            <th className="px-4 py-3 text-left">结算时间</th>
                                            <th className="px-4 py-3 text-left">代理商</th>
                                            <th className="px-4 py-3 text-right">金额</th>
                                            <th className="px-4 py-3 text-center">方式</th>
                                            <th className="px-4 py-3 text-left">账号</th>
                                            <th className="px-4 py-3 text-left">流水号/备注</th>
                                            <th className="px-4 py-3 text-left">经手人</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-border/10">
                                        {records.map(record => (
                                            <tr key={record.id} className="hover:bg-surface-secondary/30">
                                                <td className="px-4 py-3 text-foreground/60 whitespace-nowrap">
                                                    {new Date(record.createdAt).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium">{record.agent?.realName || '-'}</div>
                                                    <div className="text-xs text-foreground/40">{record.agent?.contact || ''}</div>
                                                </td>
                                                <td className="px-4 py-3 text-right font-bold text-green-500">
                                                    ¥{(record.amount / 100).toFixed(2)}
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">
                                                        {METHOD_LABELS[record.method] || record.method}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-foreground/60 max-w-[150px] truncate">
                                                    {record.account}
                                                </td>
                                                <td className="px-4 py-3 text-foreground/60 max-w-[150px] truncate">
                                                    {record.transactionId || record.note || '-'}
                                                </td>
                                                <td className="px-4 py-3 text-foreground/60">
                                                    {record.admin?.nickname || record.admin?.username || '-'}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </>
                    )}

                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="flex items-center justify-center gap-2 p-4 border-t border-border/10">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="px-3 py-1 text-sm rounded bg-surface-secondary disabled:opacity-50"
                            >
                                上一页
                            </button>
                            <span className="text-sm text-foreground/60">
                                {page} / {totalPages}
                            </span>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="px-3 py-1 text-sm rounded bg-surface-secondary disabled:opacity-50"
                            >
                                下一页
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
