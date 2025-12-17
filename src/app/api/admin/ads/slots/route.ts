/**
 * Admin Ad Slots API Route
 * GET: List all slots
 * POST: Create new slot
 * 
 * Requirements: 2.1
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import * as adService from '@/services/ad.service';
import { RotationStrategy } from '@/db/schema';

/**
 * GET /api/admin/ads/slots
 * List all ad slots
 * Requirements: 2.1
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) {
    return authResult;
  }

  try {
    const slots = await adService.listSlots();

    return NextResponse.json({
      data: slots,
      total: slots.length,
    });
  } catch (error) {
    console.error('Admin slots list error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '获取广告位列表失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/ads/slots
 * Create a new ad slot
 * Requirements: 2.1
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) {
    return authResult;
  }

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: '广告位名称不能为空' },
        { status: 400 }
      );
    }

    if (body.name.length > 100) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: '广告位名称不能超过100个字符' },
        { status: 400 }
      );
    }

    if (!body.position || typeof body.position !== 'string' || body.position.trim().length === 0) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: '广告位位置标识不能为空' },
        { status: 400 }
      );
    }

    if (body.position.length > 50) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: '广告位位置标识不能超过50个字符' },
        { status: 400 }
      );
    }

    if (!body.width || typeof body.width !== 'number' || body.width <= 0) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: '广告位宽度必须为正整数' },
        { status: 400 }
      );
    }

    if (!body.height || typeof body.height !== 'number' || body.height <= 0) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: '广告位高度必须为正整数' },
        { status: 400 }
      );
    }

    // Validate rotation strategy if provided
    const validStrategies: RotationStrategy[] = ['random', 'sequential'];
    if (body.rotationStrategy && !validStrategies.includes(body.rotationStrategy)) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: '轮换策略无效，必须为 random 或 sequential' },
        { status: 400 }
      );
    }

    // Create the slot
    const slot = await adService.createSlot({
      name: body.name.trim(),
      position: body.position.trim(),
      width: Math.floor(body.width),
      height: Math.floor(body.height),
      rotationStrategy: body.rotationStrategy,
      enabled: body.enabled ?? true,
      // Multi-ad display settings
      displayMode: body.displayMode,
      maxVisible: body.maxVisible !== undefined ? Math.floor(body.maxVisible) : undefined,
      carouselInterval: body.carouselInterval !== undefined ? Math.floor(body.carouselInterval) : undefined,
    });

    return NextResponse.json({ data: slot }, { status: 201 });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string; field?: string };

    if (err.code === 'DUPLICATE_ERROR' && err.field === 'position') {
      return NextResponse.json(
        { code: 'DUPLICATE_POSITION', message: '该位置标识已存在' },
        { status: 409 }
      );
    }

    console.error('Admin create slot error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '创建广告位失败' },
      { status: 500 }
    );
  }
}
