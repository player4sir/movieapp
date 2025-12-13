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
import { SourceCategory, User, ContentAccess } from '@/db/schema';
import { getConfig } from './config.service';

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
} as const;

// Default values if config not found
const DEFAULT_CONFIG = {
  normalPrice: 1,
  adultPrice: 10,
  enabled: true,
};

// ============================================
// Helper Functions
// ============================================

function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Check if user has active VIP membership.
 */
function isVipActive(user: User): boolean {
  if (user.memberLevel === 'free') return false;
  if (!user.memberExpiry) return false;
  return new Date(user.memberExpiry) > new Date();
}

/**
 * Check if user has active SVIP membership.
 */
function isSvipActive(user: User): boolean {
  if (user.memberLevel !== 'svip') return false;
  if (!user.memberExpiry) return false;
  return new Date(user.memberExpiry) > new Date();
}

// ============================================
// PaywallService Implementation
// ============================================

const contentAccessRepository = new ContentAccessRepository();
const coinRepository = new CoinRepository();
const userRepository = new UserRepository();

/**
 * Get price for content based on source category.
 * 
 * Requirements: 1.2, 1.3
 */
export async function getPrice(sourceCategory: SourceCategory): Promise<number> {
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
  // Get user info
  const user = await userRepository.findById(userId);
  if (!user) {
    throw { ...PAYWALL_ERRORS.USER_NOT_FOUND };
  }

  // Check if paywall is enabled
  const paywallEnabled = await isPaywallEnabled();
  if (!paywallEnabled) {
    return {
      hasAccess: true,
      accessType: 'free',
    };
  }

  // Check SVIP access - SVIP can access all content
  if (isSvipActive(user)) {
    return {
      hasAccess: true,
      accessType: 'vip',
    };
  }

  // Check VIP access - VIP can access normal content only
  if (isVipActive(user) && sourceCategory === 'normal') {
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
  const price = await getPrice(sourceCategory);

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

  // Get price
  const price = await getPrice(sourceCategory);

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
