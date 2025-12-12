'use client';

/**
 * VideoPlayer Component
 * 
 * 支持HLS流媒体播放的视频播放器组件
 * - iOS Safari优先使用原生HLS支持
 * - Android/其他浏览器使用HLS.js
 * - 移动端优化配置
 * - 错误自动恢复
 * - 手势控制（双击快进快退、长按倍速）
 * 
 * Requirements: 1.1, 1.2, 1.3, 3.1, 3.2, 4.1-4.5
 */

import { useRef, useEffect, useImperativeHandle, forwardRef, useCallback, useState } from 'react';
import Artplayer from 'artplayer';
import Hls from 'hls.js';
import {
  isMobileDevice,
  isSafari,
  shouldUseNativeHLS,
  getHLSConfig,
  getVideoSourceUrl,
  getPlayerPreferences,
  savePlayerPreferences,
} from '@/lib/player-utils';

export interface VideoPlayerRef {
  pause: () => void;
  play: () => void;
  getCurrentTime: () => number;
  seek: (time: number) => void;
  retry: () => void;
  setPlaybackRate: (rate: number) => void;
}

interface VideoPlayerProps {
  src: string;
  poster?: string;
  initialPosition?: number;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onError?: (error: string) => void;
  onSourceSwitch?: () => void;
  useIframe?: boolean;
  token?: string;
}

// 错误类型
type ErrorType = 'network' | 'decode' | 'source' | 'timeout' | 'unknown';

interface ErrorState {
  hasError: boolean;
  errorType: ErrorType | null;
  errorMessage: string;
  retryCount: number;
  canRetry: boolean;
}

// 错误消息映射
const ERROR_MESSAGES: Record<ErrorType, string> = {
  network: '网络连接失败，请检查网络后重试',
  decode: '视频解码失败，正在尝试恢复...',
  source: '播放源不可用，请尝试切换其他播放源',
  timeout: '加载超时，请检查网络连接',
  unknown: '播放出错，请重试',
};

const MAX_RETRIES = 3;

// Iframe播放器组件
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

// 加载指示器组件
function LoadingIndicator({ poster, message }: { poster?: string; message?: string }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-10">
      {poster && (
        <img
          src={poster}
          alt="Loading"
          className="absolute inset-0 w-full h-full object-cover opacity-30"
        />
      )}
      <div className="flex flex-col items-center">
        <svg className="w-12 h-12 animate-spin text-white" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        {message && (
          <p className="mt-3 text-white/80 text-sm">{message}</p>
        )}
      </div>
    </div>
  );
}

// 错误显示组件
function ErrorDisplay({ 
  error, 
  onRetry, 
  onSwitchSource,
  canRetry,
}: { 
  error: ErrorState; 
  onRetry: () => void;
  onSwitchSource?: () => void;
  canRetry: boolean;
}) {
  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 text-white z-20">
      <svg className="w-12 h-12 mb-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      <p className="text-sm mb-4 text-center px-4">{error.errorMessage}</p>
      <div className="flex gap-3">
        {canRetry && (
          <button
            onClick={onRetry}
            className="px-4 py-2 bg-primary rounded-lg text-sm hover:bg-primary/80 transition-colors"
          >
            重试 ({MAX_RETRIES - error.retryCount}次)
          </button>
        )}
        {onSwitchSource && (
          <button
            onClick={onSwitchSource}
            className="px-4 py-2 bg-white/20 rounded-lg text-sm hover:bg-white/30 transition-colors"
          >
            切换播放源
          </button>
        )}
      </div>
    </div>
  );
}

// 手势提示组件
function GestureHint({ type, value }: { type: 'seek' | 'speed'; value: string }) {
  return (
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 px-4 py-2 bg-black/70 rounded-lg text-white text-center z-30 pointer-events-none">
      <p className="text-xs text-white/70">{type === 'seek' ? '快进/快退' : '播放速度'}</p>
      <p className="text-lg font-bold">{value}</p>
    </div>
  );
}

