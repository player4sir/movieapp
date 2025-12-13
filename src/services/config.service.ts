/**
 * Config Service
 * Handles coin system configuration management with validation.
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

import { CoinConfigRepository } from '@/repositories';
import { CoinConfig } from '@/db/schema';

// ============================================
// Error Definitions
// ============================================

export const CONFIG_ERRORS = {
  INVALID_CONFIG: {
    code: 'INVALID_CONFIG',
    message: '无效的配置值',
  },
  CONFIG_NOT_FOUND: {
    code: 'CONFIG_NOT_FOUND',
    message: '配置项不存在',
  },
  VALIDATION_FAILED: {
    code: 'VALIDATION_FAILED',
    message: '配置验证失败',
  },
} as const;

// ============================================
// Types
// ============================================

export interface CoinConfigValue {
  key: string;
  value: unknown;
  description: string;
  updatedAt: Date;
  updatedBy: string | null;
}

export interface UpdateConfigInput {
  key: string;
  value: unknown;
  description?: string;
}

// ============================================
// Default Configuration
// ============================================

export const DEFAULT_CONFIGS: Record<string, { value: unknown; description: string }> = {
  checkin_base_reward: {
    value: 10,
    description: '每日签到基础奖励金币数',
  },
  checkin_streak_bonus: {
    value: [0, 5, 10, 15, 20, 30, 50],
    description: '连续签到奖励金币数组（第1-7天）',
  },
  checkin_streak_max: {
    value: 7,
    description: '连续签到最大天数，超过后重置',
  },
  vip_exchange_rate: {
    value: { vip: 1000, svip: 3000 },
    description: 'VIP会员兑换所需金币（30天）',
  },
  recharge_packages: {
    value: [
      { id: 'pkg_10', name: '小额充值', coins: 100, price: 10, bonus: 0 },
      { id: 'pkg_50', name: '超值套餐', coins: 550, price: 50, bonus: 50, popular: true },
      { id: 'pkg_100', name: '豪华套餐', coins: 1200, price: 100, bonus: 200 },
    ],
    description: '充值套餐配置',
  },
  // Paywall configurations
  paywall_normal_price: {
    value: 1,
    description: '普通内容每集解锁价格（金币）',
  },
  paywall_adult_price: {
    value: 10,
    description: '成人内容每集解锁价格（金币）',
  },
  paywall_enabled: {
    value: true,
    description: '是否启用付费墙功能',
  },
  // Referral configurations
  referral_reward_inviter: {
    value: 50,
    description: '邀请人获得的金币奖励',
  },
  referral_reward_invitee: {
    value: 10,
    description: '被邀请人获得的金币奖励',
  },
};

// ============================================
// Validation Functions
// ============================================

/**
 * Validate configuration value based on key.
 * 
 * Requirements: 5.4
 */
function validateConfigValue(key: string, value: unknown): { valid: boolean; error?: string } {
  switch (key) {
    case 'checkin_base_reward':
      if (typeof value !== 'number' || value < 0 || !Number.isInteger(value)) {
        return { valid: false, error: '签到基础奖励必须是非负整数' };
      }
      break;

    case 'checkin_streak_bonus':
      if (!Array.isArray(value)) {
        return { valid: false, error: '连续签到奖励必须是数组' };
      }
      for (const bonus of value) {
        if (typeof bonus !== 'number' || bonus < 0 || !Number.isInteger(bonus)) {
          return { valid: false, error: '连续签到奖励数组中的值必须是非负整数' };
        }
      }
      break;

    case 'checkin_streak_max':
      if (typeof value !== 'number' || value < 1 || !Number.isInteger(value)) {
        return { valid: false, error: '连续签到最大天数必须是正整数' };
      }
      break;

    case 'vip_exchange_rate':
      if (typeof value !== 'object' || value === null) {
        return { valid: false, error: 'VIP兑换比例必须是对象' };
      }
      const rates = value as Record<string, unknown>;
      for (const [level, rate] of Object.entries(rates)) {
        if (typeof rate !== 'number' || rate < 0 || !Number.isInteger(rate)) {
          return { valid: false, error: `${level}的兑换比例必须是非负整数` };
        }
      }
      break;

    case 'recharge_packages':
      if (!Array.isArray(value)) {
        return { valid: false, error: '充值套餐必须是数组' };
      }
      for (const pkg of value) {
        if (typeof pkg !== 'object' || pkg === null) {
          return { valid: false, error: '充值套餐项必须是对象' };
        }
        const p = pkg as Record<string, unknown>;
        if (typeof p.coins !== 'number' || p.coins < 0) {
          return { valid: false, error: '充值套餐金币数必须是非负数' };
        }
        if (typeof p.price !== 'number' || p.price < 0) {
          return { valid: false, error: '充值套餐价格必须是非负数' };
        }
      }
      break;

    // Paywall configurations
    case 'paywall_normal_price':
    case 'paywall_adult_price':
      if (typeof value !== 'number' || value < 0 || !Number.isInteger(value)) {
        return { valid: false, error: '内容价格必须是非负整数' };
      }
      break;

    case 'paywall_enabled':
      if (typeof value !== 'boolean') {
        return { valid: false, error: '付费墙开关必须是布尔值' };
      }
      break;

    case 'referral_reward_inviter':
    case 'referral_reward_invitee':
      if (typeof value !== 'number' || value < 0 || !Number.isInteger(value)) {
        return { valid: false, error: '推广奖励必须是非负整数' };
      }
      break;
  }

  return { valid: true };
}

