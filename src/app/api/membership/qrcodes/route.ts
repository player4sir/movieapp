/**
 * Payment QR Codes API
 * GET /api/membership/qrcodes - Get enabled payment QR codes
 * 
 * Returns enabled payment QR codes for membership purchase.
 * This endpoint is public (no authentication required).
 * 
 * Requirements: 2.1
 */

import { NextResponse } from 'next/server';
import { getPaymentQRCodes } from '@/services/membership-order.service';

/**
 * GET /api/membership/qrcodes
 * Returns all enabled payment QR codes.
 * 
 * Requirements: 2.1 - Display the configured payment QR code when user selects a plan
 */
export async function GET() {
  try {
    const qrcodes = await getPaymentQRCodes();

    // Transform QR codes to API response format
    const response = qrcodes.map(qrcode => ({
      id: qrcode.id,
      paymentType: qrcode.paymentType,
      imageUrl: qrcode.imageUrl,
    }));

    return NextResponse.json({
      qrcodes: response,
    }, { status: 200 });
  } catch (error: unknown) {
    console.error('Get payment QR codes error:', error);

    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '获取收款码失败，请重试' },
      { status: 500 }
    );
  }
}
