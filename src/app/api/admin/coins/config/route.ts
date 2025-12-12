/**
 * Admin Coin Config API
 * GET /api/admin/coins/config - Get all coin system configurations
 * PUT /api/admin/coins/config - Update coin system configuration
 * 
 * Requirements: 5.1, 5.2, 5.3, 5.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import { 
  getAllConfigs, 
  updateConfig, 
  CONFIG_ERRORS 
} from '@/services/config.service';

/**
 * GET /api/admin/coins/config
 * Returns all coin system configurations.
 * 
 * Requirements: 5.1 - Display Coin_Config management section
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  
  if (isAuthError(authResult)) {
    return authResult;
  }

  try {
    const configs = await getAllConfigs();

    return NextResponse.json({
      configs,
    }, { status: 200 });
  } catch (error: unknown) {
    console.error('Get coin configs error:', error);
    
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '获取金币配置失败' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/coins/config
 * Updates a coin system configuration.
 * 
 * Requirements: 5.2 - Apply new check-in reward values
 * Requirements: 5.3 - Apply new VIP exchange rates
 * Requirements: 5.4 - Validate all values before persisting
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
    console.error('Update coin config error:', error);
    
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
      { code: 'INTERNAL_ERROR', message: '更新金币配置失败' },
      { status: 500 }
    );
  }
}
