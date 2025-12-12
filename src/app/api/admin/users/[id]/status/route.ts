/**
 * Admin User Status API Route
 * Enable/disable user accounts
 * Requirements: 7.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import { UserRepository } from '@/repositories';

const userRepository = new UserRepository();

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) {
    return authResult;
  }

  try {
    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !['active', 'disabled'].includes(status)) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: '无效的状态值' },
        { status: 400 }
      );
    }

    // Check if user exists
    const existingUser = await userRepository.findById(id);

    if (!existingUser) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: '用户不存在' },
        { status: 404 }
      );
    }

    // Prevent disabling admin users
    if (existingUser.role === 'admin' && status === 'disabled') {
      return NextResponse.json(
        { code: 'FORBIDDEN', message: '不能禁用管理员账户' },
        { status: 403 }
      );
    }

    // Update user status
    const updatedUser = await userRepository.update(id, { status });

    if (!updatedUser) {
      return NextResponse.json(
        { code: 'NOT_FOUND', message: '用户不存在' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      id: updatedUser.id,
      username: updatedUser.username,
      nickname: updatedUser.nickname,
      role: updatedUser.role,
      status: updatedUser.status,
      memberLevel: updatedUser.memberLevel,
      memberExpiry: updatedUser.memberExpiry,
      createdAt: updatedUser.createdAt,
      lastLoginAt: updatedUser.lastLoginAt,
    });
  } catch (error) {
    console.error('Admin user status update error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '更新用户状态失败' },
      { status: 500 }
    );
  }
}
