'use client';

/**
 * CheckinButton Component
 * Simplified and cleaner check-in UI
 * 
 * Requirements: 2.1 - Perform daily check-in
 * Requirements: 2.2 - Reject if already checked in, show next time
 * Requirements: 2.4 - Display streak count and bonus info
 */

import { useState } from 'react';
import { useCoins } from '@/hooks';

interface CheckinButtonProps {
  className?: string;
  compact?: boolean;
  onCheckinSuccess?: (coinsEarned: number, streakCount: number) => void;
}

export function CheckinButton({ 
  className = '', 
  compact = false,
  onCheckinSuccess 
}: CheckinButtonProps) {
  const { 
    checkinStatus, 
    checkinLoading, 
    checkinError, 
    performCheckin,
    refreshCheckinStatus 
  } = useCoins();
  
  const [showResult, setShowResult] = useState(false);
  const [lastResult, setLastResult] = useState<{ coins: number; streak: number } | null>(null);

  const handleCheckin = async () => {
    const result = await performCheckin();
    if (result?.success) {
      setLastResult({ coins: result.coinsEarned, streak: result.streakCount });
      setShowResult(true);
      onCheckinSuccess?.(result.coinsEarned, result.streakCount);
      setTimeout(() => setShowResult(false), 2500);
    }
  };

  // Loading state
  if (!checkinStatus && !checkinError) {
    return (
      <button disabled className={`bg-gray-700/50 text-gray-500 px-4 py-2 rounded-full text-sm ${className}`}>
        加载中...
      </button>
    );
  }

  // Error state
  if (checkinError && !checkinStatus) {
    return (
      <button onClick={refreshCheckinStatus} className={`text-red-400 text-sm ${className}`}>
        加载失败，点击重试
      </button>
    );
  }

  const canCheckin = checkinStatus?.canCheckin ?? false;
  const streakCount = checkinStatus?.streakCount ?? 0;

  // Success animation
  if (showResult && lastResult) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <span className="text-green-400 text-sm font-medium animate-pulse">
          +{lastResult.coins} 金币
        </span>
        <span className="text-gray-500 text-xs">
          连续{lastResult.streak}天
        </span>
      </div>
    );
  }

  // Compact mode - just button
  if (compact) {
    return (
      <button
        onClick={handleCheckin}
        disabled={!canCheckin || checkinLoading}
        className={`
          px-4 py-1.5 rounded-full text-sm font-medium transition-all
          ${canCheckin 
            ? 'bg-yellow-500 hover:bg-yellow-400 text-black' 
            : 'bg-gray-700/50 text-gray-500'
          }
          ${checkinLoading ? 'opacity-60' : ''}
          ${className}
        `}
      >
        {checkinLoading ? '...' : canCheckin ? '签到' : '已签到'}
      </button>
    );
  }

  // Full mode with streak
  return (
    <div className={`flex items-center gap-3 ${className}`}>
      <button
        onClick={handleCheckin}
        disabled={!canCheckin || checkinLoading}
        className={`
          px-5 py-2 rounded-full text-sm font-medium transition-all
          ${canCheckin 
            ? 'bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white shadow-md' 
            : 'bg-gray-700/60 text-gray-400'
          }
          ${checkinLoading ? 'opacity-60' : ''}
        `}
      >
        {checkinLoading ? (
          <span className="flex items-center gap-1.5">
            <LoadingSpinner />
            签到中
          </span>
        ) : canCheckin ? (
          '立即签到'
        ) : (
          '已签到'
        )}
      </button>
      
      {streakCount > 0 && (
        <span className="text-yellow-500/80 text-sm">
          🔥 {streakCount}天
        </span>
      )}
    </div>
  );
}

function LoadingSpinner() {
  return (
    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  );
}

export default CheckinButton;
