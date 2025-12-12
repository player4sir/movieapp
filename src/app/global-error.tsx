'use client';

/**
 * Global Error Boundary Component
 * 
 * Catches errors in the root layout and provides a fallback UI.
 * This is the last line of defense for unhandled errors.
 * 
 * Requirements: 1.4 - Display user-friendly error message and provide retry option
 */

import { useEffect } from 'react';

interface GlobalErrorProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function GlobalError({ error, reset }: GlobalErrorProps) {
  useEffect(() => {
    // Log error to console, could be sent to error reporting service
    console.error('Global error:', error);
  }, [error]);

  return (
    <html lang="zh-CN">
      <body className="antialiased bg-[#0a0a0a] text-[#ededed]">
        <div className="flex min-h-screen flex-col items-center justify-center px-4 py-8">
          <div className="w-full max-w-md text-center">
            {/* Error Icon */}
            <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#e50914]/10">
              <svg
                className="h-10 w-10 text-[#e50914]"
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
            <h1 className="mb-2 text-2xl font-bold">应用出错了</h1>
            <p className="mb-8 text-sm text-[#ededed]/60">
              应用程序遇到了一个严重错误，请尝试刷新页面
            </p>

            {/* Retry Button */}
            <button
              onClick={reset}
              className="inline-flex items-center justify-center rounded-lg bg-[#e50914] px-6 py-3 text-sm font-medium text-white transition-colors hover:bg-[#dc2626] active:bg-[#b91c1c]"
              style={{ minHeight: '44px', minWidth: '44px' }}
            >
              重新加载
            </button>

            {/* Refresh Page Link */}
            <div className="mt-4">
              <button
                onClick={() => window.location.reload()}
                className="text-sm text-[#e50914] hover:underline"
              >
                刷新页面
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
