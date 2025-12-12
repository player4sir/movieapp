'use client';

/**
 * CoinBalance Component
 * Displays user's current coin balance with icon
 * 
 * Requirements: 1.1 - Display current User_Coin_Balance
 * Requirements: 1.3 - Display error message and retry on failure
 */

import { useCoins } from '@/hooks';

interface CoinBalanceProps {
  showDetails?: boolean;
  className?: string;
}

export function CoinBalance({ showDetails = false, className = '' }: CoinBalanceProps) {
  const { balance, balanceLoading, balanceError, refreshBalance } = useCoins();

  // Loading state
  if (balanceLoading) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <CoinIcon className="w-5 h-5 text-yellow-500" />
        <div className="animate-pulse bg-gray-700 rounded h-5 w-16" />
      </div>
    );
  }

  // Error state with retry
  if (balanceError) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <CoinIcon className="w-5 h-5 text-gray-500" />
        <span className="text-red-400 text-sm">加载失败</span>
        <button
          onClick={refreshBalance}
          className="text-xs text-blue-400 hover:text-blue-300 underline"
        >
          重试
        </button>
      </div>
    );
  }

  // No balance (not authenticated or no data)
  if (!balance) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <CoinIcon className="w-5 h-5 text-gray-500" />
        <span className="text-gray-400">--</span>
      </div>
    );
  }

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <CoinIcon className="w-5 h-5 text-yellow-500" />
      <span className="font-medium text-yellow-400">{balance.balance.toLocaleString()}</span>
      
      {showDetails && (
        <div className="ml-2 text-xs text-gray-400">
          <span>累计获得: {balance.totalEarned.toLocaleString()}</span>
          <span className="mx-1">|</span>
          <span>累计消费: {balance.totalSpent.toLocaleString()}</span>
        </div>
      )}
    </div>
  );
}

// Coin icon component
function CoinIcon({ className = '' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
      xmlns="http://www.w3.org/2000/svg"
    >
      <circle cx="12" cy="12" r="10" fill="currentColor" opacity="0.2" />
      <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2" fill="none" />
      <text
        x="12"
        y="16"
        textAnchor="middle"
        fontSize="10"
        fontWeight="bold"
        fill="currentColor"
      >
        ¥
      </text>
    </svg>
  );
}

export default CoinBalance;
