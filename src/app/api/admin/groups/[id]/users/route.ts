/**
 * Admin Group Users API
 * Manage users in a group
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import { UserGroupRepository, UserRepository } from '@/repositories';

const groupRepository = new UserGroupRepository();
const userRepository = new UserRepository();

// GET users in group
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) return authResult;

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);

    const result = await groupRepository.getUsersInGroup(id, page, pageSize);

    return NextResponse.json({
      data: result.data,
      pagination: result.pagination,
    });
  } catch (error) {
    console.error('Get group users error:', error);
    return NextResponse.json({ code: 'INTERNAL_ERROR', message: '获取用户列表失败' }, { status: 500 });
  }
}

// ADD users to group
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) return authResult;

  try {
    const { id } = await params;
    const body = await request.json();
    const { userIds } = body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ code: 'VALIDATION_ERROR', message: '请选择用户' }, { status: 400 });
    }

    // Check group exists
    const group = await groupRepository.findById(id);
    if (!group) {
      return NextResponse.json({ code: 'NOT_FOUND', message: '用户组不存在' }, { status: 404 });
    }

    // Update users to add them to the group
    await userRepository.updateMany(userIds, { groupId: id });

    return NextResponse.json({ success: true, count: userIds.length });
  } catch (error) {
    console.error('Add users to group error:', error);
    return NextResponse.json({ code: 'INTERNAL_ERROR', message: '添加用户失败' }, { status: 500 });
  }
}

// REMOVE users from group
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) return authResult;

  try {
    const { id } = await params;
    const body = await request.json();
    const { userIds } = body;

    if (!Array.isArray(userIds) || userIds.length === 0) {
      return NextResponse.json({ code: 'VALIDATION_ERROR', message: '请选择用户' }, { status: 400 });
    }

    // Get users that are actually in this group
    const existingUsers = await userRepository.findByIds(userIds);
    const usersInGroup = existingUsers.filter(u => u.groupId === id);
    const userIdsInGroup = usersInGroup.map(u => u.id);

    if (userIdsInGroup.length > 0) {
      // Remove users from group by setting groupId to null
      await userRepository.updateMany(userIdsInGroup, { groupId: null });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Remove users from group error:', error);
    return NextResponse.json({ code: 'INTERNAL_ERROR', message: '移除用户失败' }, { status: 500 });
  }
}
