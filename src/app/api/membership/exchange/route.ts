/**
 * Membership Coin Exchange API
 * POST /api/membership/exchange - Exchange coins for membership
 * 
 * Uses membershipPlans.coinPrice as the price source
 * Calls activateMembership() service for consistent membership activation
 * 
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-middleware';
import { getBalance, deductCoins, COIN_ERRORS } from '@/services/coin.service';
import { getPlanById, activateMembership, MEMBERSHIP_ERRORS } from '@/services/membership.service';

/**
 * POST /api/membership/exchange
 * Exchanges coins for membership using plan's coinPrice.
 * 
 * Body:
 * - planId: string - The membership plan to purchase
 * 
 * Requirements: 3.1 - Verify balance is sufficient
 * Requirements: 3.2 - Deduct coins and extend membership
 * Requirements: 3.3 - Create transaction record with type "exchange"
 * Requirements: 3.4 - Reject if balance insufficient
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if (isAuthError(authResult)) {
    return authResult;
  }

  const { user } = authResult;

  try {
    const body = await request.json();
    const { planId } = body;

    // Validate planId
    if (!planId) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: '请选择会员套餐' },
        { status: 400 }
      );
    }

    // Get plan details
    const plan = await getPlanById(planId);
    
    if (!plan) {
      return NextResponse.json(
        { code: MEMBERSHIP_ERRORS.PLAN_NOT_FOUND.code, message: MEMBERSHIP_ERRORS.PLAN_NOT_FOUND.message },
        { status: 404 }
      );
    }

    if (!plan.enabled) {
      return NextResponse.json(
        { code: MEMBERSHIP_ERRORS.PLAN_DISABLED.code, message: MEMBERSHIP_ERRORS.PLAN_DISABLED.message },
        { status: 400 }
      );
    }

    const requiredCoins = plan.coinPrice;

    // Check user's current balance
    const balance = await getBalance(user.id);
    
    if (balance.balance < requiredCoins) {
      return NextResponse.json(
        { 
          code: COIN_ERRORS.INSUFFICIENT_BALANCE.code, 
          message: COIN_ERRORS.INSUFFICIENT_BALANCE.message,
          required: requiredCoins,
          current: balance.balance,
        },
        { status: 400 }
      );
    }

    // Deduct coins with transaction record
    await deductCoins(
      user.id,
      requiredCoins,
      'exchange',
      `兑换${plan.name}`,
      { planId: plan.id, planName: plan.name, memberLevel: plan.memberLevel, duration: plan.duration }
    );

    // Activate membership using the unified service
    const result = await activateMembership(
      user.id,
      plan.memberLevel,
      plan.duration
    );

    return NextResponse.json({
      success: true,
      coinsDeducted: requiredCoins,
      memberLevel: result.newLevel,
      newExpiry: result.newExpiry,
      plan: {
        id: plan.id,
        name: plan.name,
        duration: plan.duration,
      },
    }, { status: 200 });
  } catch (error: unknown) {
    console.error('Coin exchange error:', error);
    
    const coinError = error as { code?: string; message?: string };
    
    if (coinError.code === COIN_ERRORS.INSUFFICIENT_BALANCE.code) {
      return NextResponse.json(
        { code: coinError.code, message: coinError.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '兑换失败，请重试' },
      { status: 500 }
    );
  }
}
