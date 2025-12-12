/**
 * Admin Video Source API - Detail, Update, Delete
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import { getSourceById, updateSource, deleteSource, toggleSource } from '@/services/video-source.service';

// GET source detail
export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) return authResult;

  try {
    const { id } = await params;
    const source = await getSourceById(id);
    if (!source) {
      return NextResponse.json({ code: 'NOT_FOUND', message: '影视源不存在' }, { status: 404 });
    }
    return NextResponse.json(source);
  } catch (error) {
    console.error('Get source error:', error);
    return NextResponse.json({ code: 'INTERNAL_ERROR', message: '获取影视源失败' }, { status: 500 });
  }
}

// PUT update source
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) return authResult;

  try {
    const { id } = await params;
    const body = await request.json();
    
    // Handle toggle action
    if (body.action === 'toggle') {
      const source = await toggleSource(id);
      return NextResponse.json(source);
    }

    const { name, apiUrl, timeout, retries, enabled, category } = body;
    
    // Validate category if provided
    if (category && !['normal', 'adult'].includes(category)) {
      return NextResponse.json({ code: 'VALIDATION_ERROR', message: '无效的分类值' }, { status: 400 });
    }
    
    const source = await updateSource(id, { name, apiUrl, timeout, retries, enabled, category });
    return NextResponse.json(source);
  } catch (error) {
    console.error('Update source error:', error);
    return NextResponse.json({ code: 'INTERNAL_ERROR', message: '更新影视源失败' }, { status: 500 });
  }
}

// DELETE source
export async function DELETE(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) return authResult;

  try {
    const { id } = await params;
    await deleteSource(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete source error:', error);
    return NextResponse.json({ code: 'INTERNAL_ERROR', message: '删除影视源失败' }, { status: 500 });
  }
}
