/**
 * Admin Ad Slot Statistics API Route
 * GET: Get slot statistics with aggregation
 * 
 * Requirements: 5.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import * as adStatsService from '@/services/ad-stats.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/ads/slots/[id]/stats
 * Get statistics for a slot with aggregation of all ads
 * Requirements: 5.3
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

    // Get slot statistics
    const stats = await adStatsService.getSlotStats(id, dateRange);

    if (!stats) {
      return NextResponse.json(
        { code: 'SLOT_NOT_FOUND', message: '广告位不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: stats });
  } catch (error) {
    console.error('Admin slot stats error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '获取广告位统计失败' },
      { status: 500 }
    );
  }
}
