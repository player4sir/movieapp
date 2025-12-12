'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronRight,
  History,
  Share2,
  Heart,
  LogOut,
  Wallet,
  Crown
} from 'lucide-react';
import { useAuth, useCoins } from '@/hooks';
import { BottomNav } from '@/components/layout/BottomNav';
import { CheckinButton, RechargeModal } from '@/components/coins';
import { MembershipCard, PaymentModal } from '@/components/membership';
import { AdSlot } from '@/components/ads';

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, loading, logout } = useAuth();
  const { balance } = useCoins();
  const [showRecharge, setShowRecharge] = useState(false);
  const [showMembership, setShowMembership] = useState(false);
  const [debugClicks, setDebugClicks] = useState(0);

  const handleVersionClick = () => {
    const newCount = debugClicks + 1;
    if (newCount >= 7) {
      router.push('/admin/login');
      setDebugClicks(0);
    } else {
      setDebugClicks(newCount);
    }
  };

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  const handleLogout = async () => {
    await logout();
    router.replace('/auth/login');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!isAuthenticated || !user) return null;

  return (
    <div className="min-h-screen bg-surface dark:bg-background pb-24">
      {/* Header Area */}
      <div className="pt-12 px-4 pb-6 bg-background dark:bg-background">
        <MembershipCard
          user={{ avatar: user.avatar, nickname: user.nickname, username: user.username }}
          onUpgrade={() => setShowMembership(true)}
        />

        {/* Quick Stats Row */}
        {/* Quick Stats Row */}
        <div className="mt-6 flex items-stretch gap-3">
          <div className="flex-1 bg-background dark:bg-surface p-4 rounded-2xl shadow-sm border border-surface-secondary">
            <Link href="/profile/coins" className="flex flex-col h-full justify-between">
              <div className="flex items-center gap-2 text-foreground/60 mb-3">
                <Wallet className="w-4 h-4" />
                <span className="text-xs font-medium">我的金币</span>
              </div>
              <div className="flex items-end gap-1">
                <span className="text-xl font-bold text-foreground leading-none">
                  {balance?.balance?.toLocaleString() || 0}
                </span>
                <span className="text-xs text-foreground/40 mb-0.5">币</span>
              </div>
            </Link>
          </div>

          <div className="flex-1 bg-background dark:bg-surface p-4 rounded-2xl shadow-sm border border-surface-secondary flex flex-col justify-between">
            <div className="flex items-center gap-2 text-foreground/60 mb-3">
              <span className="text-xs font-medium">每日签到</span>
            </div>
            <div className="w-full">
              <CheckinButton compact />
            </div>
          </div>
        </div>
      </div>

      {/* Ad Slot */}
      <div className="px-4 mb-6">
        <AdSlot
          position="profile_middle"
          width={728}
          height={90}
          className="w-full rounded-2xl overflow-hidden shadow-sm"
        />
      </div>

      {/* Menu Groups */}
      <div className="px-4 space-y-4">
        {/* Content Group */}
        <div className="bg-background dark:bg-surface rounded-2xl shadow-sm border border-surface-secondary overflow-hidden">
          <Link
            href="/profile/favorites"
            className="flex items-center justify-between p-4 active:bg-surface-secondary transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-red-50 dark:bg-red-500/20 flex items-center justify-center text-red-500">
                <Heart className="w-4 h-4" />
              </div>
              <span className="font-medium text-sm text-foreground">我的收藏</span>
            </div>
            <ChevronRight className="w-4 h-4 text-foreground/30" />
          </Link>

          <div className="h-px bg-surface-secondary mx-4" />

          <Link
            href="/profile/history"
            className="flex items-center justify-between p-4 active:bg-surface-secondary transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-blue-50 dark:bg-blue-500/20 flex items-center justify-center text-blue-500">
                <History className="w-4 h-4" />
              </div>
              <span className="font-medium text-sm text-foreground">观看历史</span>
            </div>
            <ChevronRight className="w-4 h-4 text-foreground/30" />
          </Link>
        </div>

        {/* System Group */}
        <div className="bg-background dark:bg-surface rounded-2xl shadow-sm border border-surface-secondary overflow-hidden">
          <Link
            href="/share"
            className="flex items-center justify-between p-4 active:bg-surface-secondary transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-500/20 flex items-center justify-center text-emerald-500">
                <Share2 className="w-4 h-4" />
              </div>
              <span className="font-medium text-sm text-foreground">邀请好友</span>
            </div>
            <ChevronRight className="w-4 h-4 text-foreground/30" />
          </Link>

          <div className="h-px bg-surface-secondary mx-4" />

          <button
            onClick={() => setShowRecharge(true)}
            className="w-full flex items-center justify-between p-4 active:bg-surface-secondary transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-orange-50 dark:bg-orange-500/20 flex items-center justify-center text-orange-500">
                <Crown className="w-4 h-4" />
              </div>
              <span className="font-medium text-sm text-foreground">充值中心</span>
            </div>
            <ChevronRight className="w-4 h-4 text-foreground/30" />
          </button>
        </div>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full p-4 bg-background dark:bg-surface rounded-2xl shadow-sm border border-surface-secondary text-red-500 text-sm font-medium active:bg-surface-secondary transition-colors flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          退出登录
        </button>

        {debugClicks > 3 && debugClicks < 7 && (
          <div className="absolute bottom-20 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-foreground/80 backdrop-blur-md rounded-full text-background text-xs font-medium animate-in fade-in zoom-in duration-200">
            再点击 {7 - debugClicks} 次进入后台
          </div>
        )}

        <p
          onClick={handleVersionClick}
          className="text-center text-xs text-foreground/30 py-4 select-none active:text-foreground/50 transition-colors cursor-default"
        >
          Version 1.0.0
        </p>
      </div>

      <BottomNav />

      {/* Recharge Modal */}
      <RechargeModal
        isOpen={showRecharge}
        onClose={() => setShowRecharge(false)}
        currentBalance={balance?.balance || 0}
      />

      {/* Membership Payment Modal */}
      <PaymentModal
        isOpen={showMembership}
        onClose={() => setShowMembership(false)}
      />
    </div>
  );
}
