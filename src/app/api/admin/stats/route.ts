/**
 * Admin Stats API Route
 * Returns user statistics for the admin dashboard
 * Requirements: 7.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import { UserRepository } from '@/repositories';

const userRepository = new UserRepository();

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) {
    return authResult;
  }

  try {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const weekStart = new Date(todayStart);
    weekStart.setDate(weekStart.getDate() - 7);

    const [totalUsers, activeUsers, newUsersToday, newUsersThisWeek] = await Promise.all([
      userRepository.countAll(),
      userRepository.countActiveUsersSince(weekStart),
      userRepository.countCreatedSince(todayStart),
      userRepository.countCreatedSince(weekStart),
    ]);

    return NextResponse.json({
      totalUsers,
      activeUsers,
      newUsersToday,
      newUsersThisWeek,
    });
  } catch (error) {
    console.error('Admin stats error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '获取统计数据失败' },
      { status: 500 }
    );
  }
}
