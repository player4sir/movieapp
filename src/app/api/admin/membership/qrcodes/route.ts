/**
 * Admin Payment QR Codes API Route
 * CRUD operations for payment QR codes
 * 
 * Requirements: 7.2, 7.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import { PaymentQRCodeRepository } from '@/repositories';

const paymentQRCodeRepository = new PaymentQRCodeRepository();

function generateId(): string {
  return crypto.randomUUID();
}



/**
 * GET /api/admin/membership/qrcodes
 * List all payment QR codes (including disabled)
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) {
    return authResult;
  }

  try {
    const qrcodes = await paymentQRCodeRepository.findAll();
    return NextResponse.json({ data: qrcodes });
  } catch (error) {
    console.error('Admin list qrcodes error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '获取收款码列表失败' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/admin/membership/qrcodes
 * Upload a new payment QR code
 * 
 * Body:
 * - paymentType: 'wechat' | 'alipay'
 * - imageUrl: string
 * - enabled?: boolean
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) {
    return authResult;
  }

  try {
    const body = await request.json();
    const { paymentType, imageUrl, enabled } = body;

    // Validate required fields
    if (!paymentType || !['wechat', 'alipay'].includes(paymentType)) {
      return NextResponse.json(
        { code: 'INVALID_PAYMENT_TYPE', message: '支付类型必须是 wechat 或 alipay' },
        { status: 400 }
      );
    }

    if (!imageUrl || typeof imageUrl !== 'string') {
      return NextResponse.json(
        { code: 'INVALID_IMAGE_URL', message: '收款码图片URL不能为空' },
        { status: 400 }
      );
    }

    const qrcode = await paymentQRCodeRepository.create({
      id: generateId(),
      paymentType,
      imageUrl,
      enabled: enabled ?? true,
    });

    return NextResponse.json({ data: qrcode }, { status: 201 });
  } catch (error) {
    console.error('Admin create qrcode error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '创建收款码失败' },
      { status: 500 }
    );
  }
}
