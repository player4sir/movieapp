/**
 * Admin Single Ad API Route
 * GET: Get ad details
 * PUT: Update ad
 * DELETE: Soft delete ad
 * 
 * Requirements: 1.2, 1.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import * as adService from '@/services/ad.service';
import * as adStatsService from '@/services/ad-stats.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/ads/[id]
 * Get ad details with statistics
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) {
    return authResult;
  }

  try {
    const { id } = await params;
    const ad = await adService.getAd(id);

    if (!ad) {
      return NextResponse.json(
        { code: 'AD_NOT_FOUND', message: '广告不存在' },
        { status: 404 }
      );
    }

    // Get stats for this ad
    const stats = await adStatsService.getAdStats(id);

    // Get assigned slots
    const slots = await adService.getAdSlots(id);
    const slotIds = slots.map(s => s.id);

    return NextResponse.json({
      data: {
        ...ad,
        impressions: stats?.impressions ?? 0,
        clicks: stats?.clicks ?? 0,
        ctr: stats?.ctr ?? 0,
        slotIds, // Include slotIds
      },
    });
  } catch (error) {
    console.error('Admin get ad error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '获取广告详情失败' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/ads/[id]
 * Update an existing ad
 * Requirements: 1.2
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
    if (body.title !== undefined) {
      if (typeof body.title !== 'string' || body.title.trim().length === 0) {
        return NextResponse.json(
          { code: 'VALIDATION_ERROR', message: '广告标题不能为空' },
          { status: 400 }
        );
      }
      if (body.title.length > 255) {
        return NextResponse.json(
          { code: 'VALIDATION_ERROR', message: '广告标题不能超过255个字符' },
          { status: 400 }
        );
      }
    }

    // Parse dates if provided
    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (body.startDate !== undefined) {
      startDate = new Date(body.startDate);
      if (isNaN(startDate.getTime())) {
        return NextResponse.json(
          { code: 'VALIDATION_ERROR', message: '开始日期格式无效' },
          { status: 400 }
        );
      }
    }

    if (body.endDate !== undefined) {
      endDate = new Date(body.endDate);
      if (isNaN(endDate.getTime())) {
        return NextResponse.json(
          { code: 'VALIDATION_ERROR', message: '结束日期格式无效' },
          { status: 400 }
        );
      }
    }

    // Update the ad
    const ad = await adService.updateAd(id, {
      title: body.title?.trim(),
      imageUrl: body.imageUrl,
      targetUrl: body.targetUrl,
      startDate,
      endDate,
      enabled: body.enabled,
      targetMemberLevels: body.targetMemberLevels,
      targetGroupIds: body.targetGroupIds,
      priority: body.priority,
      slotIds: body.slotIds,
    });

    return NextResponse.json({ data: ad });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };

    if (err.code === 'AD_NOT_FOUND') {
      return NextResponse.json(
        { code: err.code, message: err.message },
        { status: 404 }
      );
    }

    if (err.code === 'INVALID_DATE_RANGE') {
      return NextResponse.json(
        { code: err.code, message: err.message },
        { status: 400 }
      );
    }

    console.error('Admin update ad error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '更新广告失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/ads/[id]
 * Soft delete an ad
 * Requirements: 1.3
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) {
    return authResult;
  }

  try {
    const { id } = await params;
    await adService.deleteAd(id);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };

    if (err.code === 'AD_NOT_FOUND') {
      return NextResponse.json(
        { code: err.code, message: err.message },
        { status: 404 }
      );
    }

    console.error('Admin delete ad error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '删除广告失败' },
      { status: 500 }
    );
  }
}
