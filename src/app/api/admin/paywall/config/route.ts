/**
 * Admin Paywall Config API
 * GET /api/admin/paywall/config - Get all paywall configurations
 * PUT /api/admin/paywall/config - Update paywall configuration
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import { 
  getConfig, 
  updateConfig, 
  CONFIG_ERRORS 
} from '@/services/config.service';

// ============================================
// Paywall Configuration Keys
// ============================================

const PAYWALL_CONFIG_KEYS = [
  'paywall_normal_price',
  'paywall_adult_price',
  'paywall_preview_duration',
  'paywall_enabled',
] as const;

// Default values for paywall configs
const PAYWALL_DEFAULTS: Record<string, { value: unknown; description: string }> = {
  paywall_normal_price: {
    value: 1,
    description: '普通内容每集解锁价格（金币）',
  },
  paywall_adult_price: {
    value: 10,
    description: '成人内容每集解锁价格（金币）',
  },
  paywall_preview_duration: {
    value: 180,
    description: '试看时长（秒）',
  },
  paywall_enabled: {
    value: true,
    description: '付费墙功能开关',
  },
};

// ============================================
// Validation Functions
// ============================================

/**
 * Validate paywall configuration value based on key.
 * 
 * Requirements: 1.2, 1.3, 1.4
 */
function validatePaywallConfig(key: string, value: unknown): { valid: boolean; error?: string } {
  switch (key) {
    case 'paywall_normal_price':
      if (typeof value !== 'number' || value < 0 || !Number.isInteger(value)) {
        return { valid: false, error: '普通内容价格必须是非负整数' };
      }
      break;

    case 'paywall_adult_price':
      if (typeof value !== 'number' || value < 0 || !Number.isInteger(value)) {
        return { valid: false, error: '成人内容价格必须是非负整数' };
      }
      break;

    case 'paywall_preview_duration':
      if (typeof value !== 'number' || value < 0 || !Number.isInteger(value)) {
        return { valid: false, error: '试看时长必须是非负整数（秒）' };
      }
      break;

    case 'paywall_enabled':
      if (typeof value !== 'boolean') {
        return { valid: false, error: '付费墙开关必须是布尔值' };
      }
      break;

    default:
      return { valid: false, error: '无效的配置键' };
  }

  return { valid: true };
}

// ============================================
// GET /api/admin/paywall/config
// ============================================

/**
 * GET /api/admin/paywall/config
 * Returns all paywall configurations.
 * 
 * Requirements: 1.1 - Display Price_Config section with separate settings
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  
  if (isAuthError(authResult)) {
    return authResult;
  }

  try {
    const configs: Record<string, unknown> = {};

    // Fetch all paywall configs
    for (const key of PAYWALL_CONFIG_KEYS) {
      try {
        const config = await getConfig(key);
        configs[key] = {
          value: config.value,
          description: config.description,
          updatedAt: config.updatedAt,
          updatedBy: config.updatedBy,
        };
      } catch {
        // Use default if config not found
        const defaultConfig = PAYWALL_DEFAULTS[key];
        configs[key] = {
          value: defaultConfig.value,
          description: defaultConfig.description,
          updatedAt: null,
          updatedBy: null,
        };
      }
    }

    return NextResponse.json({
      configs,
    }, { status: 200 });
  } catch (error: unknown) {
    console.error('Get paywall configs error:', error);
    
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '获取付费墙配置失败' },
      { status: 500 }
    );
  }
}

// ============================================
// PUT /api/admin/paywall/config
// ============================================

/**
 * PUT /api/admin/paywall/config
 * Updates a paywall configuration.
 * 
 * Requirements: 1.2 - Apply normal content price
 * Requirements: 1.3 - Apply adult content price
 * Requirements: 1.4 - Configure preview duration
 */
export async function PUT(request: NextRequest) {
  const authResult = await requireAdmin(request);
  
  if (isAuthError(authResult)) {
    return authResult;
  }

  const { user } = authResult;

  try {
    const body = await request.json();
    const { key, value, description } = body;

    // Validate required fields
    if (!key || typeof key !== 'string') {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: '配置键不能为空' },
        { status: 400 }
      );
    }

    if (value === undefined) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: '配置值不能为空' },
        { status: 400 }
      );
    }

    // Validate it's a paywall config key
    if (!PAYWALL_CONFIG_KEYS.includes(key as typeof PAYWALL_CONFIG_KEYS[number])) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: '无效的付费墙配置键' },
        { status: 400 }
      );
    }

    // Validate the value
    const validation = validatePaywallConfig(key, value);
    if (!validation.valid) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: validation.error },
        { status: 400 }
      );
    }

    // Update the config
    const config = await updateConfig(key, value, user.id, description);

    return NextResponse.json({
      success: true,
      config: {
        key: config.key,
        value: config.value,
        description: config.description,
        updatedAt: config.updatedAt,
        updatedBy: config.updatedBy,
      },
    }, { status: 200 });
  } catch (error: unknown) {
    console.error('Update paywall config error:', error);
    
    const configError = error as { code?: string; message?: string };
    
    if (configError.code === CONFIG_ERRORS.VALIDATION_FAILED.code ||
        configError.code === CONFIG_ERRORS.INVALID_CONFIG.code) {
      return NextResponse.json(
        { code: configError.code, message: configError.message },
        { status: 400 }
      );
    }

    if (configError.code === CONFIG_ERRORS.CONFIG_NOT_FOUND.code) {
      return NextResponse.json(
        { code: configError.code, message: configError.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '更新付费墙配置失败' },
      { status: 500 }
    );
  }
}
