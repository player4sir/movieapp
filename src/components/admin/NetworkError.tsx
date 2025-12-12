'use client';

/**
 * Network Error Component - Simplified
 * 
 * Minimal error states for admin panel.
 * Requirements: 5.5
 */

import React from 'react';

export interface NetworkErrorProps {
  message?: string;
  onRetry?: () => void;
  retryText?: string;
  compact?: boolean;
  retrying?: boolean;
  type?: 'network' | 'server' | 'auth' | 'notfound' | 'generic';
  className?: string;
}

/**
 * Simplified Network Error Component
 * Requirements: 5.5
 */
export function NetworkError({
  message = '加载失败',
  onRetry,
  retryText = '重试',
  compact = false,
  retrying = false,
  className = '',
}: NetworkErrorProps) {
  // Compact inline version
  if (compact) {
    return (
      <div className={`flex items-center justify-between p-3 rounded-lg bg-red-500/10 ${className}`}>
        <span className="text-sm text-foreground/70">{message}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            disabled={retrying}
            className="text-sm text-red-500 hover:underline disabled:opacity-50"
          >
            {retrying ? '重试中...' : retryText}
          </button>
        )}
      </div>
    );
  }

  // Simple centered error display
  return (
    <div className={`text-center py-12 ${className}`}>
      <p className="text-foreground/50 mb-3">{message}</p>
      {onRetry && (
        <button
          onClick={onRetry}
          disabled={retrying}
          className="text-sm text-primary hover:underline disabled:opacity-50"
        >
          {retrying ? '重试中...' : retryText}
        </button>
      )}
    </div>
  );
}

/**
 * Empty State Component - Simplified
 */
export interface EmptyStateProps {
  title?: string;
  actionText?: string;
  onAction?: () => void;
  className?: string;
}

export function EmptyState({
  title = '暂无数据',
  actionText,
  onAction,
  className = '',
}: EmptyStateProps) {
  return (
    <div className={`text-center py-12 ${className}`}>
      <p className="text-foreground/50">{title}</p>
      {actionText && onAction && (
        <button 
          onClick={onAction} 
          className="text-sm text-primary hover:underline mt-2"
        >
          {actionText}
        </button>
      )}
    </div>
  );
}

export default NetworkError;
