'use client';

import { useState, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { AlertCircle, Loader2, RefreshCw, Film } from 'lucide-react';
import { SliverHeader, BottomNav, PullToRefresh, VODGrid, CategoryMenu, AgeVerificationGate, Sidebar } from '@/components';
import { AdSlot } from '@/components/ads';
import { useVODList, useCategories, useInfiniteScroll, useAgeVerification } from '@/hooks';

export default function AdultPage() {
  const router = useRouter();
  const { isVerified, loading: verificationLoading, verify } = useAgeVerification();

  // Use 'adult' source category for adult content page
  const { categories, loading: categoriesLoading } = useCategories({ sourceCategory: 'adult' });

  // Track selected category for filtering
  const [selectedTypeId, setSelectedTypeId] = useState<number | undefined>(undefined);

  // Fetch VOD list based on selected category, using 'adult' source category
  const { data: vodList, loading, error, loadMore, refresh, hasMore } = useVODList({
    pageSize: 20,
    typeId: selectedTypeId,
    sourceCategory: 'adult',
  });

  const { loadMoreRef } = useInfiniteScroll({ onLoadMore: loadMore, hasMore, loading });

  // Check if we have any categories (either standard or virtual structure)
  const hasCategories = useMemo(() => {
    // Standard structure: has type_pid === 0 categories
    const hasStandardCategories = categories.filter(cat => cat.type_pid === 0).length > 0;
    // Virtual structure: has any categories at all (will be grouped by unique type_pid)
    const hasAnyCategories = categories.length > 0;
    return hasStandardCategories || hasAnyCategories;
  }, [categories]);

  // Check if using virtual structure (no type_pid === 0 categories)
  const isVirtualStructure = useMemo(() => {
    return categories.length > 0 && categories.filter(cat => cat.type_pid === 0).length === 0;
  }, [categories]);

  // Count unique parent IDs for virtual structure
  const uniqueParentCount = useMemo(() => {
    if (!isVirtualStructure) return 0;
    return new Set(categories.map(cat => cat.type_pid)).size;
  }, [categories, isVirtualStructure]);

  // Dynamic padding based on whether categories are shown
  // CategoryMenu shows:
  // - 2 rows (~100px) for standard structure or virtual structure with multiple parents
  // - 1 row (~50px) for virtual structure with single parent
  // - 0 when empty
  const mainPadding = useMemo(() => {
    if (!hasCategories && !categoriesLoading) return 'pt-14';
    if (categoriesLoading) return 'pt-[calc(56px+100px)]';
    if (isVirtualStructure && uniqueParentCount === 1) return 'pt-[calc(56px+50px)]';
    return 'pt-[calc(56px+100px)]';
  }, [hasCategories, categoriesLoading, isVirtualStructure, uniqueParentCount]);

  // Handle age verification confirmation
  const handleConfirm = useCallback(() => {
    verify();
  }, [verify]);

  // Handle age verification decline - redirect to home
  const handleDecline = useCallback(() => {
    router.push('/');
  }, [router]);

  // Handle category selection - update list and scroll to top
  const handleCategoryChange = useCallback((typeId: number | undefined) => {
    setSelectedTypeId(typeId);
    // 滚动回顶部
    const scrollContainer = document.getElementById('adult-main-scroll');
    if (scrollContainer) {
      scrollContainer.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, []);

  // Show loading state while checking verification
  if (verificationLoading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 animate-spin text-primary/40" />
      </div>
    );
  }

  // Show age verification gate if not verified
  if (!isVerified) {
    return <AgeVerificationGate onConfirm={handleConfirm} onDecline={handleDecline} />;
  }

  return (
    <>
      {/* Desktop Sidebar */}
      <Sidebar />

      <div className="h-screen flex flex-col bg-background overflow-hidden lg:pl-64">
        {/* Sliver Header with CategoryMenu */}
        <SliverHeader title="成人专区" scrollContainerSelector="#adult-main-scroll" searchHref="/search?source=adult">
          <CategoryMenu
            categories={categories}
            loading={categoriesLoading}
            selectedTypeId={selectedTypeId}
            onCategoryChange={handleCategoryChange}
          />
        </SliverHeader>

        <main id="adult-main-scroll" className={`flex-1 overflow-auto ${mainPadding} bg-surface dark:bg-background`}>
          <PullToRefresh onRefresh={refresh} className="min-h-full" disableScroll>

            {/* Ad Slot - adult_top position (Requirements: 3.1) */}
            <div className="px-4 py-3">
              <AdSlot
                position="adult_top"
                width={728}
                height={90}
                className="w-full max-w-full rounded-xl overflow-hidden shadow-sm"
              />
            </div>

            {/* Error State */}
            {error && (
              <div className="flex flex-col items-center justify-center py-16 px-4 min-h-[50vh]">
                <div className="w-12 h-12 mb-4 rounded-full bg-red-50 dark:bg-red-900/20 flex items-center justify-center">
                  <AlertCircle className="w-6 h-6 text-red-500" />
                </div>
                <h3 className="text-base font-medium text-foreground/80 mb-2">加载失败</h3>
                <p className="text-sm text-foreground/60 mb-6 text-center max-w-xs">{error}</p>
                <button
                  onClick={() => refresh()}
                  className="flex items-center gap-2 px-6 py-2.5 bg-primary text-white rounded-full text-sm font-medium active:opacity-90 transition-opacity shadow-sm shadow-primary/20"
                >
                  <RefreshCw className="w-4 h-4" />
                  重新加载
                </button>
              </div>
            )}

            {/* Empty State - when no error but no data and not loading */}
            {!error && !loading && vodList.length === 0 && (
              <div className="flex flex-col items-center justify-center py-16 px-4 min-h-[50vh]">
                <div className="w-16 h-16 mb-4 rounded-full bg-surface-secondary/50 flex items-center justify-center">
                  <Film className="w-8 h-8 text-foreground/20" />
                </div>
                <h3 className="text-base font-medium text-foreground/80 mb-2">
                  {categories.length === 0 && !categoriesLoading ? '未配置成人源' : '暂无内容'}
                </h3>
                <p className="text-sm text-foreground/50 mb-6 text-center max-w-xs">
                  {categories.length === 0 && !categoriesLoading
                    ? '请在管理后台添加成人影视源后再访问此页面'
                    : '当前分类下没有可用的内容'}
                </p>
                <button
                  onClick={() => refresh()}
                  className="px-6 py-2.5 bg-surface border border-surface-secondary text-foreground/70 rounded-full text-sm font-medium active:bg-surface-secondary transition-colors"
                >
                  刷新试试
                </button>
              </div>
            )}

            {/* VOD Grid - show when no error and (has data or is loading) */}
            {!error && (vodList.length > 0 || loading) && (
              <>
                <VODGrid items={vodList} loading={loading} columns={2} sourceCategory="adult" />

                {/* Infinite scroll trigger */}
                <div ref={loadMoreRef} className="h-4" />

                {/* Loading more indicator */}
                {loading && vodList.length > 0 && (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="w-5 h-5 animate-spin text-primary/60" />
                  </div>
                )}

                {/* End of list with subtle styling */}
                {!hasMore && vodList.length > 0 && !loading && (
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
    </>
  );
}
