'use client';

/**
 * UnlockedContentSection Component
 * Displays user's unlocked content grouped by content title
 * 
 * Requirements:
 * - 7.1: Display section for unlocked content in profile
 * - 7.2: Show content name, unlock date, and episode information
 * - 7.3: Group episodes by content title
 */

import { useState, useMemo } from 'react';
import Link from 'next/link';
import { useUnlockedContent, type SourceCategory } from '@/hooks/useUnlockedContent';

// Grouped content type for display
interface GroupedContent {
  vodId: number;
  sourceCategory: SourceCategory;
  episodes: {
    episodeIndex: number;
    coinsSpent: number;
    unlockType: string;
    createdAt: string;
  }[];
  totalCoinsSpent: number;
  lastUnlockedAt: string;
}

interface UnlockedContentSectionProps {
  /** Optional category filter */
  categoryFilter?: SourceCategory;
  /** Show category filter UI */
  showCategoryFilter?: boolean;
}

export function UnlockedContentSection({
  categoryFilter,
  showCategoryFilter = true
}: UnlockedContentSectionProps) {
  const {
    unlockedContent,
    pagination,
    loading,
    error,
    fetchUnlockedContent,
    currentFilters,
    setFilters,
    refresh
  } = useUnlockedContent();

  const [selectedCategory, setSelectedCategory] = useState<SourceCategory | undefined>(categoryFilter);

  // Group episodes by vodId - Requirements: 7.3
  const groupedContent = useMemo(() => {
    const groups = new Map<number, GroupedContent>();

    for (const item of unlockedContent) {
      const existing = groups.get(item.vodId);

      if (existing) {
        existing.episodes.push({
          episodeIndex: item.episodeIndex,
          coinsSpent: item.coinsSpent,
          unlockType: item.unlockType,
          createdAt: item.createdAt,
        });
        existing.totalCoinsSpent += item.coinsSpent;
        // Update lastUnlockedAt if this episode is newer
        if (new Date(item.createdAt) > new Date(existing.lastUnlockedAt)) {
          existing.lastUnlockedAt = item.createdAt;
        }
      } else {
        groups.set(item.vodId, {
          vodId: item.vodId,
          sourceCategory: item.sourceCategory,
          episodes: [{
            episodeIndex: item.episodeIndex,
            coinsSpent: item.coinsSpent,
            unlockType: item.unlockType,
            createdAt: item.createdAt,
          }],
          totalCoinsSpent: item.coinsSpent,
          lastUnlockedAt: item.createdAt,
        });
      }
    }

    // Sort episodes within each group by episodeIndex
    const groupArray = Array.from(groups.values());
    for (const group of groupArray) {
      group.episodes.sort((a, b) => a.episodeIndex - b.episodeIndex);
    }

    // Sort by lastUnlockedAt (most recent first)
    return groupArray.sort(
      (a: GroupedContent, b: GroupedContent) => new Date(b.lastUnlockedAt).getTime() - new Date(a.lastUnlockedAt).getTime()
    );
  }, [unlockedContent]);

  // Handle category filter change
  const handleCategoryChange = (category: SourceCategory | undefined) => {
    setSelectedCategory(category);
    setFilters({ category });
  };

  // Handle pagination
  const handleLoadMore = () => {
    if (pagination && pagination.page < pagination.totalPages) {
      fetchUnlockedContent(pagination.page + 1, currentFilters);
    }
  };

  // Format episode display text
  const formatEpisodes = (episodes: GroupedContent['episodes']): string => {
    if (episodes.length === 1) {
      return `第${episodes[0].episodeIndex + 1}集`;
    }
    const indices = episodes.map(e => e.episodeIndex + 1);
    // Check if consecutive
    const isConsecutive = indices.every((val, i, arr) => i === 0 || val === arr[i - 1] + 1);
    if (isConsecutive && indices.length > 2) {
      return `第${indices[0]}-${indices[indices.length - 1]}集`;
    }
    return `第${indices.join(', ')}集`;
  };

  // Format date
  const formatDate = (dateStr: string): string => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' });
  };

  return (
    <div className="space-y-4">
      {/* Category Filter - Requirements: 7.4 */}
      {showCategoryFilter && (
        <div className="flex gap-2 px-4">
          <button
            onClick={() => handleCategoryChange(undefined)}
            className={`px-3 py-1.5 text-sm rounded-full transition-colors ${!selectedCategory
                ? 'bg-primary text-white'
                : 'bg-surface text-foreground/70 hover:bg-surface-secondary'
              }`}
          >
            全部
          </button>
          <button
            onClick={() => handleCategoryChange('normal')}
            className={`px-3 py-1.5 text-sm rounded-full transition-colors ${selectedCategory === 'normal'
                ? 'bg-primary text-white'
                : 'bg-surface text-foreground/70 hover:bg-surface-secondary'
              }`}
          >
            普通内容
          </button>
          <button
            onClick={() => handleCategoryChange('adult')}
            className={`px-3 py-1.5 text-sm rounded-full transition-colors ${selectedCategory === 'adult'
                ? 'bg-primary text-white'
                : 'bg-surface text-foreground/70 hover:bg-surface-secondary'
              }`}
          >
            成人内容
          </button>
        </div>
      )}

      {/* Loading State */}
      {loading && groupedContent.length === 0 && (
        <div className="flex justify-center py-8">
          <svg className="w-6 h-6 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="flex flex-col items-center py-8 px-4">
          <p className="text-sm text-red-500 mb-3">{error}</p>
          <button
            onClick={() => refresh()}
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm"
          >
            重试
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && groupedContent.length === 0 && (
        <div className="flex flex-col items-center py-8 px-4">
          <svg className="w-12 h-12 mb-3 text-foreground/20" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
          </svg>
          <p className="text-foreground/60 text-sm mb-3">暂无已解锁内容</p>
          <Link
            href="/"
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm"
          >
            去发现
          </Link>
        </div>
      )}

      {/* Content List - Requirements: 7.1, 7.2, 7.3 */}
      {!error && groupedContent.length > 0 && (
        <div className="px-4 space-y-3">
          {groupedContent.map((group) => (
            <UnlockedContentCard key={group.vodId} group={group} formatEpisodes={formatEpisodes} formatDate={formatDate} />
          ))}

          {/* Load More Button */}
          {pagination && pagination.page < pagination.totalPages && (
            <button
              onClick={handleLoadMore}
              disabled={loading}
              className="w-full py-3 text-sm text-primary hover:bg-surface rounded-lg disabled:opacity-50"
            >
              {loading ? '加载中...' : '加载更多'}
            </button>
          )}

          {/* End of List */}
          {pagination && pagination.page >= pagination.totalPages && groupedContent.length > 0 && (
            <p className="text-center text-xs text-foreground/40 py-2">
              已显示全部 {pagination.total} 条记录
            </p>
          )}
        </div>
      )}
    </div>
  );
}


