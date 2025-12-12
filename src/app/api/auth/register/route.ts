/**
 * POST /api/auth/register
 * Register a new user account
 */

import { NextRequest, NextResponse } from 'next/server';
import { register } from '@/services/auth.service';
import { AUTH_ERRORS } from '@/types/auth';

interface RegisterBody {
  username: string;
  password: string;
  nickname?: string;
  inviteCode?: string;
}

import { rateLimiter } from '@/lib/rate-limit';

export async function POST(request: NextRequest) {
  const ip = request.headers.get('x-forwarded-for') || 'unknown';

  // Rate Limit: 5 attempts per minute per IP
  const limitResult = rateLimiter.check(ip, 5, 60 * 1000);

  if (!limitResult.success) {
    return NextResponse.json(
      {
        code: 'RATE_LIMIT_EXCEEDED',
        message: '注册请求过于频繁，请稍后再试'
      },
      { status: 429 }
    );
  }
  try {
    const body: RegisterBody = await request.json();

    if (!body.username || !body.password) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: '用户名和密码不能为空' },
        { status: 400 }
      );
    }

    // Validate username format (alphanumeric, 3-20 chars)
    const usernameRegex = /^[a-zA-Z0-9_]{3,20}$/;
    if (!usernameRegex.test(body.username)) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: '用户名只能包含字母、数字和下划线，长度3-20位' },
        { status: 400 }
      );
    }

    if (body.password.length < 6) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: '密码至少6个字符' },
        { status: 400 }
      );
    }

    const result = await register(body.username, body.password, body.nickname, body.inviteCode);

    return NextResponse.json(result, { status: 201 });
  } catch (error: unknown) {
    const authError = error as { code?: string; message?: string };

    if (authError.code === AUTH_ERRORS.USERNAME_EXISTS.code) {
      return NextResponse.json(
        { code: authError.code, message: authError.message },
        { status: 409 }
      );
    }

    console.error('Registration error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: `服务器内部错误: ${errorMessage}` },
      { status: 500 }
    );
  }
}
