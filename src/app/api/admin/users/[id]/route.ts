/**
 * Admin User API Route
 * Get, update, delete single user
 * Returns: account info, membership status, group assignment, effective permissions, coin balance
 * Requirements: 3.1, 3.2, 3.3, 6.3
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import { UserRepository, CoinRepository } from '@/repositories';
import { hashPassword } from '@/services/auth.service';
import { calculateEffectivePermissions, parseGroupPermissions } from '@/services/permission.service';
import { terminateAllUserSessions } from '@/services/session.service';
import type { GroupPermissions } from '@/types/admin';
import type { MemberLevel } from '@/types/auth';

const userRepository = new UserRepository();
const coinRepository = new CoinRepository();

// GET single user with complete details (Requirements 3.1, 3.5)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) return authResult;

  try {
    const { id } = await params;
    
    // Get user with group relation
    const user = await userRepository.findById(id);

    if (!user) {
      return NextResponse.json({ code: 'NOT_FOUND', message: '用户不存在' }, { status: 404 });
    }

    // Get user statistics
    const stats = await userRepository.getUserStats(id);

    // Get user coin balance (Requirements 6.3)
    let coinBalance = null;
    try {
      const balance = await coinRepository.findByUserId(id);
      if (balance) {
        coinBalance = {
          balance: balance.balance,
          totalEarned: balance.totalEarned,
          totalSpent: balance.totalSpent,
        };
      }
    } catch (e) {
      console.error('Failed to fetch coin balance:', e);
    }

    // Calculate effective permissions (Requirements 3.1)
    const groupPermissions: GroupPermissions | null = user.group 
      ? parseGroupPermissions(user.group.permissions)
      : null;
    
    const effectivePermissions = calculateEffectivePermissions(
      { memberLevel: user.memberLevel as MemberLevel, memberExpiry: user.memberExpiry },
      groupPermissions
    );

    // Build response matching UserDetailResponse interface
    const response = {
      id: user.id,
      username: user.username,
      nickname: user.nickname,
      avatar: user.avatar,
      role: user.role,
      status: user.status,
      memberLevel: user.memberLevel,
      memberExpiry: user.memberExpiry,
      groupId: user.groupId,
      group: user.group ? { id: user.group.id, name: user.group.name, color: user.group.color } : null,
      effectivePermissions,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      lastLoginAt: user.lastLoginAt,
      stats,
      coinBalance,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Get user error:', error);
    return NextResponse.json({ code: 'INTERNAL_ERROR', message: '获取用户失败' }, { status: 500 });
  }
}

// UPDATE user (Requirements 3.2, 3.3)
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) return authResult;

  try {
    const { id } = await params;
    const body = await request.json();
    const { nickname, role, status, memberLevel, memberExpiry, newPassword } = body;

    const existingUser = await userRepository.findById(id);
    if (!existingUser) {
      return NextResponse.json({ code: 'NOT_FOUND', message: '用户不存在' }, { status: 404 });
    }

    // Build update data
    const updateData: Record<string, unknown> = {};
    
    if (nickname !== undefined && nickname !== existingUser.nickname) {
      updateData.nickname = nickname;
    }
    
    if (status !== undefined && ['active', 'disabled'].includes(status) && status !== existingUser.status) {
      if (existingUser.role === 'admin' && status === 'disabled') {
        return NextResponse.json({ code: 'FORBIDDEN', message: '不能禁用管理员' }, { status: 403 });
      }
      updateData.status = status;
    }
    
    if (role !== undefined && ['user', 'admin'].includes(role) && role !== existingUser.role) {
      updateData.role = role;
    }
    
    if (memberLevel !== undefined && ['free', 'vip', 'svip'].includes(memberLevel) && memberLevel !== existingUser.memberLevel) {
      updateData.memberLevel = memberLevel;
    }
    
    // Handle membership expiry date update (Requirements 3.2)
    if (memberExpiry !== undefined) {
      const newExpiry = memberExpiry ? new Date(memberExpiry) : null;
      const oldExpiry = existingUser.memberExpiry;
      if ((newExpiry?.getTime() || null) !== (oldExpiry?.getTime() || null)) {
        updateData.memberExpiry = newExpiry;
      }
    }
    
    if (body.groupId !== undefined && body.groupId !== existingUser.groupId) {
      updateData.groupId = body.groupId || null;
    }
    
    // Handle password reset with session invalidation (Requirements 3.3)
    let passwordReset = false;
    if (newPassword && newPassword.length >= 6) {
      updateData.passwordHash = await hashPassword(newPassword);
      passwordReset = true;
    }

    // Update user using repository
    const updatedUser = await userRepository.update(id, updateData as Parameters<typeof userRepository.update>[1]);

    if (!updatedUser) {
      return NextResponse.json({ code: 'NOT_FOUND', message: '用户不存在' }, { status: 404 });
    }

    // Get updated user with group relation
    const userWithGroup = await userRepository.findById(id);

    // If password was reset, invalidate all sessions (Requirements 3.3)
    if (passwordReset) {
      await terminateAllUserSessions(id);
    }

    // If user was disabled, terminate all sessions (Requirements 3.4)
    if (status === 'disabled' && existingUser.status !== 'disabled') {
      await terminateAllUserSessions(id);
    }

    return NextResponse.json({
      id: userWithGroup?.id,
      username: userWithGroup?.username,
      nickname: userWithGroup?.nickname,
      role: userWithGroup?.role,
      status: userWithGroup?.status,
      memberLevel: userWithGroup?.memberLevel,
      memberExpiry: userWithGroup?.memberExpiry,
      groupId: userWithGroup?.groupId,
      group: userWithGroup?.group ? { 
        id: userWithGroup.group.id, 
        name: userWithGroup.group.name, 
        color: userWithGroup.group.color 
      } : null,
      createdAt: userWithGroup?.createdAt,
      lastLoginAt: userWithGroup?.lastLoginAt,
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ code: 'INTERNAL_ERROR', message: '更新用户失败' }, { status: 500 });
  }
}

// DELETE user
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) return authResult;

  try {
    const { id } = await params;
    
    const existingUser = await userRepository.findById(id);
    if (!existingUser) {
      return NextResponse.json({ code: 'NOT_FOUND', message: '用户不存在' }, { status: 404 });
    }

    if (existingUser.role === 'admin') {
      return NextResponse.json({ code: 'FORBIDDEN', message: '不能删除管理员账户' }, { status: 403 });
    }

    await userRepository.delete(id);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json({ code: 'INTERNAL_ERROR', message: '删除用户失败' }, { status: 500 });
  }
}
