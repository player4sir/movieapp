/**
 * Admin Ad Slot Assignment API Route
 * GET: Get assigned ads for a slot
 * POST: Assign ad to slot
 * DELETE: Remove ad from slot
 * 
 * Requirements: 2.2, 2.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import * as adService from '@/services/ad.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/ads/slots/[id]/assign
 * Get all ads assigned to a slot
 * Requirements: 2.2
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) {
    return authResult;
  }

  try {
    const { id: slotId } = await params;
    
    // Get all ads assigned to this slot
    const ads = await adService.getSlotAds(slotId);

    return NextResponse.json({ data: ads });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };

    if (err.code === 'SLOT_NOT_FOUND') {
      return NextResponse.json(
        { code: err.code, message: err.message },
        { status: 404 }
      );
    }

    console.error('Admin get slot ads error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '获取广告位分配列表失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/ads/slots/[id]/assign
 * Assign an ad to a slot
 * Requirements: 2.2, 2.3
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) {
    return authResult;
  }

  try {
    const { id: slotId } = await params;
    const body = await request.json();

    // Validate required fields
    if (!body.adId || typeof body.adId !== 'string') {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: '广告ID不能为空' },
        { status: 400 }
      );
    }

    // Validate priority if provided
    if (body.priority !== undefined && typeof body.priority !== 'number') {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: '优先级必须为数字' },
        { status: 400 }
      );
    }

    // Assign the ad to the slot
    const assignment = await adService.assignAdToSlot(
      body.adId,
      slotId,
      body.priority
    );

    return NextResponse.json({ data: assignment }, { status: 201 });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };

    if (err.code === 'AD_NOT_FOUND') {
      return NextResponse.json(
        { code: err.code, message: err.message },
        { status: 404 }
      );
    }

    if (err.code === 'SLOT_NOT_FOUND') {
      return NextResponse.json(
        { code: err.code, message: err.message },
        { status: 404 }
      );
    }

    if (err.code === 'ASSIGNMENT_EXISTS') {
      return NextResponse.json(
        { code: err.code, message: err.message },
        { status: 409 }
      );
    }

    console.error('Admin assign ad to slot error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '分配广告到广告位失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/ads/slots/[id]/assign
 * Remove an ad from a slot
 * Requirements: 2.2
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) {
    return authResult;
  }

  try {
    const { id: slotId } = await params;
    const { searchParams } = new URL(request.url);
    const adId = searchParams.get('adId');

    if (!adId) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: '广告ID不能为空' },
        { status: 400 }
      );
    }

    // Remove the ad from the slot
    await adService.removeAdFromSlot(adId, slotId);

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };

    if (err.code === 'ASSIGNMENT_NOT_FOUND') {
      return NextResponse.json(
        { code: err.code, message: err.message },
        { status: 404 }
      );
    }

    console.error('Admin remove ad from slot error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '移除广告位分配失败' },
      { status: 500 }
    );
  }
}
