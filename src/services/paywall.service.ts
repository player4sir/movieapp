/**
 * Paywall Service
 * Handles content access control, pricing, and unlock operations.
 * 
 * Requirements: 1.2, 1.3, 2.1, 4.1, 4.2
 */

import { db } from '@/db';
import {
  ContentAccessRepository,
  CoinRepository,
  CoinTransactionRepository,
  UserRepository,
} from '@/repositories';
import { UserGroupRepository } from '@/repositories';
import { SourceCategory, User, ContentAccess } from '@/db/schema';
import { getConfig } from './config.service';
import { calculateEffectivePermissions, parseGroupPermissions } from './permission.service';
import type { MemberLevel } from '@/types/auth';

// ============================================
// Error Definitions
// ============================================

export const PAYWALL_ERRORS = {
  INSUFFICIENT_BALANCE: {
    code: 'INSUFFICIENT_BALANCE',
    message: '金币余额不足',
  },
  ALREADY_UNLOCKED: {
    code: 'ALREADY_UNLOCKED',
    message: '内容已解锁',
  },
  PAYWALL_DISABLED: {
    code: 'PAYWALL_DISABLED',
    message: '付费功能已关闭',
  },
  INVALID_CONTENT: {
    code: 'INVALID_CONTENT',
    message: '无效的内容',
  },
  USER_NOT_FOUND: {
    code: 'USER_NOT_FOUND',
    message: '用户不存在',
  },
  TRANSACTION_FAILED: {
    code: 'TRANSACTION_FAILED',
    message: '交易处理失败',
  },
} as const;

// ============================================
// Types
// ============================================

export type AccessType = 'free' | 'vip' | 'purchased' | 'locked';

export interface AccessResult {
  hasAccess: boolean;
  accessType: AccessType;
  price?: number;            // Only present when accessType === 'locked'
  unlockedAt?: Date;         // Only present when accessType === 'purchased'
}

export interface UnlockResult {
  success: boolean;
  coinsSpent: number;
  newBalance: number;
  accessRecord: ContentAccess;
}

// ============================================
// Configuration Keys
// ============================================

const CONFIG_KEYS = {
  NORMAL_PRICE: 'paywall_normal_price',
  ADULT_PRICE: 'paywall_adult_price',
  ENABLED: 'paywall_enabled',
  VIP_DISCOUNT: 'paywall_vip_discount',
  PREVIEW_PERCENTAGE: 'paywall_preview_percentage',
  PREVIEW_MIN_SECONDS: 'paywall_preview_min_seconds',
  PREVIEW_MAX_SECONDS: 'paywall_preview_max_seconds',
} as const;

// Default values if config not found
const DEFAULT_CONFIG = {
  normalPrice: 1,
  adultPrice: 10,
  enabled: true,
  vipDiscount: 0.5, // 50% discount for VIP on adult content
  previewPercentage: 0.25, // 25% of video duration
  previewMinSeconds: 60, // Minimum 1 minute
  previewMaxSeconds: 360, // Maximum 6 minutes
};

// ============================================
// Helper Functions
// ============================================

function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Get user's effective member level considering group permissions.
 * Group permissions can override user's individual member level.
 */
async function getEffectiveMemberLevel(user: User & { group?: { permissions: unknown } | null }): Promise<MemberLevel> {
  // Parse group permissions if user belongs to a group
  const groupPermissions = user.group ? parseGroupPermissions(user.group.permissions) : null;

  // Calculate effective permissions
  const effectivePerms = calculateEffectivePermissions(
    { memberLevel: user.memberLevel, memberExpiry: user.memberExpiry },
    groupPermissions
  );

  return effectivePerms.memberLevel;
}

/**
 * Check if user's membership (own or from group) has valid expiry.
 * For group-granted memberships, we don't require expiry.
 */
function hasMembershipValidity(user: User, effectiveLevel: MemberLevel, hasGroupOverride: boolean): boolean {
  // If the group grants the membership level, it's always valid (no expiry check)
  if (hasGroupOverride) {
    return true;
  }

  // For user's own membership, check expiry
  if (effectiveLevel === 'free') return false;
  if (!user.memberExpiry) return false;
  return new Date(user.memberExpiry) > new Date();
}

/**
 * Check if user has active VIP or higher membership.
 */
async function isVipActive(user: User & { group?: { permissions: unknown } | null }): Promise<boolean> {
  const effectiveLevel = await getEffectiveMemberLevel(user);
  if (effectiveLevel === 'free') return false;

  // Check if group grants the membership
  const groupPermissions = user.group ? parseGroupPermissions(user.group.permissions) : null;
  const hasGroupOverride = !!groupPermissions?.memberLevel;

  return hasMembershipValidity(user, effectiveLevel, hasGroupOverride);
}

/**
 * Check if user has active SVIP membership.
 */
async function isSvipActive(user: User & { group?: { permissions: unknown } | null }): Promise<boolean> {
  const effectiveLevel = await getEffectiveMemberLevel(user);
  if (effectiveLevel !== 'svip') return false;

  // Check if group grants the membership
  const groupPermissions = user.group ? parseGroupPermissions(user.group.permissions) : null;
  const hasGroupOverride = groupPermissions?.memberLevel === 'svip';

  return hasMembershipValidity(user, effectiveLevel, hasGroupOverride);
}

