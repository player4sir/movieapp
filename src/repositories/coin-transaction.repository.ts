import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { BaseRepository } from './base.repository';
import { coinTransactions, CoinTransaction, TransactionType } from '@/db/schema';
import { RepositoryError } from './errors';

// ============================================
// Input Types
// ============================================

export interface CreateCoinTransactionInput {
  id: string;
  userId: string;
  type: TransactionType;
  amount: number;
  balanceAfter: number;
  description?: string;
  metadata?: Record<string, unknown>;
}

export interface TransactionFilterParams {
  userId: string;
  type?: TransactionType;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
}

export interface TransactionListResult {
  data: CoinTransaction[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// CoinTransactionRepository Implementation
// ============================================

/**
 * Repository for coin transaction operations.
 * Encapsulates all transaction queries using Drizzle ORM.
 * 
 * Requirements: 4.1, 4.3, 4.4
 */
export class CoinTransactionRepository extends BaseRepository {
  /**
   * Create a new transaction record.
   */
  async create(input: CreateCoinTransactionInput): Promise<CoinTransaction> {
    try {
      const [transaction] = await this.db.insert(coinTransactions).values({
        id: input.id,
        userId: input.userId,
        type: input.type,
        amount: input.amount,
        balanceAfter: input.balanceAfter,
        description: input.description ?? '',
        metadata: input.metadata ?? {},
      }).returning();
      return transaction;
    } catch (error) {
      throw new RepositoryError('Failed to create coin transaction', 'CREATE_ERROR', error);
    }
  }

  /**
   * Find all transactions for a user (most recent first).
   */
  async findByUserId(userId: string, limit?: number): Promise<CoinTransaction[]> {
    try {
      const query = this.db.query.coinTransactions.findMany({
        where: eq(coinTransactions.userId, userId),
        orderBy: [desc(coinTransactions.createdAt)],
        limit: limit,
      });
      return await query;
    } catch (error) {
      throw new RepositoryError('Failed to find transactions by user id', 'FIND_ERROR', error);
    }
  }

  /**
   * Find transactions with filters and pagination.
   * Supports filtering by type and date range.
   */
  async findWithFilters(params: TransactionFilterParams): Promise<TransactionListResult> {
    try {
      const {
        userId,
        type,
        startDate,
        endDate,
        page = 1,
        pageSize = 20,
      } = params;

      const offset = (page - 1) * pageSize;

      // Build where conditions
      const conditions = [eq(coinTransactions.userId, userId)];

      if (type) {
        conditions.push(eq(coinTransactions.type, type));
      }
      if (startDate) {
        conditions.push(gte(coinTransactions.createdAt, startDate));
      }
      if (endDate) {
        conditions.push(lte(coinTransactions.createdAt, endDate));
      }

      const whereClause = and(...conditions);

      // Execute queries in parallel
      const [data, countResult] = await Promise.all([
        this.db.query.coinTransactions.findMany({
          where: whereClause,
          orderBy: [desc(coinTransactions.createdAt)],
          limit: pageSize,
          offset,
        }),
        this.db.select({ count: sql<number>`count(*)` })
          .from(coinTransactions)
          .where(whereClause),
      ]);

      const total = Number(countResult[0]?.count ?? 0);

      return {
        data,
        pagination: {
          page,
          pageSize,
          total,
          totalPages: Math.ceil(total / pageSize),
        },
      };
    } catch (error) {
      throw new RepositoryError('Failed to find transactions with filters', 'FIND_ERROR', error);
    }
  }

  /**
   * Get transaction statistics for a date range using SQL aggregation.
   */
  async getStats(startDate?: Date, endDate?: Date): Promise<{
    totalEarned: number;
    totalSpent: number;
    countByType: Record<TransactionType, number>;
  }> {
    try {
      const conditions = [];
      if (startDate) {
        conditions.push(gte(coinTransactions.createdAt, startDate));
      }
      if (endDate) {
        conditions.push(lte(coinTransactions.createdAt, endDate));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Aggregate query: Group by type, count items, and sum amounts
      const result = await this.db.select({
        type: coinTransactions.type,
        count: sql<number>`count(*)::int`,
        totalAmount: sql<number>`sum(${coinTransactions.amount})::int`,
      })
        .from(coinTransactions)
        .where(whereClause)
        .groupBy(coinTransactions.type);

      let totalEarned = 0;
      let totalSpent = 0;
      const countByType: Record<TransactionType, number> = {
        recharge: 0,
        checkin: 0,
        exchange: 0,
        consume: 0,
        adjust: 0,
        promotion: 0,
      };

      for (const row of result) {
        const type = row.type as TransactionType;
        const count = Number(row.count);
        const amount = Number(row.totalAmount || 0);

        countByType[type] = count;

        if (amount > 0) {
          totalEarned += amount;
        } else {
          totalSpent += Math.abs(amount);
        }
      }

      return { totalEarned, totalSpent, countByType };
    } catch (error) {
      throw new RepositoryError('Failed to get transaction stats', 'QUERY_ERROR', error);
    }
  }
}
