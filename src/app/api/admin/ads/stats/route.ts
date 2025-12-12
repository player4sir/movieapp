/**
 * Admin Ad Statistics API Route
 * GET: Get all ads statistics with optional date range
 * 
 * Requirements: 5.1, 5.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import * as adStatsService from '@/services/ad-stats.service';

/**
 * GET /api/admin/ads/stats
 * Get statistics for all ads with optional date range filtering
 * Requirements: 5.1, 5.2
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) {
    return authResult;
  }

  try {
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

    // Get all ads statistics
    const stats = await adStatsService.getAllAdsStats(dateRange);

    return NextResponse.json({
      data: {
        totalImpressions: stats.totalImpressions,
        totalClicks: stats.totalClicks,
        averageCtr: stats.averageCtr,
        ads: stats.ads,
      },
    });
  } catch (error) {
    console.error('Admin ads stats error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '获取广告统计失败' },
      { status: 500 }
    );
  }
}
