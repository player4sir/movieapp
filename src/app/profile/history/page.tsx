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
import { Sidebar } from '@/components/layout/Sidebar';

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
    <>
      <Sidebar />

      <div className="h-screen flex flex-col bg-background overflow-hidden lg:pl-64">
        {/* Header - Responsive */}
        <header className="fixed top-0 left-0 lg:left-64 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-surface-secondary">
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
                className="text-sm font-medium text-red-500 hover:text-red-400 px-2"
              >
                清空
              </button>
            )}
            {history.length === 0 && <div className="w-10" />}
          </div>
        </header>

        {/* Content */}
        <main className="flex-1 overflow-auto pt-14 pb-4 bg-surface dark:bg-background">
          <div className="max-w-screen-md mx-auto min-h-full">
            {/* Error State */}
            {error && (
              <div className="flex flex-col items-center justify-center py-20 px-4">
                <p className="text-sm text-red-500 mb-6">{error}</p>
                <button
                  onClick={() => refresh()}
                  className="px-8 py-2.5 bg-primary text-white rounded-full text-sm font-medium"
                >
                  重试
                </button>
              </div>
            )}

            {/* Empty State */}
            {!error && history.length === 0 && (
              <div className="flex flex-col items-center justify-center py-32 px-4 text-center">
                <div className="w-20 h-20 bg-surface-secondary rounded-full flex items-center justify-center mb-6">
                  <svg className="w-10 h-10 text-foreground/20" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M13 3a9 9 0 0 0-9 9H1l3.89 3.89.07.14L9 12H6c0-3.87 3.13-7 7-7s7 3.13 7 7-3.13 7-7 7c-1.93 0-3.68-.79-4.94-2.06l-1.42 1.42A8.954 8.954 0 0 0 13 21a9 9 0 0 0 0-18zm-1 5v5l4.28 2.54.72-1.21-3.5-2.08V8H12z" />
                  </svg>
                </div>
                <p className="text-foreground/40 mb-6">暂无历史记录，去探索更多精彩</p>
                <Link
                  href="/"
                  className="px-8 py-2.5 bg-primary text-white rounded-full text-sm font-medium shadow-lg shadow-primary/20"
                >
                  发现精彩
                </Link>
              </div>
            )}

            {/* History List */}
            {!error && history.length > 0 && (
              <div className="p-4 grid grid-cols-1 gap-4">
                {history.map((item) => {
                  const progress = item.duration > 0 ? (item.position / item.duration) * 100 : 0;

                  return (
                    <Link
                      key={item.id}
                      href={`/play/${item.vodId}?ep=${item.episodeIndex}&source=${item.sourceIndex}&sourceCategory=${item.sourceCategory || 'normal'}`}
                      className="flex gap-4 p-4 bg-background lg:bg-surface border border-transparent lg:border-white/5 rounded-2xl transition-all hover:border-primary/20 hover:shadow-lg active:scale-[0.99] group"
                    >
                      {/* Poster with Progress */}
                      <div className="w-32 h-20 flex-shrink-0 rounded-xl overflow-hidden bg-surface-secondary relative shadow-sm">
                        {item.vodPic ? (
                          <img
                            src={item.vodPic}
                            alt={item.vodName}
                            className="w-full h-full object-cover transition-transform group-hover:scale-110"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-foreground/10" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
                            </svg>
                          </div>
                        )}
                        {/* Play Icon Overlay */}
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity">
                          <svg className="w-8 h-8 text-white" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M8 5v14l11-7z" />
                          </svg>
                        </div>
                        {/* Progress Bar */}
                        <div className="absolute bottom-0 left-0 right-0 h-1.5 bg-black/60">
                          <div
                            className="h-full bg-primary"
                            style={{ width: `${Math.min(progress, 100)}%` }}
                          />
                        </div>
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                        <div>
                          <h3 className="text-base font-bold text-foreground line-clamp-1 group-hover:text-primary transition-colors">{item.vodName}</h3>
                          <div className="mt-1 flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-primary/10 text-primary text-[10px] font-bold">
                              {item.episodeName || `第${item.episodeIndex + 1}集`}
                            </span>
                            <span className="text-xs text-foreground/40 font-medium">
                              {formatRelativeTime(item.watchedAt)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-foreground/40 flex items-center">
                            <svg className="w-3.5 h-3.5 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            观看至 {formatDuration(item.position)}
                            {item.duration > 0 && ` / ${formatDuration(item.duration)}`}
                          </p>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Clear Confirmation Modal - Responsive */}
      {showClearConfirm && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fadeIn">
          <div className="bg-background lg:bg-surface border border-white/5 rounded-3xl p-8 max-w-sm w-full shadow-2xl animate-scaleIn">
            <h3 className="text-xl font-bold mb-3">清空观看历史</h3>
            <p className="text-foreground/60 text-sm mb-8 leading-relaxed">确定要清空所有观看历史吗？此操作将无法撤消，建议保留历史记录方便断点续播哦。</p>
            <div className="flex gap-4">
              <button
                onClick={() => setShowClearConfirm(false)}
                disabled={clearing}
                className="flex-1 py-3 px-4 rounded-xl bg-surface-secondary/50 text-foreground font-bold text-sm transition-all hover:bg-surface-secondary active:scale-[0.98]"
              >
                取消
              </button>
              <button
                onClick={handleClearHistory}
                disabled={clearing}
                className="flex-1 py-3 px-4 rounded-xl bg-red-500 text-white font-bold text-sm shadow-lg shadow-red-500/20 transition-all hover:bg-red-600 active:scale-[0.98]"
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
    </>
  );
}
