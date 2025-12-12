/**
 * Admin User Transactions API
 * GET /api/admin/users/[id]/transactions - Get user's transaction history
 * 
 * Requirements: 6.3 - Display user's recent transactions in admin panel
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import { getTransactions } from '@/services/transaction.service';
import { TransactionType } from '@/db/schema';

const VALID_TRANSACTION_TYPES: TransactionType[] = ['recharge', 'checkin', 'exchange', 'consume', 'adjust'];

/**
 * GET /api/admin/users/[id]/transactions
 * Returns paginated transaction history for a specific user.
 * Admin only endpoint.
 * 
 * Query params:
 * - page: Page number (default: 1)
 * - pageSize: Items per page (default: 5, max: 100)
 * - type: Filter by transaction type
 * 
 * Requirements: 6.3
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAdmin(request);
  
  if (isAuthError(authResult)) {
    return authResult;
  }

  const { id: userId } = await params;
  const searchParams = request.nextUrl.searchParams;

  // Parse pagination params
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '5', 10)));

  // Parse type filter
  const typeParam = searchParams.get('type');
  let type: TransactionType | undefined;
  if (typeParam && VALID_TRANSACTION_TYPES.includes(typeParam as TransactionType)) {
    type = typeParam as TransactionType;
  }

  try {
    const result = await getTransactions(userId, {
      page,
      pageSize,
      type,
    });

    // Format transactions for response
    const transactions = result.data.map(tx => ({
      id: tx.id,
      type: tx.type,
      amount: tx.amount,
      balanceAfter: tx.balanceAfter,
      description: tx.description,
      createdAt: tx.createdAt,
    }));

    return NextResponse.json({
      data: transactions,
      pagination: result.pagination,
    }, { status: 200 });
  } catch (error: unknown) {
    console.error('Get user transactions error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '获取交易记录失败' },
      { status: 500 }
    );
  }
}