// ============================================
// ConfigService Implementation
// ============================================

const configRepository = new CoinConfigRepository();

function generateId(): string {
  return crypto.randomUUID();
}

/**
 * Get a configuration value by key.
 * Returns default value if not found in database.
 * 
 * Requirements: 5.1
 */
export async function getConfig(key: string): Promise<CoinConfigValue> {
  const config = await configRepository.getByKey(key);

  if (config) {
    return {
      key: config.key,
      value: config.value,
      description: config.description,
      updatedAt: config.updatedAt,
      updatedBy: config.updatedBy,
    };
  }

  // Return default if exists
  const defaultConfig = DEFAULT_CONFIGS[key];
  if (defaultConfig) {
    return {
      key,
      value: defaultConfig.value,
      description: defaultConfig.description,
      updatedAt: new Date(),
      updatedBy: null,
    };
  }

  throw { ...CONFIG_ERRORS.CONFIG_NOT_FOUND };
}

// Coin-only config keys (exclude paywall configs)
const COIN_CONFIG_KEYS = [
  'checkin_base_reward',
  'checkin_streak_bonus',
  'checkin_streak_max',
  'vip_exchange_rate',
  'recharge_packages',
  'referral_reward_inviter',
  'referral_reward_invitee',
] as const;

/**
 * Get all coin configurations (excludes paywall configs).
 * Merges database configs with defaults.
 * 
 * Requirements: 5.1
 */
export async function getAllConfigs(): Promise<CoinConfigValue[]> {
  const dbConfigs = await configRepository.getAll();
  const dbConfigMap = new Map(dbConfigs.map(c => [c.key, c]));

  const result: CoinConfigValue[] = [];

  // Only add coin-related configs, not paywall configs
  for (const key of COIN_CONFIG_KEYS) {
    const defaultConfig = DEFAULT_CONFIGS[key];
    const dbConfig = dbConfigMap.get(key);

    if (dbConfig) {
      result.push({
        key: dbConfig.key,
        value: dbConfig.value,
        description: dbConfig.description,
        updatedAt: dbConfig.updatedAt,
        updatedBy: dbConfig.updatedBy,
      });
    } else if (defaultConfig) {
      result.push({
        key,
        value: defaultConfig.value,
        description: defaultConfig.description,
        updatedAt: new Date(),
        updatedBy: null,
      });
    }
  }

  return result;
}


/**
 * Update a configuration value with validation.
 * 
 * Requirements: 5.2, 5.3, 5.4
 */
export async function updateConfig(
  key: string,
  value: unknown,
  adminId: string,
  description?: string
): Promise<CoinConfig> {
  // Validate the value
  const validation = validateConfigValue(key, value);
  if (!validation.valid) {
    throw {
      ...CONFIG_ERRORS.VALIDATION_FAILED,
      message: validation.error ?? CONFIG_ERRORS.VALIDATION_FAILED.message
    };
  }

  // Get existing config or default description
  const existingConfig = await configRepository.getByKey(key);
  const defaultConfig = DEFAULT_CONFIGS[key];
  const finalDescription = description ?? existingConfig?.description ?? defaultConfig?.description ?? '';

  // Upsert the config
  const config = await configRepository.upsert({
    id: existingConfig?.id ?? generateId(),
    key,
    value,
    description: finalDescription,
    updatedBy: adminId,
  });

  return config;
}

/**
 * Reset a configuration to its default value.
 */
export async function resetConfig(key: string, adminId: string): Promise<CoinConfig | null> {
  const defaultConfig = DEFAULT_CONFIGS[key];
  if (!defaultConfig) {
    throw { ...CONFIG_ERRORS.CONFIG_NOT_FOUND };
  }

  return await updateConfig(key, defaultConfig.value, adminId, defaultConfig.description);
}

/**
 * Initialize all default configurations in the database.
 * Only creates configs that don't already exist.
 */
export async function initializeDefaultConfigs(adminId: string): Promise<void> {
  for (const [key, config] of Object.entries(DEFAULT_CONFIGS)) {
    const existing = await configRepository.getByKey(key);
    if (!existing) {
      await configRepository.upsert({
        id: generateId(),
        key,
        value: config.value,
        description: config.description,
        updatedBy: adminId,
      });
    }
  }
}
