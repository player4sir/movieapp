/**
 * Admin Settings API Route
 * Get and update API configuration
 * Requirements: 8.1
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';

// In a real implementation, this would be stored in database or Redis
let apiConfig = {
  baseUrl: process.env.VIDEO_API_URL || 'http://caiji.dyttzyapi.com/api.php/provide/vod',
  timeout: 10000,
  retries: 3,
};

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) {
    return authResult;
  }

  return NextResponse.json(apiConfig);
}

export async function PUT(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) {
    return authResult;
  }

  try {
    const body = await request.json();
    const { baseUrl, timeout, retries } = body;

    // Validate configuration
    if (!baseUrl || typeof baseUrl !== 'string') {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'API地址不能为空' },
        { status: 400 }
      );
    }

    try {
      new URL(baseUrl);
    } catch {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: '无效的API地址' },
        { status: 400 }
      );
    }

    if (typeof timeout !== 'number' || timeout < 1000 || timeout > 60000) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: '超时时间必须在1000-60000ms之间' },
        { status: 400 }
      );
    }

    if (typeof retries !== 'number' || retries < 0 || retries > 10) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: '重试次数必须在0-10之间' },
        { status: 400 }
      );
    }

    // Test the API endpoint before saving
    try {
      const testResponse = await fetch(`${baseUrl}?ac=list&pg=1`, {
        signal: AbortSignal.timeout(timeout),
      });
      
      if (!testResponse.ok) {
        return NextResponse.json(
          { code: 'VALIDATION_ERROR', message: 'API地址验证失败，请检查地址是否正确' },
          { status: 400 }
        );
      }
    } catch {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'API地址无法访问，请检查地址是否正确' },
        { status: 400 }
      );
    }

    // Update configuration
    apiConfig = { baseUrl, timeout, retries };

    return NextResponse.json(apiConfig);
  } catch (error) {
    console.error('Admin settings update error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '更新配置失败' },
      { status: 500 }
    );
  }
}
