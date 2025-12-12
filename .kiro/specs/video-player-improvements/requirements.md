# Requirements Document

## Introduction

本文档定义了PWA视频播放器页面的改进需求。当前播放器基于ArtPlayer实现，支持HLS流媒体播放，但在移动端存在播放失败的问题。本次改进的核心目标是确保移动端能正常播放视频，同时优化播放体验。

视频源通过代理API（/api/proxy/m3u8、/api/proxy/ts、/api/proxy/video）处理，以解决CORS和混合内容问题。当前问题可能出在：
1. HLS.js在移动端的配置不够优化
2. 代理API的响应头或内容处理问题
3. iOS Safari原生HLS支持与代理URL的兼容性
4. 移动端网络超时设置过短

## Glossary

- **VideoPlayer**: 视频播放器组件，负责视频的加载、播放和控制
- **ArtPlayer**: 第三方视频播放器库，提供丰富的播放器功能
- **HLS (HTTP Live Streaming)**: 苹果公司开发的流媒体传输协议，用于视频流的分段传输
- **HLS.js**: JavaScript库，用于在不原生支持HLS的浏览器中播放HLS流
- **M3U8**: HLS协议使用的播放列表文件格式
- **TS Segment**: HLS视频流的分段文件，通常为.ts格式
- **Proxy API**: 代理API，用于绑定CORS限制和处理混合内容问题
- **Mixed Content**: HTTPS页面加载HTTP资源时产生的安全问题

## Requirements

### Requirement 1: 移动端HLS播放兼容性修复

**User Story:** As a 移动端用户, I want 视频能在我的手机上正常播放, so that 我可以在移动设备上观看影片。

#### Acceptance Criteria

1. WHEN 在iOS Safari上播放HLS视频 THEN VideoPlayer SHALL 优先使用原生HLS支持并正确处理代理URL
2. WHEN 在Android浏览器上播放HLS视频 THEN VideoPlayer SHALL 使用HLS.js并配置移动端优化参数
3. WHEN HLS.js初始化失败 THEN VideoPlayer SHALL 回退到原生video标签直接播放
4. WHEN 代理URL返回M3U8内容 THEN VideoPlayer SHALL 正确解析并加载所有TS分段
5. WHEN 移动端网络较慢 THEN VideoPlayer SHALL 使用更长的超时时间和更多的重试次数
6. IF 视频加载失败 THEN VideoPlayer SHALL 显示具体错误信息并提供重试按钮

### Requirement 2: 代理API移动端优化

**User Story:** As a 移动端用户, I want 视频代理服务能正确处理我的请求, so that 视频流能顺利加载。

#### Acceptance Criteria

1. WHEN 移动端请求M3U8文件 THEN Proxy API SHALL 返回正确的Content-Type头（application/vnd.apple.mpegurl）
2. WHEN M3U8包含相对路径 THEN Proxy API SHALL 正确重写为代理URL
3. WHEN 请求TS分段 THEN Proxy API SHALL 使用流式传输以减少内存占用
4. WHEN 请求超时 THEN Proxy API SHALL 返回适当的错误响应而非挂起
5. WHEN 源服务器返回重定向 THEN Proxy API SHALL 正确跟随重定向并更新基础URL

### Requirement 3: 播放器错误处理与恢复

**User Story:** As a 用户, I want 播放器能自动处理播放错误并尝试恢复, so that 我可以获得更流畅的观看体验。

#### Acceptance Criteria

1. WHEN HLS流加载失败 THEN VideoPlayer SHALL 自动重试最多3次并显示重试状态
2. WHEN 视频解码错误发生 THEN VideoPlayer SHALL 尝试使用HLS.js的recoverMediaError方法恢复
3. WHEN 所有恢复尝试失败 THEN VideoPlayer SHALL 显示错误信息和手动重试按钮
4. IF 当前播放源不可用 THEN VideoPlayer SHALL 提示用户切换到其他播放源

### Requirement 4: 移动端手势控制

**User Story:** As a 移动端用户, I want 通过手势控制播放器, so that 我可以更方便地控制视频播放。

#### Acceptance Criteria

1. WHEN 用户双击播放器左侧区域 THEN VideoPlayer SHALL 快退10秒并显示快退提示
2. WHEN 用户双击播放器右侧区域 THEN VideoPlayer SHALL 快进10秒并显示快进提示
3. WHEN 用户单击播放器中央区域 THEN VideoPlayer SHALL 切换播放/暂停状态
4. WHEN 用户长按播放器区域 THEN VideoPlayer SHALL 以2倍速播放并显示倍速指示器
5. WHEN 用户释放长按 THEN VideoPlayer SHALL 恢复原始播放速度

### Requirement 5: 加载状态优化

**User Story:** As a 用户, I want 在视频加载时看到清晰的加载状态, so that 我知道视频正在加载而不是出错。

#### Acceptance Criteria

1. WHEN 视频开始加载 THEN VideoPlayer SHALL 显示带有封面图的加载指示器
2. WHEN 视频缓冲中 THEN VideoPlayer SHALL 显示缓冲进度指示器
3. WHEN 加载超过5秒 THEN VideoPlayer SHALL 显示"加载中，请稍候"提示
4. WHEN 加载超过15秒 THEN VideoPlayer SHALL 显示"加载较慢，可尝试切换播放源"提示

