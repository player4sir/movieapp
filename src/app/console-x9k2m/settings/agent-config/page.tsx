'use client';

/**
 * Agent System Configuration Page
 * Allows admins to configure agent system settings
 */

import { useState, useEffect } from 'react';
import useSWR from 'swr';
import { useAdminAuth } from '@/contexts/AdminAuthContext';
import { useToast } from '@/components/admin';

interface AgentConfig {
    trackingExpiryDays: number;
    autoUpgradeEnabled: boolean;
    minWithdrawAmount: number; // in cents
}

const DEFAULT_CONFIG: AgentConfig = {
    trackingExpiryDays: 30,
    autoUpgradeEnabled: true,
    minWithdrawAmount: 10000, // 100 yuan
};

export default function AgentConfigPage() {
    const { getAccessToken } = useAdminAuth();
    const { showToast } = useToast();

    const [config, setConfig] = useState<AgentConfig>(DEFAULT_CONFIG);
    const [saving, setSaving] = useState(false);

    const fetcher = async (url: string) => {
        const token = getAccessToken();
        if (!token) throw new Error('未登录');
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) return { data: DEFAULT_CONFIG };
        return res.json();
    };

    const { data, mutate } = useSWR<{ data: AgentConfig }>(
        '/api/admin/agent-config',
        fetcher
    );

    useEffect(() => {
        if (data?.data) {
            setConfig(data.data);
        }
    }, [data]);

    const handleSave = async () => {
        const token = getAccessToken();
        if (!token) return;

        setSaving(true);
        try {
            const res = await fetch('/api/admin/agent-config', {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(config),
            });

            if (!res.ok) throw new Error('保存失败');
            showToast({ message: '配置已保存', type: 'success' });
            mutate();
        } catch (e) {
            showToast({ message: e instanceof Error ? e.message : '保存失败', type: 'error' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-4 lg:p-6">
            <div className="flex items-center justify-between mb-6">
                <h1 className="text-lg lg:text-xl font-semibold">代理商系统配置</h1>
            </div>

            <div className="bg-surface rounded-lg border border-border/50 p-6 max-w-2xl">
                {/* Tracking Expiry Days */}
                <div className="mb-6">
                    <label className="block text-sm font-medium mb-2">
                        推广码追踪有效期（天）
                    </label>
                    <div className="flex items-center gap-3">
                        <input
                            type="number"
                            min="1"
                            max="365"
                            value={config.trackingExpiryDays}
                            onChange={(e) => setConfig(c => ({
                                ...c,
                                trackingExpiryDays: parseInt(e.target.value) || 30
                            }))}
                            className="input w-32"
                        />
                        <span className="text-sm text-foreground/60">
                            用户访问推广链接后，在此期间内的订单都将归属到代理商
                        </span>
                    </div>
                </div>

                {/* Auto Upgrade */}
                <div className="mb-6">
                    <label className="flex items-center gap-3 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={config.autoUpgradeEnabled}
                            onChange={(e) => setConfig(c => ({
                                ...c,
                                autoUpgradeEnabled: e.target.checked
                            }))}
                            className="w-5 h-5 accent-primary"
                        />
                        <div>
                            <div className="font-medium">启用自动升级</div>
                            <div className="text-sm text-foreground/60">
                                当代理商满足升级条件时自动升级到更高等级
                            </div>
                        </div>
                    </label>
                </div>

                {/* Minimum Withdraw Amount */}
                <div className="mb-6">
                    <label className="block text-sm font-medium mb-2">
                        最低提现金额（元）
                    </label>
                    <div className="flex items-center gap-3">
                        <input
                            type="number"
                            min="1"
                            value={config.minWithdrawAmount / 100}
                            onChange={(e) => setConfig(c => ({
                                ...c,
                                minWithdrawAmount: (parseFloat(e.target.value) || 100) * 100
                            }))}
                            className="input w-32"
                        />
                        <span className="text-sm text-foreground/60">
                            代理商余额达到此金额后方可申请提现
                        </span>
                    </div>
                </div>

                {/* Save Button */}
                <div className="pt-4 border-t border-border/20">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="btn-primary px-6 py-2"
                    >
                        {saving ? '保存中...' : '保存配置'}
                    </button>
                </div>
            </div>

            {/* Quick Stats */}
            <div className="mt-8">
                <h2 className="text-lg font-semibold mb-4">系统概览</h2>
                <AgentStats />
            </div>
        </div>
    );
}

function AgentStats() {
    const { getAccessToken } = useAdminAuth();

    const fetcher = async (url: string) => {
        const token = getAccessToken();
        if (!token) throw new Error('未登录');
        const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error('获取失败');
        return res.json();
    };

    const { data, isLoading } = useSWR<{
        totalAgents: number;
        activeAgents: number;
        pendingAgents: number;
        totalEarnings: number;
        totalBalance: number;
        levelDistribution: { levelName: string; count: number }[];
    }>('/api/admin/agent-stats', fetcher);

    if (isLoading) {
        return <div className="text-foreground/40">加载中...</div>;
    }

    if (!data) {
        return <div className="text-foreground/40">暂无数据</div>;
    }

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard title="总代理数" value={data.totalAgents} />
            <StatCard title="活跃代理" value={data.activeAgents} color="text-green-500" />
            <StatCard title="待审核" value={data.pendingAgents} color="text-yellow-500" />
            <StatCard title="总佣金" value={`¥${(data.totalEarnings / 100).toFixed(2)}`} color="text-primary" />
            <StatCard title="待提现" value={`¥${(data.totalBalance / 100).toFixed(2)}`} color="text-orange-500" />

            {/* Level Distribution */}
            <div className="col-span-2 md:col-span-3 bg-surface rounded-lg border border-border/50 p-4">
                <div className="text-sm text-foreground/60 mb-3">等级分布</div>
                <div className="flex flex-wrap gap-3">
                    {data.levelDistribution.map((item, i) => (
                        <div key={i} className="flex items-center gap-2 bg-surface-secondary/50 px-3 py-1.5 rounded-full">
                            <span className="text-sm font-medium">{item.levelName}</span>
                            <span className="text-xs bg-primary/20 text-primary px-2 py-0.5 rounded-full">
                                {item.count}人
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}

function StatCard({ title, value, color = 'text-foreground' }: { title: string; value: string | number; color?: string }) {
    return (
        <div className="bg-surface rounded-lg border border-border/50 p-4">
            <div className="text-sm text-foreground/60 mb-1">{title}</div>
            <div className={`text-xl font-bold ${color}`}>{value}</div>
        </div>
    );
}
