/**
 * Admin User Groups API
 * List and create user groups
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import { UserGroupRepository, DuplicateError } from '@/repositories';

const groupRepository = new UserGroupRepository();

// GET all groups
export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) return authResult;

  try {
    const groups = await groupRepository.findAllWithUserCount();
    return NextResponse.json(groups);
  } catch (error) {
    console.error('Get groups error:', error);
    return NextResponse.json({ code: 'INTERNAL_ERROR', message: '获取用户组失败' }, { status: 500 });
  }
}

// CREATE new group
export async function POST(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) return authResult;

  try {
    const body = await request.json();
    const { name, description, color, permissions } = body;

    if (!name || name.trim().length === 0) {
      return NextResponse.json({ code: 'VALIDATION_ERROR', message: '用户组名称不能为空' }, { status: 400 });
    }

    // Check if name exists
    const existing = await groupRepository.findByName(name);
    if (existing) {
      return NextResponse.json({ code: 'DUPLICATE', message: '用户组名称已存在' }, { status: 409 });
    }

    const group = await groupRepository.create({
      id: crypto.randomUUID(),
      name: name.trim(),
      description: description || '',
      color: color || '#6b7280',
      permissions: permissions || {},
    });

    return NextResponse.json(group, { status: 201 });
  } catch (error) {
    if (error instanceof DuplicateError) {
      return NextResponse.json({ code: 'DUPLICATE', message: '用户组名称已存在' }, { status: 409 });
    }
    console.error('Create group error:', error);
    return NextResponse.json({ code: 'INTERNAL_ERROR', message: '创建用户组失败' }, { status: 500 });
  }
}
