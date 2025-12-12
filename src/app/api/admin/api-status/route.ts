/**
 * Admin API Status Route
 * Returns video API health status
 * Requirements: 8.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';

const VIDEO_API_BASE = process.env.VIDEO_API_URL || 'http://caiji.dyttzyapi.com/api.php/provide/vod';

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) {
    return authResult;
  }

  try {
    const startTime = Date.now();
    let isAvailable = false;
    let responseTime = 0;

    try {
      const response = await fetch(`${VIDEO_API_BASE}?ac=list&pg=1`, {
        signal: AbortSignal.timeout(10000),
      });
      responseTime = Date.now() - startTime;
      isAvailable = response.ok;
    } catch {
      responseTime = Date.now() - startTime;
      isAvailable = false;
    }

    // In a real implementation, these would come from Redis/database
    const lastSuccessfulSync = isAvailable ? new Date().toISOString() : null;
    const errorRate = isAvailable ? 0 : 100;
    const cachedCategories = 0;
    const cachedVODs = 0;

    return NextResponse.json({
      isAvailable,
      responseTime,
      lastSuccessfulSync,
      errorRate,
      cachedCategories,
      cachedVODs,
    });
  } catch (error) {
    console.error('API status check error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '获取API状态失败' },
      { status: 500 }
    );
  }
}
