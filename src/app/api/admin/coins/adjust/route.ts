/**
 * Admin Coin Adjust API
 * POST /api/admin/coins/adjust - Adjust user coin balances
 * 
 * Requirements: 6.1, 6.2, 6.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import { 
  adjustBalance, 
  batchAdjust, 
  COIN_ERRORS 
} from '@/services/coin.service';

/**
 * POST /api/admin/coins/adjust
 * Adjusts single or multiple user coin balances.
 * Creates audit trail with admin note.
 * 
 * Requirements: 6.1 - Update User_Coin_Balance accordingly
 * Requirements: 6.2 - Create Coin_Transaction with type "adjust" and admin note
 * Requirements: 6.4 - Process batch adjustments atomically
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request);
  
  if (isAuthError(authResult)) {
    return authResult;
  }

  const { user } = authResult;

  try {
    const body = await request.json();
    const { userId, userIds, amount, note } = body;

    // Validate amount
    if (typeof amount !== 'number' || amount === 0) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: '调整金额必须是非零数字' },
        { status: 400 }
      );
    }

    // Validate note
    if (!note || typeof note !== 'string' || note.trim().length === 0) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: '调整原因不能为空' },
        { status: 400 }
      );
    }

    // Batch adjustment
    if (userIds && Array.isArray(userIds)) {
      if (userIds.length === 0) {
        return NextResponse.json(
          { code: 'VALIDATION_ERROR', message: '用户列表不能为空' },
          { status: 400 }
        );
      }

      // Validate all userIds are strings
      if (!userIds.every(id => typeof id === 'string' && id.length > 0)) {
        return NextResponse.json(
          { code: 'VALIDATION_ERROR', message: '用户ID格式无效' },
          { status: 400 }
        );
      }

      const result = await batchAdjust(userIds, amount, user.id, note.trim());

      return NextResponse.json({
        success: true,
        affected: result.affected,
        message: `成功调整 ${result.affected} 个用户的金币余额`,
      }, { status: 200 });
    }

    // Single user adjustment
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: '用户ID不能为空' },
        { status: 400 }
      );
    }

    const result = await adjustBalance(userId, amount, user.id, note.trim());

    return NextResponse.json({
      success: true,
      affected: 1,
      transaction: {
        id: result.transaction.id,
        userId: result.transaction.userId,
        type: result.transaction.type,
        amount: result.transaction.amount,
        balanceAfter: result.transaction.balanceAfter,
        description: result.transaction.description,
        createdAt: result.transaction.createdAt,
      },
      newBalance: result.newBalance,
    }, { status: 200 });
  } catch (error: unknown) {
    console.error('Adjust coin balance error:', error);
    
    const coinError = error as { code?: string; message?: string };
    
    if (coinError.code === COIN_ERRORS.INSUFFICIENT_BALANCE.code) {
      return NextResponse.json(
        { code: coinError.code, message: coinError.message },
        { status: 400 }
      );
    }

    if (coinError.code === COIN_ERRORS.INVALID_AMOUNT.code) {
      return NextResponse.json(
        { code: coinError.code, message: coinError.message },
        { status: 400 }
      );
    }

    if (coinError.code === COIN_ERRORS.USER_NOT_FOUND.code) {
      return NextResponse.json(
        { code: coinError.code, message: coinError.message },
        { status: 404 }
      );
    }

    if (coinError.code === COIN_ERRORS.TRANSACTION_FAILED.code) {
      return NextResponse.json(
        { code: coinError.code, message: coinError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '调整金币余额失败' },
      { status: 500 }
    );
  }
}
