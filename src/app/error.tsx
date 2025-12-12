'use client';

/**
 * Error Boundary Component
 * 
 * Catches and displays errors gracefully with retry functionality.
 * This component handles errors at the route segment level.
 * 
 * Requirements: 1.4 - Display user-friendly error message and provide retry option
 */

import { useEffect } from 'react';
import Link from 'next/link';

interface ErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function Error({ error, reset }: ErrorProps) {
  useEffect(() => {
    // Log error to console in development, could be sent to error reporting service
    console.error('Route error:', error);
  }, [error]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
      <div className="w-full max-w-md text-center">
        {/* Error Icon */}
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-primary/10">
          <svg
            className="h-8 w-8 text-primary"
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
        </div>

        {/* Error Message */}
        <h2 className="mb-2 text-xl font-bold text-foreground">出错了</h2>
        <p className="mb-6 text-sm text-foreground/60">
          加载内容时发生错误，请稍后重试
        </p>

        {/* Error Details (development only) */}
        {process.env.NODE_ENV === 'development' && error.message && (
          <div className="mb-6 rounded-lg bg-surface p-4 text-left">
            <p className="text-xs font-mono text-foreground/70 break-all">
              {error.message}
            </p>
          </div>
        )}

        {/* Retry Button */}
        <button
          onClick={reset}
          className="btn-primary w-full"
        >
          重试
        </button>

        {/* Back to Home Link */}
        <Link
          href="/"
          className="mt-4 inline-block text-sm text-primary hover:underline"
        >
          返回首页
        </Link>
      </div>
    </div>
  );
}
