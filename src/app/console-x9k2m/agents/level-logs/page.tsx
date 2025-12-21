'use client';

/**
 * Agent Level Change Logs Page
 * Shows history of all agent level changes (manual and automatic)
 */

import { useState } from 'react';
import useSWR from 'swr';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { PageHeader } from '@/components/admin';

interface LevelChangeLog {
    id: string;
    userId: string;
    previousLevelName: string | null;
    newLevelName: string;
    changeType: 'manual' | 'auto_upgrade' | 'initial';
    changedBy: string | null;
    reason: string | null;
    createdAt: string;
    user?: { nickname: string; username: string };
    admin?: { nickname: string; username: string };
}

export default function AgentLevelLogsPage() {
    const { getAccessToken } = useAdminAuth();
    const [page, setPage] = useState(1);

    const fetcher = async (url: string) => {
        const token = getAccessToken();
        if (!token) throw new Error('未登录');
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('获取失败');
        return res.json();
    };

    const { data, error, isLoading } = useSWR<{ data: LevelChangeLog[]; total: number }>(
        `/api/admin/agent-level-logs?page=${page}&pageSize=20`,
        fetcher
    );

    const logs = data?.data || [];
    const total = data?.total || 0;
    const totalPages = Math.ceil(total / 20);

    const getChangeTypeLabel = (type: string) => {
        switch (type) {
            case 'manual': return { label: '手动调整', color: 'bg-blue-500/20 text-blue-400' };
            case 'auto_upgrade': return { label: '自动升级', color: 'bg-green-500/20 text-green-400' };
            case 'initial': return { label: '初始等级', color: 'bg-gray-500/20 text-gray-400' };
            default: return { label: type, color: 'bg-gray-500/20 text-gray-400' };
        }
    };

    if (error) {
        return (
            <div className="p-6 text-center text-red-400">
                加载失败: {error.message}
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background pb-20">
            <PageHeader title="等级变更日志">
                <span className="text-sm text-foreground/40">共 {total} 条</span>
            </PageHeader>
            <div className="px-4 lg:px-6">

                <div className="bg-surface rounded-lg border border-border/50">
                    {isLoading ? (
                        <div className="p-8 text-center text-foreground/40">加载中...</div>
                    ) : logs.length === 0 ? (
                        <div className="p-8 text-center text-foreground/40">暂无等级变更记录</div>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-surface-secondary/50 text-foreground/60 text-xs">
                                    <tr>
                                        <th className="px-4 py-3 text-left">时间</th>
                                        <th className="px-4 py-3 text-left">代理商</th>
                                        <th className="px-4 py-3 text-center">变更类型</th>
                                        <th className="px-4 py-3 text-center">等级变化</th>
                                        <th className="px-4 py-3 text-left">原因/操作人</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/10">
                                    {logs.map(log => {
                                        const type = getChangeTypeLabel(log.changeType);
                                        return (
                                            <tr key={log.id} className="hover:bg-surface-secondary/30">
                                                <td className="px-4 py-3 text-foreground/60 whitespace-nowrap">
                                                    {new Date(log.createdAt).toLocaleString()}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="font-medium">{log.user?.nickname || log.userId}</div>
                                                    <div className="text-xs text-foreground/40">{log.user?.username || ''}</div>
                                                </td>
                                                <td className="px-4 py-3 text-center">
                                                    <span className={`px-2 py-1 rounded text-xs ${type.color}`}>
                                                        {type.label}
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3 text-center whitespace-nowrap">
                                                    <span className="text-foreground/50">{log.previousLevelName || '-'}</span>
                                                    <span className="mx-2 text-foreground/30">→</span>
                                                    <span className="text-primary font-medium">{log.newLevelName}</span>
                                                </td>
                                                <td className="px-4 py-3 text-foreground/60 max-w-xs">
                                                    {log.reason && <div className="truncate">{log.reason}</div>}
                                                    {log.changedBy && log.admin && (
                                                        <div className="text-xs text-foreground/40">
                                                            操作人: {log.admin.nickname || log.admin.username}
                                                        </div>
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
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
