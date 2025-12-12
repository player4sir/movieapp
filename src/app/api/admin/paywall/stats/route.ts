/**
 * Admin Paywall Stats API
 * GET /api/admin/paywall/stats - Get paywall unlock statistics
 * 
 * Requirements: 8.1, 8.2, 8.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import { getUnlockStats } from '@/services/access.service';

/**
 * GET /api/admin/paywall/stats
 * Returns paywall unlock statistics with optional date range filtering.
 * 
 * Requirements: 8.1 - Display total content unlocks and coin revenue
 * Requirements: 8.2 - Show daily unlock trends by content category
 * Requirements: 8.3 - List top unlocked content by unlock count
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  
  if (isAuthError(authResult)) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    
    // Parse date range parameters
    const startDateStr = searchParams.get('startDate');
    const endDateStr = searchParams.get('endDate');

    let startDate: Date | undefined;
    let endDate: Date | undefined;

    if (startDateStr) {
      startDate = new Date(startDateStr);
      if (isNaN(startDate.getTime())) {
        return NextResponse.json(
          { code: 'VALIDATION_ERROR', message: '无效的开始日期格式' },
          { status: 400 }
        );
      }
    }

    if (endDateStr) {
      endDate = new Date(endDateStr);
      if (isNaN(endDate.getTime())) {
        return NextResponse.json(
          { code: 'VALIDATION_ERROR', message: '无效的结束日期格式' },
          { status: 400 }
        );
      }
    }

    // Validate date range
    if (startDate && endDate && startDate > endDate) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: '开始日期不能晚于结束日期' },
        { status: 400 }
      );
    }

    const stats = await getUnlockStats({ startDate, endDate });

    return NextResponse.json({
      totalUnlocks: stats.totalUnlocks,
      totalRevenue: stats.totalRevenue,
      dailyStats: stats.dailyStats,
      categoryBreakdown: stats.categoryBreakdown,
      topContent: stats.topContent,
    }, { status: 200 });
  } catch (error: unknown) {
    console.error('Get paywall stats error:', error);
    
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '获取付费墙统计失败' },
      { status: 500 }
    );
  }
}
