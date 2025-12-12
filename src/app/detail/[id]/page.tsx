'use client';

import { useState, useEffect, Suspense } from 'react';
import Image from 'next/image';
import { useRouter, useParams, useSearchParams } from 'next/navigation';
import {
  ArrowLeft,
  Heart,
  Play,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  Film,
  Star
} from 'lucide-react';
import { useVODDetail, useContentAccess, useAuth, AccessResult } from '@/hooks';
import { PaywallBadge, EpisodeItem } from '@/components/paywall';
import { AdSlot } from '@/components/ads';

type SourceCategory = 'normal' | 'adult';

function DetailPageContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const id = params.id as string;
  const router = useRouter();

  // Get sourceCategory from URL params
  const sourceCategoryParam = searchParams.get('sourceCategory');
  const sourceCategory = (sourceCategoryParam === 'normal' || sourceCategoryParam === 'adult')
    ? sourceCategoryParam as SourceCategory
    : undefined;

  const { data: vod, loading, error, refresh } = useVODDetail(id, { sourceCategory });
  const { checkAccess, accessLoading } = useContentAccess();
  const { isAuthenticated } = useAuth();
  const [selectedSourceIndex, setSelectedSourceIndex] = useState(-1);
  const [imageError, setImageError] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteLoading, setFavoriteLoading] = useState(false);
  const [showAllEpisodes, setShowAllEpisodes] = useState(false);
  const [isDescExpanded, setIsDescExpanded] = useState(false);
  const [contentAccess, setContentAccess] = useState<AccessResult | null>(null);
  const [episodeAccessMap, setEpisodeAccessMap] = useState<Map<number, AccessResult>>(new Map());

  // Auto-select m3u8 source when VOD data loads
  useEffect(() => {
    if (!vod || selectedSourceIndex !== -1) return;

    // Handle empty playSources
    if (!vod.playSources || vod.playSources.length === 0) {
      setSelectedSourceIndex(0); // Set to 0 to exit loading state
      return;
    }

    const m3u8SourceIndex = vod.playSources.findIndex(source =>
      source.episodes.some(ep => ep.url.toLowerCase().includes('.m3u8'))
    );

    setSelectedSourceIndex(m3u8SourceIndex >= 0 ? m3u8SourceIndex : 0);
  }, [vod, selectedSourceIndex]);

  // Check favorite status on load (only for authenticated users)
  useEffect(() => {
    if (!id) return;

    // Check if user has token before making the request
    const token = localStorage.getItem('accessToken');
    if (!token) return; // Skip for unauthenticated users

    fetch(`/api/user/favorites?vodId=${id}`, {
      headers: { 'Authorization': `Bearer ${token}` }
    })
      .then(res => res.ok ? res.json() : null)
      .then(data => data && setIsFavorite(data.isFavorite))
      .catch(() => { });
  }, [id]);

  // Compute currentSource early for use in effects
  const currentSource = vod?.playSources?.[selectedSourceIndex];

  // Check content access for first episode when VOD loads
  useEffect(() => {
    if (!vod || !sourceCategory) return;

    const checkContentAccess = async () => {
      const result = await checkAccess(vod.vod_id, 0, sourceCategory);
      setContentAccess(result);
    };

    checkContentAccess();
  }, [vod, sourceCategory, checkAccess]);

  // Check access for visible episodes
  useEffect(() => {
    if (!vod || !sourceCategory || !currentSource || selectedSourceIndex === -1) return;

    const checkEpisodeAccess = async () => {
      const episodesToCheck = showAllEpisodes
        ? currentSource.episodes
        : currentSource.episodes.slice(0, 16);

      const accessPromises = episodesToCheck.map(async (_, index) => {
        const result = await checkAccess(vod.vod_id, index, sourceCategory);
        return { index, result };
      });

      const results = await Promise.all(accessPromises);
      const newMap = new Map<number, AccessResult>();
      results.forEach(({ index, result }) => {
        if (result) newMap.set(index, result);
      });
      setEpisodeAccessMap(newMap);
    };

    checkEpisodeAccess();
  }, [vod, sourceCategory, currentSource, selectedSourceIndex, showAllEpisodes, checkAccess]);

  const handleAddFavorite = async () => {
    if (!vod || favoriteLoading) return;

    setFavoriteLoading(true);
    try {
      const response = await fetch('/api/user/favorites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vodId: vod.vod_id,
          vodName: vod.vod_name,
          vodPic: vod.vod_pic,
          typeName: vod.type_name,
        }),
      });

      if (response.ok) {
        setIsFavorite(true);
      } else if (response.status === 401) {
        router.push('/auth/login');
      }
    } catch (err) {
      console.error('Failed to add favorite:', err);
    } finally {
      setFavoriteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <DetailSkeleton />
      </div>
    );
  }

  if (error || !vod) {
    return (
      <div className="min-h-screen bg-background">
        <header className="fixed top-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-sm border-b border-surface-secondary">
          <div className="flex items-center h-14 px-4 pt-safe-top">
            <button
              onClick={() => router.back()}
              className="flex items-center justify-center w-10 h-10 -ml-2 rounded-full text-foreground hover:bg-surface active:bg-surface-secondary transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          </div>
        </header>
        <div className="flex flex-col items-center justify-center min-h-screen px-4">
          <div className="w-16 h-16 mb-4 rounded-full bg-surface-secondary/50 flex items-center justify-center">
            <AlertCircle className="w-8 h-8 text-foreground/30" />
          </div>
          <p className="text-sm text-foreground/60 mb-2 font-medium">
            {error?.includes('not found') ? '内容不存在或已下架' : error || '加载失败'}
          </p>
          <p className="text-xs text-foreground/40 mb-6">请返回重新选择</p>
          <div className="flex gap-3">
            <button
              onClick={() => router.back()}
              className="px-5 py-2 bg-surface border border-surface-secondary text-foreground rounded-full text-sm font-medium active:bg-surface-secondary transition-colors"
            >
              返回
            </button>
            <button
              onClick={refresh}
              className="px-5 py-2 bg-primary text-white rounded-full text-sm font-medium active:opacity-90 transition-opacity shadow-sm shadow-primary/20"
            >
              重试
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Wait for source auto-selection
  if (selectedSourceIndex === -1) {
    return (
      <div className="min-h-screen bg-background">
        <DetailSkeleton />
      </div>
    );
  }

  const hasValidPoster = vod.vod_pic && !imageError;

  // Strip HTML tags from content
  const cleanContent = vod.vod_content?.replace(/<[^>]*>/g, '') || vod.vod_blurb || '';

  return (
    <div className="min-h-screen bg-surface dark:bg-background pb-safe-bottom">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-gradient-to-b from-black/80 to-transparent pointer-events-none">
        <div className="flex items-center justify-between h-14 px-4 pt-safe-top pointer-events-auto">
          <button
            onClick={() => router.back()}
            className="flex items-center justify-center w-10 h-10 -ml-2 rounded-full text-white bg-black/20 backdrop-blur-md hover:bg-black/30 active:scale-95 transition-all outline-none"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <button
            onClick={handleAddFavorite}
            disabled={favoriteLoading || isFavorite}
            className="flex items-center justify-center w-10 h-10 -mr-2 rounded-full text-white bg-black/20 backdrop-blur-md hover:bg-black/30 active:scale-95 disabled:opacity-80 transition-all outline-none"
          >
            <Heart
              className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-white'}`}
            />
          </button>
        </div>
      </header>

      {/* Hero Section with Poster */}
      <div className="relative aspect-[16/9] bg-surface-secondary overflow-hidden">
        {hasValidPoster ? (
          <Image
            src={vod.vod_pic}
            alt={vod.vod_name}
            fill
            className="object-cover"
            priority
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <Film className="w-12 h-12 text-foreground/20" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-surface dark:from-background via-transparent to-black/30" />
      </div>

      {/* Content */}
      <div className="px-4 -mt-12 relative z-10">
        {/* Title and Paywall Badge */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <h1 className="text-xl font-bold flex-1 text-foreground leading-tight drop-shadow-sm">{vod.vod_name}</h1>
          {sourceCategory && (
            <PaywallBadge
              accessResult={contentAccess}
              loading={accessLoading}
              size="md"
            />
          )}
        </div>

        <div className="flex flex-wrap gap-2 text-xs text-foreground/60 mb-5">
          {vod.type_name && (
            <span className="px-2 py-0.5 bg-surface/80 dark:bg-surface-secondary/50 backdrop-blur-sm border border-surface-secondary rounded text-foreground/80">
              {vod.type_name}
            </span>
          )}
          {vod.vod_year && <span className="px-2 py-0.5 bg-surface/80 dark:bg-surface-secondary/50 backdrop-blur-sm border border-surface-secondary rounded">{vod.vod_year}</span>}
          {vod.vod_area && <span className="px-2 py-0.5 bg-surface/80 dark:bg-surface-secondary/50 backdrop-blur-sm border border-surface-secondary rounded">{vod.vod_area}</span>}
          {vod.vod_lang && <span className="px-2 py-0.5 bg-surface/80 dark:bg-surface-secondary/50 backdrop-blur-sm border border-surface-secondary rounded">{vod.vod_lang}</span>}
          {vod.vod_score && parseFloat(vod.vod_score) > 0 && (
            <span className="px-2 py-0.5 bg-amber-500/10 border border-amber-500/20 text-amber-600 dark:text-amber-500 rounded flex items-center gap-1">
              <Star className="w-3 h-3 fill-amber-500 text-amber-500" />
              {vod.vod_score}
            </span>
          )}
        </div>

        {/* Director and Actors */}
        {(vod.vod_director || vod.vod_actor) && (
          <div className="text-sm text-foreground/80 mb-5 space-y-1.5 p-3 bg-background dark:bg-surface border border-surface-secondary rounded-xl">
            {vod.vod_director && (
              <p className="flex gap-2">
                <span className="text-foreground/40 shrink-0">导演</span>
                <span className="line-clamp-1">{vod.vod_director}</span>
              </p>
            )}
            {vod.vod_actor && (
              <p className="flex gap-2">
                <span className="text-foreground/40 shrink-0">演员</span>
                <span className="line-clamp-2">{vod.vod_actor}</span>
              </p>
            )}
          </div>
        )}

        {/* Description */}
        {cleanContent && (
          <div className="mb-5">
            <h2 className="text-sm font-bold mb-2 text-foreground">简介</h2>
            <div className="relative">
              <p
                className={`text-sm text-foreground/70 leading-relaxed ${isDescExpanded ? '' : 'line-clamp-3'}`}
                onClick={() => setIsDescExpanded(!isDescExpanded)}
              >
                {cleanContent}
              </p>
              {cleanContent.length > 100 && (
                <button
                  onClick={() => setIsDescExpanded(!isDescExpanded)}
                  className="mt-1 flex items-center gap-0.5 text-xs text-primary font-medium active:opacity-70"
                >
                  {isDescExpanded ? (
                    <>收起 <ChevronUp className="w-3 h-3" /></>
                  ) : (
                    <>展开 <ChevronDown className="w-3 h-3" /></>
                  )}
                </button>
              )}
            </div>
          </div>
        )}

        {/* Ad Slot - detail_middle */}
        <div className="mb-6">
          <AdSlot
            position="detail_middle"
            width={728}
            height={90}
            className="w-full max-w-full rounded-xl overflow-hidden shadow-sm"
          />
        </div>

        {/* Play Button */}
        {currentSource && currentSource.episodes.length > 0 && (
          <button
            onClick={() => {
              if (!isAuthenticated) {
                router.push('/auth/login');
                return;
              }
              router.push(`/play/${vod.vod_id}?source=${selectedSourceIndex}&ep=0${sourceCategory ? `&sourceCategory=${sourceCategory}` : ''}`);
            }}
            className="flex items-center justify-center gap-2 w-full py-3.5 mb-8 bg-primary text-white rounded-full font-bold shadow-lg shadow-primary/30 active:scale-[0.98] transition-all"
          >
            <Play className="w-5 h-5 fill-current" />
            立即播放
          </button>
        )}

        {/* Play Sources Selector */}
        {vod.playSources && vod.playSources.length > 1 && (
          <div className="mb-6">
            <h2 className="text-sm font-bold mb-3 text-foreground">播放源</h2>
            <div className="flex flex-wrap gap-2">
              {vod.playSources.map((source, index) => (
                <button
                  key={source.name}
                  onClick={() => setSelectedSourceIndex(index)}
                  className={`px-4 py-2 text-xs font-medium rounded-full transition-all border ${selectedSourceIndex === index
                    ? 'bg-primary border-primary text-white shadow-md shadow-primary/20'
                    : 'bg-background dark:bg-surface border-surface-secondary text-foreground/70 hover:bg-surface-secondary'
                    }`}
                >
                  {source.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Episode List */}
        {currentSource && currentSource.episodes.length > 0 && (
          <div className="mb-8">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-bold text-foreground">
                选集 <span className="text-foreground/40 font-normal ml-1">({currentSource.episodes.length}集)</span>
              </h2>
              {currentSource.episodes.length > 16 && (
                <button
                  onClick={() => setShowAllEpisodes(!showAllEpisodes)}
                  className="flex items-center gap-0.5 text-xs text-primary font-medium"
                >
                  {showAllEpisodes ? '收起' : '展开全部'}
                  <ChevronDown className={`w-3 h-3 transition-transform ${showAllEpisodes ? 'rotate-180' : ''}`} />
                </button>
              )}
            </div>
            <div className="grid grid-cols-4 gap-2.5">
              {(showAllEpisodes ? currentSource.episodes : currentSource.episodes.slice(0, 16)).map((episode, index) => (
                <EpisodeItem
                  key={`${episode.name}-${index}`}
                  episodeName={episode.name}
                  episodeIndex={index}
                  vodId={vod.vod_id}
                  sourceIndex={selectedSourceIndex}
                  sourceCategory={sourceCategory}
                  accessResult={episodeAccessMap.get(index)}
                  loading={accessLoading && !episodeAccessMap.has(index)}
                />
              ))}
            </div>
          </div>
        )}

        {/* No Episodes */}
        {(!currentSource || currentSource.episodes.length === 0) && (
          <div className="flex flex-col items-center justify-center py-12 px-4 rounded-2xl bg-background dark:bg-surface border border-surface-secondary">
            <div className="w-12 h-12 mb-3 rounded-full bg-surface-secondary/50 flex items-center justify-center">
              <Film className="w-6 h-6 text-foreground/20" />
            </div>
            <p className="text-sm text-foreground/40">暂无播放源</p>
          </div>
        )}
      </div>
    </div>
  );
}

function DetailSkeleton() {
  return (
    <>
      <div className="aspect-[16/9] bg-surface-secondary animate-pulse" />
      <div className="px-4 -mt-12 relative z-10">
        <div className="h-8 bg-surface-secondary rounded-lg w-3/4 mb-3 animate-pulse ring-4 ring-background dark:ring-surface" />
        <div className="flex gap-2 mb-5">
          <div className="h-6 w-16 bg-surface-secondary rounded animate-pulse" />
          <div className="h-6 w-12 bg-surface-secondary rounded animate-pulse" />
          <div className="h-6 w-14 bg-surface-secondary rounded animate-pulse" />
        </div>
        <div className="h-24 bg-surface-secondary rounded-xl mb-5 animate-pulse" />
        <div className="space-y-2 mb-6">
          <div className="h-4 bg-surface-secondary rounded w-1/4 mb-2 animate-pulse" />
          <div className="h-4 bg-surface-secondary rounded w-full animate-pulse" />
          <div className="h-4 bg-surface-secondary rounded w-5/6 animate-pulse" />
          <div className="h-4 bg-surface-secondary rounded w-4/6 animate-pulse" />
        </div>
        <div className="h-12 bg-surface-secondary rounded-full mb-8 animate-pulse" />
        <div className="h-5 bg-surface-secondary rounded w-20 mb-3 animate-pulse" />
        <div className="grid grid-cols-4 gap-2.5">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-10 bg-surface-secondary rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    </>
  );
}

export default function DetailPage() {
  return (
    <Suspense fallback={<DetailSkeleton />}>
      <DetailPageContent />
    </Suspense>
  );
}
