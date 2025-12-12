/**
 * POST /api/auth/refresh
 * Refresh access token using refresh token
 * 
 * Requirements: 5.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { refreshAccessToken } from '@/services/auth.service';
import { AUTH_ERRORS } from '@/types/auth';

interface RefreshBody {
  refreshToken: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: RefreshBody = await request.json();

    // Validate required fields
    if (!body.refreshToken) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Refresh token is required' },
        { status: 400 }
      );
    }

    const result = await refreshAccessToken(body.refreshToken);

    return NextResponse.json(result, { status: 200 });
  } catch (error: unknown) {
    const authError = error as { code?: string; message?: string };
    
    if (
      authError.code === AUTH_ERRORS.INVALID_TOKEN.code ||
      authError.code === AUTH_ERRORS.TOKEN_EXPIRED.code
    ) {
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

    console.error('Token refresh error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' },
      { status: 500 }
    );
  }
}
