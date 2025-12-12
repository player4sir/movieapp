/**
 * POST /api/auth/login
 * Authenticate user and return tokens
 */

import { NextRequest, NextResponse } from 'next/server';
import { login } from '@/services/auth.service';
import { AUTH_ERRORS } from '@/types/auth';

interface LoginBody {
  username: string;
  password: string;
}

import { rateLimiter } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';

  // Rate Limit: 10 attempts per minute per IP
  const limitResult = rateLimiter.check(ip, 10, 60 * 1000);

  if (!limitResult.success) {
    return NextResponse.json(
      {
        code: 'RATE_LIMIT_EXCEEDED',
        message: '尝试次数过多，请稍后再试'
      },
      { status: 429 }
    );
  }
  try {
    const body: LoginBody = await request.json();

    if (!body.username || !body.password) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: '用户名和密码不能为空' },
        { status: 400 }
      );
    }

    const result = await login(body.username, body.password);

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const authError = error as { code?: string; message?: string };

    if (authError.code === AUTH_ERRORS.INVALID_CREDENTIALS.code) {
      return NextResponse.json(
        { code: authError.code, message: authError.message },
        { status: 401 }
      );
    }

    if (authError.code === AUTH_ERRORS.USER_DISABLED.code) {
      return NextResponse.json(
        { code: authError.code, message: authError.message },
        { status: 403 }
      );
    }

    console.error('Login error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: `服务器内部错误: ${errorMessage}` },
      { status: 500 }
    );
  }
}
