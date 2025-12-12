import { eq, sql } from 'drizzle-orm';
import { BaseRepository } from './base.repository';
import { userCoinBalances, UserCoinBalance } from '@/db/schema';
import { RepositoryError, NotFoundError } from './errors';

// ... (Input Types remain unchanged)


// ============================================
// Input Types
// ============================================

export interface CreateCoinBalanceInput {
  id: string;
  userId: string;
  balance?: number;
  totalEarned?: number;
  totalSpent?: number;
}

export interface UpdateCoinBalanceInput {
  balance?: number;
  totalEarned?: number;
  totalSpent?: number;
}

// ============================================
// CoinRepository Implementation
// ============================================

/**
 * Repository for user coin balance operations.
 * Encapsulates all coin balance queries using Drizzle ORM.
 * 
 * Requirements: 1.1, 2.1, 6.1
 */
export class CoinRepository extends BaseRepository {
  /**
   * Find a coin balance by user ID.
   * Returns null if not found.
   */
  async findByUserId(userId: string): Promise<UserCoinBalance | null> {
    try {
      const result = await this.db.query.userCoinBalances.findFirst({
        where: eq(userCoinBalances.userId, userId),
      });
      return result ?? null;
    } catch (error) {
      throw new RepositoryError('Failed to find coin balance by user id', 'FIND_ERROR', error);
    }
  }

  /**
   * Get a coin balance by user ID.
   * Throws NotFoundError if not found.
   */
  async getBalance(userId: string): Promise<UserCoinBalance> {
    try {
      const result = await this.findByUserId(userId);
      if (!result) {
        throw new NotFoundError('CoinBalance', userId);
      }
      return result;
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw error;
      }
      throw new RepositoryError('Failed to get coin balance', 'FIND_ERROR', error);
    }
  }

  /**
   * Create a new coin balance record for a user.
   */
  async createBalance(input: CreateCoinBalanceInput): Promise<UserCoinBalance> {
    try {
      const [balance] = await this.db.insert(userCoinBalances).values({
        id: input.id,
        userId: input.userId,
        balance: input.balance ?? 0,
        totalEarned: input.totalEarned ?? 0,
        totalSpent: input.totalSpent ?? 0,
        updatedAt: new Date(),
      }).returning();
      return balance;
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('unique constraint')) {
        throw new RepositoryError('Coin balance already exists for this user', 'DUPLICATE', error);
      }
      throw new RepositoryError('Failed to create coin balance', 'CREATE_ERROR', error);
    }
  }

  /**
   * Update an existing coin balance.
   * Returns null if not found.
   */
  async updateBalance(userId: string, input: UpdateCoinBalanceInput): Promise<UserCoinBalance | null> {
    try {
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (input.balance !== undefined) updateData.balance = input.balance;
      if (input.totalEarned !== undefined) updateData.totalEarned = input.totalEarned;
      if (input.totalSpent !== undefined) updateData.totalSpent = input.totalSpent;

      const [balance] = await this.db.update(userCoinBalances)
        .set(updateData)
        .where(eq(userCoinBalances.userId, userId))
        .returning();
      return balance ?? null;
    } catch (error) {
      throw new RepositoryError('Failed to update coin balance', 'UPDATE_ERROR', error);
    }
  }

  /**
   * Get or create a coin balance for a user.
   * Uses ON CONFLICT DO UPDATE to avoid transaction abortion on duplicate key errors.
   */
  async getOrCreate(userId: string, id: string): Promise<UserCoinBalance> {
    try {
      // Use upsert pattern which is safe inside transactions
      const [balance] = await this.db.insert(userCoinBalances)
        .values({
          id,
          userId,
          balance: 0,
          totalEarned: 0,
          totalSpent: 0,
          updatedAt: new Date(),
        })
        .onConflictDoUpdate({
          target: userCoinBalances.userId,
          set: { updatedAt: new Date() }, // Dummy update to return the record
        })
        .returning();

      if (!balance) {
        // Should not happen with returning(), but for safety
        throw new RepositoryError('Failed to get or create coin balance', 'UPSERT_ERROR');
      }

      return balance;
    } catch (error) {
      throw new RepositoryError('Failed to get or create coin balance', 'UPSERT_ERROR', error);
    }
  }

  /**
   * Atomically increment (or decrement) user balance.
   * Uses SQL atomic update to prevent race conditions.
   * 
   * @param userId The user ID
   * @param amount The amount to add (negative to deduct)
   * @param updateTotal Whether to update totalEarned/totalSpent stats
   */
  async incrementBalance(userId: string, amount: number, updateTotal = true): Promise<UserCoinBalance> {
    try {
      const updateSet: Record<string, unknown> = {
        balance: sql`${userCoinBalances.balance} + ${amount}`,
        updatedAt: new Date(),
      };

      if (updateTotal) {
        if (amount > 0) {
          updateSet.totalEarned = sql`${userCoinBalances.totalEarned} + ${amount}`;
        } else if (amount < 0) {
          updateSet.totalSpent = sql`${userCoinBalances.totalSpent} + ${Math.abs(amount)}`;
        }
      }

      const [updatedBalance] = await this.db.update(userCoinBalances)
        .set(updateSet)
        .where(eq(userCoinBalances.userId, userId))
        .returning();

      if (!updatedBalance) {
        throw new NotFoundError('UserCoinBalance', userId);
      }

      return updatedBalance;
    } catch (error) {
      if (error instanceof NotFoundError) throw error;
      throw new RepositoryError('Failed to increment coin balance', 'UPDATE_ERROR', error);
    }
  }
}