// Individual content card component
interface UnlockedContentCardProps {
  group: GroupedContent;
  formatEpisodes: (episodes: GroupedContent['episodes']) => string;
  formatDate: (dateStr: string) => string;
}

function UnlockedContentCard({ group, formatEpisodes, formatDate }: UnlockedContentCardProps) {
  const [expanded, setExpanded] = useState(false);

  // Build detail URL with sourceCategory
  const detailUrl = `/detail/${group.vodId}?sourceCategory=${group.sourceCategory}`;

  // Determine unlock type badge
  const hasVipUnlock = group.episodes.some(e => e.unlockType === 'vip');
  const hasPurchase = group.episodes.some(e => e.unlockType === 'purchase');

  return (
    <div className="bg-surface rounded-xl overflow-hidden">
      {/* Main Content Row */}
      <Link
        href={detailUrl}
        className="flex gap-3 p-3 active:bg-surface-secondary"
      >
        {/* Placeholder for poster - vodId only, no actual image data */}
        <div className="w-16 h-22 flex-shrink-0 rounded-md overflow-hidden bg-surface-secondary flex items-center justify-center">
          <svg className="w-6 h-6 text-foreground/20" fill="currentColor" viewBox="0 0 24 24">
            <path d="M18 4l2 4h-3l-2-4h-2l2 4h-3l-2-4H8l2 4H7L5 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V4h-4z" />
          </svg>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-medium text-sm line-clamp-1">视频 #{group.vodId}</h3>
              {/* Category Badge */}
              <span className={`px-1.5 py-0.5 text-[10px] rounded ${group.sourceCategory === 'adult'
                  ? 'bg-pink-500/10 text-pink-500'
                  : 'bg-blue-500/10 text-blue-500'
                }`}>
                {group.sourceCategory === 'adult' ? '成人' : '普通'}
              </span>
            </div>

            {/* Episode Info - Requirements: 7.2 */}
            <p className="text-xs text-foreground/60 mt-1">
              {formatEpisodes(group.episodes)}
              {group.episodes.length > 1 && ` (共${group.episodes.length}集)`}
            </p>
          </div>

          {/* Bottom Row */}
          <div className="flex items-center justify-between mt-2">
            <div className="flex items-center gap-2">
              {/* Unlock Type Badges */}
              {hasVipUnlock && (
                <span className="px-1.5 py-0.5 text-[10px] bg-primary/10 text-primary rounded">
                  会员
                </span>
              )}
              {hasPurchase && group.totalCoinsSpent > 0 && (
                <span className="px-1.5 py-0.5 text-[10px] bg-yellow-500/10 text-yellow-600 rounded">
                  {group.totalCoinsSpent}金币
                </span>
              )}
            </div>
            <span className="text-xs text-foreground/40">
              {formatDate(group.lastUnlockedAt)}
            </span>
          </div>
        </div>
      </Link>

      {/* Expandable Episode Details - Requirements: 7.2, 7.3 */}
      {group.episodes.length > 1 && (
        <>
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full px-3 py-2 text-xs text-foreground/60 border-t border-surface-secondary flex items-center justify-center gap-1 hover:bg-surface-secondary"
          >
            {expanded ? '收起详情' : '展开详情'}
            <svg
              className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>

          {expanded && (
            <div className="px-3 pb-3 space-y-2 border-t border-surface-secondary pt-2">
              {group.episodes.map((episode) => (
                <div
                  key={episode.episodeIndex}
                  className="flex items-center justify-between text-xs"
                >
                  <span className="text-foreground/70">
                    第{episode.episodeIndex + 1}集
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded ${episode.unlockType === 'vip'
                        ? 'bg-primary/10 text-primary'
                        : 'bg-yellow-500/10 text-yellow-600'
                      }`}>
                      {episode.unlockType === 'vip' ? '会员' : `${episode.coinsSpent}金币`}
                    </span>
                    <span className="text-foreground/40">
                      {formatDate(episode.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
