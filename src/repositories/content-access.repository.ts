import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import { BaseRepository } from './base.repository';
import { contentAccess, ContentAccess, SourceCategory } from '@/db/schema';
import { DuplicateError, RepositoryError } from './errors';

// ============================================
// Input Types
// ============================================

export interface CreateContentAccessInput {
  id: string;
  userId: string;
  vodId: number;
  episodeIndex: number;
  sourceCategory: SourceCategory;
  unlockType: 'purchase' | 'vip';
  coinsSpent: number;
}

export interface ContentAccessFilterParams {
  userId: string;
  sourceCategory?: SourceCategory;
  startDate?: Date;
  endDate?: Date;
  page?: number;
  pageSize?: number;
}

export interface ContentAccessListResult {
  data: ContentAccess[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export interface ContentAccessStats {
  totalUnlocks: number;
  totalRevenue: number;
  byCategory: {
    normal: { count: number; revenue: number };
    adult: { count: number; revenue: number };
  };
}

// ============================================
// ContentAccessRepository Implementation
// ============================================

/**
 * Repository for content access operations.
 * Encapsulates all content access queries using Drizzle ORM.
 * 
 * Requirements: 4.2, 5.1, 7.1, 7.4
 */
export class ContentAccessRepository extends BaseRepository {

  /**
   * Create a new content access record.
   * Throws DuplicateError if the user already has access to this content/episode.
   * 
   * Requirements: 4.2, 5.1
   */
  async create(input: CreateContentAccessInput): Promise<ContentAccess> {
    try {
      const [record] = await this.db.insert(contentAccess)
        .values({
          id: input.id,
          userId: input.userId,
          vodId: input.vodId,
          episodeIndex: input.episodeIndex,
          sourceCategory: input.sourceCategory,
          unlockType: input.unlockType,
          coinsSpent: input.coinsSpent,
        })
        .returning();
      return record;
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('unique constraint')) {
        throw new DuplicateError('ContentAccess', 'userId_vodId_episodeIndex');
      }
      throw new RepositoryError('Failed to create content access record', 'CREATE_ERROR', error);
    }
  }

  /**
   * Find access record by user, VOD, and episode.
   * 
   * Requirements: 5.1
   */
  async findByUserAndContent(
    userId: string,
    vodId: number,
    episodeIndex: number
  ): Promise<ContentAccess | null> {
    try {
      const result = await this.db.query.contentAccess.findFirst({
        where: and(
          eq(contentAccess.userId, userId),
          eq(contentAccess.vodId, vodId),
          eq(contentAccess.episodeIndex, episodeIndex)
        ),
      });
      return result ?? null;
    } catch (error) {
      throw new RepositoryError('Failed to find content access', 'FIND_ERROR', error);
    }
  }

  /**
   * Find all access records for a user with pagination and filtering.
   * 
   * Requirements: 7.1, 7.4
   */
  async findByUser(params: ContentAccessFilterParams): Promise<ContentAccessListResult> {
    try {
      const {
        userId,
        sourceCategory,
        startDate,
        endDate,
        page = 1,
        pageSize = 20,
      } = params;

      const offset = (page - 1) * pageSize;

      // Build where conditions
      const conditions = [eq(contentAccess.userId, userId)];
      
      if (sourceCategory) {
        conditions.push(eq(contentAccess.sourceCategory, sourceCategory));
      }
      if (startDate) {
        conditions.push(gte(contentAccess.createdAt, startDate));
      }
      if (endDate) {
        conditions.push(lte(contentAccess.createdAt, endDate));
      }

      const whereClause = and(...conditions);

      // Execute queries in parallel
      const [data, countResult] = await Promise.all([
        this.db.query.contentAccess.findMany({
          where: whereClause,
          orderBy: [desc(contentAccess.createdAt)],
          limit: pageSize,
          offset,
        }),
        this.db.select({ count: sql<number>`count(*)` })
          .from(contentAccess)
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
      throw new RepositoryError('Failed to find user content access', 'FIND_ERROR', error);
    }
  }


  /**
   * Find all access records for a specific VOD (all episodes).
   * Useful for showing which episodes are unlocked.
   */
  async findByUserAndVod(userId: string, vodId: number): Promise<ContentAccess[]> {
    try {
      return await this.db.query.contentAccess.findMany({
        where: and(
          eq(contentAccess.userId, userId),
          eq(contentAccess.vodId, vodId)
        ),
        orderBy: [desc(contentAccess.episodeIndex)],
      });
    } catch (error) {
      throw new RepositoryError('Failed to find content access by VOD', 'FIND_ERROR', error);
    }
  }

  /**
   * Get statistics for content access records.
   * Used for admin dashboard.
   * 
   * Requirements: 8.1, 8.2
   */
  async getStats(startDate?: Date, endDate?: Date): Promise<ContentAccessStats> {
    try {
      const conditions = [];
      if (startDate) {
        conditions.push(gte(contentAccess.createdAt, startDate));
      }
      if (endDate) {
        conditions.push(lte(contentAccess.createdAt, endDate));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const records = await this.db.query.contentAccess.findMany({
        where: whereClause,
      });

      const stats: ContentAccessStats = {
        totalUnlocks: records.length,
        totalRevenue: 0,
        byCategory: {
          normal: { count: 0, revenue: 0 },
          adult: { count: 0, revenue: 0 },
        },
      };

      for (const record of records) {
        stats.totalRevenue += record.coinsSpent;
        const category = record.sourceCategory as 'normal' | 'adult';
        stats.byCategory[category].count++;
        stats.byCategory[category].revenue += record.coinsSpent;
      }

      return stats;
    } catch (error) {
      throw new RepositoryError('Failed to get content access stats', 'QUERY_ERROR', error);
    }
  }

  /**
   * Get top unlocked content by unlock count.
   * 
   * Requirements: 8.3
   */
  async getTopContent(limit: number = 10, startDate?: Date, endDate?: Date): Promise<{
    vodId: number;
    unlockCount: number;
    totalRevenue: number;
  }[]> {
    try {
      const conditions = [];
      if (startDate) {
        conditions.push(gte(contentAccess.createdAt, startDate));
      }
      if (endDate) {
        conditions.push(lte(contentAccess.createdAt, endDate));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const result = await this.db
        .select({
          vodId: contentAccess.vodId,
          unlockCount: sql<number>`count(*)`,
          totalRevenue: sql<number>`sum(${contentAccess.coinsSpent})`,
        })
        .from(contentAccess)
        .where(whereClause)
        .groupBy(contentAccess.vodId)
        .orderBy(sql`count(*) desc`)
        .limit(limit);

      return result.map((r: { vodId: number; unlockCount: number; totalRevenue: number }) => ({
        vodId: r.vodId,
        unlockCount: Number(r.unlockCount),
        totalRevenue: Number(r.totalRevenue ?? 0),
      }));
    } catch (error) {
      throw new RepositoryError('Failed to get top content', 'QUERY_ERROR', error);
    }
  }

  /**
   * Get daily unlock statistics.
   * 
   * Requirements: 8.2
   */
  async getDailyStats(startDate: Date, endDate: Date): Promise<{
    date: string;
    unlockCount: number;
    revenue: number;
    normalCount: number;
    adultCount: number;
  }[]> {
    try {
      const result = await this.db
        .select({
          date: sql<string>`date(${contentAccess.createdAt})`,
          unlockCount: sql<number>`count(*)`,
          revenue: sql<number>`sum(${contentAccess.coinsSpent})`,
          normalCount: sql<number>`sum(case when ${contentAccess.sourceCategory} = 'normal' then 1 else 0 end)`,
          adultCount: sql<number>`sum(case when ${contentAccess.sourceCategory} = 'adult' then 1 else 0 end)`,
        })
        .from(contentAccess)
        .where(and(
          gte(contentAccess.createdAt, startDate),
          lte(contentAccess.createdAt, endDate)
        ))
        .groupBy(sql`date(${contentAccess.createdAt})`)
        .orderBy(sql`date(${contentAccess.createdAt})`);

      return result.map((r: { date: string; unlockCount: number; revenue: number; normalCount: number; adultCount: number }) => ({
        date: r.date,
        unlockCount: Number(r.unlockCount),
        revenue: Number(r.revenue ?? 0),
        normalCount: Number(r.normalCount ?? 0),
        adultCount: Number(r.adultCount ?? 0),
      }));
    } catch (error) {
      throw new RepositoryError('Failed to get daily stats', 'QUERY_ERROR', error);
    }
  }
}
