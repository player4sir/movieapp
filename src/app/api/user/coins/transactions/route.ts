/**
 * User Coin Transactions API
 * GET /api/user/coins/transactions - Get paginated transaction history
 * 
 * Requirements: 4.1, 4.2, 4.3, 4.4
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-middleware';
import { getTransactions } from '@/services/transaction.service';
import { TransactionType } from '@/db/schema';

const VALID_TRANSACTION_TYPES: TransactionType[] = ['recharge', 'checkin', 'exchange', 'consume', 'adjust'];

/**
 * GET /api/user/coins/transactions
 * Returns paginated transaction history for the authenticated user.
 * 
 * Query params:
 * - page: Page number (default: 1)
 * - pageSize: Items per page (default: 20, max: 100)
 * - type: Filter by transaction type
 * - startDate: Filter by start date (ISO string)
 * - endDate: Filter by end date (ISO string)
 * 
 * Requirements: 4.1 - Display paginated list of transactions
 * Requirements: 4.2 - Show type, amount, balanceAfter, timestamp
 * Requirements: 4.3 - Filter by type
 * Requirements: 4.4 - Filter by date range
 */
export async function GET(request: NextRequest) {
  const authResult = await requireAuth(request);
  
  if (isAuthError(authResult)) {
    return authResult;
  }

  const { user } = authResult;
  const searchParams = request.nextUrl.searchParams;

  // Parse pagination params
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20', 10)));

  // Parse type filter
  const typeParam = searchParams.get('type');
  let type: TransactionType | undefined;
  if (typeParam && VALID_TRANSACTION_TYPES.includes(typeParam as TransactionType)) {
    type = typeParam as TransactionType;
  }

  // Parse date filters
  let startDate: Date | undefined;
  let endDate: Date | undefined;
  
  const startDateParam = searchParams.get('startDate');
  if (startDateParam) {
    const parsed = new Date(startDateParam);
    if (!isNaN(parsed.getTime())) {
      startDate = parsed;
    }
  }

  const endDateParam = searchParams.get('endDate');
  if (endDateParam) {
    const parsed = new Date(endDateParam);
    if (!isNaN(parsed.getTime())) {
      endDate = parsed;
    }
  }

  try {
    const result = await getTransactions(user.id, {
      page,
      pageSize,
      type,
      startDate,
      endDate,
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
    console.error('Get transactions error:', error);
    return NextResponse.json(
      { code: 'INTERNAL_ERROR', message: '获取交易记录失败' },
      { status: 500 }
    );
  }
}
