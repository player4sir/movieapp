/**
 * Admin Users API Route
 * Returns paginated user list with search and filter functionality
 * Supports: search (username/nickname), status, memberLevel, groupId filters
 * Requirements: 4.1, 4.2
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import { UserRepository } from '@/repositories';
import { calculateEffectivePermissions, parseGroupPermissions } from '@/services/permission.service';
import { hashPassword } from '@/services/auth.service';
import { DuplicateError } from '@/repositories/errors';
import type { GroupPermissions, EffectivePermissions } from '@/types/admin';
import type { MemberLevel } from '@/types/auth';
import logger from '@/lib/logger';

interface UserListItem {
  id: string;
  username: string;
  nickname: string;
  role: string;
  status: string;
  memberLevel: string;
  memberExpiry: Date | null;
  groupId: string | null;
  group: { id: string; name: string; color: string } | null;
  createdAt: Date;
  lastLoginAt: Date | null;
  effectivePermissions: EffectivePermissions;
}

const userRepository = new UserRepository();

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '10', 10);
    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') as 'active' | 'disabled' | null;
    const memberLevel = searchParams.get('memberLevel') as 'free' | 'vip' | 'svip' | null;
    const groupId = searchParams.get('groupId') || undefined;

    // Use UserRepository to list users with filters
    const result = await userRepository.list({
      page,
      pageSize,
      search,
      status: status && ['active', 'disabled'].includes(status) ? status : undefined,
      memberLevel: memberLevel && ['free', 'vip', 'svip'].includes(memberLevel) ? memberLevel : undefined,
      groupId,
      sortBy: 'createdAt',
      sortOrder: 'desc',
    });

    // Calculate effective permissions for each user
    const usersWithPermissions: UserListItem[] = result.data.map((user) => {
      const groupPermissions: GroupPermissions | null = user.group
        ? parseGroupPermissions(user.group.permissions)
        : null;

      const effectivePermissions = calculateEffectivePermissions(
        { memberLevel: user.memberLevel as MemberLevel, memberExpiry: user.memberExpiry },
        groupPermissions
      );

      return {
        id: user.id,
        username: user.username,
        nickname: user.nickname,
        role: user.role,
        status: user.status,
        memberLevel: user.memberLevel,
        memberExpiry: user.memberExpiry,
        groupId: user.groupId,
        group: user.group ? { id: user.group.id, name: user.group.name, color: user.group.color } : null,
        createdAt: user.createdAt,
        lastLoginAt: user.lastLoginAt,
        effectivePermissions,
      };
    });

    return NextResponse.json({
      data: usersWithPermissions,
      pagination: result.pagination,
    });
  } catch (error) {
    logger.error({ err: error }, 'Admin users list error');
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '获取用户列表失败' },
      { status: 500 }
    );
  }
}

// CREATE user
export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) return authResult;

  try {
    const body = await request.json();
    const { username, password, nickname, role, status, memberLevel, groupId } = body;

    // Validation
    if (!username || !password) {
      return NextResponse.json({ code: 'BAD_REQUEST', message: '用户名和密码不能为空' }, { status: 400 });
    }

    if (password.length < 6) {
      return NextResponse.json({ code: 'BAD_REQUEST', message: '密码长度至少为 6 位' }, { status: 400 });
    }

    // Create user
    const newUser = await userRepository.create({
      id: crypto.randomUUID(),
      username,
      passwordHash: await hashPassword(password),
      nickname: nickname || '',
      role: role ?? 'user',
      status: status ?? 'active',
      memberLevel: memberLevel ?? 'free',
      groupId: groupId || null,
    });

    return NextResponse.json(newUser, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateError) {
      return NextResponse.json({ code: 'CONFLICT', message: '用户名已存在' }, { status: 409 });
    }
    logger.error({ err: error }, 'Create user error');
    return NextResponse.json({ code: 'INTERNAL_ERROR', message: '创建用户失败' }, { status: 500 });
  }
}
