'use client';

/**
 * StaleDataIndicator Component
 * 
 * Displays a visual indicator when cached/stale data is being shown
 * due to API unavailability.
 * 
 * Requirements: 3.4, 8.3 - Display stale data indicator
 */

import { useState } from 'react';

interface StaleDataIndicatorProps {
  /** Timestamp when the data was cached */
  cachedAt?: number;
  /** Whether to show a dismissible banner */
  dismissible?: boolean;
  /** Custom message */
  message?: string;
  /** Callback when refresh is requested */
  onRefresh?: () => void;
  /** Variant style */
  variant?: 'banner' | 'badge' | 'inline';
  /** Additional CSS classes */
  className?: string;
}

/**
 * Formats the cached time as a relative string
 */
function formatCachedTime(cachedAt: number): string {
  const now = Date.now();
  const diff = now - cachedAt;
  
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  
  if (minutes < 1) {
    return '刚刚';
  } else if (minutes < 60) {
    return `${minutes}分钟前`;
  } else if (hours < 24) {
    return `${hours}小时前`;
  } else {
    const days = Math.floor(hours / 24);
    return `${days}天前`;
  }
}

export function StaleDataIndicator({
  cachedAt,
  dismissible = true,
  message = '当前显示的是缓存数据',
  onRefresh,
  variant = 'banner',
  className = '',
}: StaleDataIndicatorProps) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return null;
  }

  const timeString = cachedAt ? formatCachedTime(cachedAt) : null;

  // Badge variant - small inline indicator
  if (variant === 'badge') {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full bg-yellow-500/20 px-2 py-0.5 text-xs text-yellow-600 dark:text-yellow-400 ${className}`}>
        <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        缓存数据
      </span>
    );
  }

  // Inline variant - minimal text indicator
  if (variant === 'inline') {
    return (
      <span className={`text-xs text-yellow-600 dark:text-yellow-400 ${className}`}>
        {message}
        {timeString && ` (${timeString})`}
      </span>
    );
  }

  // Banner variant - full width notification
  return (
    <div className={`flex items-center justify-between gap-3 bg-yellow-500/10 px-4 py-2 text-sm ${className}`}>
      <div className="flex items-center gap-2">
        {/* Warning Icon */}
        <svg
          className="h-4 w-4 flex-shrink-0 text-yellow-600 dark:text-yellow-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
          />
        </svg>
        
        <span className="text-yellow-700 dark:text-yellow-300">
          {message}
          {timeString && (
            <span className="ml-1 text-yellow-600/70 dark:text-yellow-400/70">
              ({timeString})
            </span>
          )}
        </span>
      </div>

      <div className="flex items-center gap-2">
        {/* Refresh Button */}
        {onRefresh && (
          <button
            onClick={onRefresh}
            className="flex items-center gap-1 rounded px-2 py-1 text-xs font-medium text-yellow-700 hover:bg-yellow-500/20 dark:text-yellow-300"
          >
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            刷新
          </button>
        )}

        {/* Dismiss Button */}
        {dismissible && (
          <button
            onClick={() => setDismissed(true)}
            className="rounded p-1 text-yellow-600 hover:bg-yellow-500/20 dark:text-yellow-400"
            aria-label="关闭提示"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>
    </div>
  );
}

export default StaleDataIndicator;
