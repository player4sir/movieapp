/**
 * Admin Membership Order Detail API Route
 * Approve or reject order, activate membership on approval
 * 
 * Requirements: 6.2, 6.3, 6.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import {
  approveOrder,
  rejectOrder,
  getOrderById,
  ORDER_ERRORS,
} from '@/services/membership-order.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/membership/orders/[id]
 * Get order details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) {
    return authResult;
  }

  try {
    const { id } = await params;
    const order = await getOrderById(id);

    if (!order) {
      return NextResponse.json(
        { code: ORDER_ERRORS.ORDER_NOT_FOUND.code, message: ORDER_ERRORS.ORDER_NOT_FOUND.message },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: order });
  } catch (error) {
    console.error('Admin get order error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '获取订单详情失败' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/membership/orders/[id]
 * Approve or reject order
 * 
 * Body:
 * - action: 'approve' | 'reject'
 * - reason?: string (required for reject)
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) {
    return authResult;
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { action, reason } = body;

    if (!action || !['approve', 'reject'].includes(action)) {
      return NextResponse.json(
        { code: 'INVALID_ACTION', message: '无效的操作类型' },
        { status: 400 }
      );
    }

    if (action === 'reject' && !reason) {
      return NextResponse.json(
        { code: 'REASON_REQUIRED', message: '拒绝订单需要填写原因' },
        { status: 400 }
      );
    }

    const adminId = authResult.user.id;

    if (action === 'approve') {
      const result = await approveOrder(id, adminId);
      return NextResponse.json({
        data: result.order,
        membershipActivated: result.membershipActivated,
        message: '订单已通过，会员已激活',
      });
    } else {
      await rejectOrder(id, adminId, reason);
      return NextResponse.json({
        deleted: true,
        message: '订单已删除',
      });
    }
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };

    if (err.code === ORDER_ERRORS.ORDER_NOT_FOUND.code) {
      return NextResponse.json(
        { code: err.code, message: err.message },
        { status: 404 }
      );
    }

    if (err.code === ORDER_ERRORS.ORDER_ALREADY_PROCESSED.code) {
      return NextResponse.json(
        { code: err.code, message: err.message },
        { status: 400 }
      );
    }

    console.error('Admin order review error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '处理订单失败' },
      { status: 500 }
    );
  }
}
