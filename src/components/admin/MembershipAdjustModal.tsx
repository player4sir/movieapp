'use client';

/**
 * MembershipAdjustModal Component
 * Manual membership adjustment form
 * Reason input
 * 
 * Requirements: 8.1, 8.2
 */

import { useState, useCallback, useEffect } from 'react';

type MemberLevel = 'free' | 'vip' | 'svip';

interface User {
  id: string;
  username: string;
  nickname?: string | null;
  memberLevel: MemberLevel;
  memberExpiry: string | null;
}

export interface MembershipAdjustModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  getAccessToken: () => string | null;
  onSuccess?: () => void;
  onShowToast?: (message: string, type: 'success' | 'error') => void;
}

const LEVEL_CONFIG: Record<MemberLevel, { label: string; color: string }> = {
  free: { label: '免费用户', color: 'text-foreground/70' },
  vip: { label: 'VIP', color: 'text-yellow-500' },
  svip: { label: 'SVIP', color: 'text-purple-400' },
};

function formatDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function toDateInputValue(date: Date): string {
  return date.toISOString().slice(0, 16);
}


export function MembershipAdjustModal({
  isOpen,
  onClose,
  user,
  getAccessToken,
  onSuccess,
  onShowToast,
}: MembershipAdjustModalProps) {
  const [memberLevel, setMemberLevel] = useState<MemberLevel>('free');
  const [memberExpiry, setMemberExpiry] = useState<string>('');
  const [reason, setReason] = useState('');
  const [processing, setProcessing] = useState(false);

  // Reset form when user changes
  useEffect(() => {
    if (user) {
      setMemberLevel(user.memberLevel);
      if (user.memberExpiry) {
        setMemberExpiry(toDateInputValue(new Date(user.memberExpiry)));
      } else {
        // Default to 30 days from now for new membership
        const defaultExpiry = new Date();
        defaultExpiry.setDate(defaultExpiry.getDate() + 30);
        setMemberExpiry(toDateInputValue(defaultExpiry));
      }
      setReason('');
    }
  }, [user]);

  const showToast = useCallback((message: string, type: 'success' | 'error') => {
    if (onShowToast) {
      onShowToast(message, type);
    }
  }, [onShowToast]);

  const handleSubmit = useCallback(async () => {
    if (!user) return;
    
    if (!reason.trim()) {
      showToast('请输入调整原因', 'error');
      return;
    }

    if (memberLevel !== 'free' && !memberExpiry) {
      showToast('请设置会员到期时间', 'error');
      return;
    }

    const token = getAccessToken();
    if (!token) return;

    setProcessing(true);
    try {
      const response = await fetch('/api/admin/membership/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          userId: user.id,
          memberLevel,
          memberExpiry: memberLevel === 'free' ? null : new Date(memberExpiry).toISOString(),
          reason: reason.trim(),
        }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || '调整失败');
      }

      showToast('会员状态已调整', 'success');
      onSuccess?.();
      onClose();
    } catch (err) {
      showToast(err instanceof Error ? err.message : '调整失败', 'error');
    } finally {
      setProcessing(false);
    }
  }, [user, memberLevel, memberExpiry, reason, getAccessToken, showToast, onSuccess, onClose]);

  const handleClose = () => {
    setReason('');
    onClose();
  };

  // Quick duration buttons
  const handleQuickDuration = (days: number) => {
    const baseDate = user?.memberExpiry && new Date(user.memberExpiry) > new Date()
      ? new Date(user.memberExpiry)
      : new Date();
    baseDate.setDate(baseDate.getDate() + days);
    setMemberExpiry(toDateInputValue(baseDate));
  };

  if (!isOpen || !user) return null;

  const currentLevelConfig = LEVEL_CONFIG[user.memberLevel];

  return (
    <div 
      className="fixed inset-0 bg-black/50 flex items-end lg:items-center justify-center z-50" 
      onClick={handleClose}
    >
      <div 
        className="bg-background rounded-t-xl lg:rounded-lg w-full lg:max-w-md max-h-[85vh] overflow-hidden flex flex-col" 
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-surface-secondary">
          <h2 className="text-lg font-semibold">调整会员状态</h2>
          <button onClick={handleClose} className="p-1 text-foreground/50 hover:text-foreground">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* User Info */}
          <div className="bg-surface rounded-lg p-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-surface-secondary flex items-center justify-center text-lg font-semibold text-foreground/50">
                {user.username.charAt(0).toUpperCase()}
              </div>
              <div>
                <p className="font-medium">{user.username}</p>
                <div className="flex items-center gap-2 text-sm">
                  <span className={currentLevelConfig.color}>{currentLevelConfig.label}</span>
                  {user.memberExpiry && (
                    <span className="text-foreground/50">
                      到期: {formatDate(user.memberExpiry)}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Member Level */}
          <div>
            <label className="block text-sm text-foreground/70 mb-2">会员等级</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(LEVEL_CONFIG) as MemberLevel[]).map(level => {
                const config = LEVEL_CONFIG[level];
                return (
                  <button
                    key={level}
                    onClick={() => setMemberLevel(level)}
                    className={`py-2 text-sm rounded-lg border transition-colors ${
                      memberLevel === level
                        ? 'border-primary bg-primary/10 text-primary'
                        : 'border-surface-secondary hover:border-foreground/30'
                    }`}
                  >
                    {config.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Expiry Date */}
          {memberLevel !== 'free' && (
            <div>
              <label className="block text-sm text-foreground/70 mb-2">到期时间</label>
              <input
                type="datetime-local"
                value={memberExpiry}
                onChange={(e) => setMemberExpiry(e.target.value)}
                className="w-full px-3 py-2 bg-surface border border-surface-secondary rounded-lg"
              />
              <div className="flex gap-2 mt-2">
                <button
                  onClick={() => handleQuickDuration(30)}
                  className="px-3 py-1 text-xs bg-surface-secondary rounded hover:bg-surface-secondary/80"
                >
                  +30天
                </button>
                <button
                  onClick={() => handleQuickDuration(90)}
                  className="px-3 py-1 text-xs bg-surface-secondary rounded hover:bg-surface-secondary/80"
                >
                  +90天
                </button>
                <button
                  onClick={() => handleQuickDuration(180)}
                  className="px-3 py-1 text-xs bg-surface-secondary rounded hover:bg-surface-secondary/80"
                >
                  +180天
                </button>
                <button
                  onClick={() => handleQuickDuration(365)}
                  className="px-3 py-1 text-xs bg-surface-secondary rounded hover:bg-surface-secondary/80"
                >
                  +1年
                </button>
              </div>
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-sm text-foreground/70 mb-2">调整原因 *</label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="请输入调整原因..."
              className="w-full px-3 py-2 bg-surface border border-surface-secondary rounded-lg resize-none"
              rows={3}
            />
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 border-t border-surface-secondary">
          <button
            onClick={handleSubmit}
            disabled={processing || !reason.trim()}
            className="w-full py-3 text-sm font-medium bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            {processing ? '处理中...' : '确认调整'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default MembershipAdjustModal;
