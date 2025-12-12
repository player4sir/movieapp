/**
 * Transaction Service
 * Handles transaction history queries and statistics calculation.
 * 
 * Requirements: 4.1, 7.2, 7.3
 */

import {
  CoinTransactionRepository,
  TransactionFilterParams,
  TransactionListResult,
} from '@/repositories';
import { TransactionType } from '@/db/schema';

// ============================================
// Types
// ============================================

export interface TransactionQueryParams {
  type?: TransactionType;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
}

export interface DailyStat {
  date: string;
  earned: number;
  spent: number;
  netChange: number;
}

export interface TypeBreakdown {
  type: TransactionType;
  count: number;
  totalAmount: number;
}

export interface CoinStats {
  totalCirculation: number;
  totalEarned: number;
  totalSpent: number;
  dailyStats: DailyStat[];
  typeBreakdown: TypeBreakdown[];
}

export interface StatsQueryParams {
  startDate?: Date;
  endDate?: Date;
}

// ============================================
// TransactionService Implementation
// ============================================

const transactionRepository = new CoinTransactionRepository();

/**
 * Get paginated transaction history for a user.
 * Supports filtering by type and date range.
 * 
 * Requirements: 4.1
 */
export async function getTransactions(
  userId: string,
  params: TransactionQueryParams
): Promise<TransactionListResult> {
  const filterParams: TransactionFilterParams = {
    userId,
    type: params.type,
    startDate: params.startDate,
    endDate: params.endDate,
    page: params.page ?? 1,
    pageSize: params.pageSize ?? 20,
  };

  return await transactionRepository.findWithFilters(filterParams);
}

/**
 * Get coin system statistics.
 * Calculates total circulation, daily trends, and type breakdown.
 * 
 * Requirements: 7.2, 7.3
 */
export async function getStats(params: StatsQueryParams = {}): Promise<CoinStats> {
  const { startDate, endDate } = params;
  
  // Get basic stats from repository
  const repoStats = await transactionRepository.getStats(startDate, endDate);
  
  // Calculate total circulation (earned - spent)
  const totalCirculation = repoStats.totalEarned - repoStats.totalSpent;
  
  // Get all transactions for detailed analysis
  const allTransactions = await transactionRepository.findWithFilters({
    userId: '', // Empty userId to get all transactions - we'll need to modify this
    startDate,
    endDate,
    pageSize: 10000, // Large page size to get all
  });

  // Calculate daily stats
  const dailyStatsMap = new Map<string, { earned: number; spent: number }>();
  
  for (const tx of allTransactions.data) {
    const dateKey = tx.createdAt.toISOString().split('T')[0];
    const existing = dailyStatsMap.get(dateKey) ?? { earned: 0, spent: 0 };
    
    if (tx.amount > 0) {
      existing.earned += tx.amount;
    } else {
      existing.spent += Math.abs(tx.amount);
    }
    
    dailyStatsMap.set(dateKey, existing);
  }

  const dailyStats: DailyStat[] = Array.from(dailyStatsMap.entries())
    .map(([date, stats]) => ({
      date,
      earned: stats.earned,
      spent: stats.spent,
      netChange: stats.earned - stats.spent,
    }))
    .sort((a, b) => a.date.localeCompare(b.date));

  // Calculate type breakdown
  const typeBreakdownMap = new Map<TransactionType, { count: number; totalAmount: number }>();
  
  for (const tx of allTransactions.data) {
    const existing = typeBreakdownMap.get(tx.type) ?? { count: 0, totalAmount: 0 };
    existing.count++;
    existing.totalAmount += tx.amount;
    typeBreakdownMap.set(tx.type, existing);
  }

  const typeBreakdown: TypeBreakdown[] = Array.from(typeBreakdownMap.entries())
    .map(([type, stats]) => ({
      type,
      count: stats.count,
      totalAmount: stats.totalAmount,
    }));

  return {
    totalCirculation,
    totalEarned: repoStats.totalEarned,
    totalSpent: repoStats.totalSpent,
    dailyStats,
    typeBreakdown,
  };
}

/**
 * Get transaction count by type for a user.
 */
export async function getTransactionCountByType(
  userId: string,
  type: TransactionType
): Promise<number> {
  const result = await transactionRepository.findWithFilters({
    userId,
    type,
    pageSize: 1,
  });
  return result.pagination.total;
}
