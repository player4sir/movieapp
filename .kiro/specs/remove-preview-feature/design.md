# Design Document: Remove Preview Feature

## Overview

本设计文档描述了移除付费墙系统中试看（Preview）功能的技术方案。主要变更包括：
1. 简化前端播放页面的访问控制逻辑
2. 将 AccessType 中的 'preview' 改为 'locked'
3. 移除前端试看时间追踪相关代码
4. 更新后端 API 响应结构

## Architecture

### 变更前后对比

```
变更前流程:
┌─────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│ 用户访问 │───▶│ 检查访问权限  │───▶│ 返回 preview │───▶│ 播放视频     │
└─────────┘    └──────────────┘    └─────────────┘    │ + 时间追踪   │
                                                       └──────┬───────┘
                                                              │ 超时
                                                              ▼
                                                       ┌──────────────┐
                                                       │ 显示解锁弹窗  │
                                                       └──────────────┘

变更后流程:
┌─────────┐    ┌──────────────┐    ┌─────────────┐    ┌──────────────┐
│ 用户访问 │───▶│ 检查访问权限  │───▶│ 返回 locked  │───▶│ 显示解锁弹窗  │
└─────────┘    └──────────────┘    └─────────────┘    │ + 视频封面   │
                                                       └──────────────┘
```

### 系统架构图

```mermaid
graph TB
    subgraph Frontend
        A[PlayPage] --> B[useContentAccess Hook]
        A --> C[VideoPlayer]
        A --> D[UnlockPromptModal]
    end
    
    subgraph Backend
        E[/api/content/access] --> F[PaywallService]
        G[/api/content/unlock] --> F
        F --> H[ContentAccessRepository]
        F --> I[UserRepository]
    end
    
    B --> E
    B --> G
```

## Components and Interfaces

### 1. AccessType 类型变更

```typescript
// 变更前
export type AccessType = 'free' | 'vip' | 'purchased' | 'preview';

// 变更后
export type AccessType = 'free' | 'vip' | 'purchased' | 'locked';
```

### 2. AccessResult 接口变更

```typescript
// 变更前
export interface AccessResult {
  hasAccess: boolean;
  accessType: AccessType;
  previewDuration?: number;  // 将被移除
  price?: number;
  unlockedAt?: Date;
}

// 变更后
export interface AccessResult {
  hasAccess: boolean;
  accessType: AccessType;
  price?: number;            // 仅当 accessType === 'locked' 时存在
  unlockedAt?: Date;         // 仅当 accessType === 'purchased' 时存在
}
```

### 3. PlayPage 状态简化

需要移除的状态变量：
- `previewDuration: number`
- `previewExpired: boolean`
- `previewTimeRef: MutableRefObject<number>`

需要移除的逻辑：
- `handleTimeUpdate` 中的试看时间追踪
- Preview Mode Indicator UI 组件

### 4. PaywallService 变更

`checkAccess` 函数返回值变更：
- 无权限时返回 `accessType: 'locked'` 而非 `'preview'`
- 不再返回 `previewDuration` 字段

## Data Models

### AccessResult 数据模型

| 字段 | 类型 | 描述 | 条件 |
|------|------|------|------|
| hasAccess | boolean | 是否有访问权限 | 必需 |
| accessType | 'free' \| 'vip' \| 'purchased' \| 'locked' | 访问类型 | 必需 |
| price | number | 解锁价格（金币） | 仅当 locked |
| unlockedAt | Date | 解锁时间 | 仅当 purchased |

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Access type determination based on user status

*For any* user and content combination, the checkAccess function should return the correct accessType based on user's membership status and purchase history:
- SVIP users get 'vip' for all content
- VIP users get 'vip' for normal content, 'locked' for adult content
- Users with purchase records get 'purchased'
- All other users get 'locked'

**Validates: Requirements 2.1, 5.1, 5.2, 5.3**

### Property 2: Locked response structure

*For any* checkAccess call that returns accessType 'locked', the response must include a valid price (positive number) and must NOT include previewDuration.

**Validates: Requirements 2.2, 4.1, 4.2**

### Property 3: Full access response structure

*For any* checkAccess call that returns hasAccess true, the accessType must be one of 'free', 'vip', or 'purchased', and previewDuration must NOT be present.

**Validates: Requirements 1.2, 4.1**

### Property 4: Price consistency with source category

*For any* locked content, the price returned must match the configured price for the content's sourceCategory (normal or adult).

**Validates: Requirements 2.2**

## Error Handling

### 前端错误处理

| 场景 | 处理方式 |
|------|----------|
| API 请求失败 | 显示错误提示，允许重试 |
| 用户未登录 | 返回 locked 状态，引导登录 |
| 解锁失败 | 显示具体错误信息（余额不足等） |

### 后端错误处理

保持现有错误处理逻辑不变：
- `INSUFFICIENT_BALANCE`: 余额不足
- `ALREADY_UNLOCKED`: 已解锁
- `USER_NOT_FOUND`: 用户不存在

## Testing Strategy

### 单元测试

1. **PaywallService.checkAccess**
   - 测试各种用户状态（free/vip/svip）的返回值
   - 测试已购买内容的返回值
   - 验证不再返回 previewDuration

2. **useContentAccess Hook**
   - 测试 checkAccess 返回 locked 时的状态更新
   - 测试缓存逻辑

### 属性测试

使用 fast-check 库进行属性测试：

1. **Property 1 测试**: 生成随机用户状态和内容类型，验证 accessType 返回正确
2. **Property 2 测试**: 生成返回 locked 的场景，验证响应结构
3. **Property 3 测试**: 生成有权限的场景，验证响应结构
4. **Property 4 测试**: 生成不同 sourceCategory，验证价格一致性

每个属性测试配置运行 100 次迭代。

### 集成测试

1. 测试完整的访问检查流程
2. 测试解锁流程
3. 测试 VIP/SVIP 权限验证

## Migration Notes

### 需要更新的文件

1. `src/services/paywall.service.ts` - 修改 checkAccess 返回值
2. `src/hooks/useContentAccess.ts` - 更新 AccessType 类型
3. `src/app/play/[id]/page.tsx` - 移除试看相关状态和逻辑
4. `src/components/paywall/UnlockPromptModal.tsx` - 移除"试看时间已结束"提示
5. `src/app/api/content/access/route.ts` - 更新 API 文档注释

### 向后兼容性

- 前端需要同时处理旧的 'preview' 和新的 'locked' 类型（过渡期）
- 建议在一次部署中同时更新前后端
