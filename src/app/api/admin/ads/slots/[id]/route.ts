/**
 * Admin Single Ad Slot API Route
 * PUT: Update slot
 * DELETE: Delete slot
 * 
 * Requirements: 2.1
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import * as adService from '@/services/ad.service';
import { RotationStrategy } from '@/db/schema';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/ads/slots/[id]
 * Get slot details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) {
    return authResult;
  }

  try {
    const { id } = await params;
    const slot = await adService.getSlot(id);

    if (!slot) {
      return NextResponse.json(
        { code: 'SLOT_NOT_FOUND', message: '广告位不存在' },
        { status: 404 }
      );
    }

    // Get assigned ads for this slot
    const assignedAds = await adService.getSlotAds(id);

    return NextResponse.json({
      data: {
        ...slot,
        assignedAds,
      },
    });
  } catch (error) {
    console.error('Admin get slot error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '获取广告位详情失败' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/ads/slots/[id]
 * Update an existing ad slot
 * Requirements: 2.1
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) {
    return authResult;
  }

  try {
    const { id } = await params;
    const body = await request.json();

    // Validate fields if provided
    if (body.name !== undefined) {
      if (typeof body.name !== 'string' || body.name.trim().length === 0) {
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
    }

    if (body.position !== undefined) {
      if (typeof body.position !== 'string' || body.position.trim().length === 0) {
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
    }

    if (body.width !== undefined && (typeof body.width !== 'number' || body.width <= 0)) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: '广告位宽度必须为正整数' },
        { status: 400 }
      );
    }

    if (body.height !== undefined && (typeof body.height !== 'number' || body.height <= 0)) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: '广告位高度必须为正整数' },
        { status: 400 }
      );
    }

    // Validate rotation strategy if provided
    const validStrategies: RotationStrategy[] = ['random', 'sequential'];
    if (body.rotationStrategy !== undefined && !validStrategies.includes(body.rotationStrategy)) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: '轮换策略无效，必须为 random 或 sequential' },
        { status: 400 }
      );
    }

    // Update the slot
    const slot = await adService.updateSlot(id, {
      name: body.name?.trim(),
      position: body.position?.trim(),
      width: body.width !== undefined ? Math.floor(body.width) : undefined,
      height: body.height !== undefined ? Math.floor(body.height) : undefined,
      rotationStrategy: body.rotationStrategy,
      enabled: body.enabled,
      // Multi-ad display settings
      displayMode: body.displayMode,
      maxVisible: body.maxVisible !== undefined ? Math.floor(body.maxVisible) : undefined,
      carouselInterval: body.carouselInterval !== undefined ? Math.floor(body.carouselInterval) : undefined,
    });

    return NextResponse.json({ data: slot });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string; field?: string };

    if (err.code === 'SLOT_NOT_FOUND') {
      return NextResponse.json(
        { code: err.code, message: err.message },
        { status: 404 }
      );
    }

    if (err.code === 'DUPLICATE_ERROR' && err.field === 'position') {
      return NextResponse.json(
        { code: 'DUPLICATE_POSITION', message: '该位置标识已存在' },
        { status: 409 }
      );
    }

    console.error('Admin update slot error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '更新广告位失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/ads/slots/[id]
 * Delete an ad slot
 * Requirements: 2.1
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) {
    return authResult;
  }

  try {
    const { id } = await params;
    await adService.deleteSlot(id);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };

    if (err.code === 'SLOT_NOT_FOUND') {
      return NextResponse.json(
        { code: err.code, message: err.message },
        { status: 404 }
      );
    }

    console.error('Admin delete slot error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '删除广告位失败' },
      { status: 500 }
    );
  }
}
