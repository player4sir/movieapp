'use client';

/**
 * Agent Share Page - Agent-specific promotion page
 * 
 * Features:
 * - Display agent's commission rate and level
 * - Show unique agent promotion code and QR code
 * - Commission calculation explanation
 * - Generate promotional poster
 */

import { useEffect, useState, useRef, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks';
import { Sidebar } from '@/components/layout/Sidebar';
import { BottomNav } from '@/components/layout/BottomNav';
import {
    ChevronLeft,
    Copy,
    Check,
    Download,
    Share2,
    Crown,
    TrendingUp,
    Wallet,
    Users,
    QrCode
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import Link from 'next/link';

interface AgentShareData {
    agentCode: string;
    level: {
        name: string;
        commissionRate: number; // in basis points (1000 = 10%)
    };
    totalIncome: number;
    totalReferrals: number;
}

export default function AgentSharePage() {
    const router = useRouter();
    const { isAuthenticated, loading, getAccessToken } = useAuth();
    const [data, setData] = useState<AgentShareData | null>(null);
    const [fetching, setFetching] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState<'code' | 'link' | null>(null);
    const [generatingPoster, setGeneratingPoster] = useState(false);
    const posterRef = useRef<HTMLDivElement>(null);

    const headers = useCallback((): Record<string, string> => {
        const token = getAccessToken();
        return token ? { 'Authorization': `Bearer ${token}` } : {};
    }, [getAccessToken]);

    useEffect(() => {
        if (!isAuthenticated) return;

        async function fetchData() {
            try {
                const res = await fetch('/api/user/agent/share', { headers: headers() });
                const result = await res.json();

                if (res.ok && result.data) {
                    setData(result.data);
                } else {
                    setError(result.message || '无法获取推广信息');
                }
            } catch (e) {
                setError('网络错误，请重试');
            } finally {
                setFetching(false);
            }
        }

        fetchData();
    }, [isAuthenticated, headers]);

    const shareLink = data?.agentCode
        ? `${typeof window !== 'undefined' ? window.location.origin : ''}/auth/register?agent=${data.agentCode}`
        : '';

    const commissionPercent = data?.level?.commissionRate
        ? (data.level.commissionRate / 100).toFixed(0)
        : '0';

    const handleCopy = async (type: 'code' | 'link') => {
        const text = type === 'code' ? data?.agentCode || '' : shareLink;
        await navigator.clipboard.writeText(text);
        setCopied(type);
        setTimeout(() => setCopied(null), 2000);
    };

    const handleGeneratePoster = async () => {
        if (!posterRef.current || generatingPoster) return;

        setGeneratingPoster(true);
        try {
            // Dynamic import html2canvas
            const html2canvas = (await import('html2canvas')).default;

            const canvas = await html2canvas(posterRef.current, {
                backgroundColor: '#0f0f0f',
                scale: 2,
                useCORS: true,
            });

            // Convert to image and download
            const link = document.createElement('a');
            link.download = `agent-poster-${data?.agentCode || 'share'}.png`;
            link.href = canvas.toDataURL('image/png');
            link.click();
        } catch (e) {
            console.error('Failed to generate poster:', e);
            alert('海报生成失败，请重试');
        } finally {
            setGeneratingPoster(false);
        }
    };

    if (loading || fetching) {
        return (
            <div className="min-h-screen bg-background flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
            </div>
        );
    }

    if (error || !data) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
                <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center mb-6">
                    <Share2 className="w-10 h-10 text-red-400" />
                </div>
                <h2 className="text-xl font-bold mb-2">无法获取推广信息</h2>
                <p className="text-foreground/60 mb-6 text-center max-w-xs">
                    {error || '您需要成为活跃代理商才能使用此功能'}
                </p>
                <Link href="/agent" className="px-8 py-3 bg-primary text-white rounded-full font-medium">
                    返回代理中心
                </Link>
            </div>
        );
    }

    return (
        <>
            <Sidebar />
            <div className="h-screen flex flex-col bg-background overflow-hidden lg:pl-64">
                {/* Header */}
                <header
                    className="flex-none px-4 py-3 flex items-center gap-3 border-b border-white/5 bg-background/80 backdrop-blur-xl z-20"
                    style={{ paddingTop: 'max(0.75rem, env(safe-area-inset-top))' }}
                >
                    <button onClick={() => router.back()} className="p-2 -ml-2 rounded-full active:bg-white/10 lg:hidden">
                        <ChevronLeft className="w-5 h-5" />
                    </button>
                    <h1 className="text-lg font-bold flex-1">推广赚钱</h1>
                </header>

                <main className="flex-1 overflow-auto">
                    <div className="max-w-2xl mx-auto p-4 lg:p-6 space-y-5 pb-24 lg:pb-8">
                        {/* Commission Rate Hero */}
                        <div className="bg-gradient-to-br from-amber-500/20 via-orange-500/15 to-red-500/10 rounded-2xl p-6 border border-white/5 text-center relative overflow-hidden">
                            <div className="absolute -right-8 -top-8 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl" />
                            <div className="absolute -left-8 -bottom-8 w-24 h-24 bg-orange-500/10 rounded-full blur-2xl" />

                            <div className="relative">
                                <div className="flex items-center justify-center gap-2 mb-3">
                                    <Crown className="w-5 h-5 text-amber-400" />
                                    <span className="text-sm font-medium text-amber-400">{data.level.name}</span>
                                </div>

                                <div className="text-5xl lg:text-6xl font-bold mb-2 bg-gradient-to-r from-amber-400 to-orange-400 bg-clip-text text-transparent">
                                    {commissionPercent}%
                                </div>
                                <div className="text-foreground/60 text-sm">佣金比例</div>

                                <div className="mt-4 p-3 bg-black/20 rounded-xl">
                                    <div className="text-xs text-foreground/50 mb-1">收益示例</div>
                                    <div className="text-sm">
                                        用户消费 <span className="text-white font-medium">¥100</span> →
                                        您获得 <span className="text-amber-400 font-bold">¥{Number(commissionPercent)}</span> 佣金
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Stats */}
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-surface rounded-xl p-4 flex items-center gap-3">
                                <div className="w-11 h-11 rounded-xl bg-green-500/10 flex items-center justify-center text-green-400">
                                    <Wallet className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="text-xs text-foreground/50">累计佣金</div>
                                    <div className="text-lg font-bold">¥{(data.totalIncome / 100).toFixed(2)}</div>
                                </div>
                            </div>
                            <div className="bg-surface rounded-xl p-4 flex items-center gap-3">
                                <div className="w-11 h-11 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                                    <Users className="w-5 h-5" />
                                </div>
                                <div>
                                    <div className="text-xs text-foreground/50">推广用户</div>
                                    <div className="text-lg font-bold">{data.totalReferrals}</div>
                                </div>
                            </div>
                        </div>

                        {/* QR Code & Promotion Code */}
                        <div className="bg-surface rounded-2xl p-5 lg:p-6 space-y-5">
                            <div className="text-center">
                                <h3 className="font-bold mb-4 flex items-center justify-center gap-2">
                                    <QrCode className="w-4 h-4 text-primary" />
                                    我的专属推广码
                                </h3>
                                <div className="inline-block bg-white p-4 rounded-xl">
                                    <QRCodeSVG
                                        value={shareLink}
                                        size={160}
                                        level="M"
                                        includeMargin={false}
                                    />
                                </div>
                            </div>

                            {/* Promotion Code */}
                            <div className="space-y-2">
                                <label className="text-sm text-foreground/60 block">推广码</label>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-background rounded-xl p-3.5 font-mono text-xl tracking-widest text-center font-bold">
                                        {data.agentCode}
                                    </div>
                                    <button
                                        onClick={() => handleCopy('code')}
                                        className="p-3.5 bg-background rounded-xl hover:bg-white/10 transition-colors"
                                    >
                                        {copied === 'code' ? (
                                            <Check className="w-5 h-5 text-green-400" />
                                        ) : (
                                            <Copy className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Share Link */}
                            <div className="space-y-2">
                                <label className="text-sm text-foreground/60 block">推广链接</label>
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 bg-background rounded-xl p-3.5 text-sm truncate text-foreground/70">
                                        {shareLink}
                                    </div>
                                    <button
                                        onClick={() => handleCopy('link')}
                                        className="px-4 py-3.5 bg-primary hover:bg-primary/90 text-white rounded-xl font-medium text-sm transition-colors flex items-center gap-2"
                                    >
                                        {copied === 'link' ? (
                                            <>
                                                <Check className="w-4 h-4" />
                                                已复制
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-4 h-4" />
                                                复制
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Generate Poster Button */}
                            <button
                                onClick={handleGeneratePoster}
                                disabled={generatingPoster}
                                className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white rounded-xl font-medium transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                                {generatingPoster ? (
                                    <>
                                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white" />
                                        生成中...
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-4 h-4" />
                                        保存推广海报
                                    </>
                                )}
                            </button>
                        </div>

                        {/* How It Works */}
                        <div className="bg-surface rounded-2xl p-5 lg:p-6">
                            <h3 className="font-bold mb-4 flex items-center gap-2">
                                <TrendingUp className="w-4 h-4 text-primary" />
                                推广说明
                            </h3>
                            <div className="space-y-3">
                                {[
                                    { step: '1', title: '分享推广', desc: '将您的专属链接或二维码分享给好友' },
                                    { step: '2', title: '用户注册', desc: '好友通过链接注册成为平台用户' },
                                    { step: '3', title: '用户消费', desc: '好友购买会员或充值金币' },
                                    { step: '4', title: '获得佣金', desc: `自动获得消费金额 ${commissionPercent}% 的佣金` },
                                ].map((item) => (
                                    <div key={item.step} className="flex items-start gap-3 p-3 bg-background rounded-xl">
                                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center text-primary text-sm font-bold flex-shrink-0">
                                            {item.step}
                                        </div>
                                        <div>
                                            <div className="font-medium text-sm">{item.title}</div>
                                            <div className="text-xs text-foreground/50">{item.desc}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <p className="text-xs text-foreground/40 text-center">
                            佣金由管理员定期结算，结算后打入您的收款账户
                        </p>
                    </div>
                </main>
            </div>
            <BottomNav />

            {/* Hidden Poster Template for html2canvas */}
            <div
                ref={posterRef}
                className="fixed -left-[9999px] top-0 w-[375px] bg-gradient-to-b from-[#1a1a2e] to-[#0f0f1a] p-6"
                style={{ fontFamily: 'system-ui, sans-serif' }}
            >
                <div className="text-center space-y-6">
                    {/* Header */}
                    <div>
                        <div className="text-2xl font-bold text-white mb-2">🎬 影视平台</div>
                        <div className="text-amber-400 text-sm">邀请您加入</div>
                    </div>

                    {/* Commission Highlight */}
                    <div className="bg-gradient-to-r from-amber-500/20 to-orange-500/20 rounded-2xl p-6 border border-amber-500/30">
                        <div className="text-amber-400 text-sm mb-2">专属佣金比例</div>
                        <div className="text-5xl font-bold text-white">{commissionPercent}%</div>
                    </div>

                    {/* QR Code */}
                    <div className="bg-white p-4 rounded-xl inline-block mx-auto">
                        <QRCodeSVG
                            value={shareLink}
                            size={140}
                            level="M"
                        />
                    </div>

                    {/* Code */}
                    <div>
                        <div className="text-white/60 text-xs mb-1">推广码</div>
                        <div className="text-2xl font-mono font-bold text-white tracking-widest">
                            {data.agentCode}
                        </div>
                    </div>

                    {/* Benefits */}
                    <div className="text-left bg-white/5 rounded-xl p-4 space-y-2">
                        <div className="text-white text-sm font-medium">✨ 加入福利</div>
                        <div className="text-white/60 text-xs">• 海量影视资源随心看</div>
                        <div className="text-white/60 text-xs">• 高清画质极速播放</div>
                        <div className="text-white/60 text-xs">• 新人注册即享好礼</div>
                    </div>

                    {/* Footer */}
                    <div className="text-white/40 text-xs">
                        长按识别二维码立即加入
                    </div>
                </div>
            </div>
        </>
    );
}
