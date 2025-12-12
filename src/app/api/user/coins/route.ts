/**
 * User Coins API
 * GET /api/user/coins - Get user's coin balance and summary
 * 
 * Requirements: 1.1, 1.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-middleware';
import { getBalance, COIN_ERRORS } from '@/services/coin.service';

/**
 * GET /api/user/coins
 * Returns user's current coin balance and summary.
 * 
 * Requirements: 1.1 - Display current User_Coin_Balance
 * Requirements: 1.3 - Display error message and retry on failure
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if (isAuthError(authResult)) {
    return authResult;
  }

  const { user } = authResult;

  try {
    const balance = await getBalance(user.id);

    return NextResponse.json({
      balance: balance.balance,
      totalEarned: balance.totalEarned,
      totalSpent: balance.totalSpent,
      updatedAt: balance.updatedAt,
    }, { status: 200 });
  } catch (error: unknown) {
    console.error('Get coin balance error:', error);
    
    // Check for known error types
    const coinError = error as { code?: string; message?: string };
    if (coinError.code === COIN_ERRORS.USER_NOT_FOUND.code) {
      return NextResponse.json(
        { code: coinError.code, message: coinError.message },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '获取金币余额失败，请重试' },
      { status: 500 }
    );
  }
}
