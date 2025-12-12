'use client';

import { useRef, useEffect, useState, useCallback, useImperativeHandle, forwardRef } from 'react';
import Hls from 'hls.js';

export interface VideoPlayerRef {
  pause: () => void;
  play: () => void;
  getCurrentTime: () => number;
}

interface VideoPlayerProps {
  src: string;
  poster?: string;
  initialPosition?: number;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onError?: (error: string) => void;
  /** Use iframe mode for external player pages */
  useIframe?: boolean;
  /** Playback token for secure proxy access */
  token?: string;
}

/**
 * Check if we're on a mobile device
 */
function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

/**
 * Check if the browser is Safari (including iOS Safari)
 */
function isSafari(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  return /^((?!chrome|android).)*safari/i.test(ua) || /iPad|iPhone|iPod/.test(ua);
}

// Separate component for iframe player to avoid hooks issues
function IframePlayer({ src }: { src: string }) {
  return (
    <div className="relative aspect-video bg-black">
      <iframe
        src={src}
        className="w-full h-full border-0"
        allowFullScreen
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
      />
    </div>
  );
}

// Native video player component with all hooks
const NativeVideoPlayer = forwardRef<VideoPlayerRef, Omit<VideoPlayerProps, 'useIframe'>>(function NativeVideoPlayer({
  src,
  poster,
  initialPosition = 0,
  onTimeUpdate,
  onEnded,
  onError,
  token,
}, ref) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [showControls, setShowControls] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const controlsTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Gesture state
  const touchStartRef = useRef<{ x: number; y: number; time: number } | null>(null);
  const gestureTypeRef = useRef<'seek' | 'volume' | 'brightness' | null>(null);
  const [gestureInfo, setGestureInfo] = useState<{ type: string; value: string } | null>(null);

  // Expose methods to parent via ref
  useImperativeHandle(ref, () => ({
    pause: () => {
      videoRef.current?.pause();
    },
    play: () => {
      videoRef.current?.play();
    },
    getCurrentTime: () => {
      return videoRef.current?.currentTime ?? 0;
    },
  }), []);

  // Build the video source URL with proper proxy handling
  const getVideoSource = useCallback((originalSrc: string, playbackToken?: string): string => {
    const isM3U8 = originalSrc.toLowerCase().includes('.m3u8');
    const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const isHttpSource = originalSrc.startsWith('http://');
    const mobile = isMobileDevice();
    
    // For M3U8 streams, always use proxy on mobile or when there's mixed content
    if (isM3U8) {
      // If we have a token, use the secure m3u8 proxy
      if (playbackToken) {
        return `/api/proxy/m3u8?token=${playbackToken}`;
      }
      // For mobile or mixed content, use the video proxy which handles m3u8 rewriting
      if (mobile || (isHttps && isHttpSource)) {
        return `/api/proxy/video?url=${encodeURIComponent(originalSrc)}`;
      }
    }
    
    // For non-M3U8 content with mixed content issues
    if (isHttps && isHttpSource) {
      return `/api/proxy/video?url=${encodeURIComponent(originalSrc)}`;
    }
    
    return originalSrc;
  }, []);

  // Initialize HLS with mobile-optimized settings
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !src) return;

    setLoading(true);
    setError(null);

    const videoSrc = getVideoSource(src, token);
    const isM3U8 = src.toLowerCase().includes('.m3u8') || videoSrc.includes('/api/proxy/m3u8') || videoSrc.includes('/api/proxy/video');
    const mobile = isMobileDevice();
    const safari = isSafari();

    // For Safari/iOS, prefer native HLS support (but only on first attempt)
    // If retryCount > 0, skip native and use HLS.js as fallback
    if (safari && video.canPlayType('application/vnd.apple.mpegurl') && retryCount === 0) {
      video.src = videoSrc;
      
      const handleLoadedMetadata = () => {
        setLoading(false);
        if (initialPosition > 0) {
          video.currentTime = initialPosition;
        }
        // Auto-play on mobile requires user interaction, but we can try
        video.play().catch(() => {
          // Autoplay blocked, user needs to tap play
        });
      };
      
      const handleNativeError = () => {
        // If native playback fails, try HLS.js as fallback
        if (Hls.isSupported()) {
          console.log('Native HLS failed, falling back to HLS.js');
          video.src = ''; // Clear the source to stop native playback
          setRetryCount(prev => prev + 1); // This will trigger useEffect to use HLS.js
        } else {
          const errorMsg = '视频加载失败，请检查网络连接';
          setError(errorMsg);
          setLoading(false);
          onError?.(errorMsg);
        }
      };
      
      video.addEventListener('loadedmetadata', handleLoadedMetadata);
      video.addEventListener('error', handleNativeError);
      
      return () => {
        video.removeEventListener('loadedmetadata', handleLoadedMetadata);
        video.removeEventListener('error', handleNativeError);
      };
    }

    // Use HLS.js for non-Safari browsers or as fallback
    if (isM3U8 && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: !mobile, // Disable worker on mobile for better compatibility
        lowLatencyMode: false, // Disable low latency for better stability
        maxBufferLength: mobile ? 15 : 60, // Much shorter buffer on mobile to reduce memory
        maxMaxBufferLength: mobile ? 30 : 120,
        maxBufferSize: mobile ? 15 * 1000 * 1000 : 60 * 1000 * 1000, // 15MB on mobile, 60MB on desktop
        maxBufferHole: 0.5,
        // Mobile-specific optimizations
        startLevel: mobile ? 0 : -1, // Start with lowest quality on mobile
        capLevelToPlayerSize: true,
        // Better error recovery - more retries for unstable mobile networks
        fragLoadingMaxRetry: mobile ? 8 : 6,
        manifestLoadingMaxRetry: mobile ? 6 : 4,
        levelLoadingMaxRetry: mobile ? 6 : 4,
        // Longer timeouts for mobile networks
        fragLoadingTimeOut: mobile ? 30000 : 20000,
        manifestLoadingTimeOut: mobile ? 15000 : 10000,
        levelLoadingTimeOut: mobile ? 15000 : 10000,
        // Faster retry for mobile
        fragLoadingRetryDelay: mobile ? 500 : 1000,
        manifestLoadingRetryDelay: mobile ? 500 : 1000,
        levelLoadingRetryDelay: mobile ? 500 : 1000,
        // XHR setup for CORS
        xhrSetup: (xhr) => {
          xhr.withCredentials = false;
        },
      });

      hls.loadSource(videoSrc);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        setLoading(false);
        if (initialPosition > 0) {
          video.currentTime = initialPosition;
        }
        // Try to autoplay
        video.play().catch(() => {
          // Autoplay blocked
        });
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        console.error('HLS Error:', data.type, data.details, data);
        
        if (data.fatal) {
          switch (data.type) {
            case Hls.ErrorTypes.NETWORK_ERROR:
              // Try to recover from network error
              console.log('Fatal network error, trying to recover...');
              hls.startLoad();
              break;
            case Hls.ErrorTypes.MEDIA_ERROR:
              console.log('Fatal media error, trying to recover...');
              hls.recoverMediaError();
              break;
            default:
              const errorMsg = mobile 
                ? '视频加载失败，请尝试刷新页面或切换网络' 
                : `播放错误: ${data.details}`;
              setError(errorMsg);
              setLoading(false);
              onError?.(errorMsg);
              break;
          }
        }
      });

      hlsRef.current = hls;

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (!isM3U8) {
      // Non-HLS video
      video.src = videoSrc;
      video.addEventListener('loadedmetadata', () => {
        setLoading(false);
        if (initialPosition > 0) {
          video.currentTime = initialPosition;
        }
      });
    } else {
      setError('您的浏览器不支持HLS播放，请尝试使用其他浏览器');
      setLoading(false);
    }
  }, [src, token, initialPosition, onError, retryCount, getVideoSource]);


  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      setCurrentTime(video.currentTime);
      onTimeUpdate?.(video.currentTime, video.duration);
    };

    const handleDurationChange = () => {
      setDuration(video.duration);
    };

    const handleProgress = () => {
      if (video.buffered.length > 0) {
        setBuffered(video.buffered.end(video.buffered.length - 1));
      }
    };

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      onEnded?.();
    };
    const handleWaiting = () => setLoading(true);
    const handleCanPlay = () => setLoading(false);
    const handleError = () => {
      const errorMsg = '视频加载失败';
      setError(errorMsg);
      setLoading(false);
      onError?.(errorMsg);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('progress', handleProgress);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('ended', handleEnded);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('progress', handleProgress);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('ended', handleEnded);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
    };
  }, [onTimeUpdate, onEnded, onError]);

  // Auto-hide controls
  const resetControlsTimeout = useCallback(() => {
    if (controlsTimeoutRef.current) {
      clearTimeout(controlsTimeoutRef.current);
    }
    setShowControls(true);
    if (isPlaying) {
      controlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 3000);
    }
  }, [isPlaying]);

  // Fullscreen handling
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNowFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isNowFullscreen);

      // Unlock screen orientation when exiting fullscreen
      if (!isNowFullscreen) {
        try {
          if (screen.orientation && 'unlock' in screen.orientation) {
            screen.orientation.unlock();
          }
        } catch {
          // Screen orientation unlock not supported
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      // Cleanup: unlock orientation on unmount
      try {
        if (screen.orientation && 'unlock' in screen.orientation) {
          screen.orientation.unlock();
        }
      } catch {
        // Ignore
      }
    };
  }, []);


  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
    resetControlsTimeout();
  };

  const toggleFullscreen = async () => {
    const container = containerRef.current;
    if (!container) return;

    try {
      if (!document.fullscreenElement) {
        await container.requestFullscreen();
        // Try to lock screen orientation to landscape on mobile
        try {
          if (screen.orientation && 'lock' in screen.orientation) {
            await (screen.orientation.lock as (orientation: string) => Promise<void>)('landscape');
          }
        } catch {
          // Screen orientation lock not supported or not allowed
          // This is expected on desktop browsers
        }
      } else {
        // Unlock screen orientation before exiting fullscreen
        try {
          if (screen.orientation && 'unlock' in screen.orientation) {
            (screen.orientation.unlock as () => void)();
          }
        } catch {
          // Screen orientation unlock not supported
        }
        await document.exitFullscreen();
      }
    } catch (err) {
      console.error('Fullscreen error:', err);
    }
  };

  const seek = (time: number) => {
    const video = videoRef.current;
    if (!video) return;
    video.currentTime = Math.max(0, Math.min(time, duration));
  };

  const handleProgressClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    seek(percent * duration);
  };

  // Gesture controls
  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    touchStartRef.current = {
      x: touch.clientX,
      y: touch.clientY,
      time: Date.now(),
    };
    gestureTypeRef.current = null;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStartRef.current.x;
    const deltaY = touch.clientY - touchStartRef.current.y;
    const container = containerRef.current;
    if (!container) return;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;

    if (!gestureTypeRef.current) {
      if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 10) {
        gestureTypeRef.current = 'seek';
      } else if (Math.abs(deltaY) > Math.abs(deltaX) && Math.abs(deltaY) > 10) {
        gestureTypeRef.current = touchStartRef.current.x < containerWidth / 2 ? 'brightness' : 'volume';
      }
    }

    if (gestureTypeRef.current === 'seek') {
      const seekDelta = (deltaX / containerWidth) * duration * 0.5;
      const newTime = Math.max(0, Math.min(currentTime + seekDelta, duration));
      setGestureInfo({
        type: '快进/快退',
        value: formatTime(newTime),
      });
    } else if (gestureTypeRef.current === 'volume') {
      const video = videoRef.current;
      if (video) {
        const volumeDelta = -deltaY / containerHeight;
        const newVolume = Math.max(0, Math.min(1, video.volume + volumeDelta * 0.5));
        video.volume = newVolume;
        setGestureInfo({
          type: '音量',
          value: `${Math.round(newVolume * 100)}%`,
        });
      }
    }
  };

  const handleTouchEnd = () => {
    touchStartRef.current = null;
    gestureTypeRef.current = null;
    setGestureInfo(null);
    resetControlsTimeout();
  };

  const formatTime = (seconds: number): string => {
    if (!isFinite(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };


  return (
    <div
      ref={containerRef}
      className={`relative bg-black ${isFullscreen ? 'fixed inset-0 z-50' : 'aspect-video'}`}
      onClick={resetControlsTimeout}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <video
        ref={videoRef}
        className="w-full h-full object-contain"
        poster={poster}
        playsInline
        webkit-playsinline="true"
        x5-video-player-type="h5"
        x5-video-player-fullscreen="true"
        x5-video-orientation="landscape"
        crossOrigin="anonymous"
        preload="auto"
      />

      {/* Loading Spinner */}
      {loading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <svg className="w-12 h-12 animate-spin text-white" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
          </svg>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white">
          <svg className="w-12 h-12 mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Gesture Info Overlay */}
      {gestureInfo && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-2 bg-black/70 rounded-lg text-white text-center">
          <p className="text-xs text-white/70">{gestureInfo.type}</p>
          <p className="text-lg font-bold">{gestureInfo.value}</p>
        </div>
      )}

      {/* Controls Overlay */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0 pointer-events-none'
          }`}
      >
        {/* Center Play Button */}
        <button
          onClick={togglePlay}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 flex items-center justify-center bg-black/50 rounded-full text-white"
        >
          {isPlaying ? (
            <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 24 24">
              <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg className="w-8 h-8 ml-1" fill="currentColor" viewBox="0 0 24 24">
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>

        {/* Bottom Controls */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-4">
          {/* Progress Bar */}
          <div
            className="relative h-1 bg-white/30 rounded-full mb-3 cursor-pointer"
            onClick={handleProgressClick}
          >
            <div
              className="absolute h-full bg-white/50 rounded-full"
              style={{ width: `${(buffered / duration) * 100}%` }}
            />
            <div
              className="absolute h-full bg-primary rounded-full"
              style={{ width: `${(currentTime / duration) * 100}%` }}
            />
            <div
              className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-primary rounded-full -ml-1.5"
              style={{ left: `${(currentTime / duration) * 100}%` }}
            />
          </div>

          {/* Time and Controls */}
          <div className="flex items-center justify-between text-white text-sm">
            <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
            <button onClick={toggleFullscreen} className="p-2">
              {isFullscreen ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M9 15v4.5M9 15H4.5M9 15l-5.25 5.25M15 9h4.5M15 9V4.5M15 9l5.25-5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
});

// Main export component that delegates to the appropriate player
export const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(function VideoPlayer(props, ref) {
  const { useIframe = false, src, token, ...rest } = props;

  if (useIframe && src) {
    return <IframePlayer src={src} />;
  }

  return <NativeVideoPlayer ref={ref} src={src} token={token} {...rest} />;
});
