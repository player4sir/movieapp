'use client';

/**
 * MembershipCard Component
 * Displays current membership level and expiry on profile page
 * Shows upgrade/renew button
 * 
 * Requirements: 1.2 - Display user's current member level and expiry date
 * Requirements: 1.3 - Display user as free member if membership has expired
 */

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/hooks';

interface MembershipStatus {
  memberLevel: 'free' | 'vip' | 'svip';
  memberExpiry: string | null;
  isActive: boolean;
  daysRemaining: number;
}

interface UserInfo {
  avatar?: string | null;
  nickname?: string | null;
  username: string;
}

interface MembershipCardProps {
  user?: UserInfo;
  onUpgrade?: () => void;
  className?: string;
}

const LEVEL_CONFIG = {
  free: {
    label: '普通用户',
    color: 'text-foreground/50',
    bgColor: 'bg-surface',
    borderColor: 'border-surface-secondary',
  },
  vip: {
    label: 'VIP',
    color: 'text-yellow-500',
    bgColor: 'bg-gradient-to-r from-yellow-500/10 to-orange-500/10',
    borderColor: 'border-yellow-500/30',
  },
  svip: {
    label: 'SVIP',
    color: 'text-purple-400',
    bgColor: 'bg-gradient-to-r from-purple-500/10 to-pink-500/10',
    borderColor: 'border-purple-500/30',
  },
};

export function MembershipCard({ user, onUpgrade, className = '' }: MembershipCardProps) {
  const { getAccessToken, isAuthenticated } = useAuth();
  const [status, setStatus] = useState<MembershipStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);



  const fetchMembershipStatus = useCallback(async () => {
    const token = getAccessToken();
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/membership/status', {
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStatus(data);
      } else {
        setError('获取会员状态失败');
      }
    } catch (err) {
      console.error('Failed to fetch membership status:', err);
      setError('网络错误');
    } finally {
      setLoading(false);
    }
  }, [getAccessToken]);

  useEffect(() => {
    if (isAuthenticated) {
      fetchMembershipStatus();
    }
  }, [isAuthenticated, fetchMembershipStatus]);

  if (loading) {
    return (
      <div className={`rounded-xl p-4 bg-surface animate-pulse ${className}`}>
        <div className="h-6 bg-surface-secondary rounded w-24 mb-2" />
        <div className="h-4 bg-surface-secondary rounded w-32" />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`rounded-xl p-4 bg-surface ${className}`}>
        <p className="text-red-400 text-sm">{error}</p>
        <button
          onClick={fetchMembershipStatus}
          className="text-xs text-primary mt-2 underline"
        >
          重试
        </button>
      </div>
    );
  }

  const level = status?.memberLevel || 'free';
  const config = LEVEL_CONFIG[level];
  const expiryDate = status?.memberExpiry ? new Date(status.memberExpiry) : null;

  return (
    <div className={`rounded-xl border ${config.bgColor} ${config.borderColor} ${className}`}>
      {/* 用户信息 + 会员状态 */}
      <div className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center overflow-hidden flex-shrink-0">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.nickname || user.username} className="w-full h-full object-cover" />
            ) : (
              <svg className="w-6 h-6 text-foreground/40" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z" />
              </svg>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-base font-semibold truncate">{user?.nickname || user?.username || '用户'}</h1>
              {level !== 'free' && (
                <span className={`px-1.5 py-0.5 text-xs font-medium rounded ${config.color} ${level === 'vip' ? 'bg-yellow-500/20' : 'bg-purple-500/20'}`}>
                  {config.label}
                </span>
              )}
            </div>
            <div className="text-xs text-foreground/40 mt-0.5">
              {level === 'free' ? (
                '开通会员享受更多权益'
              ) : status?.isActive && expiryDate ? (
                `到期: ${expiryDate.toLocaleDateString('zh-CN')} (剩余${status.daysRemaining}天)`
              ) : (
                <span className="text-red-400">会员已过期</span>
              )}
            </div>
          </div>
          <button
            onClick={onUpgrade}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all active:scale-95 flex-shrink-0 ${level === 'free'
              ? 'bg-primary text-white'
              : level === 'vip'
                ? 'bg-yellow-500/20 text-yellow-500'
                : 'bg-purple-500/20 text-purple-400'
              }`}
          >
            {level === 'free' ? '开通会员' : '续费'}
          </button>
        </div>
      </div>
      {/* 会员订单入口 */}
      <a
        href="/profile/membership"
        className="flex items-center justify-between px-4 py-2.5 border-t border-foreground/5 text-xs text-foreground/50 active:bg-foreground/5"
      >
        <span>会员订单</span>
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </a>
    </div>
  );
}

export default MembershipCard;
