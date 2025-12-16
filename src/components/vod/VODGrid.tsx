'use client';

import { memo, useMemo } from 'react';
import type { VODItem } from '@/types/vod';
import { VODCard } from './VODCard';

type SourceCategory = 'normal' | 'adult';

interface VODGridProps {
  items: VODItem[];
  loading?: boolean;
  columns?: 2 | 3 | 4;
  sourceCategory?: SourceCategory;
}

export const VODGrid = memo(function VODGrid({ items, loading = false, columns = 2, sourceCategory }: VODGridProps) {
  const gridCols = useMemo(() => ({
    2: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6',
    3: 'grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6',
    4: 'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
  }), []);

  if (loading && items.length === 0) {
    return (
      <div className={`grid ${gridCols[columns]} gap-4 p-4`}>
        {Array.from({ length: 6 }).map((_, i) => (
          <VODCardSkeleton key={i} />
        ))}
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-foreground/40">
        <svg className="w-12 h-12 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
        </svg>
        <p className="text-sm">暂无内容</p>
      </div>
    );
  }

  return (
    <div className={`grid ${gridCols[columns]} gap-3 p-4`}>
      {items.map((vod, index) => (
        <VODCard
          key={vod.vod_id}
          vod={vod}
          priority={index < 4}
          sourceCategory={sourceCategory}
        />
      ))}
      {loading && (
        <>
          <VODCardSkeleton />
          <VODCardSkeleton />
        </>
      )}
    </div>
  );
});

const VODCardSkeleton = memo(function VODCardSkeleton() {
  return (
    <div className="rounded-xl overflow-hidden bg-surface shadow-sm">
      <div className="aspect-[3/4] bg-surface-secondary" />
      <div className="p-2.5 space-y-2">
        <div className="h-4 bg-surface-secondary rounded w-4/5" />
        <div className="h-3 bg-surface-secondary rounded w-3/5" />
      </div>
    </div>
  );
});
