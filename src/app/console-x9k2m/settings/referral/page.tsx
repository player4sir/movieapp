'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api-client';

interface CoinConfigValue {
    key: string;
    value: unknown;
    description: string;
}

const REFERRAL_CONFIG_KEYS = ['referral_reward_inviter', 'referral_reward_invitee'];

const CONFIG_LABELS: Record<string, string> = {
    referral_reward_inviter: '邀请人奖励',
    referral_reward_invitee: '新人奖励',
};

export default function ReferralSettingsPage() {
    const [configs, setConfigs] = useState<CoinConfigValue[]>([]);
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [saving, setSaving] = useState(false);

    // Edit state
    const [editingKey, setEditingKey] = useState<string | null>(null);
    const [editValue, setEditValue] = useState<string>('');

    const fetchConfigs = useCallback(async () => {
        setLoading(true);
        const { data } = await api.get<{ configs: CoinConfigValue[] }>('/api/admin/coins/config');
        if (data?.configs) {
            // Filter only referral configs
            setConfigs(data.configs.filter(c => REFERRAL_CONFIG_KEYS.includes(c.key)));
        }
        setLoading(false);
    }, []);

    useEffect(() => {
        fetchConfigs();
    }, [fetchConfigs]);

    const handleEdit = (config: CoinConfigValue) => {
        setEditingKey(config.key);
        setEditValue(String(config.value));
    };

    const handleCancel = () => {
        setEditingKey(null);
        setEditValue('');
    };

    const handleSave = async (key: string) => {
        setSaving(true);
        try {
            const numValue = parseInt(editValue, 10);
            if (isNaN(numValue) || numValue < 0) {
                throw new Error('请输入有效的非负整数');
            }

            const { error } = await api.put('/api/admin/coins/config', {
                key,
                value: numValue
            });

            if (error) throw new Error(error);

            setMessage({ type: 'success', text: '配置已更新' });
            setEditingKey(null);
            fetchConfigs();
        } catch (e) {
            setMessage({ type: 'error', text: e instanceof Error ? e.message : '保存失败' });
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="p-4 lg:p-6 max-w-4xl">
            <div className="flex items-center gap-3 mb-4">
                <Link
                    href="/console-x9k2m/settings"
                    className="p-2 -ml-2 text-foreground/60 hover:text-foreground rounded-lg hover:bg-surface-secondary/50"
                >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                </Link>
                <h1 className="text-xl font-semibold">推广配置</h1>
            </div>

            {message && (
                <div className={`mb-4 p-3 rounded-lg text-sm ${message.type === 'success' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                    {message.text}
                </div>
            )}

            <div className="bg-surface rounded-lg p-4 lg:p-6">
                <h2 className="text-base lg:text-lg font-semibold mb-4">奖励设置</h2>

                {loading ? (
                    <div className="space-y-3">
                        {[1, 2].map((i) => (
                            <div key={i} className="h-16 bg-surface-secondary/30 rounded-lg animate-pulse" />
                        ))}
                    </div>
                ) : (
                    <div className="space-y-3">
                        {configs.map((config) => (
                            <div key={config.key} className="p-3 bg-surface-secondary/30 rounded-lg">
                                <div className="flex items-center justify-between gap-3">
                                    <div>
                                        <div className="font-medium text-sm mb-1">{CONFIG_LABELS[config.key] || config.key}</div>
                                        <div className="text-xs text-foreground/50">{config.description}</div>
                                    </div>

                                    {editingKey === config.key ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                value={editValue}
                                                onChange={(e) => setEditValue(e.target.value)}
                                                className="w-24 px-2 py-1 bg-background border border-surface-secondary rounded text-sm"
                                            />
                                            <button
                                                onClick={() => handleSave(config.key)}
                                                disabled={saving}
                                                className="px-3 py-1 text-xs bg-primary text-white rounded disabled:opacity-50"
                                            >
                                                保存
                                            </button>
                                            <button
                                                onClick={handleCancel}
                                                disabled={saving}
                                                className="px-3 py-1 text-xs text-foreground/60 hover:text-foreground"
                                            >
                                                取消
                                            </button>
                                        </div>
                                    ) : (
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm">{String(config.value)} 金币</span>
                                            <button
                                                onClick={() => handleEdit(config)}
                                                className="text-xs text-primary hover:underline"
                                            >
                                                编辑
                                            </button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                        {configs.length === 0 && <p className="text-sm text-foreground/50">暂无配置项</p>}
                    </div>
                )}
            </div>
        </div>
    );
}