// ArtPlayer组件
const ArtVideoPlayer = forwardRef<VideoPlayerRef, Omit<VideoPlayerProps, 'useIframe'>>(
  function ArtVideoPlayer({ src, poster, initialPosition = 0, onTimeUpdate, onEnded, onError, onSourceSwitch, token }, ref) {
    const containerRef = useRef<HTMLDivElement>(null);
    const artRef = useRef<Artplayer | null>(null);
    const hlsRef = useRef<Hls | null>(null);
    const retryCountRef = useRef(0);
    const wakeLockRef = useRef<WakeLockSentinel | null>(null);
    
    // 状态
    const [loading, setLoading] = useState(true);
    const [loadingMessage, setLoadingMessage] = useState<string | undefined>();
    const [error, setError] = useState<ErrorState>({
      hasError: false,
      errorType: null,
      errorMessage: '',
      retryCount: 0,
      canRetry: true,
    });
    const [gestureHint, setGestureHint] = useState<{ type: 'seek' | 'speed'; value: string } | null>(null);
    
    // 长按状态
    const longPressTimerRef = useRef<NodeJS.Timeout | null>(null);
    const originalPlaybackRateRef = useRef(1);
    const isLongPressingRef = useRef(false);

    // 屏幕唤醒锁管理 - 防止播放时屏幕休眠
    const requestWakeLock = useCallback(async () => {
      if ('wakeLock' in navigator) {
        try {
          wakeLockRef.current = await navigator.wakeLock.request('screen');
          console.log('[VideoPlayer] Wake lock acquired');
        } catch (err) {
          console.log('[VideoPlayer] Wake lock request failed:', err);
        }
      }
    }, []);

    const releaseWakeLock = useCallback(async () => {
      if (wakeLockRef.current) {
        try {
          await wakeLockRef.current.release();
          wakeLockRef.current = null;
          console.log('[VideoPlayer] Wake lock released');
        } catch (err) {
          console.log('[VideoPlayer] Wake lock release failed:', err);
        }
      }
    }, []);

    // 页面可见性变化时重新获取唤醒锁
    useEffect(() => {
      const handleVisibilityChange = async () => {
        if (document.visibilityState === 'visible' && artRef.current?.playing) {
          await requestWakeLock();
        }
      };

      document.addEventListener('visibilitychange', handleVisibilityChange);
      return () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }, [requestWakeLock]);

    // 加载超时处理
    useEffect(() => {
      if (!loading) return;
      
      const timer5s = setTimeout(() => {
        setLoadingMessage('加载中，请稍候...');
      }, 5000);
      
      const timer15s = setTimeout(() => {
        setLoadingMessage('加载较慢，可尝试切换播放源');
      }, 15000);
      
      return () => {
        clearTimeout(timer5s);
        clearTimeout(timer15s);
      };
    }, [loading]);

    // 处理错误
    const handleError = useCallback((type: ErrorType, details?: string) => {
      const message = ERROR_MESSAGES[type] + (details ? ` (${details})` : '');
      setError(prev => ({
        hasError: true,
        errorType: type,
        errorMessage: message,
        retryCount: prev.retryCount,
        canRetry: prev.retryCount < MAX_RETRIES,
      }));
      setLoading(false);
      onError?.(message);
    }, [onError]);

    // 重试播放
    const retry = useCallback(() => {
      if (error.retryCount >= MAX_RETRIES) return;
      
      setError(prev => ({
        ...prev,
        hasError: false,
        retryCount: prev.retryCount + 1,
      }));
      setLoading(true);
      setLoadingMessage(undefined);
      retryCountRef.current += 1;
      
      // 销毁并重新创建播放器
      if (artRef.current) {
        artRef.current.destroy();
        artRef.current = null;
      }
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    }, [error.retryCount]);

    // 暴露方法给父组件
    useImperativeHandle(ref, () => ({
      pause: () => artRef.current?.pause(),
      play: () => artRef.current?.play(),
      getCurrentTime: () => artRef.current?.currentTime ?? 0,
      seek: (time: number) => {
        if (artRef.current) {
          artRef.current.currentTime = time;
        }
      },
      retry,
      setPlaybackRate: (rate: number) => {
        if (artRef.current) {
          artRef.current.playbackRate = rate;
        }
      },
    }), [retry]);

    // 初始化播放器
    useEffect(() => {
      if (!containerRef.current || !src || error.hasError) return;

      const videoSrc = getVideoSourceUrl(src, token);
      const isM3U8 = src.toLowerCase().includes('.m3u8') || videoSrc.includes('/api/proxy/');
      const mobile = isMobileDevice();
      const safari = isSafari();
      const useNative = shouldUseNativeHLS();
      
      // 获取保存的偏好设置
      const prefs = getPlayerPreferences();

      // HLS.js自定义加载器
      const playM3u8 = (video: HTMLVideoElement, url: string, art: Artplayer) => {
        // iOS Safari优先使用原生HLS（Requirements: 1.1）
        if (useNative && retryCountRef.current === 0) {
          console.log('[VideoPlayer] Using native HLS support (Safari/iOS)');
          video.src = url;
          
          video.addEventListener('loadedmetadata', () => {
            setLoading(false);
            if (initialPosition > 0) {
              video.currentTime = initialPosition;
            }
          }, { once: true });
          
          video.addEventListener('error', () => {
            console.log('[VideoPlayer] Native HLS failed, falling back to HLS.js');
            // 原生播放失败，尝试HLS.js
            if (Hls.isSupported()) {
              video.src = '';
              retryCountRef.current += 1;
              retry();
            } else {
              handleError('source', 'HLS不支持');
            }
          }, { once: true });
          
          return;
        }

        // 使用HLS.js（Requirements: 1.2, 1.5）
        if (Hls.isSupported()) {
          console.log('[VideoPlayer] Using HLS.js', mobile ? '(mobile config)' : '(desktop config)');
          const hlsConfig = getHLSConfig();
          const hls = new Hls(hlsConfig);

          hls.loadSource(url);
          hls.attachMedia(video);
          hlsRef.current = hls;

          // 清单解析完成
          hls.on(Hls.Events.MANIFEST_PARSED, () => {
            setLoading(false);
            if (initialPosition > 0) {
              video.currentTime = initialPosition;
            }
            
            // 画质切换支持
            const qualities = hls.levels.map((level, index) => ({
              html: level.height ? `${level.height}P` : `质量 ${index + 1}`,
              value: index,
            }));

            if (qualities.length > 1) {
              qualities.unshift({ html: '自动', value: -1 });
              art.setting.update({
                name: 'quality',
                selector: qualities,
                onSelect: (item) => {
                  hls.currentLevel = item.value as number;
                  return item.html;
                },
              });
            }
          });

          // 错误处理（Requirements: 3.1, 3.2）
          hls.on(Hls.Events.ERROR, (_, data) => {
            console.error('[VideoPlayer] HLS Error:', data.type, data.details);
            
            if (data.fatal) {
              switch (data.type) {
                case Hls.ErrorTypes.NETWORK_ERROR:
                  console.log('[VideoPlayer] Network error, attempting recovery...');
                  hls.startLoad();
                  break;
                case Hls.ErrorTypes.MEDIA_ERROR:
                  console.log('[VideoPlayer] Media error, attempting recovery...');
                  hls.recoverMediaError();
                  break;
                default:
                  handleError('unknown', data.details);
                  break;
              }
            }
          });

          art.on('destroy', () => {
            hls.destroy();
            hlsRef.current = null;
          });
        } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
          // 回退到原生HLS（Requirements: 1.3）
          console.log('[VideoPlayer] Falling back to native HLS');
          video.src = url;
        } else {
          handleError('source', '浏览器不支持HLS');
        }
      };

      // 创建ArtPlayer实例
      const art = new Artplayer({
        container: containerRef.current,
        url: videoSrc,
        poster: poster || '',
        volume: prefs.volume,
        isLive: false,
        muted: false,
        autoplay: false,
        pip: !mobile, // 移动端禁用PiP（兼容性问题）
        autoSize: false,
        autoMini: false,
        screenshot: !mobile,
        setting: true,
        loop: false,
        flip: !mobile,
        playbackRate: true,
        aspectRatio: !mobile,
        fullscreen: true,
        fullscreenWeb: true,
        subtitleOffset: false,
        miniProgressBar: true,
        mutex: true,
        backdrop: true,
        playsInline: true,
        autoPlayback: true,
        airplay: safari,
        theme: '#3b82f6',
        lang: 'zh-cn',
        moreVideoAttr: {
          crossOrigin: 'anonymous',
          playsInline: true,
          'webkit-playsinline': 'true',
          'x5-video-player-type': 'h5',
          'x5-video-player-fullscreen': 'true',
        } as Record<string, unknown>,
        settings: [
          {
            name: 'quality',
            html: '画质',
            tooltip: '自动',
            selector: [{ html: '自动', value: -1 }],
          },
        ],
        controls: mobile ? [] : [
          {
            name: 'fast-rewind',
            position: 'right',
            html: '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M11 18V6l-8.5 6 8.5 6zm.5-6l8.5 6V6l-8.5 6z"/></svg>',
            tooltip: '快退10秒',
            click: () => {
              art.currentTime = Math.max(0, art.currentTime - 10);
            },
          },
          {
            name: 'fast-forward',
            position: 'right',
            html: '<svg viewBox="0 0 24 24" width="22" height="22"><path fill="currentColor" d="M4 18l8.5-6L4 6v12zm9-12v12l8.5-6L13 6z"/></svg>',
            tooltip: '快进10秒',
            click: () => {
              art.currentTime = Math.min(art.duration, art.currentTime + 10);
            },
          },
        ],
        customType: {
          m3u8: playM3u8,
        },
        type: isM3U8 ? 'm3u8' : '',
      });

      // 事件处理
      art.on('video:timeupdate', () => {
        onTimeUpdate?.(art.currentTime, art.duration);
      });

      art.on('video:ended', () => {
        releaseWakeLock();
        onEnded?.();
      });

      art.on('video:error', () => {
        releaseWakeLock();
        handleError('unknown');
      });

      // 播放时请求屏幕唤醒锁
      art.on('video:play', () => {
        requestWakeLock();
      });

      // 暂停时释放唤醒锁
      art.on('video:pause', () => {
        releaseWakeLock();
      });

      art.on('ready', () => {
        setLoading(false);
        if (initialPosition > 0) {
          art.currentTime = initialPosition;
        }
        // 恢复播放速度
        if (prefs.playbackRate !== 1) {
          art.playbackRate = prefs.playbackRate;
        }
      });

      // 保存音量设置
      art.on('video:volumechange', () => {
        savePlayerPreferences({ volume: art.volume });
      });

      // 保存播放速度设置
      art.on('video:ratechange', () => {
        if (!isLongPressingRef.current) {
          savePlayerPreferences({ playbackRate: art.playbackRate });
        }
      });

      // 移动端手势控制（Requirements: 4.1-4.5）
      if (mobile) {
        let lastTap = 0;
        let lastTapX = 0;
        let singleTapTimer: NodeJS.Timeout | null = null;

        // 双击快进快退 + 单击播放/暂停
        art.on('click', (event: Event) => {
          const mouseEvent = event as MouseEvent;
          const now = Date.now();
          const tapX = mouseEvent.clientX;
          const containerWidth = containerRef.current?.clientWidth || 0;

          // 检测是否为双击（300ms内的第二次点击）
          if (now - lastTap < 300 && Math.abs(tapX - lastTapX) < 50) {
            // 取消单击定时器
            if (singleTapTimer) {
              clearTimeout(singleTapTimer);
              singleTapTimer = null;
            }
            
            // 双击检测
            if (tapX < containerWidth / 3) {
              // 左侧双击：快退10秒
              const newTime = Math.max(0, art.currentTime - 10);
              art.currentTime = newTime;
              art.notice.show = '快退 10 秒';
              setGestureHint({ type: 'seek', value: formatTime(newTime) });
              setTimeout(() => setGestureHint(null), 500);
            } else if (tapX > (containerWidth * 2) / 3) {
              // 右侧双击：快进10秒
              const newTime = Math.min(art.duration, art.currentTime + 10);
              art.currentTime = newTime;
              art.notice.show = '快进 10 秒';
              setGestureHint({ type: 'seek', value: formatTime(newTime) });
              setTimeout(() => setGestureHint(null), 500);
            } else {
              // 中央双击：也可以快进（可选行为）
            }
            
            // 重置lastTap防止连续触发
            lastTap = 0;
          } else {
            // 可能是单击，设置延迟检测
            // 如果300ms内没有第二次点击，则执行单击操作
            if (singleTapTimer) {
              clearTimeout(singleTapTimer);
            }
            
            const isCenterArea = tapX >= containerWidth / 3 && tapX <= (containerWidth * 2) / 3;
            
            singleTapTimer = setTimeout(() => {
              // 单击中央区域：切换播放/暂停（Requirements: 4.3）
              if (isCenterArea) {
                art.toggle();
              }
              singleTapTimer = null;
            }, 300);
            
            lastTap = now;
            lastTapX = tapX;
          }
        });

        // 长按倍速播放
        const handleTouchStart = () => {
          longPressTimerRef.current = setTimeout(() => {
            isLongPressingRef.current = true;
            originalPlaybackRateRef.current = art.playbackRate;
            art.playbackRate = 2;
            setGestureHint({ type: 'speed', value: '2x' });
            art.notice.show = '2倍速播放';
          }, 500);
        };

        const handleTouchEnd = () => {
          if (longPressTimerRef.current) {
            clearTimeout(longPressTimerRef.current);
            longPressTimerRef.current = null;
          }
          if (isLongPressingRef.current) {
            isLongPressingRef.current = false;
            art.playbackRate = originalPlaybackRateRef.current;
            setGestureHint(null);
            art.notice.show = '恢复正常速度';
          }
        };

        const container = containerRef.current;
        container?.addEventListener('touchstart', handleTouchStart, { passive: true });
        container?.addEventListener('touchend', handleTouchEnd, { passive: true });
        container?.addEventListener('touchcancel', handleTouchEnd, { passive: true });

        art.on('destroy', () => {
          container?.removeEventListener('touchstart', handleTouchStart);
          container?.removeEventListener('touchend', handleTouchEnd);
          container?.removeEventListener('touchcancel', handleTouchEnd);
        });
      }

      artRef.current = art;

      return () => {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
        }
        // 释放唤醒锁
        releaseWakeLock();
        if (artRef.current) {
          artRef.current.destroy();
          artRef.current = null;
        }
      };
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [src, token, poster, initialPosition, onTimeUpdate, onEnded, handleError, error.hasError, retry, requestWakeLock, releaseWakeLock]);

    return (
      <div className="relative aspect-video bg-black">
        <div ref={containerRef} className="w-full h-full" />
        
        {/* 加载指示器 */}
        {loading && !error.hasError && (
          <LoadingIndicator poster={poster} message={loadingMessage} />
        )}
        
        {/* 错误显示 */}
        {error.hasError && (
          <ErrorDisplay
            error={error}
            onRetry={retry}
            onSwitchSource={onSourceSwitch}
            canRetry={error.canRetry}
          />
        )}
        
        {/* 手势提示 */}
        {gestureHint && (
          <GestureHint type={gestureHint.type} value={gestureHint.value} />
        )}
      </div>
    );
  }
);

// 格式化时间
function formatTime(seconds: number): string {
  if (!isFinite(seconds)) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// 主导出组件
export const VideoPlayer = forwardRef<VideoPlayerRef, VideoPlayerProps>(
  function VideoPlayer(props, ref) {
    const { useIframe = false, src, token, ...rest } = props;

    if (useIframe && src) {
      return <IframePlayer src={src} />;
    }

    return <ArtVideoPlayer ref={ref} src={src} token={token} {...rest} />;
  }
);

export default VideoPlayer;
