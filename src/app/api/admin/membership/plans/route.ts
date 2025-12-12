/**
 * Admin Membership Plans API Route
 * CRUD operations for membership plans
 * 
 * Requirements: 7.1, 7.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import { MembershipPlanRepository } from '@/repositories';


const membershipPlanRepository = new MembershipPlanRepository();

function generateId(): string {
  return crypto.randomUUID();
}

/**
 * GET /api/admin/membership/plans
 * List all membership plans (including disabled)
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) {
    return authResult;
  }

  try {
    const plans = await membershipPlanRepository.findAll();
    return NextResponse.json({ data: plans });
  } catch (error) {
    console.error('Admin list plans error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '获取套餐列表失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/membership/plans
 * Create a new membership plan
 * 
 * Body:
 * - name: string
 * - memberLevel: 'vip' | 'svip'
 * - duration: number (days)
 * - price: number (cents)
 * - coinPrice: number
 * - enabled?: boolean
 * - sortOrder?: number
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) {
    return authResult;
  }

  try {
    const body = await request.json();
    const { name, memberLevel, duration, price, coinPrice, enabled, sortOrder } = body;

    // Validate required fields
    if (!name || typeof name !== 'string') {
      return NextResponse.json(
        { code: 'INVALID_NAME', message: '套餐名称不能为空' },
        { status: 400 }
      );
    }

    if (!memberLevel || !['vip', 'svip'].includes(memberLevel)) {
      return NextResponse.json(
        { code: 'INVALID_LEVEL', message: '会员等级必须是 vip 或 svip' },
        { status: 400 }
      );
    }

    if (typeof duration !== 'number' || duration <= 0) {
      return NextResponse.json(
        { code: 'INVALID_DURATION', message: '会员时长必须大于0' },
        { status: 400 }
      );
    }

    if (typeof price !== 'number' || price < 0) {
      return NextResponse.json(
        { code: 'INVALID_PRICE', message: '价格不能为负数' },
        { status: 400 }
      );
    }

    if (typeof coinPrice !== 'number' || coinPrice < 0) {
      return NextResponse.json(
        { code: 'INVALID_COIN_PRICE', message: '金币价格不能为负数' },
        { status: 400 }
      );
    }

    const plan = await membershipPlanRepository.create({
      id: generateId(),
      name,
      memberLevel,
      duration,
      price,
      coinPrice,
      enabled: enabled ?? true,
      sortOrder: sortOrder ?? 0,
    });

    return NextResponse.json({ data: plan }, { status: 201 });
  } catch (error) {
    console.error('Admin create plan error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '创建套餐失败' },
      { status: 500 }
    );
  }
}
