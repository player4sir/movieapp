import { eq, and, lte, gte, desc } from 'drizzle-orm';
import { BaseRepository } from './base.repository';
import { ads, Ad, MemberLevel } from '@/db/schema';
import { RepositoryError } from './errors';

// ============================================
// Input Types
// ============================================

export interface CreateAdInput {
  id: string;
  title: string;
  imageUrl: string;
  targetUrl: string;
  startDate: Date;
  endDate: Date;
  enabled?: boolean;
  targetMemberLevels?: MemberLevel[];
  targetGroupIds?: string[];
  priority?: number;
}

export interface UpdateAdInput {
  title?: string;
  imageUrl?: string;
  targetUrl?: string;
  startDate?: Date;
  endDate?: Date;
  enabled?: boolean;
  targetMemberLevels?: MemberLevel[];
  targetGroupIds?: string[];
  priority?: number;
}

export interface AdFilters {
  enabled?: boolean;
  deleted?: boolean;
  includeExpired?: boolean;
}

// ============================================
// AdRepository Implementation
// ============================================

/**
 * Repository for ad database operations.
 * Encapsulates all ad queries using Drizzle ORM.
 * 
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */
export class AdRepository extends BaseRepository {
  /**
   * Find an ad by ID.
   */
  async findById(id: string): Promise<Ad | null> {
    try {
      const result = await this.db.query.ads.findFirst({
        where: eq(ads.id, id),
      });
      return result ?? null;
    } catch (error) {
      throw new RepositoryError('Failed to find ad by id', 'FIND_ERROR', error);
    }
  }

  /**
   * Find all ads with optional filters.
   * Returns ads ordered by priority (descending) and creation date.
   */
  async findAll(filters?: AdFilters): Promise<Ad[]> {
    try {
      const conditions = [];

      // By default, exclude deleted ads
      if (filters?.deleted === undefined || filters.deleted === false) {
        conditions.push(eq(ads.deleted, false));
      } else if (filters.deleted === true) {
        conditions.push(eq(ads.deleted, true));
      }

      if (filters?.enabled !== undefined) {
        conditions.push(eq(ads.enabled, filters.enabled));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      return await this.db.query.ads.findMany({
        where: whereClause,
        orderBy: [desc(ads.priority), desc(ads.createdAt)],
      });
    } catch (error) {
      throw new RepositoryError('Failed to find all ads', 'FIND_ERROR', error);
    }
  }

  /**
   * Get active ads for delivery.
   * Filters by: not deleted, enabled, within date range.
   * 
   * Requirements: 1.5 - Automatically excludes expired ads
   */
  async getActiveAds(currentDate?: Date): Promise<Ad[]> {
    try {
      const now = currentDate ?? new Date();

      return await this.db.query.ads.findMany({
        where: and(
          eq(ads.deleted, false),
          eq(ads.enabled, true),
          lte(ads.startDate, now),
          gte(ads.endDate, now)
        ),
        orderBy: [desc(ads.priority), desc(ads.createdAt)],
      });
    } catch (error) {
      throw new RepositoryError('Failed to get active ads', 'FIND_ERROR', error);
    }
  }

  /**
   * Create a new ad.
   * 
   * Requirements: 1.1
   */
  async create(input: CreateAdInput): Promise<Ad> {
    try {
      const [ad] = await this.db.insert(ads).values({
        id: input.id,
        title: input.title,
        imageUrl: input.imageUrl,
        targetUrl: input.targetUrl,
        startDate: input.startDate,
        endDate: input.endDate,
        enabled: input.enabled ?? true,
        targetMemberLevels: input.targetMemberLevels ?? [],
        targetGroupIds: input.targetGroupIds ?? [],
        priority: input.priority ?? 0,
        deleted: false,
        updatedAt: new Date(),
      }).returning();
      return ad;
    } catch (error) {
      throw new RepositoryError('Failed to create ad', 'CREATE_ERROR', error);
    }
  }

  /**
   * Update an existing ad.
   * Returns null if ad not found.
   * 
   * Requirements: 1.2
   */
  async update(id: string, input: UpdateAdInput): Promise<Ad | null> {
    try {
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (input.title !== undefined) updateData.title = input.title;
      if (input.imageUrl !== undefined) updateData.imageUrl = input.imageUrl;
      if (input.targetUrl !== undefined) updateData.targetUrl = input.targetUrl;
      if (input.startDate !== undefined) updateData.startDate = input.startDate;
      if (input.endDate !== undefined) updateData.endDate = input.endDate;
      if (input.enabled !== undefined) updateData.enabled = input.enabled;
      if (input.targetMemberLevels !== undefined) updateData.targetMemberLevels = input.targetMemberLevels;
      if (input.targetGroupIds !== undefined) updateData.targetGroupIds = input.targetGroupIds;
      if (input.priority !== undefined) updateData.priority = input.priority;

      const [ad] = await this.db.update(ads)
        .set(updateData)
        .where(eq(ads.id, id))
        .returning();
      return ad ?? null;
    } catch (error) {
      throw new RepositoryError('Failed to update ad', 'UPDATE_ERROR', error);
    }
  }

  /**
   * Soft delete an ad by marking it as deleted.
   * 
   * Requirements: 1.3
   */
  async softDelete(id: string): Promise<Ad | null> {
    try {
      const [ad] = await this.db.update(ads)
        .set({
          deleted: true,
          updatedAt: new Date(),
        })
        .where(eq(ads.id, id))
        .returning();
      return ad ?? null;
    } catch (error) {
      throw new RepositoryError('Failed to soft delete ad', 'DELETE_ERROR', error);
    }
  }

  /**
   * Hard delete an ad (permanent removal).
   * Use with caution - prefer softDelete for normal operations.
   */
  async delete(id: string): Promise<void> {
    try {
      await this.db.delete(ads).where(eq(ads.id, id));
    } catch (error) {
      throw new RepositoryError('Failed to delete ad', 'DELETE_ERROR', error);
    }
  }
}
