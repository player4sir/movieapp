/**
 * Authentication Middleware
 * Validates JWT tokens and extracts user information for protected routes
 * 
 * Requirements: 5.5, 7.1
 */

import { NextRequest, NextResponse } from 'next/server';
import { validateAccessToken, getUserById } from '@/services/auth.service';
import { TokenPayload, UserProfile, AUTH_ERRORS } from '@/types/auth';

export interface AuthenticatedRequest extends NextRequest {
  user?: UserProfile;
  tokenPayload?: TokenPayload;
}

export interface AuthResult {
  success: boolean;
  user?: UserProfile;
  tokenPayload?: TokenPayload;
  error?: {
    code: string;
    message: string;
    status: number;
  };
}

/**
 * Extract Bearer token from Authorization header
 */
export function extractBearerToken(request: NextRequest): string | null {
  const authHeader = request.headers.get('Authorization');
  
  if (!authHeader) {
    return null;
  }

  const parts = authHeader.split(' ');
  if (parts.length !== 2 || parts[0].toLowerCase() !== 'bearer') {
    return null;
  }

  return parts[1];
}

/**
 * Authenticate request and return user info
 * Use this in API route handlers for protected endpoints
 */
export async function authenticateRequest(
  request: NextRequest
): Promise<AuthResult> {
  const token = extractBearerToken(request);

  if (!token) {
    return {
      success: false,
      error: {
        code: AUTH_ERRORS.UNAUTHORIZED.code,
        message: AUTH_ERRORS.UNAUTHORIZED.message,
        status: 401,
      },
    };
  }

  try {
    const tokenPayload = validateAccessToken(token);
    const user = await getUserById(tokenPayload.userId);

    if (!user) {
      return {
        success: false,
        error: {
          code: AUTH_ERRORS.INVALID_TOKEN.code,
          message: AUTH_ERRORS.INVALID_TOKEN.message,
          status: 401,
        },
      };
    }

    if (user.status === 'disabled') {
      return {
        success: false,
        error: {
          code: AUTH_ERRORS.USER_DISABLED.code,
          message: AUTH_ERRORS.USER_DISABLED.message,
          status: 403,
        },
      };
    }

    return {
      success: true,
      user,
      tokenPayload,
    };
  } catch (error: unknown) {
    const authError = error as { code?: string; message?: string };
    
    if (authError.code === AUTH_ERRORS.TOKEN_EXPIRED.code) {
      return {
        success: false,
        error: {
          code: AUTH_ERRORS.TOKEN_EXPIRED.code,
          message: AUTH_ERRORS.TOKEN_EXPIRED.message,
          status: 401,
        },
      };
    }

    return {
      success: false,
      error: {
        code: AUTH_ERRORS.INVALID_TOKEN.code,
        message: AUTH_ERRORS.INVALID_TOKEN.message,
        status: 401,
      },
    };
  }
}


/**
 * Require authentication - returns error response if not authenticated
 * Use this as a guard at the start of protected API routes
 */
export async function requireAuth(
  request: NextRequest
): Promise<{ user: UserProfile; tokenPayload: TokenPayload } | NextResponse> {
  const result = await authenticateRequest(request);

  if (!result.success || !result.user || !result.tokenPayload) {
    return NextResponse.json(
      { code: result.error?.code, message: result.error?.message },
      { status: result.error?.status || 401 }
    );
  }

  return { user: result.user, tokenPayload: result.tokenPayload };
}

/**
 * Require admin role - returns error response if not admin
 * Use this as a guard for admin-only API routes
 * Requirements: 7.1
 */
export async function requireAdmin(
  request: NextRequest
): Promise<{ user: UserProfile; tokenPayload: TokenPayload } | NextResponse> {
  const authResult = await requireAuth(request);

  // If requireAuth returned a NextResponse (error), pass it through
  if (authResult instanceof NextResponse) {
    return authResult;
  }

  // Check admin role
  if (authResult.user.role !== 'admin') {
    return NextResponse.json(
      { code: AUTH_ERRORS.FORBIDDEN.code, message: AUTH_ERRORS.FORBIDDEN.message },
      { status: 403 }
    );
  }

  return authResult;
}

/**
 * Helper to check if result is an error response
 */
export function isAuthError(
  result: { user: UserProfile; tokenPayload: TokenPayload } | NextResponse
): result is NextResponse {
  return result instanceof NextResponse;
}

/**
 * Get admin user info from request without returning error response
 * Useful when you need admin info for logging but already validated auth
 */
export async function getAdminUser(
  request: NextRequest
): Promise<{ userId: string; username: string } | null> {
  const token = extractBearerToken(request);
  if (!token) return null;

  try {
    const tokenPayload = validateAccessToken(token);
    return {
      userId: tokenPayload.userId,
      username: tokenPayload.username,
    };
  } catch {
    return null;
  }
}
