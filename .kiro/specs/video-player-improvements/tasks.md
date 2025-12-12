# Implementation Plan

## 1. 修复移动端HLS播放兼容性

- [x] 1.1 创建移动端检测和HLS配置工具函数
  - 创建 `src/lib/player-utils.ts` 文件
  - 实现 `isMobileDevice()` 函数，检测移动设备
  - 实现 `isSafari()` 函数，检测Safari浏览器
  - 实现 `getMobileHLSConfig()` 函数，返回移动端优化的HLS.js配置
  - 配置包含：更长超时、更多重试、更小缓冲、从最低质量开始
  - _Requirements: 1.2, 1.5_

- [ ]* 1.2 编写移动端HLS配置属性测试
  - **Property 1: Mobile HLS.js Configuration Validation**
  - **Validates: Requirements 1.2, 1.5**
  - 使用fast-check生成随机User-Agent字符串
  - 验证移动端检测时配置值符合预期

- [x] 1.3 重构VideoPlayer组件的HLS初始化逻辑
  - 修改 `src/components/player/VideoPlayer.tsx`
  - 使用新的配置工具函数
  - iOS Safari优先使用原生HLS支持
  - Android使用HLS.js并应用移动端配置
  - 添加HLS.js初始化失败时的回退逻辑
  - _Requirements: 1.1, 1.2, 1.3_

## 2. 优化代理API的M3U8处理

- [x] 2.1 改进M3U8 URL重写逻辑
  - 修改 `src/app/api/proxy/m3u8/route.ts`
  - 确保正确处理各种相对路径格式（/path、./path、path）
  - 处理重定向后的基础URL更新
  - 确保Content-Type头正确设置为 `application/vnd.apple.mpegurl`
  - _Requirements: 2.1, 2.2, 2.5_

- [ ]* 2.2 编写M3U8 URL重写属性测试
  - **Property 2: M3U8 Proxy Response Validation**
  - **Property 3: M3U8 URL Rewriting Correctness**
  - **Validates: Requirements 2.1, 2.2, 2.5**
  - 使用fast-check生成随机M3U8内容
  - 验证所有相对URL都被正确重写为代理URL

- [x] 2.3 优化TS分段代理的流式传输
  - 检查 `src/app/api/proxy/ts/route.ts` 的流式传输实现
  - 确保使用 `response.body` 直接流式传输
  - 添加适当的缓存头以提高移动端性能
  - _Requirements: 2.3_

- [x] 2.4 改进代理API的超时处理
  - 修改代理API的超时设置
  - 确保超时时返回适当的错误响应（502）而非挂起
  - 添加超时错误的详细日志
  - _Requirements: 2.4_

## 3. Checkpoint - 确保代理API测试通过

- [ ] 3. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## 4. 增强播放器错误处理

- [x] 4.1 创建错误处理工具和类型
  - 在 `VideoPlayer.tsx` 中内联实现（代码量较小，无需独立文件）
  - 定义 `ErrorType` 类型和 `ErrorState` 接口
  - 实现 `ERROR_MESSAGES` 错误消息映射（中文）
  - 实现错误恢复策略（网络错误重试、媒体错误恢复）
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [x] 4.2 在VideoPlayer中实现错误恢复逻辑
  - 修改 `src/components/player/VideoPlayer.tsx`
  - 实现HLS网络错误自动重试（最多3次）
  - 实现媒体错误恢复（recoverMediaError）
  - 添加错误状态管理
  - 显示错误信息和重试按钮
  - 添加切换播放源提示
  - _Requirements: 3.1, 3.2, 3.3, 3.4_

- [ ]* 4.3 编写错误处理单元测试
  - 测试错误类型判断逻辑
  - 测试重试计数逻辑
  - 测试错误消息映射
  - _Requirements: 3.1, 3.2, 3.3_

## 5. 实现移动端手势控制

- [x] 5.1 实现手势处理逻辑
  - 在 `VideoPlayer.tsx` 中内联实现（与ArtPlayer紧密耦合）
  - 实现双击检测逻辑（左侧快退、右侧快进）
  - 实现长按检测逻辑（倍速播放）
  - 实现单击检测逻辑（中央区域播放/暂停切换）
  - 使用延迟检测区分单击和双击
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ]* 5.2 编写手势控制属性测试
  - **Property 4: Double-tap Seek Behavior**
  - **Property 5: Long-press Playback Rate**
  - **Property 6: Play/Pause Toggle**
  - **Validates: Requirements 4.1, 4.2, 4.3, 4.4, 4.5**
  - 使用fast-check生成随机视频时长和当前时间
  - 验证双击快进快退计算正确
  - 验证长按倍速和释放恢复正确

- [x] 5.3 在VideoPlayer中集成手势控制
  - 手势逻辑已内联在 `VideoPlayer.tsx` 中
  - 添加 `GestureHint` 组件显示手势提示UI
  - 使用300ms延迟区分单击和双击，避免冲突
  - 长按使用500ms阈值触发2倍速
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

## 6. 优化加载状态反馈

- [x] 6.1 实现加载状态管理
  - 在 `VideoPlayer.tsx` 中使用 `useState` 和 `useEffect` 内联实现
  - 使用 `loading` 状态跟踪加载中
  - 使用 `loadingMessage` 状态显示提示信息
  - 5秒后显示"加载中，请稍候"提示
  - 15秒后显示"加载较慢，可尝试切换播放源"提示
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 6.2 在VideoPlayer中集成加载状态
  - 添加 `LoadingIndicator` 组件显示加载指示器
  - 显示带封面图的加载指示器（半透明背景）
  - 缓冲进度由ArtPlayer原生处理
  - 显示加载提示信息
  - _Requirements: 5.1, 5.2, 5.3, 5.4_

## 7. Checkpoint - 确保所有测试通过

- [ ] 7. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

## 8. 集成测试和最终验证

- [x] 8.1 更新播放页面集成
  - 修改 `src/app/play/[id]/page.tsx`
  - 确保正确传递新的props（onSourceSwitch等）
  - 添加切换播放源的处理逻辑
  - 测试完整播放流程
  - _Requirements: 1.1, 3.4_

- [ ]* 8.2 编写集成测试
  - 测试VideoPlayer组件的完整渲染
  - 测试错误状态显示
  - 测试手势交互
  - _Requirements: 1.1, 3.1, 4.1_

## 9. Final Checkpoint - 确保所有测试通过

- [ ] 9. Final Checkpoint
  - Ensure all tests pass, ask the user if questions arise.
