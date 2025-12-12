'use client';

/**
 * ErrorDisplay Component
 * 
 * A reusable error display component with retry functionality.
 * Can be used for inline error states in components.
 * 
 * Requirements: 1.4 - Display user-friendly error message and provide retry option
 */

import { ReactNode } from 'react';

interface ErrorDisplayProps {
  /** Error message to display */
  message?: string;
  /** Detailed error information (shown in development) */
  details?: string;
  /** Callback function for retry action */
  onRetry?: () => void;
  /** Custom retry button text */
  retryText?: string;
  /** Whether to show a compact version */
  compact?: boolean;
  /** Custom icon */
  icon?: ReactNode;
  /** Additional CSS classes */
  className?: string;
}

export function ErrorDisplay({
  message = '加载失败',
  details,
  onRetry,
  retryText = '重试',
  compact = false,
  icon,
  className = '',
}: ErrorDisplayProps) {
  if (compact) {
    return (
      <div className={`flex items-center justify-center gap-3 p-4 ${className}`}>
        <span className="text-sm text-foreground/60">{message}</span>
        {onRetry && (
          <button
            onClick={onRetry}
            className="text-sm font-medium text-primary hover:underline"
          >
            {retryText}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center p-6 text-center ${className}`}>
      {/* Error Icon */}
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-primary/10">
        {icon || (
          <svg
            className="h-6 w-6 text-primary"
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
        )}
      </div>

      {/* Error Message */}
      <p className="mb-2 text-sm font-medium text-foreground">{message}</p>

      {/* Error Details (development only) */}
      {process.env.NODE_ENV === 'development' && details && (
        <p className="mb-4 text-xs text-foreground/50 font-mono max-w-xs break-all">
          {details}
        </p>
      )}

      {/* Retry Button */}
      {onRetry && (
        <button
          onClick={onRetry}
          className="btn-primary mt-2 px-6"
        >
          {retryText}
        </button>
      )}
    </div>
  );
}

export default ErrorDisplay;
