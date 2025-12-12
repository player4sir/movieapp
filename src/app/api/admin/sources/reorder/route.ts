/**
 * Admin Video Sources Reorder API
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import { reorderSources } from '@/services/video-source.service';

// PUT reorder sources
export async function PUT(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) return authResult;

  try {
    const body = await request.json();
    const { sourceIds } = body;

    if (!Array.isArray(sourceIds) || sourceIds.length === 0) {
      return NextResponse.json({ code: 'VALIDATION_ERROR', message: '无效的源ID列表' }, { status: 400 });
    }

    await reorderSources(sourceIds);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reorder sources error:', error);
    return NextResponse.json({ code: 'INTERNAL_ERROR', message: '重排序失败' }, { status: 500 });
  }
}