// ============================================
// PaywallService Implementation
// ============================================

const contentAccessRepository = new ContentAccessRepository();
const coinRepository = new CoinRepository();
const userRepository = new UserRepository();
const groupRepository = new UserGroupRepository();

/**
 * Get base price for content based on source category.
 */
async function getBasePrice(sourceCategory: SourceCategory): Promise<number> {
  try {
    const configKey = sourceCategory === 'adult'
      ? CONFIG_KEYS.ADULT_PRICE
      : CONFIG_KEYS.NORMAL_PRICE;

    const config = await getConfig(configKey);
    return typeof config.value === 'number' ? config.value :
      (sourceCategory === 'adult' ? DEFAULT_CONFIG.adultPrice : DEFAULT_CONFIG.normalPrice);
  } catch {
    return sourceCategory === 'adult' ? DEFAULT_CONFIG.adultPrice : DEFAULT_CONFIG.normalPrice;
  }
}

/**
 * Get VIP discount rate (0-1, where 0.5 = 50% discount)
 */
async function getVipDiscount(): Promise<number> {
  try {
    const config = await getConfig(CONFIG_KEYS.VIP_DISCOUNT);
    return typeof config.value === 'number' ? config.value : DEFAULT_CONFIG.vipDiscount;
  } catch {
    return DEFAULT_CONFIG.vipDiscount;
  }
}

/**
 * Get price for content based on source category and member level.
 * VIP users get a discount on adult content.
 * 
 * Requirements: 1.2, 1.3
 */
export async function getPrice(
  sourceCategory: SourceCategory,
  memberLevel?: MemberLevel
): Promise<number> {
  const basePrice = await getBasePrice(sourceCategory);

  // VIP gets discount on adult content only
  if (memberLevel === 'vip' && sourceCategory === 'adult') {
    const discount = await getVipDiscount();
    return Math.ceil(basePrice * (1 - discount));
  }

  return basePrice;
}

/**
 * Check if paywall is enabled.
 */
export async function isPaywallEnabled(): Promise<boolean> {
  try {
    const config = await getConfig(CONFIG_KEYS.ENABLED);
    return config.value === true;
  } catch {
    return DEFAULT_CONFIG.enabled;
  }
}

/**
 * Preview configuration interface
 */
export interface PreviewConfig {
  percentage: number;  // 0-1, e.g., 0.25 = 25%
  minSeconds: number;  // Minimum preview duration
  maxSeconds: number;  // Maximum preview duration
}

/**
 * Get preview configuration from database or defaults
 */
export async function getPreviewConfig(): Promise<PreviewConfig> {
  try {
    const [percentageConfig, minConfig, maxConfig] = await Promise.all([
      getConfig(CONFIG_KEYS.PREVIEW_PERCENTAGE).catch(() => null),
      getConfig(CONFIG_KEYS.PREVIEW_MIN_SECONDS).catch(() => null),
      getConfig(CONFIG_KEYS.PREVIEW_MAX_SECONDS).catch(() => null),
    ]);

    return {
      percentage: typeof percentageConfig?.value === 'number'
        ? percentageConfig.value
        : DEFAULT_CONFIG.previewPercentage,
      minSeconds: typeof minConfig?.value === 'number'
        ? minConfig.value
        : DEFAULT_CONFIG.previewMinSeconds,
      maxSeconds: typeof maxConfig?.value === 'number'
        ? maxConfig.value
        : DEFAULT_CONFIG.previewMaxSeconds,
    };
  } catch {
    return {
      percentage: DEFAULT_CONFIG.previewPercentage,
      minSeconds: DEFAULT_CONFIG.previewMinSeconds,
      maxSeconds: DEFAULT_CONFIG.previewMaxSeconds,
    };
  }
}

/**
 * Calculate preview duration based on video total duration
 * Formula: min(max(totalDuration * percentage, minSeconds), maxSeconds)
 * 
 * @param totalDuration - Total video duration in seconds
 * @param config - Optional preview config (will fetch if not provided)
 * @returns Preview duration in seconds
 */
export async function calculatePreviewDuration(
  totalDuration: number,
  config?: PreviewConfig
): Promise<number> {
  const previewConfig = config || await getPreviewConfig();

  // Calculate percentage-based duration
  const percentageDuration = Math.floor(totalDuration * previewConfig.percentage);

  // Apply min/max limits
  const duration = Math.min(
    Math.max(percentageDuration, previewConfig.minSeconds),
    previewConfig.maxSeconds
  );

  // Don't exceed total duration
  return Math.min(duration, totalDuration);
}

