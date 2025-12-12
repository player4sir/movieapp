/**
 * Admin Single User Group API
 * Get, update, delete user group
 * 
 * Requirements: 1.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import { UserGroupRepository, UserRepository, DuplicateError } from '@/repositories';
import type { GroupPermissions } from '@/types/admin';

const groupRepository = new UserGroupRepository();
const userRepository = new UserRepository();

/**
 * Generates a human-readable permission summary from group permissions
 */
function generatePermissionSummary(permissions: GroupPermissions): string[] {
  const summary: string[] = [];
  
  if (permissions.memberLevel) {
    const levelNames: Record<string, string> = { free: '免费', vip: 'VIP', svip: 'SVIP' };
    summary.push(`会员等级: ${levelNames[permissions.memberLevel] || permissions.memberLevel}`);
  }
  
  if (permissions.canWatch !== undefined) {
    summary.push(permissions.canWatch ? '可观看' : '禁止观看');
  }
  
  if (permissions.canDownload !== undefined) {
    summary.push(permissions.canDownload ? '可下载' : '禁止下载');
  }
  
  if (permissions.adFree !== undefined) {
    summary.push(permissions.adFree ? '免广告' : '有广告');
  }
  
  if (permissions.maxFavorites !== undefined) {
    summary.push(`最大收藏: ${permissions.maxFavorites}`);
  }
  
  if (permissions.maxConcurrentStreams !== undefined) {
    summary.push(`同时播放: ${permissions.maxConcurrentStreams}`);
  }
  
  if (permissions.qualityLimit) {
    const qualityNames: Record<string, string> = { sd: '标清', hd: '高清', '4k': '4K' };
    summary.push(`画质限制: ${qualityNames[permissions.qualityLimit] || permissions.qualityLimit}`);
  }
  
  return summary;
}

/**
 * GET single group with paginated user list and permission summary
 * Requirements: 1.4 - Display group's permission summary and list of assigned users with pagination
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) return authResult;

  try {
    const { id } = await params;
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') || '20', 10)));

    // Get group
    const group = await groupRepository.findById(id);

    if (!group) {
      return NextResponse.json({ code: 'NOT_FOUND', message: '用户组不存在' }, { status: 404 });
    }

    // Get paginated users and total count
    const usersResult = await groupRepository.getUsersInGroup(id, page, pageSize);

    // Parse permissions and generate summary
    const permissions = (group.permissions as GroupPermissions) || {};
    const permissionSummary = generatePermissionSummary(permissions);

    return NextResponse.json({
      id: group.id,
      name: group.name,
      description: group.description,
      color: group.color,
      permissions,
      permissionSummary,
      createdAt: group.createdAt.toISOString(),
      updatedAt: group.updatedAt.toISOString(),
      userCount: usersResult.pagination.total,
      users: {
        data: usersResult.data.map(user => ({
          ...user,
          createdAt: user.createdAt.toISOString(),
        })),
        pagination: usersResult.pagination,
      },
    });
  } catch (error) {
    console.error('Get group error:', error);
    return NextResponse.json({ code: 'INTERNAL_ERROR', message: '获取用户组失败' }, { status: 500 });
  }
}

// UPDATE group
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) return authResult;

  try {
    const { id } = await params;
    const body = await request.json();
    const { name, description, color, permissions } = body;

    const existing = await groupRepository.findById(id);
    if (!existing) {
      return NextResponse.json({ code: 'NOT_FOUND', message: '用户组不存在' }, { status: 404 });
    }

    // Check name uniqueness if changed
    if (name && name !== existing.name) {
      const duplicate = await groupRepository.findByName(name);
      if (duplicate) {
        return NextResponse.json({ code: 'DUPLICATE', message: '用户组名称已存在' }, { status: 409 });
      }
    }

    const updateData: Record<string, unknown> = {};
    if (name !== undefined) updateData.name = name.trim();
    if (description !== undefined) updateData.description = description;
    if (color !== undefined) updateData.color = color;
    if (permissions !== undefined) updateData.permissions = permissions;

    const group = await groupRepository.update(id, updateData);

    return NextResponse.json(group);
  } catch (error) {
    if (error instanceof DuplicateError) {
      return NextResponse.json({ code: 'DUPLICATE', message: '用户组名称已存在' }, { status: 409 });
    }
    console.error('Update group error:', error);
    return NextResponse.json({ code: 'INTERNAL_ERROR', message: '更新用户组失败' }, { status: 500 });
  }
}

/**
 * DELETE group with user preservation
 * Requirements: 1.4 - Remove group assignment from all users and preserve their individual settings
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) return authResult;

  try {
    const { id } = await params;

    // Get group and user count before deletion
    const existing = await groupRepository.findById(id);

    if (!existing) {
      return NextResponse.json({ code: 'NOT_FOUND', message: '用户组不存在' }, { status: 404 });
    }

    const affectedUserCount = await groupRepository.countUsers(id);

    // First, set groupId to null for all users in this group
    // This preserves their other individual settings
    const usersInGroup = await groupRepository.getUsersInGroup(id, 1, 10000);
    if (usersInGroup.data.length > 0) {
      const userIds = usersInGroup.data.map(u => u.id);
      await userRepository.updateMany(userIds, { groupId: null });
    }

    // Then delete the group
    await groupRepository.delete(id);

    return NextResponse.json({
      success: true,
      affectedUserCount,
    });
  } catch (error) {
    console.error('Delete group error:', error);
    return NextResponse.json({ code: 'INTERNAL_ERROR', message: '删除用户组失败' }, { status: 500 });
  }
}
