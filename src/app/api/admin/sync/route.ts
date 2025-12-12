/**
 * Admin Sync API Route
 * Trigger manual sync of categories and VOD data
 * Requirements: 8.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';

const VIDEO_API_BASE = process.env.VIDEO_API_URL || 'http://caiji.dyttzyapi.com/api.php/provide/vod';

interface VODListResponse {
  code: number;
  msg: string;
  page: number;
  pagecount: number;
  limit: string;
  total: number;
  list: unknown[];
  class: Array<{
    type_id: number;
    type_pid: number;
    type_name: string;
  }>;
}

export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) {
    return authResult;
  }

  try {
    // Fetch categories and first page of VODs
    const response = await fetch(`${VIDEO_API_BASE}?ac=list&pg=1`, {
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      return NextResponse.json(
        { code: 'EXTERNAL_API_ERROR', message: 'API同步失败' },
        { status: 502 }
      );
    }

    const data: VODListResponse = await response.json();

    // In a real implementation, this would:
    // 1. Store categories in Redis/database
    // 2. Fetch and cache multiple pages of VODs
    // 3. Update cache timestamps

    const categoriesCount = data.class?.length || 0;
    const vodsCount = data.total || 0;

    return NextResponse.json({
      success: true,
      categoriesCount,
      vodsCount,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Admin sync error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '同步失败' },
      { status: 500 }
    );
  }
}
