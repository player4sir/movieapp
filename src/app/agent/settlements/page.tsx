'use client';

/**
 * Agent Settlements Page - Redesigned
 * 
 * Clean, minimal design with:
 * - Responsive layout for mobile and desktop
 * - Compact settlement cards
 * - Smooth animations
 */

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import {
    ChevronLeft,
    Wallet,
    Clock,
    CheckCircle2,
    ChevronDown
} from 'lucide-react';

interface SettlementRecord {
    id: string;
    amount: number;
    method: string;
    account: string;
    transactionId: string | null;
    note: string | null;
    createdAt: string;
}

interface SettlementListResult {
    data: SettlementRecord[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
}

const METHOD_LABELS: Record<string, string> = {
    'kangxun': '康讯支付',
    'alipay': '支付宝',
    'wechat': '微信',
    'bank': '银行卡'
};

export default function AgentSettlementsPage() {
    const router = useRouter();
    const { isAuthenticated, loading, getAccessToken } = useAuth();
    const [result, setResult] = useState<SettlementListResult | null>(null);
    const [fetching, setFetching] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [page, setPage] = useState(1);
    const [expandedId, setExpandedId] = useState<string | null>(null);

    const headers = useCallback((): Record<string, string> => {
        const token = getAccessToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }, [getAccessToken]);

    useEffect(() => {
        if (!isAuthenticated) return;

        const fetchData = async () => {
            setFetching(true);
            setError(null);
            try {
                const res = await fetch(`/api/user/agent/settlements?page=${page}&pageSize=20`, {
                    headers: headers()
                });

                if (!res.ok) {
                    if (res.status === 401) {
                        router.replace('/auth/login');
                        return;
                    }
                    throw new Error('Failed to fetch settlements');
                }

                const json = await res.json();
                setResult(json);
            } catch (err) {
                console.error('Failed to fetch settlements:', err);
                setError('获取结算记录失败');
            } finally {
                setFetching(false);
            }
        };

        fetchData();
    }, [isAuthenticated, headers, page, router]);

    useEffect(() => {
        if (!loading && !isAuthenticated) {
            router.replace('/auth/login');
        }
    }, [isAuthenticated, loading, router]);

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleDateString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });
    };

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        return date.toLocaleTimeString('zh-CN', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    if (loading || (fetching && !result)) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    const totalPages = result?.pagination?.totalPages ?? 1;
    const records = result?.data ?? [];
    const totalAmount = records.reduce((sum, r) => sum + r.amount, 0);
    const totalCount = result?.pagination?.total ?? 0;

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
                    <h1 className="text-lg font-bold flex-1">结算记录</h1>
                </header>

                <main className="max-w-3xl mx-auto px-4 py-4 space-y-4">
                    {error ? (
                        <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-center">
                            <p className="text-red-400 text-sm">{error}</p>
                            <button
                                onClick={() => setPage(1)}
                                className="mt-2 text-sm text-primary"
                            >
                                重试
                            </button>
                        </div>
                    ) : records.length > 0 ? (
                        <>
                            {/* Stats Bar - Desktop: horizontal, Mobile: 2 columns */}
                            <div className="grid grid-cols-2 gap-3">
                                <div className="bg-surface rounded-xl p-4 border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center">
                                            <Wallet className="w-5 h-5 text-green-400" />
                                        </div>
                                        <div>
                                            <div className="text-xs text-foreground/50">累计结算</div>
                                            <div className="text-lg font-bold text-green-400">
                                                ¥{(totalAmount / 100).toFixed(2)}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-surface rounded-xl p-4 border border-white/5">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                                            <CheckCircle2 className="w-5 h-5 text-primary" />
                                        </div>
                                        <div>
                                            <div className="text-xs text-foreground/50">结算次数</div>
                                            <div className="text-lg font-bold">{totalCount} 次</div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Records List */}
                            <div className="space-y-2">
                                {records.map((record) => (
                                    <div
                                        key={record.id}
                                        className="bg-surface rounded-xl border border-white/5 overflow-hidden"
                                    >
                                        <button
                                            onClick={() => setExpandedId(expandedId === record.id ? null : record.id)}
                                            className="w-full p-4 flex items-center justify-between hover:bg-white/[0.02] transition-colors"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className="w-9 h-9 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
                                                    <CheckCircle2 className="w-4 h-4 text-green-400" />
                                                </div>
                                                <div className="text-left">
                                                    <div className="font-medium text-sm">提现成功</div>
                                                    <div className="text-xs text-foreground/50 flex items-center gap-1 mt-0.5">
                                                        <Clock className="w-3 h-3" />
                                                        {formatDate(record.createdAt)}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-lg font-bold text-green-400">
                                                    +{(record.amount / 100).toFixed(2)}
                                                </span>
                                                <ChevronDown
                                                    className={`w-4 h-4 text-foreground/30 transition-transform ${expandedId === record.id ? 'rotate-180' : ''
                                                        }`}
                                                />
                                            </div>
                                        </button>

                                        {/* Expanded Details */}
                                        {expandedId === record.id && (
                                            <div className="px-4 pb-4 pt-0 border-t border-white/5 mt-0">
                                                <div className="pt-3 space-y-2 text-sm">
                                                    <div className="flex justify-between">
                                                        <span className="text-foreground/50">收款方式</span>
                                                        <span>{METHOD_LABELS[record.method] || record.method}</span>
                                                    </div>
                                                    {record.account && (
                                                        <div className="flex justify-between">
                                                            <span className="text-foreground/50">收款账号</span>
                                                            <span>****{record.account.slice(-4)}</span>
                                                        </div>
                                                    )}
                                                    <div className="flex justify-between">
                                                        <span className="text-foreground/50">结算时间</span>
                                                        <span>{formatDate(record.createdAt)} {formatTime(record.createdAt)}</span>
                                                    </div>
                                                    {record.transactionId && (
                                                        <div className="flex justify-between">
                                                            <span className="text-foreground/50">交易号</span>
                                                            <span className="font-mono text-xs">{record.transactionId}</span>
                                                        </div>
                                                    )}
                                                    {record.note && (
                                                        <div className="flex justify-between">
                                                            <span className="text-foreground/50">备注</span>
                                                            <span>{record.note}</span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-center gap-4 pt-2">
                                    <button
                                        onClick={() => setPage(p => Math.max(1, p - 1))}
                                        disabled={page === 1}
                                        className="px-4 py-2 text-sm rounded-lg bg-surface border border-white/5 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/5 transition-colors"
                                    >
                                        上一页
                                    </button>
                                    <span className="text-sm text-foreground/50">
                                        {page} / {totalPages}
                                    </span>
                                    <button
                                        onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                        disabled={page === totalPages}
                                        className="px-4 py-2 text-sm rounded-lg bg-surface border border-white/5 disabled:opacity-40 disabled:cursor-not-allowed hover:bg-white/5 transition-colors"
                                    >
                                        下一页
                                    </button>
                                </div>
                            )}
                        </>
                    ) : (
                        <div className="py-20 text-center">
                            <div className="w-16 h-16 rounded-full bg-surface mx-auto mb-4 flex items-center justify-center">
                                <Wallet className="w-8 h-8 text-foreground/20" />
                            </div>
                            <h3 className="font-medium mb-1">暂无结算记录</h3>
                            <p className="text-foreground/50 text-sm">
                                余额达到条件后可申请提现
                            </p>
                        </div>
                    )}
                </main>
            </div>

            <BottomNav />
        </>
    );
}
