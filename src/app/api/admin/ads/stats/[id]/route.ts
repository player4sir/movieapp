/**
 * Admin Single Ad Statistics API Route
 * GET: Get single ad statistics
 * 
 * Requirements: 5.1
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import * as adStatsService from '@/services/ad-stats.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/ads/stats/[id]
 * Get statistics for a single ad with optional date range filtering
 * Requirements: 5.1
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) {
    return authResult;
  }

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    // Parse date range if provided
    let dateRange: adStatsService.DateRange | undefined;

    if (startDateStr || endDateStr) {
      const startDate = startDateStr ? new Date(startDateStr) : undefined;
      const endDate = endDateStr ? new Date(endDateStr) : undefined;

      if (startDateStr && (!startDate || isNaN(startDate.getTime()))) {
        return NextResponse.json(
          { code: 'VALIDATION_ERROR', message: '开始日期格式无效' },
          { status: 400 }
        );
      }

      if (endDateStr && (!endDate || isNaN(endDate.getTime()))) {
        return NextResponse.json(
          { code: 'VALIDATION_ERROR', message: '结束日期格式无效' },
          { status: 400 }
        );
      }

      if (startDate && endDate) {
        dateRange = { startDate, endDate };
      }
    }

    // Get ad statistics
    const stats = await adStatsService.getAdStats(id, dateRange);

    if (!stats) {
      return NextResponse.json(
        { code: 'AD_NOT_FOUND', message: '广告不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: stats });
  } catch (error) {
    console.error('Admin ad stats error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '获取广告统计失败' },
      { status: 500 }
    );
  }
}
