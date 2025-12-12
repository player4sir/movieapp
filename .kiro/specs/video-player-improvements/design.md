# Design Document: Video Player Improvements

## Overview

本设计文档描述了PWA视频播放器的改进方案，核心目标是解决移动端播放失败的问题，同时优化播放体验。

当前播放器架构：
- 前端使用ArtPlayer + HLS.js处理HLS流媒体
- 后端通过代理API（/api/proxy/m3u8、/api/proxy/ts、/api/proxy/video）处理CORS和混合内容问题
- 视频源URL通过token机制保护，支持预览模式和完整播放

主要改进方向：
1. 修复移动端HLS播放兼容性问题
2. 优化代理API的移动端支持
3. 增强错误处理和恢复机制
4. 添加移动端手势控制
5. 优化加载状态反馈

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Play Page                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    VideoPlayer                           │   │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │   │
│  │  │ ArtPlayer   │  │  HLS.js     │  │ Native Video    │  │   │
│  │  │ (Controls)  │  │ (Streaming) │  │ (iOS Fallback)  │  │   │
│  │  └─────────────┘  └─────────────┘  └─────────────────┘  │   │
│  │                         │                                │   │
│  │  ┌─────────────────────────────────────────────────────┐│   │
│  │  │              Gesture Handler                        ││   │
│  │  │  (Double-tap, Long-press, Swipe)                   ││   │
│  │  └─────────────────────────────────────────────────────┘│   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Proxy API Layer                             │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │ /api/proxy/m3u8 │  │ /api/proxy/ts   │  │ /api/proxy/video│ │
│  │ (Manifest)      │  │ (Segments)      │  │ (Generic)       │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
│                              │                                   │
│  ┌─────────────────────────────────────────────────────────────┐│
│  │              URL Rewriting & CORS Handling                  ││
│  └─────────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    External Video Sources                        │
│                    (HLS Streams, M3U8 Files)                    │
└─────────────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. VideoPlayer Component (Enhanced)

```typescript
interface VideoPlayerProps {
  src: string;                    // 视频源URL（代理URL）
  poster?: string;                // 封面图
  initialPosition?: number;       // 初始播放位置
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onEnded?: () => void;
  onError?: (error: VideoError) => void;
  onSourceSwitch?: () => void;    // 新增：切换播放源回调
  useIframe?: boolean;            // 使用iframe模式
  token?: string;                 // 播放token
}

interface VideoError {
  type: 'network' | 'decode' | 'source' | 'unknown';
  message: string;
  recoverable: boolean;
  retryCount: number;
}

interface VideoPlayerRef {
  pause: () => void;
  play: () => void;
  getCurrentTime: () => number;
  seek: (time: number) => void;
  retry: () => void;              // 新增：重试播放
  setPlaybackRate: (rate: number) => void;  // 新增：设置播放速度
}
```

### 2. HLS Configuration for Mobile

```typescript
interface MobileHLSConfig {
  // 缓冲设置 - 移动端使用更小的缓冲
  maxBufferLength: number;        // 15秒（移动端）vs 60秒（桌面端）
  maxMaxBufferLength: number;     // 30秒（移动端）vs 120秒（桌面端）
  maxBufferSize: number;          // 15MB（移动端）vs 60MB（桌面端）
  
  // 超时设置 - 移动端使用更长的超时
  fragLoadingTimeOut: number;     // 30秒（移动端）vs 20秒（桌面端）
  manifestLoadingTimeOut: number; // 20秒（移动端）vs 10秒（桌面端）
  
  // 重试设置 - 移动端使用更多重试
  fragLoadingMaxRetry: number;    // 8次（移动端）vs 6次（桌面端）
  manifestLoadingMaxRetry: number;// 6次（移动端）vs 4次（桌面端）
  
  // 质量设置
  startLevel: number;             // 0（移动端从最低质量开始）vs -1（自动）
  capLevelToPlayerSize: boolean;  // true（限制质量到播放器尺寸）
}
```

### 3. Gesture Handler

```typescript
interface GestureState {
  type: 'none' | 'seek' | 'volume' | 'brightness' | 'longpress';
  startX: number;
  startY: number;
  startTime: number;
  lastTapTime: number;
  lastTapX: number;
}

interface GestureConfig {
  doubleTapThreshold: number;     // 双击时间阈值（300ms）
  longPressThreshold: number;     // 长按时间阈值（500ms）
  seekSensitivity: number;        // 快进快退灵敏度
  doubleTapSeekTime: number;      // 双击快进/快退时间（10秒）
  longPressPlaybackRate: number;  // 长按播放速度（2x）
}
```

### 4. Loading State Manager

```typescript
interface LoadingState {
  isLoading: boolean;
  isBuffering: boolean;
  loadingStartTime: number | null;
  loadingDuration: number;
  showSlowLoadingHint: boolean;   // 超过5秒显示
  showSwitchSourceHint: boolean;  // 超过15秒显示
}
```

