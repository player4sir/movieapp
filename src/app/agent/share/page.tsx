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
import { useAuth, useSiteSettings } from '@/hooks';
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
import { QRCodeSVG, QRCodeCanvas } from 'qrcode.react';
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
    const { settings } = useSiteSettings();
    const posterRef = useRef<HTMLDivElement>(null);

    const siteName = settings?.site_name || '影视平台';

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
            // First, get QR code as data URL from the visible/hidden-but-rendered canvas
            const qrCanvas = document.querySelector('#poster-qr-canvas canvas') as HTMLCanvasElement;
            if (qrCanvas) {
                const qrDataUrl = qrCanvas.toDataURL('image/png');
                // Set the poster QR image src
                const posterQrImg = document.getElementById('poster-qr-img') as HTMLImageElement;
                if (posterQrImg) {
                    posterQrImg.src = qrDataUrl;

                    // Wait for image to load and be ready in the DOM
                    await new Promise((resolve, reject) => {
                        if (posterQrImg.complete) resolve(true);
                        posterQrImg.onload = () => resolve(true);
                        posterQrImg.onerror = reject;
                        // Safety timeout
                        setTimeout(() => resolve(true), 500);
                    });
                }
            }

            // Dynamic import html2canvas
            const html2canvas = (await import('html2canvas')).default;

            const canvas = await html2canvas(posterRef.current, {
                useCORS: true,
                scale: 3, // Higher scale for better quality
                backgroundColor: '#ffffff',
                logging: false,
                width: 375,
                height: 667,
            });

            // Convert to image and download
            const link = document.createElement('a');
            link.download = `agent-share-${data?.agentCode || 'poster'}.png`;
            link.href = canvas.toDataURL('image/png', 1.0);
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
                    <h1 className="text-lg font-bold flex-1">{siteName} - 推广赚钱</h1>
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
                                {/* Use opacity-0 instead of hidden to ensure it's rendered for toDataURL */}
                                <div id="poster-qr-canvas" className="absolute opacity-0 pointer-events-none -z-10">
                                    <QRCodeCanvas
                                        value={shareLink}
                                        size={512} // Render at high res
                                        level="H"
                                        includeMargin={true}
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

            {/* Hidden Poster Template for html2canvas - Compact & Aesthetic Style */}
            <div
                ref={posterRef}
                className="fixed -left-[2000px] top-0 w-[375px] h-[667px] bg-[#F4F7FA] flex flex-col items-center justify-center p-6"
                style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}
            >
                {/* Main Card Container */}
                <div className="w-full bg-white rounded-[40px] shadow-[0_20px_50px_rgba(0,0,0,0.06)] border border-white p-8 flex flex-col items-center relative overflow-hidden">
                    {/* Decorative element */}
                    <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-primary/20 via-primary to-primary/20" />

                    {/* Top - Branding */}
                    <div className="mb-8 text-center">
                        <div className="inline-block px-3 py-1 bg-primary/10 rounded-full text-primary text-[10px] font-black uppercase tracking-[0.2em] mb-2">
                            Official Invitation
                        </div>
                        <h1 className="text-3xl font-black text-[#1A1A1B] tracking-tight">{siteName}</h1>
                        <p className="text-[10px] text-gray-400 font-medium mt-1 uppercase tracking-widest">Premium Content Experience</p>
                    </div>

                    {/* Center - QR Code Card */}
                    <div className="relative group mb-8">
                        <div className="absolute -inset-4 bg-gradient-to-br from-primary/5 to-primary/20 rounded-[48px] blur-xl opacity-50" />
                        <div className="relative p-5 bg-white rounded-[32px] shadow-sm border border-gray-100">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                                id="poster-qr-img"
                                alt="QR Code"
                                width={180}
                                height={180}
                                className="block"
                            />
                        </div>
                    </div>

                    {/* Bottom - Info Section */}
                    <div className="w-full space-y-5 text-center">
                        <div className="space-y-1">
                            <p className="text-[#1A1A1B] text-base font-bold">扫描二维码 · 立即加入</p>
                            <p className="text-gray-400 text-[10px] font-medium tracking-wide">加入我们，体验极致视听盛宴</p>
                        </div>

                        {/* Invite Code Box - Resized to be more compact */}
                        <div className="bg-[#1A1A1B] rounded-[20px] py-3 px-8 relative inline-flex flex-col items-center shadow-lg shadow-black/5 overflow-hidden">
                            <p className="text-white/30 text-[8px] uppercase font-black tracking-[0.2em] mb-1 relative z-10">Exclusive Invite Code</p>
                            <p className="text-2xl font-black text-white tracking-[0.2em] relative z-10">{data.agentCode}</p>
                        </div>
                    </div>
                </div>

                {/* Outer Footer */}
                <div className="mt-8 text-center">
                    <p className="text-gray-300 text-[9px] font-black tracking-[0.3em] uppercase">
                        Quality Service • Verified Platform
                    </p>
                </div>
            </div>
        </>
    );
}
