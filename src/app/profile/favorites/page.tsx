'use client';

/**
 * Favorites Page
 * List user favorites, remove from favorites, navigate to detail
 * 
 * Requirements: 6.1, 6.2
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth, useFavorites } from '@/hooks';

export default function FavoritesPage() {
  const router = useRouter();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { favorites, loading, error, refresh, removeFavorite } = useFavorites();
  const [removingId, setRemovingId] = useState<number | null>(null);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [isAuthenticated, authLoading, router]);

  const handleRemove = async (vodId: number, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (removingId !== null) return;
    
    setRemovingId(vodId);
    try {
      await removeFavorite(vodId);
    } catch {
      // Error handling - could show toast
    } finally {
      setRemovingId(null);
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
          <h1 className="flex-1 text-center text-lg font-semibold">我的收藏</h1>
          <div className="w-10" /> {/* Spacer for centering */}
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
        {!error && favorites.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 px-4">
            <svg className="w-16 h-16 mb-4 text-foreground/20" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
            </svg>
            <p className="text-foreground/60 mb-4">暂无收藏内容</p>
            <Link
              href="/"
              className="px-4 py-2 bg-primary text-white rounded-lg text-sm"
            >
              去发现
            </Link>
          </div>
        )}

        {/* Favorites List */}
        {!error && favorites.length > 0 && (
          <div className="px-4 py-2">
            {favorites.map((favorite) => (
              <Link
                key={favorite.id}
                href={`/detail/${favorite.vodId}`}
                className="flex gap-3 p-3 bg-surface rounded-lg mb-3 active:bg-surface-secondary"
              >
                {/* Poster */}
                <div className="w-20 h-28 flex-shrink-0 rounded-md overflow-hidden bg-surface-secondary">
                  {favorite.vodPic ? (
                    <img
                      src={favorite.vodPic}
                      alt={favorite.vodName}
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
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 flex flex-col justify-between py-1">
                  <div>
                    <h3 className="font-medium line-clamp-2">{favorite.vodName}</h3>
                    {favorite.typeName && (
                      <p className="text-sm text-foreground/60 mt-1">{favorite.typeName}</p>
                    )}
                  </div>
                  <p className="text-xs text-foreground/40">
                    收藏于 {new Date(favorite.createdAt).toLocaleDateString('zh-CN')}
                  </p>
                </div>

                {/* Remove Button */}
                <button
                  onClick={(e) => handleRemove(favorite.vodId, e)}
                  disabled={removingId === favorite.vodId}
                  className="flex-shrink-0 self-center p-2 text-foreground/40 hover:text-red-500 active:text-red-600"
                  aria-label="移除收藏"
                >
                  {removingId === favorite.vodId ? (
                    <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  )}
                </button>
              </Link>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
