/**
 * Admin Ads API Route
 * GET: List all ads with stats
 * POST: Create new ad with validation
 * 
 * Requirements: 1.1, 1.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import * as adService from '@/services/ad.service';
import * as adStatsService from '@/services/ad-stats.service';

interface AdWithStats {
  id: string;
  title: string;
  imageUrl: string;
  targetUrl: string;
  startDate: Date;
  endDate: Date;
  enabled: boolean;
  targetMemberLevels: string[];
  targetGroupIds: string[];
  priority: number;
  deleted: boolean;
  createdAt: Date;
  updatedAt: Date;
  impressions: number;
  clicks: number;
  ctr: number;
}

/**
 * GET /api/admin/ads
 * List all ads with their statistics
 * Requirements: 1.4
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const includeDeleted = searchParams.get('includeDeleted') === 'true';
    const enabledOnly = searchParams.get('enabledOnly') === 'true';

    // Get all ads
    const ads = await adService.listAds({
      deleted: includeDeleted ? undefined : false,
      enabled: enabledOnly ? true : undefined,
    });

    // Get stats for all ads
    const statsResult = await adStatsService.getAllAdsStats();
    const statsMap = new Map(statsResult.ads.map(s => [s.adId, s]));

    // Combine ads with stats
    const adsWithStats: AdWithStats[] = ads.map(ad => {
      const stats = statsMap.get(ad.id);
      return {
        id: ad.id,
        title: ad.title,
        imageUrl: ad.imageUrl,
        targetUrl: ad.targetUrl,
        startDate: ad.startDate,
        endDate: ad.endDate,
        enabled: ad.enabled,
        targetMemberLevels: ad.targetMemberLevels as string[],
        targetGroupIds: ad.targetGroupIds as string[],
        priority: ad.priority,
        deleted: ad.deleted,
        createdAt: ad.createdAt,
        updatedAt: ad.updatedAt,
        impressions: stats?.impressions ?? 0,
        clicks: stats?.clicks ?? 0,
        ctr: stats?.ctr ?? 0,
      };
    });

    return NextResponse.json({
      data: adsWithStats,
      total: adsWithStats.length,
    });
  } catch (error) {
    console.error('Admin ads list error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '获取广告列表失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/ads
 * Create a new ad
 * Requirements: 1.1
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) {
    return authResult;
  }

  try {
    const body = await request.json();

    // Validate required fields
    if (!body.title || typeof body.title !== 'string' || body.title.trim().length === 0) {
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

    if (!body.imageUrl || typeof body.imageUrl !== 'string') {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: '广告图片URL不能为空' },
        { status: 400 }
      );
    }

    if (!body.targetUrl || typeof body.targetUrl !== 'string') {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: '广告目标URL不能为空' },
        { status: 400 }
      );
    }

    if (!body.startDate) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: '开始日期不能为空' },
        { status: 400 }
      );
    }

    if (!body.endDate) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: '结束日期不能为空' },
        { status: 400 }
      );
    }

    const startDate = new Date(body.startDate);
    const endDate = new Date(body.endDate);

    if (isNaN(startDate.getTime())) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: '开始日期格式无效' },
        { status: 400 }
      );
    }

    if (isNaN(endDate.getTime())) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: '结束日期格式无效' },
        { status: 400 }
      );
    }

    // Create the ad
    const ad = await adService.createAd({
      title: body.title.trim(),
      imageUrl: body.imageUrl,
      targetUrl: body.targetUrl,
      startDate,
      endDate,
      enabled: body.enabled ?? true,
      targetMemberLevels: body.targetMemberLevels ?? [],
      targetGroupIds: body.targetGroupIds ?? [],
      priority: body.priority ?? 0,
      slotIds: body.slotIds,
    });

    return NextResponse.json({ data: ad }, { status: 201 });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };

    if (err.code === 'INVALID_DATE_RANGE') {
      return NextResponse.json(
        { code: err.code, message: err.message },
        { status: 400 }
      );
    }

    console.error('Admin create ad error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '创建广告失败' },
      { status: 500 }
    );
  }
}
