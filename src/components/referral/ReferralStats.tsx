'use client';

import { useState, useEffect } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { api } from '@/lib/api-client';

interface ReferralStatsData {
    inviteCount: number;
    totalIncome: number;
    rewards?: {
        inviter: number;
        invitee: number;
    };
}

interface UserProfile {
    id: string;
    username: string;
    referralCode?: string;
}

export function ReferralStats() {
    const [stats, setStats] = useState<ReferralStatsData | null>(null);
    const [user, setUser] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);

    useEffect(() => {
        async function fetchData() {
            try {
                const [statsRes, userRes] = await Promise.all([
                    api.get<ReferralStatsData>('/api/user/referral'),
                    api.get<{ user: UserProfile }>('/api/auth/me')
                ]);

                if (statsRes.data) {
                    setStats(statsRes.data);
                }
                if (userRes.data?.user) {
                    setUser(userRes.data.user);
                }
            } catch (error) {
                console.error('Failed to fetch referral data', error);
            } finally {
                setLoading(false);
            }
        }
        fetchData();
    }, []);

    if (loading) return <div className="p-8 text-center text-white/60">加载中...</div>;
    if (!user || !user.referralCode) return <div className="p-8 text-center text-white/60">无法获取推广信息</div>;

    const shareLink = `${window.location.origin}/auth/register?ref=${user.referralCode}`;
    const inviterReward = stats?.rewards?.inviter ?? 50;
    const inviteeReward = stats?.rewards?.invitee ?? 10;

    const handleCopy = () => {
        navigator.clipboard.writeText(shareLink);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="space-y-6">
            {/* Stats Cards */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-surface rounded-xl p-4 border border-white/5">
                    <div className="text-foreground/60 text-sm mb-1">累计邀请</div>
                    <div className="text-2xl font-bold text-foreground">{stats?.inviteCount || 0} 人</div>
                </div>
                <div className="bg-surface rounded-xl p-4 border border-white/5">
                    <div className="text-foreground/60 text-sm mb-1">获得奖励</div>
                    <div className="text-2xl font-bold text-amber-500">{stats?.totalIncome || 0} 金币</div>
                </div>
            </div>

            {/* Share Section */}
            <div className="bg-surface rounded-xl p-6 border border-white/5 space-y-6">
                <div className="text-center">
                    <h3 className="text-foreground font-medium mb-4">扫描二维码邀请好友</h3>
                    <div className="flex justify-center bg-white p-4 rounded-lg w-fit mx-auto">
                        <QRCodeSVG value={shareLink} size={160} />
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm text-foreground/60 block">我的邀请码</label>
                    <div className="flex bg-background rounded-lg p-3 border border-white/5 items-center justify-between">
                        <span className="text-xl font-mono text-foreground tracking-wider">{user.referralCode}</span>
                        <button
                            onClick={() => {
                                navigator.clipboard.writeText(user.referralCode || '');
                                setCopied(true);
                                setTimeout(() => setCopied(false), 2000);
                            }}
                            className="text-primary text-sm font-medium hover:text-primary/80"
                        >
                            复制
                        </button>
                    </div>
                </div>

                <div className="space-y-2">
                    <label className="text-sm text-foreground/60 block">推广链接</label>
                    <div className="flex gap-2">
                        <div className="flex-1 bg-background rounded-lg p-3 text-sm text-foreground/80 border border-white/5 truncate">
                            {shareLink}
                        </div>
                        <button
                            onClick={handleCopy}
                            className="bg-primary hover:bg-primary/90 text-white px-4 rounded-lg text-sm font-medium transition-colors"
                        >
                            {copied ? '已复制' : '复制'}
                        </button>
                    </div>
                </div>
            </div>

            <div className="text-center text-xs text-foreground/40">
                每邀请一位好友注册，您将获得 {inviterReward} 金币奖励，好友获得 {inviteeReward} 金币。
            </div>
        </div>
    );
}
