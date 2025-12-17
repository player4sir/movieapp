import { eq, and, gte, lte, count, desc } from 'drizzle-orm';
import { BaseRepository } from './base.repository';
import { adClicks, AdClick } from '@/db/schema';
import { RepositoryError } from './errors';

// ============================================
// Input Types
// ============================================

export interface CreateAdClickInput {
  id: string;
  adId: string;
  slotId: string;
  userId?: string | null;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface ClickCountByAd {
  adId: string;
  count: number;
}

// ============================================
// AdClickRepository Implementation
// ============================================

/**
 * Repository for ad click database operations.
 * Tracks when users click on ads.
 * 
 * Requirements: 3.3, 5.1, 5.2
 */
export class AdClickRepository extends BaseRepository {
  /**
   * Create a new click record.
   * 
   * Requirements: 3.3
   */
  async create(input: CreateAdClickInput): Promise<AdClick> {
    try {
      const [click] = await this.db.insert(adClicks).values({
        id: input.id,
        adId: input.adId,
        slotId: input.slotId,
        userId: input.userId ?? null,
      }).returning();
      return click;
    } catch (error) {
      throw new RepositoryError('Failed to create ad click', 'CREATE_ERROR', error);
    }
  }

  /**
   * Count clicks for a specific ad.
   * 
   * Requirements: 5.1
   */
  async countByAd(adId: string, dateRange?: DateRange): Promise<number> {
    try {
      const conditions = [eq(adClicks.adId, adId)];

      if (dateRange) {
        conditions.push(gte(adClicks.createdAt, dateRange.startDate));
        conditions.push(lte(adClicks.createdAt, dateRange.endDate));
      }

      const result = await this.db
        .select({ count: count() })
        .from(adClicks)
        .where(and(...conditions));

      return result[0]?.count ?? 0;
    } catch (error) {
      throw new RepositoryError('Failed to count clicks by ad', 'FIND_ERROR', error);
    }
  }

  /**
   * Count clicks for a specific slot.
   * 
   * Requirements: 5.1
   */
  async countBySlot(slotId: string, dateRange?: DateRange): Promise<number> {
    try {
      const conditions = [eq(adClicks.slotId, slotId)];

      if (dateRange) {
        conditions.push(gte(adClicks.createdAt, dateRange.startDate));
        conditions.push(lte(adClicks.createdAt, dateRange.endDate));
      }

      const result = await this.db
        .select({ count: count() })
        .from(adClicks)
        .where(and(...conditions));

      return result[0]?.count ?? 0;
    } catch (error) {
      throw new RepositoryError('Failed to count clicks by slot', 'FIND_ERROR', error);
    }
  }

  /**
   * Count clicks within a date range.
   * 
   * Requirements: 5.2
   */
  async countByDateRange(dateRange: DateRange): Promise<number> {
    try {
      const result = await this.db
        .select({ count: count() })
        .from(adClicks)
        .where(and(
          gte(adClicks.createdAt, dateRange.startDate),
          lte(adClicks.createdAt, dateRange.endDate)
        ));

      return result[0]?.count ?? 0;
    } catch (error) {
      throw new RepositoryError('Failed to count clicks by date range', 'FIND_ERROR', error);
    }
  }

  /**
   * Get click counts grouped by ad within a date range.
   * Useful for statistics dashboard.
   */
  async getCountsByAd(dateRange?: DateRange): Promise<ClickCountByAd[]> {
    try {
      const conditions = [];

      if (dateRange) {
        conditions.push(gte(adClicks.createdAt, dateRange.startDate));
        conditions.push(lte(adClicks.createdAt, dateRange.endDate));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const result = await this.db
        .select({
          adId: adClicks.adId,
          count: count(),
        })
        .from(adClicks)
        .where(whereClause)
        .groupBy(adClicks.adId);

      return result.map((r: { adId: string; count: number }) => ({
        adId: r.adId,
        count: r.count,
      }));
    } catch (error) {
      throw new RepositoryError('Failed to get click counts by ad', 'FIND_ERROR', error);
    }
  }

  /**
   * Find clicks by ad ID.
   */
  async findByAd(adId: string, limit?: number): Promise<AdClick[]> {
    try {
      return await this.db.query.adClicks.findMany({
        where: eq(adClicks.adId, adId),
        limit: limit ?? 100,
        orderBy: [desc(adClicks.createdAt)],
      });
    } catch (error) {
      throw new RepositoryError('Failed to find clicks by ad', 'FIND_ERROR', error);
    }
  }

  /**
   * Check if there's a recent click from the same user for the same ad.
   * Used for anti-fraud deduplication - prevents counting multiple clicks
   * from the same user within a short time window.
   * 
   * @param adId - The ad ID
   * @param slotId - The slot ID
   * @param userId - The user ID (null for anonymous)
   * @param windowMinutes - Time window in minutes (default: 1)
   * @returns true if a recent click exists
   */
  async hasRecentClick(
    adId: string,
    slotId: string,
    userId: string | null,
    windowMinutes: number = 1
  ): Promise<boolean> {
    try {
      const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

      const conditions = [
        eq(adClicks.adId, adId),
        eq(adClicks.slotId, slotId),
        gte(adClicks.createdAt, windowStart),
      ];

      // For authenticated users, check by userId
      // For anonymous users, we can't deduplicate server-side
      if (userId) {
        conditions.push(eq(adClicks.userId, userId));
      } else {
        // For anonymous users, skip deduplication (rely on client-side)
        return false;
      }

      const result = await this.db
        .select({ count: count() })
        .from(adClicks)
        .where(and(...conditions));

      return (result[0]?.count ?? 0) > 0;
    } catch (error) {
      // Don't block click recording on dedup errors
      console.error('Failed to check recent click:', error);
      return false;
    }
  }
}

