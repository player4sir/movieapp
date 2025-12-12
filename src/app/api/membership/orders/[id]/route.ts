/**
 * Membership Order Detail API
 * PUT /api/membership/orders/[id] - Submit payment screenshot and transaction note
 * 
 * Requirements: 2.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-middleware';
import {
  submitPaymentProof,
  ORDER_ERRORS
} from '@/services/membership-order.service';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PUT /api/membership/orders/[id]
 * Submit payment screenshot and transaction note for an order.
 * 
 * Requirements: 2.3 - Allow user to upload payment screenshot or enter transaction note
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAuth(request);

  if (isAuthError(authResult)) {
    return authResult;
  }

  const { user } = authResult;
  const { id: orderId } = await params;

  try {
    const body = await request.json();
    const { screenshot, transactionNote } = body;

    // No mandatory validation for screenshot/note anymore as we allow "Remark Code" mode

    const order = await submitPaymentProof(orderId, user.id, {
      screenshot,
      transactionNote,
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
        paymentScreenshot: order.paymentScreenshot,
        transactionNote: order.transactionNote,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
    }, { status: 200 });
  } catch (error: unknown) {
    console.error('Submit payment proof error:', error);

    const orderError = error as { code?: string; message?: string };

    if (orderError.code === ORDER_ERRORS.ORDER_NOT_FOUND.code) {
      return NextResponse.json(
        { code: orderError.code, message: orderError.message },
        { status: 404 }
      );
    }

    if (orderError.code === ORDER_ERRORS.ORDER_ALREADY_PROCESSED.code) {
      return NextResponse.json(
        { code: orderError.code, message: orderError.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '提交支付凭证失败，请重试' },
      { status: 500 }
    );
  }
}
