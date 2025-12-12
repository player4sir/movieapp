'use client';

/**
 * UnlockPromptModal Component
 * Displays when content is locked, showing price, balance, and unlock options
 * 
 * Requirements: 3.1 - Display unlock prompt modal for locked content
 * Requirements: 3.2 - Show price and user's current coin balance
 * Requirements: 4.1 - Handle unlock action
 */

import { useState } from 'react';
import { useCoins } from '@/hooks';
import Link from 'next/link';

interface UnlockPromptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUnlock: () => Promise<void>;
  price: number;
  vodName: string;
  episodeName: string;
  unlocking?: boolean;
  error?: string | null;
}

export function UnlockPromptModal({
  isOpen,
  onClose,
  onUnlock,
  price,
  vodName,
  episodeName,
  unlocking = false,
  error = null,
}: UnlockPromptModalProps) {
  const { balance, balanceLoading } = useCoins();
  const [localError, setLocalError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentBalance = balance?.balance ?? 0;
  const hasEnoughBalance = currentBalance >= price;
  const displayError = error || localError;

  const handleUnlock = async () => {
    setLocalError(null);
    try {
      await onUnlock();
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : '解锁失败');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
      <div className="bg-surface rounded-lg p-6 mx-4 max-w-sm w-full">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">解锁内容</h3>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center text-foreground/60 hover:text-foreground"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content Info */}
        <div className="mb-4 p-3 bg-background rounded-lg">
          <p className="text-sm text-foreground/70 truncate">{vodName}</p>
          <p className="text-sm font-medium">{episodeName}</p>
        </div>

        {/* Price and Balance */}
        <div className="mb-4 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground/70">解锁价格</span>
            <span className="text-lg font-bold text-primary">{price} 金币</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-sm text-foreground/70">当前余额</span>
            {balanceLoading ? (
              <div className="w-16 h-5 bg-foreground/10 rounded animate-pulse" />
            ) : (
              <span className={`text-lg font-bold ${hasEnoughBalance ? 'text-green-400' : 'text-red-400'}`}>
                {currentBalance} 金币
              </span>
            )}
          </div>
        </div>

        {/* Error Message */}
        {displayError && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400">{displayError}</p>
          </div>
        )}

        {/* Insufficient Balance Warning */}
        {!hasEnoughBalance && !balanceLoading && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
            <p className="text-sm text-red-400 mb-2">余额不足，还需 {price - currentBalance} 金币</p>
            <div className="flex flex-wrap gap-2 text-xs">
              <Link href="/profile/coins" className="text-primary hover:underline">
                去充值
              </Link>
              <span className="text-foreground/40">|</span>
              <Link href="/profile/coins" className="text-primary hover:underline">
                每日签到
              </Link>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 bg-surface-secondary rounded-lg text-sm font-medium hover:bg-surface-secondary/80 transition-colors"
          >
            稍后再看
          </button>
          <button
            onClick={handleUnlock}
            disabled={!hasEnoughBalance || unlocking || balanceLoading}
            className={`flex-1 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              hasEnoughBalance && !unlocking && !balanceLoading
                ? 'bg-primary text-white hover:bg-primary/90'
                : 'bg-foreground/10 text-foreground/40 cursor-not-allowed'
            }`}
          >
            {unlocking ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                解锁中...
              </span>
            ) : (
              '立即解锁'
            )}
          </button>
        </div>

        {/* VIP Promotion */}
        <div className="mt-4 pt-4 border-t border-surface-secondary">
          <Link 
            href="/profile" 
            className="flex items-center justify-center gap-2 text-sm text-amber-400 hover:text-amber-300"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
            </svg>
            <span>开通会员，海量内容免费看</span>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default UnlockPromptModal;
