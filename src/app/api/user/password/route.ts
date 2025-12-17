/**
 * PUT /api/user/password
 * Change current user's password
 * Requires: currentPassword and newPassword
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-middleware';
import { UserRepository } from '@/repositories';
import { hashPassword, verifyPassword } from '@/services/auth.service';
import { terminateAllUserSessions } from '@/services/session.service';
import { rateLimiter } from '@/lib/rate-limit';

const userRepository = new UserRepository();

export async function PUT(request: NextRequest) {
    // Rate limit: 5 attempts per minute
    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const limitResult = rateLimiter.check(`pwd-change-${ip}`, 5, 60 * 1000);

    if (!limitResult.success) {
        return NextResponse.json(
            { code: 'RATE_LIMIT_EXCEEDED', message: '操作过于频繁，请稍后再试' },
            { status: 429 }
        );
    }

    const authResult = await requireAuth(request);
    if (isAuthError(authResult)) return authResult;

    try {
        const body = await request.json();
        const { currentPassword, newPassword } = body;

        // Validate input
        if (!currentPassword || !newPassword) {
            return NextResponse.json(
                { code: 'VALIDATION_ERROR', message: '当前密码和新密码不能为空' },
                { status: 400 }
            );
        }

        if (newPassword.length < 6) {
            return NextResponse.json(
                { code: 'VALIDATION_ERROR', message: '新密码至少6个字符' },
                { status: 400 }
            );
        }

        // Get current user
        const user = await userRepository.findById(authResult.user.id);
        if (!user) {
            return NextResponse.json(
                { code: 'USER_NOT_FOUND', message: '用户不存在' },
                { status: 404 }
            );
        }

        // Verify current password
        const isValid = await verifyPassword(currentPassword, user.passwordHash);
        if (!isValid) {
            return NextResponse.json(
                { code: 'INVALID_PASSWORD', message: '当前密码错误' },
                { status: 401 }
            );
        }

        // Hash and update new password
        const newPasswordHash = await hashPassword(newPassword);
        await userRepository.update(authResult.user.id, { passwordHash: newPasswordHash });

        // Terminate all other sessions for security
        await terminateAllUserSessions(authResult.user.id);

        return NextResponse.json({
            success: true,
            message: '密码修改成功，请重新登录',
        });
    } catch (error) {
        console.error('Change password error:', error);
        return NextResponse.json(
            { code: 'INTERNAL_ERROR', message: '修改密码失败' },
            { status: 500 }
        );
    }
}
