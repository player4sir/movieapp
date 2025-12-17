'use client';

/**
 * Profile Page - Redesigned
 * 
 * Clean, modern profile page optimized for PWA:
 * - Unified header card with membership, coins, and checkin
 * - Touch-friendly menu items with consistent styling
 * - Safe area considerations for notched devices
 * - Subtle logout placement
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  ChevronRight,
  History,
  Share2,
  Heart,
  LogOut,
  Coins,
  CreditCard,
  Crown,
  Sparkles,
  KeyRound
} from 'lucide-react';
import { useAuth, useCoins } from '@/hooks';
import { BottomNav } from '@/components/layout/BottomNav';
import { RechargeModal } from '@/components/coins';
import { PaymentModal } from '@/components/membership';
import { ChangePasswordModal } from '@/components/profile/ChangePasswordModal';
import { AdSlotGroup } from '@/components/ads';

// Membership level configuration
const MEMBER_CONFIG = {
  free: {
    label: '普通用户',
    gradient: 'from-gray-500/20 to-gray-600/20',
    textColor: 'text-foreground/60',
    icon: null,
  },
  vip: {
    label: 'VIP会员',
    gradient: 'from-amber-500/20 to-orange-500/20',
    textColor: 'text-amber-500',
    icon: Crown,
  },
  svip: {
    label: 'SVIP会员',
    gradient: 'from-purple-500/20 to-pink-500/20',
    textColor: 'text-purple-400',
    icon: Sparkles,
  },
};

interface MembershipData {
  memberLevel: 'free' | 'vip' | 'svip';
  memberExpiry: string | null;
  isActive: boolean;
  daysRemaining: number;
  isFromGroup: boolean; // 是否来自用户组
}

export default function ProfilePage() {
  const router = useRouter();
  const { user, isAuthenticated, loading, logout } = useAuth();
  const { balance, checkinStatus, performCheckin, checkinLoading } = useCoins();

  const [showRecharge, setShowRecharge] = useState(false);
  const [showMembership, setShowMembership] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);
  const [membership, setMembership] = useState<MembershipData | null>(null);
  const [checkinResult, setCheckinResult] = useState<{ coins: number; streak: number } | null>(null);
  const [debugClicks, setDebugClicks] = useState(0);

  // Fetch membership status using subscription API (includes group permissions)
  useEffect(() => {
    if (!isAuthenticated) return;

    fetch('/api/user/subscription')
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data) {
          // Calculate days remaining if there's an expiry date
          let daysRemaining = 0;
          if (data.expiresAt) {
            const expiry = new Date(data.expiresAt);
            const now = new Date();
            daysRemaining = Math.max(0, Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));
          }

          setMembership({
            memberLevel: data.memberLevel || 'free',
            memberExpiry: data.expiresAt,
            isActive: data.isVip || data.isSvip || data.tier === 'admin',
            daysRemaining,
            isFromGroup: data.permissionSource === 'group', // 来自用户组
          });
        }
      })
      .catch(() => { });
  }, [isAuthenticated]);

  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [isAuthenticated, loading, router]);

  const handleCheckin = async () => {
    const result = await performCheckin();
    if (result?.success) {
      setCheckinResult({ coins: result.coinsEarned, streak: result.streakCount });
      setTimeout(() => setCheckinResult(null), 3000);
    }
  };

  const handleLogout = async () => {
    await logout();
    router.replace('/auth/login');
  };

  const handleVersionClick = () => {
    const newCount = debugClicks + 1;
    if (newCount >= 7) {
      router.push('/console-x9k2m');
      setDebugClicks(0);
    } else {
      setDebugClicks(newCount);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAuthenticated || !user) return null;

  const memberLevel = membership?.memberLevel || 'free';
  const memberConfig = MEMBER_CONFIG[memberLevel];
  const canCheckin = checkinStatus?.canCheckin ?? false;
  const streakCount = checkinStatus?.streakCount ?? 0;

  // 生成会员状态文本
  const getMembershipStatusText = () => {
    if (memberLevel === 'free') {
      return '开通会员享更多权益';
    }
    if (membership?.isFromGroup) {
      return '永久会员'; // 用户组授权的永久有效
    }
    if (membership?.isActive && membership.daysRemaining > 0) {
      return `剩余 ${membership.daysRemaining} 天`;
    }
    return <span className="text-red-400">会员已过期</span>;
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header - with safe area padding for PWA */}
      <div
        className="px-4 pb-4 bg-gradient-to-b from-primary/5 to-transparent"
        style={{ paddingTop: 'max(1.5rem, env(safe-area-inset-top))' }}
      >
        {/* User Profile Card */}
        <div className={`mt-6 p-4 rounded-2xl bg-gradient-to-br ${memberConfig.gradient} border border-white/5`}>
          {/* User Info Row */}
          <div className="flex items-center gap-3 mb-4">
            {/* Avatar */}
            <div className="w-14 h-14 rounded-full bg-surface border-2 border-white/10 flex items-center justify-center overflow-hidden flex-shrink-0">
              {user.avatar ? (
                <img src={user.avatar} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xl font-bold text-foreground/50">
                  {(user.nickname || user.username)?.[0]?.toUpperCase() || 'U'}
                </span>
              )}
            </div>

            {/* Name & Level */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-bold truncate">{user.nickname || user.username}</h1>
                {memberLevel !== 'free' && memberConfig.icon && (
                  <div className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${memberConfig.textColor} bg-white/10`}>
                    <memberConfig.icon className="w-3 h-3" />
                    {memberConfig.label}
                  </div>
                )}
              </div>
              <p className="text-xs text-foreground/50 mt-0.5">
                {getMembershipStatusText()}
              </p>
            </div>

            {/* Upgrade Button - hide for group members */}
            {!membership?.isFromGroup && (
              <button
                onClick={() => setShowMembership(true)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition-all active:scale-95 ${memberLevel === 'free'
                  ? 'bg-primary text-white'
                  : 'bg-white/10 text-foreground/80'
                  }`}
              >
                {memberLevel === 'free' ? '开通会员' : '续费'}
              </button>
            )}
          </div>

          {/* Coins & Checkin Row */}
          <div className="flex gap-3">
            {/* Coins */}
            <Link
              href="/profile/coins"
              className="flex-1 bg-black/20 rounded-xl p-3 active:bg-black/30 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-amber-500/20 flex items-center justify-center">
                    <Coins className="w-4 h-4 text-amber-500" />
                  </div>
                  <div>
                    <div className="text-lg font-bold leading-tight">
                      {balance?.balance?.toLocaleString() || 0}
                    </div>
                    <div className="text-xs text-foreground/50">金币</div>
                  </div>
                </div>
                <ChevronRight className="w-4 h-4 text-foreground/30" />
              </div>
            </Link>

            {/* Checkin */}
            <button
              onClick={handleCheckin}
              disabled={!canCheckin || checkinLoading}
              className={`flex-1 rounded-xl p-3 transition-all active:scale-[0.98] ${canCheckin
                ? 'bg-primary/20 text-primary'
                : 'bg-black/20 text-foreground/50'
                }`}
            >
              <div className="flex items-center justify-between">
                <div>
                  {checkinResult ? (
                    <div className="text-lg font-bold text-green-400 animate-pulse">
                      +{checkinResult.coins}
                    </div>
                  ) : (
                    <div className={`text-lg font-bold leading-tight ${canCheckin ? '' : 'text-foreground/60'}`}>
                      {checkinLoading ? '...' : canCheckin ? '签到' : '已签到'}
                    </div>
                  )}
                  <div className="text-xs text-foreground/50">
                    {streakCount > 0 ? `连续${streakCount}天` : '每日签到'}
                  </div>
                </div>
                {canCheckin && (
                  <div className="w-8 h-8 rounded-full bg-primary/30 flex items-center justify-center">
                    <Sparkles className="w-4 h-4" />
                  </div>
                )}
              </div>
            </button>
          </div>
        </div>
      </div>

      {/* Menu Sections */}
      <div className="px-4 space-y-4">
        {/* My Content */}
        <div>
          <h2 className="text-xs font-medium text-foreground/40 uppercase tracking-wider mb-2 px-1">
            我的内容
          </h2>
          <div className="bg-surface rounded-2xl overflow-hidden divide-y divide-surface-secondary">
            <MenuItem
              href="/profile/favorites"
              icon={Heart}
              label="我的收藏"
            />
            <MenuItem
              href="/profile/history"
              icon={History}
              label="观看历史"
            />
          </div>
        </div>

        {/* Services */}
        <div>
          <h2 className="text-xs font-medium text-foreground/40 uppercase tracking-wider mb-2 px-1">
            服务中心
          </h2>
          <div className="bg-surface rounded-2xl overflow-hidden divide-y divide-surface-secondary">
            <MenuItem
              href="/share"
              icon={Share2}
              label="邀请好友"
              badge="赚金币"
            />
            <MenuItem
              onClick={() => setShowRecharge(true)}
              icon={CreditCard}
              label="充值中心"
            />
            <MenuItem
              href="/profile/membership"
              icon={Crown}
              label="会员订单"
            />
            <MenuItem
              onClick={() => setShowChangePassword(true)}
              icon={KeyRound}
              label="修改密码"
            />
          </div>
        </div>

        {/* Ad Slot */}
        <AdSlotGroup
          position="profile_bottom"
          className="rounded-2xl overflow-hidden"
        />

        {/* Footer */}
        <div className="pt-4 pb-8 space-y-4">
          {/* Logout */}
          <button
            onClick={handleLogout}
            className="w-full flex items-center justify-center gap-2 py-3 text-sm text-foreground/40 hover:text-red-400 transition-colors"
          >
            <LogOut className="w-4 h-4" />
            退出登录
          </button>

          {/* Version */}
          <p
            onClick={handleVersionClick}
            className="text-center text-xs text-foreground/20 select-none cursor-default"
          >
            Version 1.0.0
          </p>

          {/* Debug hint */}
          {debugClicks > 3 && debugClicks < 7 && (
            <div className="fixed bottom-24 left-1/2 -translate-x-1/2 px-3 py-1.5 bg-foreground/80 backdrop-blur-md rounded-full text-background text-xs font-medium animate-in fade-in zoom-in duration-200">
              再点击 {7 - debugClicks} 次进入后台
            </div>
          )}
        </div>
      </div>

      <BottomNav />

      {/* Modals */}
      <RechargeModal
        isOpen={showRecharge}
        onClose={() => setShowRecharge(false)}
        currentBalance={balance?.balance || 0}
      />

      <PaymentModal
        isOpen={showMembership}
        onClose={() => setShowMembership(false)}
      />

      <ChangePasswordModal
        isOpen={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </div >
  );
}

// Reusable Menu Item Component
interface MenuItemProps {
  href?: string;
  onClick?: () => void;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  badge?: string;
}

function MenuItem({ href, onClick, icon: Icon, label, badge }: MenuItemProps) {
  const content = (
    <div className="flex items-center justify-between p-4 active:bg-surface-secondary transition-colors">
      <div className="flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
          <Icon className="w-4.5 h-4.5" />
        </div>
        <span className="font-medium text-sm">{label}</span>
        {badge && (
          <span className="px-2 py-0.5 bg-red-500/10 text-red-400 text-xs rounded-full">
            {badge}
          </span>
        )}
      </div>
      <ChevronRight className="w-4 h-4 text-foreground/30" />
    </div>
  );

  if (href) {
    return <Link href={href}>{content}</Link>;
  }

  return <button onClick={onClick} className="w-full text-left">{content}</button>;
}
