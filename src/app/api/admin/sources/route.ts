/**
 * Admin Video Sources API - List and Create
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import { getAllSources, createSource } from '@/services/video-source.service';

// GET all sources
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) return authResult;

  try {
    const sources = await getAllSources();
    return NextResponse.json(sources);
  } catch (error) {
    console.error('Get sources error:', error);
    return NextResponse.json({ code: 'INTERNAL_ERROR', message: '获取影视源失败' }, { status: 500 });
  }
}

// POST create source
export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) return authResult;

  try {
    const body = await request.json();
    const { name, apiUrl, timeout, retries, enabled, category } = body;

    if (!name?.trim() || !apiUrl?.trim()) {
      return NextResponse.json({ code: 'VALIDATION_ERROR', message: '名称和API地址不能为空' }, { status: 400 });
    }

    // Validate category if provided
    if (category && !['normal', 'adult'].includes(category)) {
      return NextResponse.json({ code: 'VALIDATION_ERROR', message: '无效的分类值' }, { status: 400 });
    }

    const source = await createSource({ 
      name: name.trim(), 
      apiUrl: apiUrl.trim(), 
      timeout, 
      retries, 
      enabled,
      category: category || 'normal'
    });
    return NextResponse.json(source, { status: 201 });
  } catch (error) {
    console.error('Create source error:', error);
    return NextResponse.json({ code: 'INTERNAL_ERROR', message: '创建影视源失败' }, { status: 500 });
  }
}
