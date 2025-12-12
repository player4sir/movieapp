/**
 * Admin Membership Plan Detail API Route
 * Update and delete membership plans
 * 
 * Requirements: 7.1, 7.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import { MembershipPlanRepository } from '@/repositories';
import { MEMBERSHIP_ERRORS } from '@/services/membership.service';

const membershipPlanRepository = new MembershipPlanRepository();

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/membership/plans/[id]
 * Get plan details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) {
    return authResult;
  }

  try {
    const { id } = await params;
    const plan = await membershipPlanRepository.findById(id);

    if (!plan) {
      return NextResponse.json(
        { code: MEMBERSHIP_ERRORS.PLAN_NOT_FOUND.code, message: MEMBERSHIP_ERRORS.PLAN_NOT_FOUND.message },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: plan });
  } catch (error) {
    console.error('Admin get plan error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '获取套餐详情失败' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/membership/plans/[id]
 * Update a membership plan
 * 
 * Body (all optional):
 * - name?: string
 * - memberLevel?: 'vip' | 'svip'
 * - duration?: number (days)
 * - price?: number (cents)
 * - coinPrice?: number
 * - enabled?: boolean
 * - sortOrder?: number
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) {
    return authResult;
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, memberLevel, duration, price, coinPrice, enabled, sortOrder } = body;

    // Check if plan exists
    const existingPlan = await membershipPlanRepository.findById(id);
    if (!existingPlan) {
      return NextResponse.json(
        { code: MEMBERSHIP_ERRORS.PLAN_NOT_FOUND.code, message: MEMBERSHIP_ERRORS.PLAN_NOT_FOUND.message },
        { status: 404 }
      );
    }

    // Validate fields if provided
    if (memberLevel !== undefined && !['vip', 'svip'].includes(memberLevel)) {
      return NextResponse.json(
        { code: 'INVALID_LEVEL', message: '会员等级必须是 vip 或 svip' },
        { status: 400 }
      );
    }

    if (duration !== undefined && (typeof duration !== 'number' || duration <= 0)) {
      return NextResponse.json(
        { code: 'INVALID_DURATION', message: '会员时长必须大于0' },
        { status: 400 }
      );
    }

    if (price !== undefined && (typeof price !== 'number' || price < 0)) {
      return NextResponse.json(
        { code: 'INVALID_PRICE', message: '价格不能为负数' },
        { status: 400 }
      );
    }

    if (coinPrice !== undefined && (typeof coinPrice !== 'number' || coinPrice < 0)) {
      return NextResponse.json(
        { code: 'INVALID_COIN_PRICE', message: '金币价格不能为负数' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name;
    if (memberLevel !== undefined) updateData.memberLevel = memberLevel;
    if (duration !== undefined) updateData.duration = duration;
    if (price !== undefined) updateData.price = price;
    if (coinPrice !== undefined) updateData.coinPrice = coinPrice;
    if (enabled !== undefined) updateData.enabled = enabled;
    if (sortOrder !== undefined) updateData.sortOrder = sortOrder;

    const plan = await membershipPlanRepository.update(id, updateData);

    return NextResponse.json({ data: plan, message: '套餐更新成功' });
  } catch (error) {
    console.error('Admin update plan error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '更新套餐失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/membership/plans/[id]
 * Delete a membership plan
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) {
    return authResult;
  }

  try {
    const { id } = await params;

    // Check if plan exists
    const existingPlan = await membershipPlanRepository.findById(id);
    if (!existingPlan) {
      return NextResponse.json(
        { code: MEMBERSHIP_ERRORS.PLAN_NOT_FOUND.code, message: MEMBERSHIP_ERRORS.PLAN_NOT_FOUND.message },
        { status: 404 }
      );
    }

    await membershipPlanRepository.delete(id);

    return NextResponse.json({ message: '套餐删除成功' });
  } catch (error) {
    console.error('Admin delete plan error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '删除套餐失败' },
      { status: 500 }
    );
  }
}
