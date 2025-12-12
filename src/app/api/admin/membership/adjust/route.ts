/**
 * Admin Membership Adjust API Route
 * Manually adjust user membership status
 * 
 * Requirements: 8.1, 8.2, 8.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import { adjustMembership, MEMBERSHIP_ERRORS } from '@/services/membership.service';
import { MemberLevel } from '@/db/schema';

/**
 * POST /api/admin/membership/adjust
 * Manually adjust user membership
 * 
 * Body:
 * - userId: string
 * - memberLevel: 'free' | 'vip' | 'svip'
 * - memberExpiry: string (ISO date) | null
 * - reason: string
 */
export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) {
    return authResult;
  }

  try {
    const body = await request.json();
    const { userId, memberLevel, memberExpiry, reason } = body;

    // Validate required fields
    if (!userId || typeof userId !== 'string') {
      return NextResponse.json(
        { code: 'INVALID_USER_ID', message: '用户ID不能为空' },
        { status: 400 }
      );
    }

    const validLevels: MemberLevel[] = ['free', 'vip', 'svip'];
    if (!memberLevel || !validLevels.includes(memberLevel)) {
      return NextResponse.json(
        { code: 'INVALID_LEVEL', message: '会员等级必须是 free、vip 或 svip' },
        { status: 400 }
      );
    }

    if (!reason || typeof reason !== 'string' || reason.trim().length === 0) {
      return NextResponse.json(
        { code: 'REASON_REQUIRED', message: '调整原因不能为空' },
        { status: 400 }
      );
    }

    // Parse expiry date if provided
    let expiryDate: Date | null = null;
    if (memberExpiry) {
      expiryDate = new Date(memberExpiry);
      if (isNaN(expiryDate.getTime())) {
        return NextResponse.json(
          { code: 'INVALID_EXPIRY', message: '无效的到期时间格式' },
          { status: 400 }
        );
      }
    }

    // If setting to VIP or SVIP, expiry is required
    if (memberLevel !== 'free' && !expiryDate) {
      return NextResponse.json(
        { code: 'EXPIRY_REQUIRED', message: 'VIP/SVIP会员需要设置到期时间' },
        { status: 400 }
      );
    }

    // If setting to free, expiry should be null
    if (memberLevel === 'free') {
      expiryDate = null;
    }

    const adminId = authResult.user.id;

    const result = await adjustMembership(
      userId,
      adminId,
      memberLevel,
      expiryDate,
      reason.trim()
    );

    return NextResponse.json({
      data: {
        user: {
          id: result.user.id,
          username: result.user.username,
          memberLevel: result.newLevel,
          memberExpiry: result.newExpiry,
        },
        previousLevel: result.previousLevel,
        previousExpiry: result.previousExpiry,
        newLevel: result.newLevel,
        newExpiry: result.newExpiry,
      },
      message: '会员状态调整成功',
    });
  } catch (error: unknown) {
    const err = error as { code?: string; message?: string };

    if (err.code === MEMBERSHIP_ERRORS.USER_NOT_FOUND.code) {
      return NextResponse.json(
        { code: err.code, message: err.message },
        { status: 404 }
      );
    }

    console.error('Admin adjust membership error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '调整会员状态失败' },
      { status: 500 }
    );
  }
}
