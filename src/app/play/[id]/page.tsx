'use client';

/**
 * Play Page with Paywall Integration
 * 
 * Requirements: 1.1 - Display unlock prompt immediately for locked content
 * Requirements: 1.2 - Allow unrestricted playback for users with full access
 * Requirements: 3.1 - Display UnlockPromptModal with price and balance information
 */

import { useState, useEffect, useCallback, useRef, Suspense } from 'react';
import dynamic from 'next/dynamic';
import { useRouter, useSearchParams, useParams } from 'next/navigation';

const VideoPlayer = dynamic(
  () => import('@/components/player').then((mod) => mod.VideoPlayer),
  {
    ssr: false, // Player relies on browser APIs (MSE/HLS)
    loading: () => <div className="aspect-video bg-black/50 animate-pulse rounded-xl" />
  }
);
// Type import can stay, it doesn't affect bundle
import type { VideoPlayerRef } from '@/components/player';
import { UnlockPromptModal } from '@/components/paywall';
import { AdSlotGroup } from '@/components/ads';
import { Sidebar } from '@/components/layout';
import { useVODDetail, useContentAccess, useAuth } from '@/hooks';
import { Star, Play, ChevronLeft, Layout, List, Share2, ShieldCheck, Crown } from 'lucide-react';

type SourceCategory = 'normal' | 'adult';

interface WatchHistory {
  vodId: number;
  episodeIndex: number;
  sourceIndex: number;
  position: number;
}

