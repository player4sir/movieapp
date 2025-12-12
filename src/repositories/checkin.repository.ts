import { eq, and, desc, gte, lte, sql } from 'drizzle-orm';
import { BaseRepository } from './base.repository';
import { userCheckins, UserCheckin } from '@/db/schema';
import { RepositoryError, DuplicateError } from './errors';

// ============================================
// Input Types
// ============================================

export interface CreateCheckinInput {
  id: string;
  userId: string;
  checkinDate: Date;
  streakCount: number;
  coinsEarned: number;
}

// ============================================
// CheckinRepository Implementation
// ============================================

/**
 * Repository for user check-in operations.
 * Encapsulates all check-in queries using Drizzle ORM.
 * 
 * Requirements: 2.1, 2.2, 2.4
 */
export class CheckinRepository extends BaseRepository {
  /**
   * Create a new check-in record.
   * Throws DuplicateError if user already checked in on this date.
   */
  async create(input: CreateCheckinInput): Promise<UserCheckin> {
    try {
      const [checkin] = await this.db.insert(userCheckins).values({
        id: input.id,
        userId: input.userId,
        checkinDate: input.checkinDate,
        streakCount: input.streakCount,
        coinsEarned: input.coinsEarned,
      }).returning();
      return checkin;
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('unique constraint')) {
        throw new DuplicateError('Checkin', 'userId_checkinDate');
      }
      throw new RepositoryError('Failed to create check-in', 'CREATE_ERROR', error);
    }
  }

  /**
   * Find a check-in record for a user on a specific date.
   * Uses date comparison at day level (ignores time).
   */
  async findByUserAndDate(userId: string, date: Date): Promise<UserCheckin | null> {
    try {
      // Normalize to start of day for comparison
      const startOfDay = new Date(date);
      startOfDay.setHours(0, 0, 0, 0);
      
      const endOfDay = new Date(date);
      endOfDay.setHours(23, 59, 59, 999);

      const result = await this.db.query.userCheckins.findFirst({
        where: and(
          eq(userCheckins.userId, userId),
          gte(userCheckins.checkinDate, startOfDay),
          lte(userCheckins.checkinDate, endOfDay)
        ),
      });
      return result ?? null;
    } catch (error) {
      throw new RepositoryError('Failed to find check-in by user and date', 'FIND_ERROR', error);
    }
  }

  /**
   * Get the most recent check-in for a user.
   */
  async getLastCheckin(userId: string): Promise<UserCheckin | null> {
    try {
      const result = await this.db.query.userCheckins.findFirst({
        where: eq(userCheckins.userId, userId),
        orderBy: [desc(userCheckins.checkinDate)],
      });
      return result ?? null;
    } catch (error) {
      throw new RepositoryError('Failed to get last check-in', 'FIND_ERROR', error);
    }
  }

  /**
   * Get the current streak count for a user.
   * Returns 0 if no check-ins or streak is broken.
   */
  async getStreakCount(userId: string): Promise<number> {
    try {
      const lastCheckin = await this.getLastCheckin(userId);
      if (!lastCheckin) {
        return 0;
      }

      // Check if the last check-in was yesterday or today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      const lastCheckinDate = new Date(lastCheckin.checkinDate);
      lastCheckinDate.setHours(0, 0, 0, 0);

      // If last check-in was today, return current streak
      if (lastCheckinDate.getTime() === today.getTime()) {
        return lastCheckin.streakCount;
      }
      
      // If last check-in was yesterday, streak continues
      if (lastCheckinDate.getTime() === yesterday.getTime()) {
        return lastCheckin.streakCount;
      }

      // Streak is broken
      return 0;
    } catch (error) {
      throw new RepositoryError('Failed to get streak count', 'QUERY_ERROR', error);
    }
  }

  /**
   * Get check-in history for a user within a date range.
   */
  async getHistory(userId: string, startDate: Date, endDate: Date): Promise<UserCheckin[]> {
    try {
      return await this.db.query.userCheckins.findMany({
        where: and(
          eq(userCheckins.userId, userId),
          gte(userCheckins.checkinDate, startDate),
          lte(userCheckins.checkinDate, endDate)
        ),
        orderBy: [desc(userCheckins.checkinDate)],
      });
    } catch (error) {
      throw new RepositoryError('Failed to get check-in history', 'FIND_ERROR', error);
    }
  }

  /**
   * Count total check-ins for a user.
   */
  async countByUserId(userId: string): Promise<number> {
    try {
      const result = await this.db.select({ count: sql<number>`count(*)` })
        .from(userCheckins)
        .where(eq(userCheckins.userId, userId));
      return Number(result[0]?.count ?? 0);
    } catch (error) {
      throw new RepositoryError('Failed to count check-ins', 'COUNT_ERROR', error);
    }
  }
}
