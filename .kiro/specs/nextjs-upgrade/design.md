# Design Document: Next.js 15 Upgrade

## Overview

本设计文档描述了将 PWA 项目从 Next.js 14.2.33 升级到 Next.js 15 的技术方案。升级涉及框架核心、PWA 插件替换、破坏性变更处理和依赖更新。

### 当前状态
- Next.js: 14.2.33
- React: 18.x
- next-pwa: 5.6.0 (已停止维护)
- Node.js: 需要 18.18.0+

### 目标状态
- Next.js: 15.x (最新稳定版)
- React: 19.x (或保持 18.x)
- PWA: @ducanh2912/next-pwa 或 Serwist
- 所有依赖兼容

## Architecture

升级不改变整体架构，主要影响以下层面：

```
┌─────────────────────────────────────────────────────────┐
│                    Application Layer                     │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────────┐  │
│  │   Pages     │  │ Components  │  │   API Routes    │  │
│  │  (App Dir)  │  │             │  │  (需要更新)     │  │
│  └─────────────┘  └─────────────┘  └─────────────────┘  │
├─────────────────────────────────────────────────────────┤
│                    Framework Layer                       │
│  ┌─────────────────────────────────────────────────────┐│
│  │  Next.js 15 (升级目标)                              ││
│  │  - Turbopack (稳定版)                               ││
│  │  - 异步 Request APIs                                ││
│  │  - 新缓存策略                                       ││
│  └─────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────┤
│                      PWA Layer                           │
│  ┌─────────────────────────────────────────────────────┐│
│  │  @ducanh2912/next-pwa (替换 next-pwa)               ││
│  │  - Service Worker 生成                              ││
│  │  - Runtime Caching                                  ││
│  └─────────────────────────────────────────────────────┘│
├─────────────────────────────────────────────────────────┤
│                    Runtime Layer                         │
│  ┌─────────────────────────────────────────────────────┐│
│  │  React 19 / React 18                                ││
│  └─────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────┘
```

## Components and Interfaces

### 1. 需要更新的 API 路由

以下动态路由需要更新 params 类型为 Promise：

| 文件路径 | 当前状态 | 需要更新 |
|---------|---------|---------|
| `src/app/api/user/coins/orders/[id]/route.ts` | 旧格式 | ✅ |
| `src/app/api/admin/coins/orders/[id]/route.ts` | 旧格式 | ✅ |
| `src/app/api/admin/groups/[id]/route.ts` | 已更新 | ❌ |
| `src/app/api/admin/users/[id]/route.ts` | 已更新 | ❌ |
| 其他 `[id]` 路由 | 需检查 | 待定 |

### 2. PWA 配置迁移

```typescript
// 旧配置 (next-pwa)
import withPWA from "next-pwa";
const pwaConfig = withPWA({ dest: "public", ... });

// 新配置 (@ducanh2912/next-pwa)
import withPWA from "@ducanh2912/next-pwa";
const pwaConfig = withPWA({ dest: "public", ... });
```

### 3. next.config.mjs 更新

```typescript
// Next.js 15 配置
/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "**" },
      { protocol: "http", hostname: "**" },
    ],
  },
  output: "standalone",
  // Next.js 15 新增: 实验性功能
  experimental: {
    // 可选: 启用 React Compiler
    // reactCompiler: true,
  },
};
```

## Data Models

升级不涉及数据模型变更。现有的 Drizzle ORM schema 保持不变。

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

由于本次升级主要是框架版本更新，大部分验收标准是具体的示例测试而非通用属性。以下是可测试的正确性属性：

### Property 1: Build Success Consistency
*For any* valid source code state after upgrade, running the build command should complete with exit code 0.
**Validates: Requirements 1.3**

### Property 2: Dynamic Route Parameter Handling
*For any* API route with dynamic parameters, the params object should be awaited before accessing its properties.
**Validates: Requirements 3.1, 3.4**

### Property 3: PWA Cache Strategy Preservation
*For any* runtime caching rule defined in the original configuration, an equivalent rule should exist in the new configuration.
**Validates: Requirements 2.2**

### Property 4: Test Suite Compatibility
*For any* existing test case, the test should pass without modification (or with documented necessary changes).
**Validates: Requirements 5.5**

## Error Handling

### 升级过程中的潜在错误

1. **Peer Dependency Conflicts**
   - 症状: npm install 报错
   - 解决: 使用 `--legacy-peer-deps` 或更新冲突的包

2. **TypeScript 类型错误**
   - 症状: 构建时类型检查失败
   - 解决: 更新 params 类型为 Promise，添加 await

3. **PWA 插件不兼容**
   - 症状: 构建失败或 Service Worker 不生成
   - 解决: 迁移到 @ducanh2912/next-pwa

4. **运行时错误**
   - 症状: 页面渲染失败
   - 解决: 检查异步 API 调用是否正确 await

## Testing Strategy

### 单元测试
- 验证关键服务和工具函数在升级后仍然正常工作
- 使用现有的 Vitest 测试框架
- 运行 `npm test` 确保所有测试通过

### 集成测试
- 手动测试关键用户流程：
  - 首页加载
  - 用户登录/注册
  - 视频播放
  - 管理后台功能

### 构建验证
- 运行 `npm run build` 确保无错误
- 检查 `public/sw.js` 生成
- 验证 standalone 输出正确

### 属性测试
- 使用 fast-check 库进行属性测试
- 每个属性测试运行至少 100 次迭代
- 测试标注格式: `**Feature: nextjs-upgrade, Property {number}: {property_text}**`

### 测试覆盖范围
| 测试类型 | 覆盖内容 |
|---------|---------|
| 单元测试 | 服务层、工具函数 |
| 集成测试 | API 路由、页面渲染 |
| 构建测试 | 编译成功、PWA 生成 |
| 属性测试 | 配置一致性、参数处理 |
