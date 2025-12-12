/**
 * Player Utilities
 * 
 * 移动端检测和HLS配置工具函数
 * Requirements: 1.2, 1.5 - 移动端HLS播放兼容性
 */

import type Hls from 'hls.js';

/**
 * 检测是否为移动设备
 */
export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
    navigator.userAgent
  );
}

/**
 * 检测是否为iOS设备
 */
export function isIOSDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

/**
 * 检测是否为Safari浏览器（包括iOS Safari）
 */
export function isSafari(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent;
  // Safari但不是Chrome（Chrome UA也包含Safari）
  return /^((?!chrome|android).)*safari/i.test(ua) || /iPad|iPhone|iPod/.test(ua);
}

/**
 * 检测是否为Android设备
 */
export function isAndroidDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android/i.test(navigator.userAgent);
}

/**
 * 检测浏览器是否原生支持HLS
 */
export function supportsNativeHLS(): boolean {
  if (typeof window === 'undefined') return false;
  const video = document.createElement('video');
  return video.canPlayType('application/vnd.apple.mpegurl') !== '';
}

/**
 * HLS.js配置类型
 */
export type HLSConfig = Partial<Hls['config']>;

/**
 * 获取移动端优化的HLS.js配置
 * 
 * 移动端特点：
 * - 网络不稳定，需要更长超时和更多重试
 * - 内存有限，需要更小的缓冲区
 * - 带宽可能较低，从最低质量开始
 */
export function getMobileHLSConfig(): HLSConfig {
  return {
    // 禁用Worker以提高兼容性
    enableWorker: false,
    // 禁用低延迟模式以提高稳定性
    lowLatencyMode: false,
    
    // 缓冲设置 - 移动端使用更小的缓冲以减少内存占用
    maxBufferLength: 15,           // 15秒（桌面端60秒）
    maxMaxBufferLength: 30,        // 30秒（桌面端120秒）
    maxBufferSize: 15 * 1000 * 1000, // 15MB（桌面端60MB）
    maxBufferHole: 0.5,
    
    // 超时设置 - 移动端使用更长的超时以适应不稳定网络
    fragLoadingTimeOut: 30000,     // 30秒（桌面端20秒）
    manifestLoadingTimeOut: 20000, // 20秒（桌面端10秒）
    levelLoadingTimeOut: 20000,    // 20秒（桌面端10秒）
    
    // 重试设置 - 移动端使用更多重试次数
    fragLoadingMaxRetry: 8,        // 8次（桌面端6次）
    manifestLoadingMaxRetry: 6,    // 6次（桌面端4次）
    levelLoadingMaxRetry: 6,       // 6次（桌面端4次）
    
    // 重试延迟 - 移动端使用更短的初始延迟以快速重试
    fragLoadingRetryDelay: 500,    // 500ms（桌面端1000ms）
    manifestLoadingRetryDelay: 500,
    levelLoadingRetryDelay: 500,
    
    // 质量设置 - 移动端从最低质量开始以快速启动
    startLevel: 0,                 // 从最低质量开始（桌面端-1自动）
    capLevelToPlayerSize: true,    // 限制质量到播放器尺寸
    
    // CORS设置
    xhrSetup: (xhr: XMLHttpRequest) => {
      xhr.withCredentials = false;
    },
  };
}

/**
 * 获取桌面端HLS.js配置
 */
export function getDesktopHLSConfig(): HLSConfig {
  return {
    enableWorker: true,
    lowLatencyMode: false,
    
    // 缓冲设置 - 桌面端使用更大的缓冲
    maxBufferLength: 60,
    maxMaxBufferLength: 120,
    maxBufferSize: 60 * 1000 * 1000, // 60MB
    maxBufferHole: 0.5,
    
    // 超时设置
    fragLoadingTimeOut: 20000,
    manifestLoadingTimeOut: 10000,
    levelLoadingTimeOut: 10000,
    
    // 重试设置
    fragLoadingMaxRetry: 6,
    manifestLoadingMaxRetry: 4,
    levelLoadingMaxRetry: 4,
    
    // 重试延迟
    fragLoadingRetryDelay: 1000,
    manifestLoadingRetryDelay: 1000,
    levelLoadingRetryDelay: 1000,
    
    // 质量设置 - 自动选择最佳质量
    startLevel: -1,
    capLevelToPlayerSize: true,
    
    // CORS设置
    xhrSetup: (xhr: XMLHttpRequest) => {
      xhr.withCredentials = false;
    },
  };
}

/**
 * 根据设备类型获取适当的HLS.js配置
 */
export function getHLSConfig(): HLSConfig {
  return isMobileDevice() ? getMobileHLSConfig() : getDesktopHLSConfig();
}

/**
 * 获取视频源URL，处理代理和混合内容问题
 * 
 * @param originalSrc - 原始视频URL
 * @param playbackToken - 可选的播放token
 * @returns 处理后的视频URL
 */
export function getVideoSourceUrl(originalSrc: string, playbackToken?: string): string {
  const isM3U8 = originalSrc.toLowerCase().includes('.m3u8');
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  const isHttpSource = originalSrc.startsWith('http://');

  // 如果已经是代理URL，直接返回
  if (originalSrc.startsWith('/api/proxy/')) {
    return originalSrc;
  }

  // M3U8流处理 - 统一使用m3u8代理以确保URL重写正确
  if (isM3U8) {
    // 如果有token，使用安全的m3u8代理
    if (playbackToken) {
      return `/api/proxy/m3u8?token=${playbackToken}`;
    }
    // 混合内容情况（HTTPS页面加载HTTP资源），使用m3u8代理
    if (isHttps && isHttpSource) {
      return `/api/proxy/m3u8?url=${encodeURIComponent(originalSrc)}`;
    }
  }

  // 非M3U8内容的混合内容处理
  if (isHttps && isHttpSource) {
    return `/api/proxy/video?url=${encodeURIComponent(originalSrc)}`;
  }

  return originalSrc;
}

/**
 * 判断是否应该使用原生HLS播放
 * iOS Safari应该优先使用原生HLS支持
 */
export function shouldUseNativeHLS(): boolean {
  return isSafari() && supportsNativeHLS();
}

/**
 * 播放器偏好设置接口
 */
export interface PlayerPreferences {
  volume: number;           // 0-1
  playbackRate: number;     // 0.5-2
  adFreeEnabled: boolean;   // 纯净模式
  lastUpdated: number;      // 时间戳
}

const PLAYER_PREFERENCES_KEY = 'video_player_preferences';

/**
 * 获取播放器偏好设置
 */
export function getPlayerPreferences(): PlayerPreferences {
  if (typeof window === 'undefined') {
    return {
      volume: 0.7,
      playbackRate: 1,
      adFreeEnabled: true,
      lastUpdated: Date.now(),
    };
  }

  try {
    const stored = localStorage.getItem(PLAYER_PREFERENCES_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch {
    // 忽略解析错误
  }

  return {
    volume: 0.7,
    playbackRate: 1,
    adFreeEnabled: true,
    lastUpdated: Date.now(),
  };
}

/**
 * 保存播放器偏好设置
 */
export function savePlayerPreferences(prefs: Partial<PlayerPreferences>): void {
  if (typeof window === 'undefined') return;

  try {
    const current = getPlayerPreferences();
    const updated = {
      ...current,
      ...prefs,
      lastUpdated: Date.now(),
    };
    localStorage.setItem(PLAYER_PREFERENCES_KEY, JSON.stringify(updated));
  } catch {
    // 忽略存储错误
  }
}