function PlayPageContent() {
  const params = useParams();
  const id = params.id as string;
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get sourceCategory from URL params
  const sourceCategoryParam = searchParams.get('sourceCategory');
  const sourceCategory = (sourceCategoryParam === 'normal' || sourceCategoryParam === 'adult')
    ? sourceCategoryParam as SourceCategory
    : 'normal'; // Default to normal if not specified

  const { data: vod, loading, error, refresh } = useVODDetail(id, { sourceCategory });

  // Auth hook for login check
  const { user, isAuthenticated, loading: authLoading } = useAuth();

  // Content access hook
  const {
    checkAccess,
    unlockContent,
    accessLoading,
    unlockLoading,
    unlockError,
    invalidateCache
  } = useContentAccess();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/auth/login');
    }
  }, [authLoading, isAuthenticated, router]);

  // Get source and episode from URL params
  const sourceParam = searchParams.get('source');
  const epParam = searchParams.get('ep');

  const [selectedSourceIndex, setSelectedSourceIndex] = useState(
    sourceParam ? parseInt(sourceParam, 10) : -1 // -1 means auto-select
  );
  const [selectedEpisodeIndex, setSelectedEpisodeIndex] = useState(
    epParam ? parseInt(epParam, 10) : 0
  );
  const [initialPosition, setInitialPosition] = useState(0);
  const [showResumePrompt, setShowResumePrompt] = useState(false);
  const [savedPosition, setSavedPosition] = useState(0);
  const [showEpisodeList, setShowEpisodeList] = useState(false);
  // 广告过滤状态
  const [adFreeEnabled, setAdFreeEnabled] = useState(false);
  const [adFreeInitialized, setAdFreeInitialized] = useState(false);
  const [isPremiumUser, setIsPremiumUser] = useState(false);
  const [subscriptionChecked, setSubscriptionChecked] = useState(false); // 等待订阅状态检查完成
  // VIP/SVIP 状态
  const [isVipUser, setIsVipUser] = useState(false);  // VIP: normal content only
  const [isSvipUser, setIsSvipUser] = useState(false); // SVIP: all content

  // Paywall state
  const [hasAccess, setHasAccess] = useState<boolean | null>(null);
  const [accessType, setAccessType] = useState<string | null>(null);
  // Track which episodes are unlocked for this VOD
  const [unlockedEpisodes, setUnlockedEpisodes] = useState<Set<number>>(new Set());
  const [contentPrice, setContentPrice] = useState<number>(0);
  const [showUnlockModal, setShowUnlockModal] = useState(false);

  // Preview/Trial viewing state
  const [previewConfig, setPreviewConfig] = useState<{ percentage: number; minSeconds: number; maxSeconds: number } | null>(null);
  const [previewDuration, setPreviewDuration] = useState<number>(0); // Calculated preview duration in seconds
  const [previewEnded, setPreviewEnded] = useState(false); // Whether preview time has ended
  const [previewTimeLeft, setPreviewTimeLeft] = useState<number>(0); // Remaining preview time for display

  // Refs for tracking
  const lastSaveTimeRef = useRef(0);
  const lastPreviewUpdateRef = useRef(0); // Throttle preview time display updates
  const saveIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const videoRef = useRef<VideoPlayerRef>(null);
  // Lock the video URL to prevent SWR revalidation from changing it during playback
  const lockedVideoUrlRef = useRef<string>('');
  const currentEpisodeKeyRef = useRef<string>(''); // Track current episode to detect real changes

  // Initialize adFree based on premium status
  useEffect(() => {
    if (!authLoading && !adFreeInitialized) {
      const isPremium = user?.memberLevel === 'vip' || user?.memberLevel === 'svip';
      if (isPremium) {
        setAdFreeEnabled(true);
      }
      setAdFreeInitialized(true);
    }
  }, [user, authLoading, adFreeInitialized]);

  // Auto-select m3u8 source if no source param provided
  useEffect(() => {
    if (!vod || selectedSourceIndex !== -1) return;

    // Handle empty playSources
    if (!vod.playSources || vod.playSources.length === 0) {
      setSelectedSourceIndex(0); // Set to 0 to exit loading state
      return;
    }

    // Find the first source with m3u8 URLs
    const m3u8SourceIndex = vod.playSources.findIndex(source =>
      source.episodes.some(ep => ep.url.toLowerCase().includes('.m3u8'))
    );

    // If found m3u8 source, use it; otherwise use first source
    setSelectedSourceIndex(m3u8SourceIndex >= 0 ? m3u8SourceIndex : 0);
  }, [vod, selectedSourceIndex]);

  // Fetch preview configuration
  useEffect(() => {
    const fetchPreviewConfig = async () => {
      try {
        const response = await fetch('/api/paywall/preview-config');
        if (response.ok) {
          const data = await response.json();
          setPreviewConfig(data);
        }
      } catch (err) {
        console.error('Failed to fetch preview config:', err);
        // Use defaults
        setPreviewConfig({ percentage: 0.25, minSeconds: 60, maxSeconds: 360 });
      }
    };
    fetchPreviewConfig();
  }, []);

  // Check content access on load and episode change
  // For locked content, allow preview instead of immediately showing modal
  useEffect(() => {
    // Don't check access if not authenticated or still loading auth
    if (!isAuthenticated || authLoading) return;
    if (!vod || selectedSourceIndex === -1) return;

    const checkContentAccess = async () => {
      const result = await checkAccess(vod.vod_id, selectedEpisodeIndex, sourceCategory);

      if (result) {
        setHasAccess(result.hasAccess);
        setAccessType(result.accessType);
        setContentPrice(result.price ?? 0);

        // For locked content, allow preview (don't show modal immediately)
        // Modal will be shown when preview ends
        if (!result.hasAccess && result.accessType === 'locked') {
          // Reset preview state for new episode
          setPreviewEnded(false);
          setShowUnlockModal(false);
        } else {
          setShowUnlockModal(false);
          setPreviewEnded(false);
        }
      }
    };

    checkContentAccess();
  }, [vod, selectedEpisodeIndex, sourceCategory, checkAccess, selectedSourceIndex, isAuthenticated, authLoading]);

  // Check if user has premium subscription for ad-free and VIP status
  // Also fetch unlocked episodes for this VOD
  useEffect(() => {
    const checkPremiumStatus = async () => {
      try {
        const response = await fetch('/api/user/subscription');
        if (response.ok) {
          const data = await response.json();
          // Update premium status
          if (typeof data.isPremium === 'boolean') {
            setIsPremiumUser(data.isPremium);
            setAdFreeEnabled(data.isPremium);
          } else {
            // 默认不开启广告过滤
            setAdFreeEnabled(false);
          }
          // Update VIP/SVIP status
          if (typeof data.isVip === 'boolean') {
            setIsVipUser(data.isVip);
          }
          if (typeof data.isSvip === 'boolean') {
            setIsSvipUser(data.isSvip);
          }
        } else {
          // 请求失败时设置默认值
          setAdFreeEnabled(false);
        }
      } catch {
        // Keep default values
        setAdFreeEnabled(false);
      } finally {
        setSubscriptionChecked(true); // 标记检查完成
      }
    };
    checkPremiumStatus();
  }, []);

  // Fetch user's unlocked episodes for this VOD
  useEffect(() => {
    if (!vod || !isAuthenticated) return;

    const fetchUnlockedEpisodes = async () => {
      try {
        // Get all unlocked content for this user
        const response = await fetch(`/api/user/unlocked?pageSize=100&category=${sourceCategory}`);
        if (response.ok) {
          const result = await response.json();
          // Filter for current VOD and extract episode indices
          const vodUnlocks = result.data?.filter(
            (item: { vodId: number }) => item.vodId === vod.vod_id
          ) || [];
          const episodes = new Set<number>(vodUnlocks.map((item: { episodeIndex: number }) => item.episodeIndex));
          setUnlockedEpisodes(episodes);
        }
      } catch (err) {
        console.error('Failed to fetch unlocked episodes:', err);
      }
    };

    fetchUnlockedEpisodes();
  }, [vod, isAuthenticated, sourceCategory]);

  // Fetch watch history to check for resume position
  useEffect(() => {
    if (!vod) return;

    const fetchHistory = async () => {
      try {
        const response = await fetch('/api/user/history');
        if (response.ok) {
          const result = await response.json();
          const history = result.data?.find(
            (h: WatchHistory) => h.vodId === vod.vod_id
          );

          if (history && history.position > 10) {
            // If there's saved progress and it's more than 10 seconds
            setSavedPosition(history.position);

            // If URL params match saved episode, show resume prompt
            if (
              history.sourceIndex === selectedSourceIndex &&
              history.episodeIndex === selectedEpisodeIndex
            ) {
              setShowResumePrompt(true);
            } else if (!sourceParam && !epParam) {
              // No URL params, use saved position
              setSelectedSourceIndex(history.sourceIndex);
              setSelectedEpisodeIndex(history.episodeIndex);
              setShowResumePrompt(true);
            }
          }
        }
      } catch (err) {
        console.error('Failed to fetch watch history:', err);
      }
    };

    fetchHistory();
  }, [vod, selectedSourceIndex, selectedEpisodeIndex, sourceParam, epParam]);

  // Save progress periodically
  const saveProgress = useCallback(async (currentTime: number, duration: number) => {
    if (!vod || currentTime < 5) return;

    // Only save every 10 seconds
    const now = Date.now();
    if (now - lastSaveTimeRef.current < 10000) return;
    lastSaveTimeRef.current = now;

    const currentSource = vod.playSources?.[selectedSourceIndex];
    const currentEpisode = currentSource?.episodes[selectedEpisodeIndex];

    try {
      await fetch('/api/user/history', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          vodId: vod.vod_id,
          vodName: vod.vod_name,
          vodPic: vod.vod_pic,
          episodeIndex: selectedEpisodeIndex,
          episodeName: currentEpisode?.name || '',
          position: Math.floor(currentTime),
          duration: Math.floor(duration),
          sourceIndex: selectedSourceIndex,
          sourceCategory: sourceCategory,
        }),
      });
    } catch (err) {
      console.error('Failed to save progress:', err);
    }
  }, [vod, selectedSourceIndex, selectedEpisodeIndex, sourceCategory]);

  // Handle time update from video player
  // Track preview time for locked content
  const handleTimeUpdate = useCallback((currentTime: number, duration: number) => {
    // Save progress
    saveProgress(currentTime, duration);

    // Only process preview logic for locked content
    if (!hasAccess && accessType === 'locked' && previewConfig) {
      // Calculate preview duration once when we first get a VALID video duration
      // Duration must be: finite, positive, and at least 10 seconds (to ensure metadata is loaded)
      const isDurationValid = isFinite(duration) && duration >= 10;

      if (isDurationValid && previewDuration === 0) {
        const percentageDuration = Math.floor(duration * previewConfig.percentage);
        const calculatedDuration = Math.min(
          Math.max(percentageDuration, previewConfig.minSeconds),
          previewConfig.maxSeconds
        );
        // Don't exceed total duration, ensure integer
        const finalDuration = Math.floor(Math.min(calculatedDuration, duration));
        setPreviewDuration(finalDuration);
        setPreviewTimeLeft(finalDuration);
        return; // Don't check end on the same frame we calculate
      }

      // Update remaining preview time for display (throttled to once per second)
      if (previewDuration > 0 && !previewEnded) {
        const remaining = Math.floor(Math.max(0, previewDuration - currentTime));

        // Only update state once per second to avoid excessive re-renders
        const now = Date.now();
        if (now - lastPreviewUpdateRef.current >= 1000) {
          lastPreviewUpdateRef.current = now;
          setPreviewTimeLeft(remaining);
        }

        // Only check end after:
        // 1. previewDuration is calculated (> 0)
        // 2. video actually started playing (at least 3 seconds in)
        // This gives time for the player to settle after seeking
        if (previewDuration > 0 && currentTime >= 3 && currentTime >= previewDuration) {
          setPreviewEnded(true);
          setShowUnlockModal(true);
          // Pause the video
          if (videoRef.current) {
            videoRef.current.pause();
          }
        }
      }
    }
  }, [saveProgress, previewConfig, hasAccess, accessType, previewDuration, previewEnded]);

  // Handle unlock action
  const handleUnlock = useCallback(async () => {
    if (!vod) return;

    const result = await unlockContent(vod.vod_id, selectedEpisodeIndex, sourceCategory);

    if (result?.success) {
      // Update access state
      setHasAccess(true);
      setAccessType('purchased');
      setShowUnlockModal(false);

      // Reset preview state
      setPreviewEnded(false);
      setPreviewDuration(0);
      setPreviewTimeLeft(0);

      // Invalidate cache for this content
      invalidateCache(vod.vod_id, selectedEpisodeIndex);

      // Clear locked URL to allow new token from VOD refresh
      lockedVideoUrlRef.current = '';

      // Refresh VOD data to get new tokens with full access (non-preview)
      // The VideoPlayer will remount with the new URL
      await refresh();

      // Note: Don't call play() here - the VideoPlayer will auto-play after remounting
      // because HLS.js auto-plays after manifest load
    }
  }, [vod, selectedEpisodeIndex, sourceCategory, unlockContent, invalidateCache, refresh]);

  // Save progress on unmount
  useEffect(() => {
    const intervalId = saveIntervalRef.current;
    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, []);

  const handleResume = () => {
    setInitialPosition(savedPosition);
    setShowResumePrompt(false);
  };

  const handleStartOver = () => {
    setInitialPosition(0);
    setShowResumePrompt(false);
  };

  // Check if a specific episode is accessible
  // VIP: can access normal content for free
  // SVIP: can access all content for free
  const isEpisodeUnlocked = useCallback((episodeIndex: number): boolean => {
    // SVIP users have access to ALL content (normal + adult)
    if (isSvipUser) return true;
    // VIP users only have access to normal content
    if (isVipUser && sourceCategory === 'normal') return true;
    // Check if this specific episode is purchased/unlocked
    return unlockedEpisodes.has(episodeIndex);
  }, [isVipUser, isSvipUser, sourceCategory, unlockedEpisodes]);

  const handleEpisodeSelect = async (sourceIndex: number, episodeIndex: number) => {
    // Check if episode is unlocked (VIP or purchased)
    const episodeUnlocked = isEpisodeUnlocked(episodeIndex);

    if (!episodeUnlocked) {
      // Episode is locked - check access to show unlock modal
      const result = await checkAccess(vod!.vod_id, episodeIndex, sourceCategory);
      if (result && !result.hasAccess) {
        // Update state for the new episode
        setSelectedSourceIndex(sourceIndex);
        setSelectedEpisodeIndex(episodeIndex);
        setContentPrice(result.price ?? 0);
        setHasAccess(false);
        setAccessType('locked');
        setShowUnlockModal(true);
        setShowEpisodeList(false);

        // Update URL
        const url = new URL(window.location.href);
        url.searchParams.set('source', sourceIndex.toString());
        url.searchParams.set('ep', episodeIndex.toString());
        window.history.replaceState({}, '', url.toString());
        return;
      }
    }

    // Episode is unlocked - proceed with playback
    setSelectedSourceIndex(sourceIndex);
    setSelectedEpisodeIndex(episodeIndex);
    setInitialPosition(0);
    setShowEpisodeList(false);

    // Reset access state for new episode - will be re-checked by useEffect
    setShowUnlockModal(false);
    setHasAccess(null);

    // Reset preview state for new episode
    setPreviewDuration(0);
    setPreviewTimeLeft(0);
    setPreviewEnded(false);

    // Clear locked URL to allow new episode URL
    lockedVideoUrlRef.current = '';

    // Update URL without navigation
    const url = new URL(window.location.href);
    url.searchParams.set('source', sourceIndex.toString());
    url.searchParams.set('ep', episodeIndex.toString());
    window.history.replaceState({}, '', url.toString());
  };

  const handleVideoEnded = useCallback(() => {
    // Auto-play next episode if available
    const currentSource = vod?.playSources?.[selectedSourceIndex];
    if (currentSource && selectedEpisodeIndex < currentSource.episodes.length - 1) {
      handleEpisodeSelect(selectedSourceIndex, selectedEpisodeIndex + 1);
    }
  }, [vod, selectedSourceIndex, selectedEpisodeIndex, handleEpisodeSelect]);

  // Stable callback handlers for VideoPlayer to prevent unnecessary remounts
  const handleVideoError = useCallback((err: string) => {
    console.error('[PlayPage] Video error:', err);
  }, []);

  const handleSourceSwitch = useCallback(() => {
    setShowEpisodeList(true);
  }, []);

  // Show loading while checking auth, auto-selecting source, loading data, checking access, or waiting for subscription
  if (authLoading || loading || selectedSourceIndex === -1 || (hasAccess === null && accessLoading) || !subscriptionChecked) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <svg className="w-12 h-12 animate-spin text-white" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
      </div>
    );
  }

  if (error || !vod) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
        <p className="text-sm mb-4">{error || '内容不存在'}</p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-primary rounded-lg text-sm"
        >
          返回
        </button>
      </div>
    );
  }

  const currentSource = vod.playSources?.[selectedSourceIndex];
  const currentEpisode = currentSource?.episodes[selectedEpisodeIndex];
  const rawVideoUrl = currentEpisode?.url || '';

  // Handle no play sources
  if (!vod.playSources || vod.playSources.length === 0 || !currentSource) {
    return (
      <div className="min-h-screen bg-black flex flex-col items-center justify-center text-white">
        <p className="text-sm mb-4">暂无播放源</p>
        <button
          onClick={() => router.back()}
          className="px-4 py-2 bg-primary rounded-lg text-sm"
        >
          返回
        </button>
      </div>
    );
  }

  // Check if URL is already a proxy URL (from VOD API with token) or raw m3u8
  // Handle both relative (/api/proxy/...) and absolute (http://host/api/proxy/...) proxy URLs
  const isProxyUrl = rawVideoUrl.includes('/api/proxy/');
  const isM3u8 = rawVideoUrl.toLowerCase().includes('.m3u8') || isProxyUrl;

  // Build video URL:
  // - If already a proxy URL (with token), just add adFree param if needed
  // - If raw m3u8 URL, wrap in proxy
  // - Otherwise use as-is (for iframe/external players)
  let computedVideoUrl = rawVideoUrl;
  if (isProxyUrl) {
    // Already tokenized proxy URL from VOD API, just add adFree if enabled
    // Ensure we don't duplicate adFree param if already present
    if (adFreeEnabled && !rawVideoUrl.includes('adFree=true')) {
      const separator = rawVideoUrl.includes('?') ? '&' : '?';
      computedVideoUrl = `${rawVideoUrl}${separator}adFree=true`;
    }
  } else if (rawVideoUrl.toLowerCase().includes('.m3u8')) {
    // Raw m3u8 URL, wrap in video proxy for CORS/mixed content handling
    const adFreeParam = adFreeEnabled ? '&adFree=true' : '';
    computedVideoUrl = `/api/proxy/video?url=${encodeURIComponent(rawVideoUrl)}${adFreeParam}`;
  }

  // Lock the video URL to prevent changes during playback
  // Only update when episode actually changes (detected by source+episode index)
  const episodeKey = `${selectedSourceIndex}:${selectedEpisodeIndex}`;
  if (currentEpisodeKeyRef.current !== episodeKey || !lockedVideoUrlRef.current) {
    currentEpisodeKeyRef.current = episodeKey;
    lockedVideoUrlRef.current = computedVideoUrl;
  }
  const videoUrl = lockedVideoUrlRef.current;

  // Use iframe for external player pages (non-m3u8, non-proxy)
  const useIframe = !isM3u8 && rawVideoUrl.includes('/share/');

  // Determine if content is locked (no access)
  const isLocked = !hasAccess && accessType === 'locked';

  // Handle modal close for locked content - navigate back (Requirements: 3.3)
  const handleUnlockModalClose = () => {
    if (isLocked) {
      router.back();
    } else {
      setShowUnlockModal(false);
    }
  };

  return (
    <div className="min-h-screen bg-black lg:bg-background">
      <Sidebar />

      <main className="lg:pl-64 min-h-screen">
        <div className="max-w-screen-2xl mx-auto px-0 lg:px-8 py-0 lg:py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0 lg:gap-8">
            {/* Left Column: Player and Info */}
            <div className="lg:col-span-8 space-y-4 lg:space-y-6">
              {/* Player Container */}
              <div className="relative aspect-video bg-black lg:rounded-2xl lg:overflow-hidden lg:shadow-2xl ring-1 ring-white/5">
                {isLocked && previewEnded ? (
                  <div className="w-full h-full flex items-center justify-center relative group">
                    {vod.vod_pic ? (
                      <img
                        src={vod.vod_pic}
                        alt={vod.vod_name}
                        className="w-full h-full object-cover opacity-40 transition-opacity group-hover:opacity-30"
                      />
                    ) : (
                      <div className="w-full h-full bg-surface-secondary" />
                    )}
                    <div className="absolute inset-0 flex flex-col items-center justify-center p-6 text-center">
                      <div className="w-16 h-16 bg-primary/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-md border border-primary/30">
                        <Crown className="w-8 h-8 text-primary" />
                      </div>
                      <h3 className="text-white text-lg font-black mb-2 px-10">试看已结束</h3>
                      <p className="text-white/60 text-sm max-w-[280px]">解锁本集即可观看完整高清视频并支持创作者</p>
                      <button
                        onClick={() => setShowUnlockModal(true)}
                        className="mt-6 px-8 py-3 bg-primary text-white rounded-full font-bold shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                      >
                        立即解锁
                      </button>
                    </div>
                  </div>
                ) : (
                  <>
                    <VideoPlayer
                      ref={videoRef}
                      src={videoUrl}
                      poster={vod.vod_pic}
                      initialPosition={initialPosition}
                      onTimeUpdate={handleTimeUpdate}
                      onEnded={handleVideoEnded}
                      onError={handleVideoError}
                      onSourceSwitch={handleSourceSwitch}
                      useIframe={useIframe}
                      maxSeekTime={isLocked && previewDuration > 0 ? previewDuration : undefined}
                    />
                    {isLocked && previewDuration > 0 && !previewEnded && (
                      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10">
                        <div className="px-4 py-2 bg-amber-500/90 backdrop-blur-md rounded-full text-white text-[11px] font-black uppercase tracking-wider flex items-center gap-2 shadow-xl shadow-amber-500/20">
                          <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                          试看中 · 剩余 {formatTime(previewTimeLeft)}
                        </div>
                      </div>
                    )}
                  </>
                )}

                {/* Overlays: Back Button */}
                <button
                  onClick={() => router.back()}
                  className="absolute top-4 left-4 z-20 w-10 h-10 flex items-center justify-center bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full text-white transition-all ring-1 ring-white/10"
                >
                  <ChevronLeft className="w-6 h-6" />
                </button>

                {/* Mobile Drawer Toggle */}
                <button
                  onClick={() => setShowEpisodeList(!showEpisodeList)}
                  className="lg:hidden absolute top-4 right-4 z-20 px-4 py-2 bg-black/40 backdrop-blur-md rounded-full text-white text-xs font-bold border border-white/10 flex items-center gap-2"
                >
                  <List className="w-3.5 h-3.5" />
                  选集
                </button>
              </div>

              {/* Video Information Area */}
              <div className="px-4 lg:px-2 py-4 lg:py-0">
                <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                  <div className="space-y-3 flex-1 min-w-0">
                    <div>
                      <h1 className="text-lg lg:text-2xl font-black text-white lg:text-foreground leading-tight truncate">
                        {vod.vod_name}
                      </h1>
                      <div className="flex items-center gap-3 mt-1.5">
                        <span className="text-white/40 lg:text-foreground/40 text-xs font-bold whitespace-nowrap">
                          {currentEpisode?.name || ''}
                          {currentSource && vod.playSources && vod.playSources.length > 1 && ` · ${currentSource.name}`}
                        </span>
                        {vod.vod_score && parseFloat(vod.vod_score) > 0 && (
                          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-md text-[10px] font-black shadow-sm">
                            <Star className="w-2.5 h-2.5 fill-amber-500" />
                            {vod.vod_score}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Access Status & Info */}
                    <div className="flex flex-wrap items-center gap-3">
                      {hasAccess !== null && (
                        <div>
                          {hasAccess ? (
                            <div className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest flex items-center gap-1.5 shadow-sm border ${accessType === 'vip' || accessType === 'svip'
                              ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                              : accessType === 'purchased'
                                ? 'bg-green-500/10 text-green-500 border-green-500/20'
                                : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                              }`}>
                              {accessType === 'vip' || accessType === 'svip' ? <Crown className="w-3 h-3" /> : <ShieldCheck className="w-3 h-3" />}
                              {accessType === 'vip' ? '会员专享' : accessType === 'svip' ? '超级会员' : accessType === 'purchased' ? '已订阅' : '全员免费'}
                            </div>
                          ) : (
                            <button
                              onClick={() => setShowUnlockModal(true)}
                              className="px-3 py-1.5 bg-primary/10 text-primary border border-primary/20 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-primary/20 transition-all shadow-lg shadow-primary/5 active:scale-95"
                            >
                              <Crown className="w-3.5 h-3.5 fill-primary" />
                              {contentPrice} 金币解锁全集
                            </button>
                          )}
                        </div>
                      )}

                      {/* Info Pills */}
                      <div className="flex flex-wrap gap-2 text-[10px] text-white/40 lg:text-foreground/30 font-bold uppercase tracking-widest">
                        {vod.vod_year && <span className="px-2 py-1 bg-white/5 lg:bg-foreground/5 rounded-md">{vod.vod_year}</span>}
                        {vod.type_name && <span className="px-2 py-1 bg-white/5 lg:bg-foreground/5 rounded-md">{vod.type_name}</span>}
                        {vod.vod_area && <span className="px-2 py-1 bg-white/5 lg:bg-foreground/5 rounded-md">{vod.vod_area}</span>}
                      </div>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div className="flex items-center gap-3 pt-2 lg:pt-0">
                    {isPremiumUser && (isM3u8 || !useIframe) && (
                      <button
                        onClick={() => setAdFreeEnabled(!adFreeEnabled)}
                        className={`px-4 py-2 rounded-xl text-xs font-black transition-all flex items-center gap-2 border-2 ${adFreeEnabled
                          ? 'bg-green-500/10 border-green-500/30 text-green-500 shadow-lg shadow-green-500/5'
                          : 'bg-white/5 lg:bg-foreground/5 border-transparent text-white/50 lg:text-foreground/40'
                          }`}
                      >
                        <ShieldCheck className={`w-4 h-4 ${adFreeEnabled ? 'text-green-500' : 'opacity-40'}`} />
                        {adFreeEnabled ? '广告已过滤' : '纯净模式'}
                      </button>
                    )}
                    <button className="p-2.5 bg-white/5 lg:bg-foreground/5 text-white/50 lg:text-foreground/40 rounded-xl hover:bg-primary/10 hover:text-primary transition-all">
                      <Share2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>

              {/* Ad Slot - play_bottom */}
              <div className="px-4 lg:px-0 pb-8">
                <AdSlotGroup
                  position="play_bottom"
                  className="w-full rounded-2xl overflow-hidden shadow-xl"
                />
              </div>
            </div>

            {/* Right Column: Persistent Episode List (Desktop Only) */}
            <div className="hidden lg:block lg:col-span-4 space-y-6">
              <div className="bg-background dark:bg-surface border border-surface-secondary/60 rounded-3xl p-6 shadow-sm sticky top-8">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-black flex items-center gap-2">
                    <div className="w-1 h-5 bg-primary rounded-full shadow-[0_0_12px_rgba(var(--primary-rgb),0.5)]" />
                    选集播放
                    <span className="text-foreground/20 text-xs font-bold ml-1 tracking-widest uppercase">
                      ({currentSource?.episodes.length || 0})
                    </span>
                  </h2>
                </div>

                {/* Source Selection */}
                {vod.playSources && vod.playSources.length > 1 && (
                  <div className="flex flex-wrap gap-2 mb-6">
                    {vod.playSources.map((source, index) => (
                      <button
                        key={source.name}
                        onClick={() => setSelectedSourceIndex(index)}
                        className={`px-3 py-1.5 text-[10px] font-black rounded-lg transition-all border-2 uppercase tracking-wider ${selectedSourceIndex === index
                          ? 'bg-primary border-primary text-white shadow-lg shadow-primary/20'
                          : 'bg-background/40 border-surface-secondary text-foreground/40 hover:bg-surface-secondary'
                          }`}
                      >
                        {source.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* Vertical Episode Grid */}
                <div className="grid grid-cols-4 sm:grid-cols-5 gap-2.5 max-h-[calc(100vh-280px)] overflow-y-auto pr-1 custom-scrollbar">
                  {currentSource?.episodes.map((episode, index) => {
                    const episodeUnlocked = isEpisodeUnlocked(index);
                    const isSelected = selectedEpisodeIndex === index;

                    return (
                      <button
                        key={`${episode.name}-${index}`}
                        onClick={() => handleEpisodeSelect(selectedSourceIndex, index)}
                        className={`aspect-square relative flex items-center justify-center text-xs font-black rounded-xl transition-all border ${isSelected
                          ? 'bg-primary border-primary text-white shadow-lg shadow-primary/30 z-10'
                          : episodeUnlocked
                            ? 'bg-surface-secondary/50 border-transparent text-foreground/60 hover:bg-surface-secondary hover:border-primary/20 hover:text-primary'
                            : 'bg-surface-secondary/50 border-transparent text-foreground/20 hover:text-primary/40'
                          }`}
                      >
                        {index + 1}
                        {!episodeUnlocked && !isSelected && (
                          <Crown className="absolute -top-1 -right-1 w-3 h-3 text-amber-500 fill-amber-500" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Mobile Episode Drawer */}
        {showEpisodeList && (
          <div className="lg:hidden fixed inset-0 z-[60]" onClick={() => setShowEpisodeList(false)}>
            <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
            <div
              className="absolute bottom-0 left-0 right-0 bg-background rounded-t-3xl max-h-[75vh] flex flex-col overflow-hidden animate-slide-up shadow-2xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-surface-secondary flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-6 bg-primary rounded-full" />
                  <h3 className="text-lg font-black tracking-tight">正片选集</h3>
                </div>
                <button
                  onClick={() => setShowEpisodeList(false)}
                  className="w-10 h-10 flex items-center justify-center bg-surface-secondary rounded-full active:scale-90 transition-transform"
                >
                  <svg className="w-5 h-5 opacity-60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 pb-safe">
                {/* Mobile Source Selector */}
                {vod.playSources && vod.playSources.length > 1 && (
                  <div className="flex gap-2.5 mb-6 overflow-x-auto no-scrollbar pb-1">
                    {vod.playSources.map((source, index) => (
                      <button
                        key={source.name}
                        onClick={() => setSelectedSourceIndex(index)}
                        className={`px-5 py-2 text-xs font-black rounded-full whitespace-nowrap transition-all border-2 ${selectedSourceIndex === index
                          ? 'bg-primary border-primary text-white'
                          : 'bg-surface-secondary/50 border-transparent text-foreground/40'
                          }`}
                      >
                        {source.name}
                      </button>
                    ))}
                  </div>
                )}

                {/* Mobile Episode Grid */}
                <div className="grid grid-cols-4 xs:grid-cols-5 gap-3 pb-8">
                  {currentSource?.episodes.map((episode, index) => {
                    const episodeUnlocked = isEpisodeUnlocked(index);
                    const isSelected = selectedEpisodeIndex === index;

                    return (
                      <button
                        key={`${episode.name}-${index}`}
                        onClick={() => handleEpisodeSelect(selectedSourceIndex, index)}
                        className={`aspect-square relative flex items-center justify-center text-sm font-black rounded-2xl transition-all ${isSelected
                          ? 'bg-primary text-white shadow-xl shadow-primary/40 active:scale-95'
                          : episodeUnlocked
                            ? 'bg-surface-secondary text-foreground/70 active:bg-surface-secondary/80'
                            : 'bg-surface-secondary/50 text-foreground/20'
                          }`}
                      >
                        {index + 1}
                        {!episodeUnlocked && !isSelected && (
                          <div className="absolute top-1.5 right-1.5 w-1.5 h-1.5 bg-amber-500 rounded-full" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Global UI Components */}
        <UnlockPromptModal
          isOpen={showUnlockModal}
          onClose={handleUnlockModalClose || (() => setShowUnlockModal(false))}
          onUnlock={handleUnlock}
          price={contentPrice}
          vodName={vod.vod_name}
          episodeName={currentEpisode?.name || ''}
          unlocking={unlockLoading}
          error={unlockError}
        />

        {/* Resume Modal */}
        {showResumePrompt && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4">
            <div className="absolute inset-0 bg-black/80 backdrop-blur-md" onClick={handleStartOver} />
            <div className="relative bg-background dark:bg-surface-secondary rounded-3xl p-8 max-w-sm w-full shadow-2xl border border-white/5 animate-scale-in">
              <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 mx-auto">
                <Play className="w-8 h-8 text-primary fill-primary" />
              </div>
              <h3 className="text-xl font-black mb-3 text-center">继续上次观看？</h3>
              <p className="text-sm text-foreground/50 mb-8 text-center leading-relaxed">
                我们发现您上次观看到 <span className="text-primary font-bold">{formatTime(savedPosition)}</span>，需要立即恢复吗？
              </p>
              <div className="grid grid-cols-2 gap-4">
                <button
                  onClick={handleStartOver}
                  className="py-3.5 bg-foreground/5 dark:bg-white/5 rounded-2xl text-xs font-black uppercase tracking-widest hover:bg-foreground/10 transition-all"
                >
                  从头开始
                </button>
                <button
                  onClick={handleResume}
                  className="py-3.5 bg-primary text-white rounded-2xl text-xs font-black uppercase tracking-widest shadow-lg shadow-primary/20 active:scale-95 transition-all"
                >
                  继续播放
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      <style jsx global>{`
        @keyframes slide-up {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes scale-in {
          from { transform: scale(0.9); opacity: 0; }
          to { transform: scale(1); opacity: 1; }
        }
        .animate-slide-up { animation: slide-up 0.35s cubic-bezier(0.165, 0.84, 0.44, 1) forwards; }
        .animate-scale-in { animation: scale-in 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .custom-scrollbar::-webkit-scrollbar { width: 4px; }
        .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(var(--primary-rgb), 0.1); border-radius: 20px; }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(var(--primary-rgb), 0.3); }
      `}</style>
    </div>
  );
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export default function PlayPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin"></div>
      </div>
    }>
      <PlayPageContent />
    </Suspense>
  );
}
