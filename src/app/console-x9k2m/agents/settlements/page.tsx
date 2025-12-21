'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { PageHeader } from '@/components/admin';

interface AgentSettlementCandidate {
    userId: string;
    realName: string;
    contact: string;
    level: { name: string; };
    balance: number;
    totalIncome: number;
    paymentMethod: string;
    paymentAccount: string;
}

export default function AdminSettlementsPage() {
    const { getAccessToken } = useAdminAuth();
    const [agents, setAgents] = useState<AgentSettlementCandidate[]>([]);
    const [loading, setLoading] = useState(true);
    const [minSettlementAmount, setMinSettlementAmount] = useState(1000); // Default 10 yuan
    const [settlingAgent, setSettlingAgent] = useState<AgentSettlementCandidate | null>(null);
    const [settleForm, setSettleForm] = useState({
        amount: 0,
        transactionId: '',
        note: ''
    });
    const [submitting, setSubmitting] = useState(false);

    // Fetch agent config to get minWithdrawAmount
    useEffect(() => {
        async function fetchConfig() {
            const token = getAccessToken();
            if (!token) return;
            try {
                const res = await fetch('/api/admin/agent-config', {
                    headers: { Authorization: `Bearer ${token}` }
                });
                const data = await res.json();
                if (data?.data?.minWithdrawAmount) {
                    setMinSettlementAmount(data.data.minWithdrawAmount);
                }
            } catch (e) {
                console.error('Failed to fetch agent config:', e);
            }
        }
        fetchConfig();
    }, [getAccessToken]);

    const fetchAgents = useCallback(async () => {
        setLoading(true);
        try {
            const token = getAccessToken();
            const res = await fetch('/api/admin/settlements', {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.agents) {
                setAgents(data.agents);
            }
        } catch (error) {
            console.error(error);
            alert('获取列表失败');
        } finally {
            setLoading(false);
        }
    }, [getAccessToken]);

    useEffect(() => {
        fetchAgents();
    }, [fetchAgents]);

    const openSettleModal = (agent: AgentSettlementCandidate) => {
        setSettlingAgent(agent);
        setSettleForm({
            amount: agent.balance, // Default to full balance
            transactionId: '',
            note: ''
        });
    };

    const handleSettle = async () => {
        if (!settlingAgent) return;
        setSubmitting(true);
        try {
            const token = getAccessToken();
            const res = await fetch('/api/admin/settlements', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`
                },
                body: JSON.stringify({
                    userId: settlingAgent.userId,
                    amount: settleForm.amount,
                    transactionId: settleForm.transactionId,
                    note: settleForm.note
                })
            });

            if (res.ok) {
                alert('结算成功');
                setSettlingAgent(null);
                fetchAgents(); // Refresh list
            } else {
                const err = await res.json();
                alert(err.error || '结算失败');
            }
        } catch {
            alert('请求失败');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-background pb-20">
            <PageHeader title="结算管理">
                <button onClick={fetchAgents} className="px-3 py-1.5 text-sm bg-surface-secondary rounded-lg">
                    刷新
                </button>
            </PageHeader>

            <div className="px-4 lg:px-6">

                {loading ? (
                    <div className="text-center py-10">加载中...</div>
                ) : agents.length === 0 ? (
                    <div className="py-16 text-center text-foreground/40">
                        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/10 flex items-center justify-center">
                            <svg className="w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                        </div>
                        <div>暂无待结算代理商</div>
                        <div className="text-xs mt-1">所有代理商余额已清零</div>
                    </div>
                ) : (
                    <>
                        {/* Mobile Card View - Compact */}
                        <div className="lg:hidden space-y-2">
                            {agents.map(agent => (
                                <div key={agent.userId} className="bg-surface rounded-lg border border-border/30 p-3">
                                    <div className="flex items-center justify-between gap-2">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-sm truncate">{agent.realName || '未实名'}</span>
                                                <span className="px-1.5 py-0.5 bg-primary/10 text-primary rounded text-xs shrink-0">
                                                    {agent.level.name}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-3 mt-1 text-xs text-foreground/50">
                                                <span>余额 <span className="text-primary font-medium">¥{(agent.balance / 100).toFixed(2)}</span></span>
                                                {agent.paymentMethod ? (
                                                    <span className="truncate">
                                                        <span className="text-blue-400">{agent.paymentMethod === 'kangxun' ? '康讯' : agent.paymentMethod}</span>
                                                        <span className="text-foreground/40 ml-1">{agent.paymentAccount}</span>
                                                    </span>
                                                ) : (
                                                    <span className="text-red-400">未设置收款</span>
                                                )}
                                            </div>
                                        </div>
                                        {agent.balance < minSettlementAmount ? (
                                            <span className="px-3 py-1.5 text-xs text-foreground/40">未满 ¥{minSettlementAmount / 100}</span>
                                        ) : !agent.paymentMethod ? (
                                            <span className="px-3 py-1.5 text-xs text-red-400">未设收款</span>
                                        ) : (
                                            <button
                                                onClick={() => openSettleModal(agent)}
                                                className="px-3 py-1.5 bg-primary text-white text-xs font-medium rounded-lg shrink-0"
                                            >
                                                结算
                                            </button>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Desktop Table View */}
                        <div className="hidden lg:block bg-surface rounded-xl border border-border/30 overflow-hidden">
                            <table className="w-full text-left">
                                <thead className="bg-surface-secondary/30 text-xs text-foreground/60">
                                    <tr>
                                        <th className="p-4 font-medium">代理商</th>
                                        <th className="p-4 font-medium">累计收入</th>
                                        <th className="p-4 font-medium">当前余额</th>
                                        <th className="p-4 font-medium">收款信息</th>
                                        <th className="p-4 text-right font-medium">操作</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-border/10">
                                    {agents.map(agent => (
                                        <tr key={agent.userId} className="hover:bg-surface-secondary/20">
                                            <td className="p-4">
                                                <div className="font-medium">{agent.realName || '未实名'}</div>
                                                <div className="text-xs text-foreground/40">{agent.contact}</div>
                                                <span className="inline-block mt-1 px-1.5 py-0.5 bg-primary/10 text-primary rounded text-xs">
                                                    {agent.level.name}
                                                </span>
                                            </td>
                                            <td className="p-4 text-foreground/60">
                                                ¥{(agent.totalIncome / 100).toFixed(2)}
                                            </td>
                                            <td className="p-4 font-bold text-lg text-primary">
                                                ¥{(agent.balance / 100).toFixed(2)}
                                            </td>
                                            <td className="p-4 text-sm">
                                                {agent.paymentMethod ? (
                                                    <div>
                                                        <span className="inline-block px-1.5 py-0.5 rounded bg-blue-500/10 text-blue-400 text-xs mr-2">
                                                            {agent.paymentMethod === 'kangxun' ? '康讯号' : agent.paymentMethod}
                                                        </span>
                                                        {agent.paymentAccount}
                                                    </div>
                                                ) : (
                                                    <span className="text-red-400 text-xs">未设置收款信息</span>
                                                )}
                                            </td>
                                            <td className="p-4 text-right">
                                                {agent.balance < minSettlementAmount ? (
                                                    <span className="text-foreground/40 text-sm">未满 ¥{minSettlementAmount / 100}</span>
                                                ) : !agent.paymentMethod ? (
                                                    <span className="text-red-400 text-sm">未设收款信息</span>
                                                ) : (
                                                    <button
                                                        onClick={() => openSettleModal(agent)}
                                                        className="px-4 py-2 bg-primary text-white text-sm rounded-lg hover:bg-primary/90"
                                                    >
                                                        结算
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                )}

                {/* Settle Modal */}
                {settlingAgent && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                        <div className="bg-surface w-full max-w-md rounded-2xl p-6 space-y-4 animate-in zoom-in-95">
                            <h3 className="text-lg font-bold">确认结算</h3>

                            <div className="bg-white/5 p-4 rounded-xl space-y-2 text-sm">
                                <div className="flex justify-between">
                                    <span className="text-foreground/60">收款人</span>
                                    <span>{settlingAgent.realName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-foreground/60">收款方式</span>
                                    <span>{settlingAgent.paymentMethod === 'kangxun' ? '康讯号' : settlingAgent.paymentMethod}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-foreground/60">账号</span>
                                    <span className="font-mono">{settlingAgent.paymentAccount}</span>
                                </div>
                            </div>

                            <div className="space-y-4 pt-2">
                                <div>
                                    <label className="text-sm text-foreground/60 mb-1 block">结算金额 (元)</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-2.5 text-foreground/40">¥</span>
                                        <input
                                            type="number"
                                            value={settleForm.amount / 100}
                                            onChange={e => setSettleForm({ ...settleForm, amount: Math.floor(parseFloat(e.target.value) * 100) })}
                                            className="w-full bg-background pl-7 pr-4 py-2 rounded-lg border border-white/5 outline-none focus:border-primary"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="text-sm text-foreground/60 mb-1 block">交易流水号/凭证号</label>
                                    <input
                                        value={settleForm.transactionId}
                                        onChange={e => setSettleForm({ ...settleForm, transactionId: e.target.value })}
                                        className="w-full bg-background px-4 py-2 rounded-lg border border-white/5 outline-none focus:border-primary"
                                        placeholder="请输入线下转账的流水号"
                                    />
                                </div>
                                <div>
                                    <label className="text-sm text-foreground/60 mb-1 block">备注</label>
                                    <input
                                        value={settleForm.note}
                                        onChange={e => setSettleForm({ ...settleForm, note: e.target.value })}
                                        className="w-full bg-background px-4 py-2 rounded-lg border border-white/5 outline-none focus:border-primary"
                                        placeholder="例如：2024年12月佣金"
                                    />
                                </div>
                            </div>

                            <div className="flex gap-3 mt-6">
                                <button
                                    onClick={() => setSettlingAgent(null)}
                                    className="flex-1 py-2.5 rounded-xl bg-white/5 font-medium"
                                >
                                    取消
                                </button>
                                <button
                                    onClick={handleSettle}
                                    disabled={submitting}
                                    className="flex-1 py-2.5 rounded-xl bg-primary text-white font-medium disabled:opacity-50"
                                >
                                    {submitting ? '处理中...' : '确认已打款'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
