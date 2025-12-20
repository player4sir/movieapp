/**
 * Membership Orders API
 * POST /api/membership/orders - Create new membership order
 * GET /api/membership/orders - Get user's order history
 * 
 * Requirements: 2.2, 2.4, 2.5, 9.1, 9.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-middleware';
import {
  createOrder,
  getUserOrders,
  ORDER_ERRORS
} from '@/services/membership-order.service';
import { PaymentType } from '@/db/schema';

/**
 * POST /api/membership/orders
 * Create a new membership order with validation.
 * Checks for duplicate pending orders.
 * 
 * Requirements: 2.2 - Create order with pending status
 * Requirements: 2.4 - Generate unique order number
 * Requirements: 2.5 - Prevent duplicate pending orders for same plan
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAuth(request);

  if (isAuthError(authResult)) {
    return authResult;
  }

  const { user } = authResult;

  try {
    const body = await request.json();
    const { planId, paymentType } = body;

    // Validate required fields
    if (!planId) {
      return NextResponse.json(
        { code: 'INVALID_INPUT', message: '请选择会员套餐' },
        { status: 400 }
      );
    }

    // Validate payment type if provided
    if (paymentType && !['wechat', 'alipay'].includes(paymentType)) {
      return NextResponse.json(
        { code: 'INVALID_INPUT', message: '无效的支付方式' },
        { status: 400 }
      );
    }

    // Resolve agent code if provided
    // Agent codes start with 'A' and are 8 chars (stored in agentProfiles)
    // Regular referral codes are 6 chars (stored in users.referralCode)
    let agentId: string | undefined;
    if (body.agentCode) {
      const { db } = await import('@/db');
      const { users, agentProfiles } = await import('@/db/schema');
      const { eq } = await import('drizzle-orm');

      const code = body.agentCode.trim().toUpperCase();
      const isAgentCode = code.startsWith('A') && code.length === 8;

      if (isAgentCode) {
        // Look for agent promotion code in agentProfiles table
        const agentProfile = await db.query.agentProfiles.findFirst({
          where: eq(agentProfiles.agentCode, code),
          columns: { userId: true, status: true }
        });

        if (agentProfile?.status === 'active') {
          agentId = agentProfile.userId;
        }
      } else {
        // Fall back to regular user referral code
        const agent = await db.query.users.findFirst({
          where: eq(users.referralCode, code),
          columns: { id: true }
        });

        if (agent) {
          agentId = agent.id;
        }
      }
    }

    const order = await createOrder({
      userId: user.id,
      planId,
      paymentType: paymentType as PaymentType | undefined,
      agentId,
    });

    return NextResponse.json({
      order: {
        id: order.id,
        orderNo: order.orderNo,
        planId: order.planId,
        memberLevel: order.memberLevel,
        duration: order.duration,
        price: order.price,
        status: order.status,
        paymentType: order.paymentType,
        remarkCode: order.remarkCode,
        createdAt: order.createdAt,
      },
    }, { status: 201 });
  } catch (error: unknown) {
    console.error('Create membership order error:', error);

    const orderError = error as { code?: string; message?: string };

    if (orderError.code === ORDER_ERRORS.PLAN_NOT_FOUND.code) {
      return NextResponse.json(
        { code: orderError.code, message: orderError.message },
        { status: 404 }
      );
    }

    if (orderError.code === ORDER_ERRORS.PLAN_DISABLED.code) {
      return NextResponse.json(
        { code: orderError.code, message: orderError.message },
        { status: 400 }
      );
    }

    if (orderError.code === ORDER_ERRORS.DUPLICATE_PENDING_ORDER.code) {
      return NextResponse.json(
        { code: orderError.code, message: orderError.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '创建订单失败，请重试' },
      { status: 500 }
    );
  }
}

/**
 * GET /api/membership/orders
 * Returns user's order history with pagination.
 * 
 * Requirements: 9.1 - Display orders with status, plan details, and timestamps
 * Requirements: 9.3 - Display membership activation details for approved orders
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);

  if (isAuthError(authResult)) {
    return authResult;
  }

  const { user } = authResult;

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    // Validate pagination params
    const validPage = Math.max(1, page);
    const validPageSize = Math.min(100, Math.max(1, pageSize));

    const result = await getUserOrders(user.id, validPage, validPageSize);

    // Transform orders to API response format
    const orders = result.data.map(order => ({
      id: order.id,
      orderNo: order.orderNo,
      planId: order.planId,
      memberLevel: order.memberLevel,
      duration: order.duration,
      price: order.price,
      status: order.status,
      paymentType: order.paymentType,
      paymentScreenshot: order.paymentScreenshot,
      transactionNote: order.transactionNote,
      reviewedAt: order.reviewedAt,
      rejectReason: order.rejectReason,
      createdAt: order.createdAt,
      updatedAt: order.updatedAt,
    }));

    return NextResponse.json({
      orders,
      pagination: result.pagination,
    }, { status: 200 });
  } catch (error: unknown) {
    console.error('Get membership orders error:', error);

    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '获取订单列表失败，请重试' },
      { status: 500 }
    );
  }
}