## Data Models

### Error Types

```typescript
enum VideoErrorType {
  NETWORK_ERROR = 'network',      // 网络错误
  DECODE_ERROR = 'decode',        // 解码错误
  SOURCE_ERROR = 'source',        // 源不可用
  TIMEOUT_ERROR = 'timeout',      // 超时
  UNKNOWN_ERROR = 'unknown'       // 未知错误
}

interface VideoErrorState {
  hasError: boolean;
  errorType: VideoErrorType | null;
  errorMessage: string;
  retryCount: number;
  maxRetries: number;
  canRetry: boolean;
  canSwitchSource: boolean;
}
```

### Player Preferences (LocalStorage)

```typescript
interface PlayerPreferences {
  volume: number;                 // 0-1
  playbackRate: number;           // 0.5-2
  adFreeEnabled: boolean;         // 纯净模式
  lastUpdated: number;            // 时间戳
}

const PLAYER_PREFERENCES_KEY = 'video_player_preferences';
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Mobile HLS.js Configuration Validation

*For any* mobile device detection result, when the device is detected as mobile, the HLS.js configuration SHALL use mobile-optimized values (longer timeouts, more retries, smaller buffers).

**Validates: Requirements 1.2, 1.5**

### Property 2: M3U8 Proxy Response Validation

*For any* M3U8 file processed by the proxy API, the response SHALL have Content-Type "application/vnd.apple.mpegurl" AND all relative URLs in the content SHALL be rewritten to proxy URLs.

**Validates: Requirements 2.1, 2.2**

### Property 3: M3U8 URL Rewriting Correctness

*For any* M3U8 content containing relative paths (starting with "/" or without protocol), after proxy processing, all segment URLs SHALL be absolute proxy URLs that can be fetched.

**Validates: Requirements 2.2, 2.5**

### Property 4: Double-tap Seek Behavior

*For any* video with duration > 20 seconds, double-tapping the left third of the player SHALL decrease currentTime by 10 seconds (or to 0 if currentTime < 10), and double-tapping the right third SHALL increase currentTime by 10 seconds (or to duration if remaining < 10).

**Validates: Requirements 4.1, 4.2**

### Property 5: Long-press Playback Rate

*For any* playing video, long-pressing the player area SHALL set playbackRate to 2.0, and releasing SHALL restore the original playbackRate.

**Validates: Requirements 4.4, 4.5**

### Property 6: Play/Pause Toggle

*For any* video player state, single-clicking the center area SHALL toggle between playing and paused states.

**Validates: Requirements 4.3**

## Error Handling

### HLS Error Recovery Strategy

```typescript
const errorRecoveryStrategy = {
  // 网络错误：重试加载
  [Hls.ErrorTypes.NETWORK_ERROR]: {
    action: 'startLoad',
    maxRetries: 3,
    retryDelay: 1000,
  },
  
  // 媒体错误：尝试恢复
  [Hls.ErrorTypes.MEDIA_ERROR]: {
    action: 'recoverMediaError',
    maxRetries: 2,
    retryDelay: 500,
  },
  
  // 其他错误：显示错误UI
  default: {
    action: 'showError',
    showSwitchSourceHint: true,
  },
};
```

### Error Messages (Chinese)

```typescript
const errorMessages = {
  network: '网络连接失败，请检查网络后重试',
  decode: '视频解码失败，正在尝试恢复...',
  source: '播放源不可用，请尝试切换其他播放源',
  timeout: '加载超时，请检查网络连接',
  unknown: '播放出错，请重试',
};
```

## Testing Strategy

### Unit Testing

使用Vitest进行单元测试：

1. **HLS配置测试**：验证移动端检测和配置生成
2. **URL重写测试**：验证M3U8内容中的URL重写逻辑
3. **手势计算测试**：验证双击区域判断和时间计算
4. **错误处理测试**：验证错误类型判断和恢复策略

### Property-Based Testing

使用fast-check进行属性测试：

1. **M3U8 URL重写属性测试**：生成随机M3U8内容，验证所有URL都被正确重写
2. **双击快进快退属性测试**：生成随机视频时长和当前时间，验证快进快退计算正确
3. **播放速度切换属性测试**：验证长按和释放后播放速度的正确性

### Integration Testing

1. **代理API测试**：测试M3U8和TS分段的代理功能
2. **播放器组件测试**：测试完整的播放流程

### Manual Testing Checklist

- [ ] iOS Safari播放测试
- [ ] Android Chrome播放测试
- [ ] 弱网环境播放测试
- [ ] 双击快进快退测试
- [ ] 长按倍速播放测试
- [ ] 错误恢复测试
- [ ] 切换播放源测试
