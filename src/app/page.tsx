'use client';

import { useState, useCallback } from 'react';
import { AlertCircle, Loader2, RefreshCw } from 'lucide-react';
import { SliverHeader, BottomNav, PullToRefresh, VODGrid, CategoryMenu } from '@/components';
import { AdSlot } from '@/components/ads';
import { useVODList, useCategories, useInfiniteScroll } from '@/hooks';

export default function HomePage() {
  // Use 'normal' source category for home page (常规影视)
  const { categories, loading: categoriesLoading } = useCategories({ sourceCategory: 'normal' });

  // Track selected category for filtering
  const [selectedTypeId, setSelectedTypeId] = useState<number | undefined>(undefined);

  // Fetch VOD list based on selected category, using 'normal' source category
  const { data: vodList, loading, error, loadMore, refresh, hasMore } = useVODList({
    pageSize: 20,
    typeId: selectedTypeId,
    sourceCategory: 'normal',
  });

  const { loadMoreRef } = useInfiniteScroll({ onLoadMore: loadMore, hasMore, loading });

  // Handle category selection - update list and scroll to top
  const handleCategoryChange = useCallback((typeId: number | undefined) => {
    setSelectedTypeId(typeId);
    // 滚动回顶部
    const scrollContainer = document.getElementById('main-scroll');
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  return (
    <div className="h-screen flex flex-col bg-background overflow-hidden">
      {/* Sliver Header with CategoryMenu */}
      <SliverHeader title="精品影视">
        <CategoryMenu
          categories={categories}
          loading={categoriesLoading}
          selectedTypeId={selectedTypeId}
          onCategoryChange={handleCategoryChange}
        />
      </SliverHeader>

      <main id="main-scroll" className="flex-1 overflow-auto pt-[calc(56px+100px)] bg-surface dark:bg-background">
        <PullToRefresh onRefresh={refresh} className="min-h-full" disableScroll>

          {/* Ad Slot - home_top position below header (Requirements: 3.1) */}
          <div className="px-4 py-3">
            <AdSlot
              position="home_top"
              width={728}
              height={90}
              className="w-full max-w-full rounded-xl overflow-hidden shadow-sm"
            />
          </div>

          {/* Error State */}
          {error && (
            <div className="flex flex-col items-center justify-center py-20 px-4">
              <div className="w-12 h-12 mb-4 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                <AlertCircle className="w-6 h-6 text-red-500" />
              </div>
              <p className="text-sm text-foreground/60 mb-6 text-center max-w-[200px]">{error}</p>
              <button
                onClick={() => refresh()}
                className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-full text-sm font-medium active:opacity-90 transition-opacity shadow-sm shadow-primary/20"
              >
                <RefreshCw className="w-4 h-4" />
                重新加载
              </button>
            </div>
          )}

          {/* VOD Grid */}
          {!error && (
            <>
              <VODGrid items={vodList} loading={loading} columns={2} sourceCategory="normal" />

              {/* Infinite scroll trigger */}
              <div ref={loadMoreRef} className="h-4" />

              {/* Loading more indicator */}
              {loading && vodList.length > 0 && (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="w-5 h-5 animate-spin text-primary/60" />
                </div>
              )}

              {/* End of list with subtle styling */}
              {!hasMore && vodList.length > 0 && (
                <div className="flex items-center justify-center py-8 gap-3">
                  <div className="h-px w-8 bg-surface-secondary" />
                  <span className="text-[10px] text-foreground/30 font-medium">THE END</span>
                  <div className="h-px w-8 bg-surface-secondary" />
                </div>
              )}
            </>
          )}
        </PullToRefresh>
      </main>

      <BottomNav />
    </div>
  );
}
