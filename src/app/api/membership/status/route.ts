/**
 * Membership Status API
 * GET /api/membership/status - Get user's current membership status
 * 
 * Returns user's current membership level and expiry with proper expiry logic.
 * Requires authentication.
 * 
 * Requirements: 1.2, 1.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-middleware';
import { getMembershipStatus, MEMBERSHIP_ERRORS } from '@/services/membership.service';

/**
 * GET /api/membership/status
 * Returns user's current membership status with expiry logic.
 * 
 * Requirements: 1.2 - Display user's current member level and expiry date
 * Requirements: 1.3 - Display user as free member if membership has expired
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if (isAuthError(authResult)) {
    return authResult;
  }

  const { user } = authResult;

  try {
    const status = await getMembershipStatus(user.id);

    return NextResponse.json({
      memberLevel: status.memberLevel,
      memberExpiry: status.memberExpiry,
      isActive: status.isActive,
      daysRemaining: status.daysRemaining,
    }, { status: 200 });
  } catch (error: unknown) {
    console.error('Get membership status error:', error);
    
    const membershipError = error as { code?: string; message?: string };
    if (membershipError.code === MEMBERSHIP_ERRORS.USER_NOT_FOUND.code) {
      return NextResponse.json(
        { code: membershipError.code, message: membershipError.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '获取会员状态失败，请重试' },
      { status: 500 }
    );
  }
}
