/**
 * User Check-in API
 * POST /api/user/coins/checkin - Perform daily check-in
 * 
 * Requirements: 2.1, 2.2, 2.3, 2.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-middleware';
import { checkin, getCheckinStatus, CHECKIN_ERRORS } from '@/services/checkin.service';

/**
 * POST /api/user/coins/checkin
 * Performs daily check-in for the authenticated user.
 * 
 * Requirements: 2.1 - Add configured check-in reward to balance
 * Requirements: 2.2 - Reject if already checked in today
 * Requirements: 2.3 - Create transaction record with type "checkin"
 * Requirements: 2.4 - Apply bonus multipliers for consecutive check-ins
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if (isAuthError(authResult)) {
    return authResult;
  }

  const { user } = authResult;

  try {
    const result = await checkin(user.id);

    return NextResponse.json({
      success: result.success,
      coinsEarned: result.coinsEarned,
      streakCount: result.streakCount,
      nextCheckinTime: result.nextCheckinTime,
      bonusApplied: result.bonusApplied,
    }, { status: 200 });
  } catch (error: unknown) {
    console.error('Check-in error:', error);
    
    const checkinError = error as { code?: string; message?: string };
    
    // Handle already checked in error - return status info
    if (checkinError.code === CHECKIN_ERRORS.ALREADY_CHECKED_IN.code) {
      const status = await getCheckinStatus(user.id);
      return NextResponse.json(
        { 
          code: checkinError.code, 
          message: checkinError.message,
          nextCheckinTime: status.nextCheckinTime,
          streakCount: status.streakCount,
        },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '签到失败，请重试' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/user/coins/checkin
 * Get current check-in status for the authenticated user.
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if (isAuthError(authResult)) {
    return authResult;
  }

  const { user } = authResult;

  try {
    const status = await getCheckinStatus(user.id);

    return NextResponse.json({
      canCheckin: status.canCheckin,
      lastCheckinDate: status.lastCheckinDate,
      streakCount: status.streakCount,
      nextCheckinTime: status.nextCheckinTime,
    }, { status: 200 });
  } catch (error: unknown) {
    console.error('Get check-in status error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '获取签到状态失败' },
      { status: 500 }
    );
  }
}
