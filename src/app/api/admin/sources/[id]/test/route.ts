/**
 * Admin Video Source Test API
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import { testSource } from '@/services/video-source.service';

// POST test source connection
export async function POST(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) return authResult;

  try {
    const { id } = await params;
    const result = await testSource(id);
    return NextResponse.json(result);
  } catch (error) {
    console.error('Test source error:', error);
    const message = error instanceof Error ? error.message : '测试连接失败';
    return NextResponse.json({ code: 'TEST_FAILED', message }, { status: 500 });
  }
}
