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
import { useVODDetail, useContentAccess, useAuth } from '@/hooks';

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
  const { isAuthenticated, loading: authLoading } = useAuth();

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
  // 广告过滤状态 - 初始为 undefined 表示未检测
  const [adFreeEnabled, setAdFreeEnabled] = useState<boolean | undefined>(undefined);
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
  }, [vod, selectedSourceIndex, selectedEpisodeIndex]);

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
  const isProxyUrl = rawVideoUrl.startsWith('/api/proxy/');
  const isM3u8 = rawVideoUrl.toLowerCase().includes('.m3u8') || isProxyUrl;

  // Build video URL:
  // - If already a proxy URL (with token), just add adFree param if needed
  // - If raw m3u8 URL, wrap in proxy
  // - Otherwise use as-is (for iframe/external players)
  let computedVideoUrl = rawVideoUrl;
  if (isProxyUrl) {
    // Already tokenized proxy URL from VOD API, just add adFree if enabled
    const adFreeParam = adFreeEnabled ? '&adFree=true' : '';
    computedVideoUrl = `${rawVideoUrl}${adFreeParam}`;
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
    <div className="min-h-screen bg-black">
      {/* Video Player or Lock overlay after preview ends */}
      <div className="relative">
        {isLocked && previewEnded ? (
          /* Show lock overlay only after preview has ended */
          <div className="aspect-video bg-black flex items-center justify-center">
            {vod.vod_pic ? (
              <img
                src={vod.vod_pic}
                alt={vod.vod_name}
                className="w-full h-full object-cover opacity-50"
              />
            ) : (
              <div className="w-full h-full bg-surface" />
            )}
            {/* Lock overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/40">
              <div className="text-center text-white">
                <svg className="w-16 h-16 mx-auto mb-2 opacity-80" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                </svg>
                <p className="text-sm opacity-80">试看已结束，请解锁继续观看</p>
              </div>
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
            {/* Preview time indicator for locked content */}
            {isLocked && previewDuration > 0 && !previewEnded && (
              <div className="absolute top-4 left-1/2 -translate-x-1/2 z-10 px-3 py-1.5 bg-amber-500/90 rounded-full text-white text-xs font-medium">
                试看中 · 剩余 {formatTime(previewTimeLeft)}
              </div>
            )}
          </>
        )}

        {/* Back Button Overlay */}
        <button
          onClick={() => router.back()}
          className="absolute top-4 left-4 z-10 w-10 h-10 flex items-center justify-center bg-black/50 rounded-full text-white"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        {/* Episode List Toggle */}
        <button
          onClick={() => setShowEpisodeList(!showEpisodeList)}
          className="absolute top-4 right-4 z-10 px-3 py-2 bg-black/50 rounded-lg text-white text-sm"
        >
          选集
        </button>
      </div>

      {/* Resume Prompt Modal */}
      {showResumePrompt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80">
          <div className="bg-surface rounded-lg p-6 mx-4 max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-2">继续播放</h3>
            <p className="text-sm text-foreground/70 mb-4">
              上次观看到 {formatTime(savedPosition)}，是否继续？
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleStartOver}
                className="flex-1 py-2 bg-surface-secondary rounded-lg text-sm"
              >
                从头开始
              </button>
              <button
                onClick={handleResume}
                className="flex-1 py-2 bg-primary text-white rounded-lg text-sm"
              >
                继续播放
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Unlock Prompt Modal */}
      <UnlockPromptModal
        isOpen={showUnlockModal}
        onClose={handleUnlockModalClose}
        onUnlock={handleUnlock}
        price={contentPrice}
        vodName={vod.vod_name}
        episodeName={currentEpisode?.name || ''}
        unlocking={unlockLoading}
        error={unlockError}
      />

      {/* Video Info */}
      <div className="p-4 text-white">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <h1 className="text-lg font-semibold mb-1">{vod.vod_name}</h1>
            <p className="text-sm text-white/60">
              {currentEpisode?.name || ''}
              {currentSource && vod.playSources && vod.playSources.length > 1 && ` · ${currentSource.name}`}
            </p>

            {/* Access Status Badge */}
            {hasAccess !== null && (
              <div className="mt-2">
                {hasAccess ? (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs ${accessType === 'vip'
                    ? 'bg-amber-500/20 text-amber-400'
                    : accessType === 'purchased'
                      ? 'bg-green-500/20 text-green-400'
                      : 'bg-blue-500/20 text-blue-400'
                    }`}>
                    {accessType === 'vip' && (
                      <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M12 2L15.09 8.26L22 9.27L17 14.14L18.18 21.02L12 17.77L5.82 21.02L7 14.14L2 9.27L8.91 8.26L12 2Z" />
                      </svg>
                    )}
                    {accessType === 'vip' ? '会员免费' : accessType === 'purchased' ? '已解锁' : '免费'}
                  </span>
                ) : (
                  <button
                    onClick={() => setShowUnlockModal(true)}
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-primary/20 text-primary hover:bg-primary/30 transition-colors"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2zm3.1-9H8.9V6c0-1.71 1.39-3.1 3.1-3.1 1.71 0 3.1 1.39 3.1 3.1v2z" />
                    </svg>
                    {contentPrice} 金币解锁
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Ad-Free Toggle (Premium Feature) - Show for m3u8 sources */}
          {isPremiumUser && (isM3u8 || !useIframe) && (
            <button
              onClick={() => setAdFreeEnabled(!adFreeEnabled)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs transition-colors ${adFreeEnabled
                ? 'bg-green-500/20 text-green-400'
                : 'bg-white/10 text-white/60'
                }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
              {adFreeEnabled ? '纯净模式' : '广告过滤'}
            </button>
          )}
        </div>
      </div>

      {/* Ad Slot - play_bottom position below video info */}
      <div className="px-4 pb-4">
        <AdSlotGroup
          position="play_bottom"
          className="w-full max-w-full"
        />
      </div>

      {/* Episode List Panel */}
      {showEpisodeList && (
        <div className="fixed inset-0 z-40 bg-black/80" onClick={() => setShowEpisodeList(false)}>
          <div
            className="absolute bottom-0 left-0 right-0 bg-background rounded-t-2xl max-h-[70vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-4 border-b border-surface-secondary">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold">选集</h3>
                <button
                  onClick={() => setShowEpisodeList(false)}
                  className="w-8 h-8 flex items-center justify-center"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Source Tabs */}
              {vod.playSources && vod.playSources.length > 1 && (
                <div className="flex gap-2 mt-3 overflow-x-auto">
                  {vod.playSources.map((source, index) => (
                    <button
                      key={source.name}
                      onClick={() => setSelectedSourceIndex(index)}
                      className={`px-3 py-1.5 text-sm rounded-lg whitespace-nowrap ${selectedSourceIndex === index
                        ? 'bg-primary text-white'
                        : 'bg-surface text-foreground/70'
                        }`}
                    >
                      {source.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Episode Grid */}
            <div className="p-4 overflow-y-auto max-h-[50vh]">
              <div className="grid grid-cols-4 gap-2">
                {currentSource?.episodes.map((episode, index) => {
                  const episodeUnlocked = isEpisodeUnlocked(index);
                  const isSelected = selectedEpisodeIndex === index;

                  return (
                    <button
                      key={`${episode.name}-${index}`}
                      onClick={() => handleEpisodeSelect(selectedSourceIndex, index)}
                      className={`relative px-3 py-2 text-sm rounded-lg truncate ${isSelected
                        ? 'bg-primary text-white'
                        : episodeUnlocked
                          ? 'bg-surface text-foreground/70 hover:bg-surface-secondary'
                          : 'bg-surface text-foreground/50 hover:bg-surface-secondary'
                        }`}
                    >
                      {episode.name}
                      {/* Lock icon for locked episodes */}
                      {!episodeUnlocked && !isSelected && (
                        <span className="absolute top-0.5 right-0.5">
                          <svg className="w-3 h-3 text-amber-500" viewBox="0 0 24 24" fill="currentColor">
                            <path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2zm-6 9c-1.1 0-2-.9-2-2s.9-2 2-2 2 .9 2 2-.9 2-2 2z" />
                          </svg>
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
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
