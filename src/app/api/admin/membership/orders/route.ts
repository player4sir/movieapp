/**
 * Admin Membership Orders API Route
 * List orders with status filter and pagination
 * 
 * Requirements: 6.1, 6.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import { listOrders } from '@/services/membership-order.service';
import { OrderStatus } from '@/db/schema';

export async function GET(request: NextRequest) {
  const authResult = await requireAdmin(request);
  if (isAuthError(authResult)) {
    return authResult;
  }

  try {
    const { searchParams } = new URL(request.url);
    const page = parseInt(searchParams.get('page') || '1', 10);
    const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
    const status = searchParams.get('status');
    const userId = searchParams.get('userId') || undefined;
    const sortBy = (searchParams.get('sortBy') || 'createdAt') as 'createdAt' | 'updatedAt';
    const sortOrder = (searchParams.get('sortOrder') || 'desc') as 'asc' | 'desc';

    // Support comma-separated status values (e.g., "pending,paid")
    const validStatuses: OrderStatus[] = ['pending', 'paid', 'approved', 'rejected'];
    let validatedStatus: OrderStatus | OrderStatus[] | undefined;

    if (status) {
      const statusArray = status.split(',').filter(s => validStatuses.includes(s as OrderStatus)) as OrderStatus[];
      validatedStatus = statusArray.length === 1 ? statusArray[0] : statusArray.length > 1 ? statusArray : undefined;
    }

    const result = await listOrders({
      page,
      pageSize,
      status: validatedStatus,
      userId,
      sortBy,
      sortOrder,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Admin membership orders list error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '获取订单列表失败' },
      { status: 500 }
    );
  }
}
