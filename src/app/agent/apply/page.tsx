'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks';

import { ChevronLeft, CheckCircle2, UserPlus } from 'lucide-react';

function AgentApplyContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { getAccessToken } = useAuth();
    const [submitting, setSubmitting] = useState(false);
    const [success, setSuccess] = useState(false);
    const [form, setForm] = useState({ realName: '', contact: '', inviteCode: '' });
    const [error, setError] = useState('');

    // Get invite code from URL
    useEffect(() => {
        const invite = searchParams.get('invite');
        if (invite) {
            setForm(prev => ({ ...prev, inviteCode: invite }));
        }
    }, [searchParams]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form.realName || !form.contact) return;

        setSubmitting(true);
        setError('');

        try {
            const token = getAccessToken();
            const res = await fetch('/api/user/agent', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': token ? `Bearer ${token}` : '',
                },
                body: JSON.stringify({
                    realName: form.realName,
                    contact: form.contact,
                    inviteCode: form.inviteCode || undefined,
                }),
            });

            if (res.ok) {
                setSuccess(true);
            } else {
                const data = await res.json();
                setError(data.message || '申请提交失败');
            }
        } catch {
            setError('网络错误，请稍后重试');
        } finally {
            setSubmitting(false);
        }
    };

    if (success) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-8 space-y-6 text-center">
                <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center">
                    <CheckCircle2 className="w-10 h-10 text-green-500" />
                </div>
                <h1 className="text-2xl font-bold">申请已提交</h1>
                <p className="text-foreground/60">
                    您的合伙人申请已收到，我们将尽快进行审核。<br />
                    {form.inviteCode && '您已通过邀请链接申请，审核通过后将绑定上级代理。'}
                    审核通过后，您将在个人中心看到代理入口。
                </p>
                <button
                    onClick={() => router.replace('/profile')}
                    className="w-full max-w-xs py-3 bg-white/10 rounded-xl font-medium active:scale-95 transition-transform"
                >
                    返回个人中心
                </button>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-background flex flex-col">
            <header className="flex-none px-4 py-3 flex items-center gap-3">
                <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full active:bg-white/10">
                    <ChevronLeft className="w-5 h-5" />
                </button>
                <h1 className="text-lg font-bold">申请成为合伙人</h1>
            </header>

            <main className="flex-1 p-6">
                <div className="bg-surface rounded-2xl p-6 mb-8">
                    <h2 className="text-lg font-bold mb-2">加入合伙人计划</h2>
                    <p className="text-sm text-foreground/60">
                        推广用户，享受高额佣金回报。请填写真实信息以便我们与您联系。
                    </p>
                </div>

                {/* Invite Code Notice */}
                {form.inviteCode && (
                    <div className="bg-primary/10 border border-primary/20 rounded-xl p-4 mb-6 flex items-start gap-3">
                        <UserPlus className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                        <div className="text-sm">
                            <p className="font-medium text-primary">通过邀请链接申请</p>
                            <p className="text-foreground/60">邀请码: {form.inviteCode}</p>
                        </div>
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground/80">真实姓名</label>
                        <input
                            type="text"
                            value={form.realName}
                            onChange={e => setForm(prev => ({ ...prev, realName: e.target.value }))}
                            className="w-full bg-surface border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-primary/50 transition-colors"
                            placeholder="请输入您的真实姓名"
                        />
                    </div>

                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground/80">联系方式</label>
                        <input
                            type="text"
                            value={form.contact}
                            onChange={e => setForm(prev => ({ ...prev, contact: e.target.value }))}
                            className="w-full bg-surface border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-primary/50 transition-colors"
                            placeholder="手机号或微信号"
                        />
                    </div>

                    {/* Manual invite code input if not from URL */}
                    {!searchParams.get('invite') && (
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-foreground/80">邀请码（选填）</label>
                            <input
                                type="text"
                                value={form.inviteCode}
                                onChange={e => setForm(prev => ({ ...prev, inviteCode: e.target.value.toUpperCase() }))}
                                className="w-full bg-surface border border-white/5 rounded-xl px-4 py-3 outline-none focus:border-primary/50 transition-colors"
                                placeholder="如有上级代理的邀请码请填写"
                                maxLength={8}
                            />
                        </div>
                    )}

                    {error && (
                        <p className="text-red-400 text-sm text-center bg-red-500/10 py-2 rounded-lg">
                            {error}
                        </p>
                    )}

                    <button
                        type="submit"
                        disabled={!form.realName || !form.contact || submitting}
                        className="w-full py-4 bg-primary text-white rounded-xl font-bold shadow-lg shadow-primary/20 disabled:opacity-50 disabled:shadow-none active:scale-[0.98] transition-all"
                    >
                        {submitting ? '提交中...' : '提交申请'}
                    </button>
                </form>
            </main>
        </div>
    );
}

export default function AgentApplyPage() {
    return (
        <Suspense fallback={<div className="min-h-screen bg-background animate-pulse" />}>
            <AgentApplyContent />
        </Suspense>
    );
}
