'use client';

/**
 * Watch History Page
 * List watch history sorted by time, resume playback, clear history
 * 
 * Requirements: 6.3, 6.4
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useWatchHistory } from '@/hooks';

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  
  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${secs.toString().padStart(2, '0')}`;
}

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return '刚刚';
  if (diffMins < 60) return `${diffMins}分钟前`;
  if (diffHours < 24) return `${diffHours}小时前`;
  if (diffDays < 7) return `${diffDays}天前`;
  return date.toLocaleDateString('zh-CN');
}

export default function HistoryPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { history, loading, error, refresh, clearHistory } = useWatchHistory();
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearing, setClearing] = useState(false);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleClearHistory = async () => {
    setClearing(true);
    try {
      await clearHistory();
      setShowClearConfirm(false);
    } catch {
      // Error handling - could show toast
    } finally {
      setClearing(false);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <svg className="w-8 h-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null; // Will redirect
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-surface-secondary">
        <div className="flex items-center h-14 px-4 pt-safe-top">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-10 h-10 -ml-2 rounded-full hover:bg-surface active:bg-surface-secondary"
            aria-label="返回"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h1 className="flex-1 text-center text-lg font-semibold">观看历史</h1>
          {history.length > 0 && (
            <button
              onClick={() => setShowClearConfirm(true)}
              className="text-sm text-foreground/60 hover:text-foreground"
            >
              清空
            </button>
          )}
          {history.length === 0 && <div className="w-10" />}
        </div>
      </header>

      {/* Content */}
      <main className="pt-14 pb-4">
        {/* Error State */}
        {error && (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <p className="text-sm text-red-500 mb-4">{error}</p>
            <button
              onClick={() => refresh()}
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm"
            >
              重试
            </button>
          </div>
        )}

        {/* Empty State */}
        {!error && history.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <svg className="w-16 h-16 mb-4 text-foreground/20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
            </svg>
            <p className="text-foreground/60 mb-4">暂无观看记录</p>
            <Link
              href="/"
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm"
            >
              去发现
            </Link>
          </div>
        )}

        {/* History List */}
        {!error && history.length > 0 && (
          <div className="px-4 py-2">
            {history.map((item) => {
              const progress = item.duration > 0 ? (item.position / item.duration) * 100 : 0;
              
              return (
                <Link
                  key={item.id}
                  href={`/play/${item.vodId}?ep=${item.episodeIndex}&source=${item.sourceIndex}`}
                  className="flex gap-3 p-3 bg-surface rounded-lg mb-3 active:bg-surface-secondary"
                >
                  {/* Poster with Progress */}
                  <div className="w-24 h-16 flex-shrink-0 rounded-md overflow-hidden bg-surface-secondary relative">
                    {item.vodPic ? (
                      <img
                        src={item.vodPic}
                        alt={item.vodName}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <svg className="w-8 h-8 text-foreground/20" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
                        </svg>
                      </div>
                    )}
                    {/* Play Icon Overlay */}
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5v14l11-7z" />
                      </svg>
                    </div>
                    {/* Progress Bar */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-black/50">
                      <div
                        className="h-full bg-primary"
                        style={{ width: `${Math.min(progress, 100)}%` }}
                      />
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    <div>
                      <h3 className="font-medium line-clamp-1">{item.vodName}</h3>
                      <p className="text-sm text-foreground/60 mt-0.5">
                        {item.episodeName || `第${item.episodeIndex + 1}集`}
                      </p>
                    </div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-foreground/40">
                        观看至 {formatDuration(item.position)}
                        {item.duration > 0 && ` / ${formatDuration(item.duration)}`}
                      </p>
                      <p className="text-xs text-foreground/40">
                        {formatRelativeTime(item.watchedAt)}
                      </p>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </main>

      {/* Clear Confirmation Modal */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-background rounded-lg p-6 mx-4 max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-2">清空观看历史</h3>
            <p className="text-foreground/60 mb-6">确定要清空所有观看历史吗？此操作无法撤销。</p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowClearConfirm(false)}
                disabled={clearing}
                className="flex-1 py-3 rounded-lg bg-surface text-foreground font-medium"
              >
                取消
              </button>
              <button
                onClick={handleClearHistory}
                disabled={clearing}
                className="flex-1 py-3 rounded-lg bg-red-500 text-white font-medium"
              >
                {clearing ? (
                  <svg className="w-5 h-5 animate-spin mx-auto" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                ) : (
                  '确定清空'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