/**
 * Check user's access to specific content.
 * Determines access type based on VIP status or purchase history.
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */
export async function checkAccess(
  userId: string,
  vodId: number,
  episodeIndex: number,
  sourceCategory: SourceCategory
): Promise<AccessResult> {
  // Get user info with group relation for permission calculation
  const user = await userRepository.findById(userId);
  if (!user) {
    throw { ...PAYWALL_ERRORS.USER_NOT_FOUND };
  }

  // Fetch group details if user belongs to a group
  let userWithGroup: User & { group?: { permissions: unknown } | null } = { ...user, group: null };
  if (user.groupId) {
    const group = await groupRepository.findById(user.groupId);
    if (group) {
      userWithGroup = { ...user, group: { permissions: group.permissions } };
    }
  }

  // Check if paywall is enabled
  const paywallEnabled = await isPaywallEnabled();
  if (!paywallEnabled) {
    return {
      hasAccess: true,
      accessType: 'free',
    };
  }

  // Check SVIP access - SVIP can access all content (including adult)
  if (await isSvipActive(userWithGroup)) {
    return {
      hasAccess: true,
      accessType: 'vip',
    };
  }

  // Check VIP access - VIP can access normal content only
  const isVip = await isVipActive(userWithGroup);
  if (isVip && sourceCategory === 'normal') {
    return {
      hasAccess: true,
      accessType: 'vip',
    };
  }

  // Check if already purchased
  const accessRecord = await contentAccessRepository.findByUserAndContent(
    userId,
    vodId,
    episodeIndex
  );

  if (accessRecord) {
    return {
      hasAccess: true,
      accessType: 'purchased',
      unlockedAt: accessRecord.createdAt,
    };
  }

  // No access - return locked status with price
  // VIP gets discount on adult content
  const effectiveLevel = await getEffectiveMemberLevel(userWithGroup);
  const price = await getPrice(sourceCategory, effectiveLevel);

  return {
    hasAccess: false,
    accessType: 'locked',
    price,
  };
}

/**
 * Unlock content with coins.
 * Deducts coins and creates access record.
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */
export async function unlockContent(
  userId: string,
  vodId: number,
  episodeIndex: number,
  sourceCategory: SourceCategory
): Promise<UnlockResult> {
  // Check if paywall is enabled
  const paywallEnabled = await isPaywallEnabled();
  if (!paywallEnabled) {
    throw { ...PAYWALL_ERRORS.PAYWALL_DISABLED };
  }

  // Get user info
  const user = await userRepository.findById(userId);
  if (!user) {
    throw { ...PAYWALL_ERRORS.USER_NOT_FOUND };
  }

  // Check if already unlocked
  const existingAccess = await contentAccessRepository.findByUserAndContent(
    userId,
    vodId,
    episodeIndex
  );

  if (existingAccess) {
    throw { ...PAYWALL_ERRORS.ALREADY_UNLOCKED };
  }

  // Get user's effective member level with group permissions
  let userWithGroup: User & { group?: { permissions: unknown } | null } = { ...user, group: null };
  if (user.groupId) {
    const group = await groupRepository.findById(user.groupId);
    if (group) {
      userWithGroup = { ...user, group: { permissions: group.permissions } };
    }
  }
  const effectiveLevel = await getEffectiveMemberLevel(userWithGroup);

  // Get price (VIP gets discount on adult content)
  const price = await getPrice(sourceCategory, effectiveLevel);

  // Get current balance
  const currentBalance = await coinRepository.getOrCreate(userId, generateId());

  // Validate sufficient balance
  if (currentBalance.balance < price) {
    throw { ...PAYWALL_ERRORS.INSUFFICIENT_BALANCE };
  }

  // Use transaction for atomicity
  try {
    let accessRecord: ContentAccess | null = null;
    let newBalance = 0;

    await db.transaction(async (tx) => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const txCoinRepository = new CoinRepository(tx as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const txTransactionRepository = new CoinTransactionRepository(tx as any);
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const txContentAccessRepository = new ContentAccessRepository(tx as any);

      // Deduct coins
      newBalance = currentBalance.balance - price;
      const newTotalSpent = currentBalance.totalSpent + price;

      await txCoinRepository.updateBalance(userId, {
        balance: newBalance,
        totalSpent: newTotalSpent,
      });

      // Create transaction record
      await txTransactionRepository.create({
        id: generateId(),
        userId,
        type: 'consume',
        amount: -price,
        balanceAfter: newBalance,
        description: `解锁内容 (VOD: ${vodId}, Episode: ${episodeIndex})`,
        metadata: { vodId, episodeIndex, sourceCategory },
      });

      // Create access record
      accessRecord = await txContentAccessRepository.create({
        id: generateId(),
        userId,
        vodId,
        episodeIndex,
        sourceCategory,
        unlockType: 'purchase',
        coinsSpent: price,
      });
    });

    if (!accessRecord) {
      throw { ...PAYWALL_ERRORS.TRANSACTION_FAILED };
    }

    return {
      success: true,
      coinsSpent: price,
      newBalance,
      accessRecord,
    };
  } catch (error) {
    // If it's our custom error, rethrow it
    if (error && typeof error === 'object' && 'code' in error) {
      throw error;
    }
    throw { ...PAYWALL_ERRORS.TRANSACTION_FAILED };
  }
}
