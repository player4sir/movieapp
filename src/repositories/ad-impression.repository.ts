import { eq, and, gte, lte, count, desc } from 'drizzle-orm';
import { BaseRepository } from './base.repository';
import { adImpressions, AdImpression } from '@/db/schema';
import { RepositoryError } from './errors';

// ============================================
// Input Types
// ============================================

export interface CreateAdImpressionInput {
  id: string;
  adId: string;
  slotId: string;
  userId?: string | null;
}

export interface DateRange {
  startDate: Date;
  endDate: Date;
}

export interface ImpressionCount {
  count: number;
}

export interface ImpressionCountByAd {
  adId: string;
  count: number;
}

// ============================================
// AdImpressionRepository Implementation
// ============================================

/**
 * Repository for ad impression database operations.
 * Tracks when ads are displayed to users.
 * 
 * Requirements: 3.2, 5.1, 5.2
 */
export class AdImpressionRepository extends BaseRepository {
  /**
   * Create a new impression record.
   * 
   * Requirements: 3.2
   */
  async create(input: CreateAdImpressionInput): Promise<AdImpression> {
    try {
      const [impression] = await this.db.insert(adImpressions).values({
        id: input.id,
        adId: input.adId,
        slotId: input.slotId,
        userId: input.userId ?? null,
      }).returning();
      return impression;
    } catch (error) {
      throw new RepositoryError('Failed to create ad impression', 'CREATE_ERROR', error);
    }
  }

  /**
   * Count impressions for a specific ad.
   * 
   * Requirements: 5.1
   */
  async countByAd(adId: string, dateRange?: DateRange): Promise<number> {
    try {
      const conditions = [eq(adImpressions.adId, adId)];
      
      if (dateRange) {
        conditions.push(gte(adImpressions.createdAt, dateRange.startDate));
        conditions.push(lte(adImpressions.createdAt, dateRange.endDate));
      }

      const result = await this.db
        .select({ count: count() })
        .from(adImpressions)
        .where(and(...conditions));
      
      return result[0]?.count ?? 0;
    } catch (error) {
      throw new RepositoryError('Failed to count impressions by ad', 'FIND_ERROR', error);
    }
  }

  /**
   * Count impressions for a specific slot.
   * 
   * Requirements: 5.1
   */
  async countBySlot(slotId: string, dateRange?: DateRange): Promise<number> {
    try {
      const conditions = [eq(adImpressions.slotId, slotId)];
      
      if (dateRange) {
        conditions.push(gte(adImpressions.createdAt, dateRange.startDate));
        conditions.push(lte(adImpressions.createdAt, dateRange.endDate));
      }

      const result = await this.db
        .select({ count: count() })
        .from(adImpressions)
        .where(and(...conditions));
      
      return result[0]?.count ?? 0;
    } catch (error) {
      throw new RepositoryError('Failed to count impressions by slot', 'FIND_ERROR', error);
    }
  }

  /**
   * Count impressions within a date range.
   * 
   * Requirements: 5.2
   */
  async countByDateRange(dateRange: DateRange): Promise<number> {
    try {
      const result = await this.db
        .select({ count: count() })
        .from(adImpressions)
        .where(and(
          gte(adImpressions.createdAt, dateRange.startDate),
          lte(adImpressions.createdAt, dateRange.endDate)
        ));
      
      return result[0]?.count ?? 0;
    } catch (error) {
      throw new RepositoryError('Failed to count impressions by date range', 'FIND_ERROR', error);
    }
  }

  /**
   * Get impression counts grouped by ad within a date range.
   * Useful for statistics dashboard.
   */
  async getCountsByAd(dateRange?: DateRange): Promise<ImpressionCountByAd[]> {
    try {
      const conditions = [];
      
      if (dateRange) {
        conditions.push(gte(adImpressions.createdAt, dateRange.startDate));
        conditions.push(lte(adImpressions.createdAt, dateRange.endDate));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const result = await this.db
        .select({
          adId: adImpressions.adId,
          count: count(),
        })
        .from(adImpressions)
        .where(whereClause)
        .groupBy(adImpressions.adId);
      
      return result.map((r: { adId: string; count: number }) => ({
        adId: r.adId,
        count: r.count,
      }));
    } catch (error) {
      throw new RepositoryError('Failed to get impression counts by ad', 'FIND_ERROR', error);
    }
  }

  /**
   * Find impressions by ad ID.
   */
  async findByAd(adId: string, limit?: number): Promise<AdImpression[]> {
    try {
      return await this.db.query.adImpressions.findMany({
        where: eq(adImpressions.adId, adId),
        limit: limit ?? 100,
        orderBy: [desc(adImpressions.createdAt)],
      });
    } catch (error) {
      throw new RepositoryError('Failed to find impressions by ad', 'FIND_ERROR', error);
    }
  }
}
