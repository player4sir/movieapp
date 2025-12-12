/**
 * Membership Plans API
 * GET /api/membership/plans - Get available membership plans
 * 
 * Returns enabled plans with prices and durations.
 * This endpoint is public (no authentication required).
 * 
 * Requirements: 1.1, 1.4
 */

import { NextResponse } from 'next/server';
import { getPlans } from '@/services/membership.service';

/**
 * GET /api/membership/plans
 * Returns all enabled membership plans with prices and durations.
 * 
 * Requirements: 1.1 - Display all available membership plans with prices and durations
 * Requirements: 1.4 - Show VIP and SVIP options with monthly, quarterly, and yearly durations
 */
export async function GET() {
  try {
    const plans = await getPlans();

    // Transform plans to API response format
    const response = plans.map(plan => ({
      id: plan.id,
      name: plan.name,
      memberLevel: plan.memberLevel,
      duration: plan.duration,
      price: plan.price,
      coinPrice: plan.coinPrice,
      sortOrder: plan.sortOrder,
    }));

    return NextResponse.json({
      plans: response,
    }, { status: 200 });
  } catch (error: unknown) {
    console.error('Get membership plans error:', error);

    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '获取会员套餐失败，请重试' },
      { status: 500 }
    );
  }
}
