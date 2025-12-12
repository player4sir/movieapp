import { eq, and, desc } from 'drizzle-orm';
import { BaseRepository } from './base.repository';
import { adSlotAssignments, AdSlotAssignment } from '@/db/schema';
import { RepositoryError, DuplicateError } from './errors';

// ============================================
// Input Types
// ============================================

export interface CreateAdSlotAssignmentInput {
  id: string;
  adId: string;
  slotId: string;
  priority?: number;
}

// ============================================
// AdSlotAssignmentRepository Implementation
// ============================================

/**
 * Repository for ad slot assignment database operations.
 * Manages the many-to-many relationship between ads and slots.
 * 
 * Requirements: 2.2, 2.3
 */
export class AdSlotAssignmentRepository extends BaseRepository {
  /**
   * Find an assignment by ID.
   */
  async findById(id: string): Promise<AdSlotAssignment | null> {
    try {
      const result = await this.db.query.adSlotAssignments.findFirst({
        where: eq(adSlotAssignments.id, id),
      });
      return result ?? null;
    } catch (error) {
      throw new RepositoryError('Failed to find assignment by id', 'FIND_ERROR', error);
    }
  }

  /**
   * Find an assignment by ad ID and slot ID.
   */
  async findByAdAndSlot(adId: string, slotId: string): Promise<AdSlotAssignment | null> {
    try {
      const result = await this.db.query.adSlotAssignments.findFirst({
        where: and(
          eq(adSlotAssignments.adId, adId),
          eq(adSlotAssignments.slotId, slotId)
        ),
      });
      return result ?? null;
    } catch (error) {
      throw new RepositoryError('Failed to find assignment by ad and slot', 'FIND_ERROR', error);
    }
  }

  /**
   * Get all assignments for a slot.
   * Returns assignments ordered by priority (descending).
   * 
   * Requirements: 2.3 - Priority ordering
   */
  async getBySlot(slotId: string): Promise<AdSlotAssignment[]> {
    try {
      return await this.db.query.adSlotAssignments.findMany({
        where: eq(adSlotAssignments.slotId, slotId),
        orderBy: [desc(adSlotAssignments.priority), desc(adSlotAssignments.createdAt)],
      });
    } catch (error) {
      throw new RepositoryError('Failed to get assignments by slot', 'FIND_ERROR', error);
    }
  }

  /**
   * Get all assignments for an ad.
   */
  async getByAd(adId: string): Promise<AdSlotAssignment[]> {
    try {
      return await this.db.query.adSlotAssignments.findMany({
        where: eq(adSlotAssignments.adId, adId),
        orderBy: [desc(adSlotAssignments.createdAt)],
      });
    } catch (error) {
      throw new RepositoryError('Failed to get assignments by ad', 'FIND_ERROR', error);
    }
  }

  /**
   * Assign an ad to a slot.
   * 
   * Requirements: 2.2
   */
  async assign(input: CreateAdSlotAssignmentInput): Promise<AdSlotAssignment> {
    try {
      const [assignment] = await this.db.insert(adSlotAssignments).values({
        id: input.id,
        adId: input.adId,
        slotId: input.slotId,
        priority: input.priority ?? 0,
      }).returning();
      return assignment;
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('unique constraint')) {
        throw new DuplicateError('AdSlotAssignment', 'adId_slotId');
      }
      throw new RepositoryError('Failed to assign ad to slot', 'CREATE_ERROR', error);
    }
  }

  /**
   * Remove an ad from a slot.
   */
  async remove(adId: string, slotId: string): Promise<void> {
    try {
      await this.db.delete(adSlotAssignments)
        .where(and(
          eq(adSlotAssignments.adId, adId),
          eq(adSlotAssignments.slotId, slotId)
        ));
    } catch (error) {
      throw new RepositoryError('Failed to remove ad from slot', 'DELETE_ERROR', error);
    }
  }

  /**
   * Remove an assignment by ID.
   */
  async removeById(id: string): Promise<void> {
    try {
      await this.db.delete(adSlotAssignments)
        .where(eq(adSlotAssignments.id, id));
    } catch (error) {
      throw new RepositoryError('Failed to remove assignment', 'DELETE_ERROR', error);
    }
  }

  /**
   * Update assignment priority.
   */
  async updatePriority(id: string, priority: number): Promise<AdSlotAssignment | null> {
    try {
      const [assignment] = await this.db.update(adSlotAssignments)
        .set({ priority })
        .where(eq(adSlotAssignments.id, id))
        .returning();
      return assignment ?? null;
    } catch (error) {
      throw new RepositoryError('Failed to update assignment priority', 'UPDATE_ERROR', error);
    }
  }
}
