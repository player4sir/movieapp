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

                {/* Summary Cards */}
                <div className="grid grid-cols-2 gap-4 mb-4">
                    <div className="bg-surface rounded-lg border border-border/50 p-4">
                        <div className="text-sm text-foreground/60">总结算笔数</div>
                        <div className="text-2xl font-bold text-primary">{summary.totalCount}</div>
                    </div>
                    <div className="bg-surface rounded-lg border border-border/50 p-4">
                        <div className="text-sm text-foreground/60">总结算金额</div>
                        <div className="text-2xl font-bold text-green-500">
                            ¥{(summary.totalAmount / 100).toFixed(2)}
                        </div>
                    </div>
                </div>

                {/* Filters */}
                <div className="bg-surface rounded-lg border border-border/50 p-4 mb-4">
                    <div className="flex flex-wrap items-center gap-3">
                        <div>
                            <label className="text-xs text-foreground/60 block mb-1">开始日期</label>
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="input px-3 py-1.5 text-sm"
                            />
                        </div>
                        <div>
                            <label className="text-xs text-foreground/60 block mb-1">结束日期</label>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="input px-3 py-1.5 text-sm"
                            />
                        </div>
                        <div className="flex items-end gap-2">
                            <button onClick={handleFilter} className="btn-primary px-4 py-1.5 text-sm">
                                筛选
                            </button>
                            <button onClick={handleClearFilter} className="btn-secondary px-4 py-1.5 text-sm">
                                清除
                            </button>
                        </div>
                    </div>
                </div>

                {/* Table */}
                <div className="bg-surface rounded-lg border border-border/50">
                    {isLoading ? (
                        <div className="p-8 text-center text-foreground/40">加载中...</div>
                    ) : records.length === 0 ? (
                        <div className="p-8 text-center text-foreground/40">暂无结算记录</div>
                    ) : (
                        <div className="overflow-x-auto">
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
