'use client';

import { useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Search,
  ArrowLeft,
  X,
  AlertCircle,
  Loader2,
  SearchX,
  History
} from 'lucide-react';
import { VODGrid } from '@/components/vod';
import { Sidebar } from '@/components/layout';
import { AdSlot } from '@/components/ads';
import { useSearch, useInfiniteScroll } from '@/hooks';

function SearchPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Default to 'normal' category if not explicitly specified to ensure correct source matching
  const sourceCategoryParam = searchParams.get('source') as 'normal' | 'adult' | null;
  const sourceCategory: 'normal' | 'adult' = sourceCategoryParam || 'normal';
  const inputRef = useRef<HTMLInputElement>(null);
  const { data, loading, error, suggestions, search, loadMore, hasMore, keyword } = useSearch({
    debounceMs: 300,
    sourceCategory,
  });
  const { loadMoreRef } = useInfiniteScroll({ onLoadMore: loadMore, hasMore, loading });

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    search(e.target.value);
  };

  const handleClear = () => {
    search('');
    inputRef.current?.focus();
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Trigger immediate search by clearing debounce
    if (keyword.trim()) {
      search(keyword);
    }
  };

  const showEmptyState = !loading && !keyword.trim();
  const showNoResults = !loading && keyword.trim() && data.length === 0 && !error;
  const showResults = data.length > 0;

  return (
    <>
      {/* Desktop Sidebar */}
      <Sidebar />

      <div className="min-h-screen bg-surface dark:bg-background lg:pl-64">
        {/* Search Header */}
        <header className="fixed top-0 left-0 right-0 lg:left-64 z-50 bg-background/95 backdrop-blur-md border-b border-surface-secondary">
          <div className="flex items-center gap-3 h-14 px-4 pt-safe-top">
            {/* Back Button */}
            <button
              onClick={() => router.back()}
              className="flex items-center justify-center w-10 h-10 -ml-2 rounded-full text-foreground hover:bg-surface active:bg-surface-secondary transition-colors"
              aria-label="返回"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            {/* Search Input */}
            <form onSubmit={handleSubmit} className="flex-1">
              <div className="relative group">
                <input
                  ref={inputRef}
                  type="text"
                  value={keyword}
                  onChange={handleInputChange}
                  placeholder={sourceCategory === 'adult' ? '搜索成人内容...' : '搜索影视...'}
                  className="w-full h-9 pl-10 pr-9 bg-surface dark:bg-surface-secondary rounded-full text-sm text-foreground placeholder-foreground/40 outline-none focus:ring-2 focus:ring-primary/20 focus:bg-background dark:focus:bg-black transition-all"
                  autoComplete="off"
                />
                {/* Search Icon */}
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40 group-focus-within:text-primary transition-colors" />

                {/* Clear Button */}
                {keyword && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-full text-foreground/40 hover:text-foreground hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                    aria-label="清除"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </form>
          </div>
        </header>

        {/* Content */}
        <main className="pt-14 pb-safe-bottom">
          {/* Ad Slot - search_top position (Requirements: 3.1) */}
          <div className="px-4 py-3">
            <AdSlot
              position="search_top"
              width={728}
              height={90}
              className="w-full max-w-full rounded-xl overflow-hidden shadow-sm"
            />
          </div>

          {/* Loading State (initial) */}
          {loading && data.length === 0 && keyword.trim() && (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
          )}

          {/* Empty State - No search yet */}
          {showEmptyState && (
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <div className="w-16 h-16 mb-4 rounded-full bg-surface-secondary/50 flex items-center justify-center">
                <Search className="w-8 h-8 text-foreground/20" />
              </div>
              <p className="text-sm text-foreground/40">输入关键词开始搜索</p>
            </div>
          )}

          {/* No Results State */}
          {showNoResults && (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <div className="w-16 h-16 mb-4 rounded-full bg-surface-secondary/50 flex items-center justify-center">
                <SearchX className="w-8 h-8 text-foreground/30" />
              </div>
              <p className="text-sm text-foreground/60 mb-8 font-medium">未找到 &ldquo;{keyword}&rdquo; 相关内容</p>

              {suggestions.length > 0 && (
                <div className="w-full max-w-xs">
                  <div className="flex items-center gap-2 mb-3 px-2">
                    <History className="w-3.5 h-3.5 text-primary" />
                    <p className="text-xs font-semibold text-foreground/40">猜你想搜</p>
                  </div>
                  <div className="bg-background dark:bg-surface rounded-xl overflow-hidden border border-surface-secondary">
                    {suggestions.map((suggestion, index) => (
                      <button
                        key={index}
                        onClick={() => search(suggestion)}
                        className="w-full text-left px-4 py-3 text-sm text-foreground border-b border-surface-secondary last:border-0 hover:bg-surface active:bg-surface-secondary transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <AlertCircle className="w-8 h-8 text-red-500 mb-3" />
              <p className="text-sm text-foreground/60 mb-4">{error}</p>
              <button
                onClick={() => search(keyword)}
                className="px-5 py-2 bg-surface border border-surface-secondary text-foreground rounded-full text-sm font-medium active:bg-surface-secondary transition-colors"
              >
                重试
              </button>
            </div>
          )}

          {/* Search Results */}
          {showResults && (
            <>
              <div className="px-4 py-2 flex items-center gap-2">
                <div className="w-1 h-3 bg-primary rounded-full" />
                <span className="text-sm font-bold text-foreground">搜索结果</span>
              </div>

              <VODGrid items={data} loading={loading} columns={2} sourceCategory={sourceCategory} />

              {/* Infinite scroll trigger */}
              <div ref={loadMoreRef} className="h-4" />

              {/* Loading more indicator */}
              {loading && data.length > 0 && (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="w-5 h-5 animate-spin text-primary/60" />
                </div>
              )}

              {/* End of list */}
              {!hasMore && data.length > 0 && (
                <div className="flex items-center justify-center py-8 gap-3">
                  <div className="h-px w-8 bg-surface-secondary" />
                  <span className="text-[10px] text-foreground/30 font-medium">END</span>
                  <div className="h-px w-8 bg-surface-secondary" />
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-surface dark:bg-background flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      <SearchPageContent />
    </Suspense>
  );
}
