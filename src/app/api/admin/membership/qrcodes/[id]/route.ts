/**
 * Admin Payment QR Code Detail API Route
 * Update and delete payment QR codes
 * 
 * Requirements: 7.2, 7.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import { PaymentQRCodeRepository } from '@/repositories';

const paymentQRCodeRepository = new PaymentQRCodeRepository();

const QRCODE_ERRORS = {
  QRCODE_NOT_FOUND: {
    code: 'QRCODE_NOT_FOUND',
    message: '收款码不存在',
  },
} as const;

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/membership/qrcodes/[id]
 * Get QR code details
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) {
    return authResult;
  }

  try {
    const { id } = await params;
    const qrcode = await paymentQRCodeRepository.findById(id);

    if (!qrcode) {
      return NextResponse.json(
        { code: QRCODE_ERRORS.QRCODE_NOT_FOUND.code, message: QRCODE_ERRORS.QRCODE_NOT_FOUND.message },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: qrcode });
  } catch (error) {
    console.error('Admin get qrcode error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '获取收款码详情失败' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/admin/membership/qrcodes/[id]
 * Update a payment QR code
 * 
 * Body (all optional):
 * - paymentType?: 'wechat' | 'alipay'
 * - imageUrl?: string
 * - enabled?: boolean
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) {
    return authResult;
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { paymentType, imageUrl, enabled } = body;

    // Check if QR code exists
    const existingQRCode = await paymentQRCodeRepository.findById(id);
    if (!existingQRCode) {
      return NextResponse.json(
        { code: QRCODE_ERRORS.QRCODE_NOT_FOUND.code, message: QRCODE_ERRORS.QRCODE_NOT_FOUND.message },
        { status: 404 }
      );
    }

    // Validate fields if provided
    if (paymentType !== undefined && !['wechat', 'alipay'].includes(paymentType)) {
      return NextResponse.json(
        { code: 'INVALID_PAYMENT_TYPE', message: '支付类型必须是 wechat 或 alipay' },
        { status: 400 }
      );
    }

    const updateData: Record<string, unknown> = {};
    if (paymentType !== undefined) updateData.paymentType = paymentType;
    if (imageUrl !== undefined) updateData.imageUrl = imageUrl;
    if (enabled !== undefined) updateData.enabled = enabled;

    const qrcode = await paymentQRCodeRepository.update(id, updateData);

    return NextResponse.json({ data: qrcode, message: '收款码更新成功' });
  } catch (error) {
    console.error('Admin update qrcode error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '更新收款码失败' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/admin/membership/qrcodes/[id]
 * Delete a payment QR code
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) {
    return authResult;
  }

  try {
    const { id } = await params;

    // Check if QR code exists
    const existingQRCode = await paymentQRCodeRepository.findById(id);
    if (!existingQRCode) {
      return NextResponse.json(
        { code: QRCODE_ERRORS.QRCODE_NOT_FOUND.code, message: QRCODE_ERRORS.QRCODE_NOT_FOUND.message },
        { status: 404 }
      );
    }

    await paymentQRCodeRepository.delete(id);

    return NextResponse.json({ message: '收款码删除成功' });
  } catch (error) {
    console.error('Admin delete qrcode error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '删除收款码失败' },
      { status: 500 }
    );
  }
}
