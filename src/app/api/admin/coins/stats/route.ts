/**
 * Admin Coin Stats API
 * GET /api/admin/coins/stats - Get coin system statistics
 * 
 * Requirements: 7.1, 7.2, 7.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import { getStats } from '@/services/transaction.service';

/**
 * GET /api/admin/coins/stats
 * Returns coin system statistics with optional date range filtering.
 * 
 * Requirements: 7.1 - Display total coins in circulation
 * Requirements: 7.2 - Show daily coin distribution and consumption trends
 * Requirements: 7.3 - Generate transaction summaries grouped by Transaction_Type
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

    const stats = await getStats({ startDate, endDate });

    return NextResponse.json({
      totalCirculation: stats.totalCirculation,
      totalEarned: stats.totalEarned,
      totalSpent: stats.totalSpent,
      dailyStats: stats.dailyStats,
      typeBreakdown: stats.typeBreakdown,
    }, { status: 200 });
  } catch (error: unknown) {
    console.error('Get coin stats error:', error);
    
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '获取金币统计失败' },
      { status: 500 }
    );
  }
}
