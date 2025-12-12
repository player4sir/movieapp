import { eq, asc } from 'drizzle-orm';
import { BaseRepository } from './base.repository';
import { membershipPlans, MembershipPlan } from '@/db/schema';
import { RepositoryError } from './errors';

// ============================================
// Input Types
// ============================================

export interface CreateMembershipPlanInput {
  id: string;
  name: string;
  memberLevel: 'vip' | 'svip';
  duration: number;
  price: number;
  coinPrice: number;
  enabled?: boolean;
  sortOrder?: number;
}

export interface UpdateMembershipPlanInput {
  name?: string;
  memberLevel?: 'vip' | 'svip';
  duration?: number;
  price?: number;
  coinPrice?: number;
  enabled?: boolean;
  sortOrder?: number;
}

// ============================================
// MembershipPlanRepository Implementation
// ============================================

/**
 * Repository for membership plan database operations.
 * Encapsulates all membership plan queries using Drizzle ORM.
 * 
 * Requirements: 1.1, 7.1
 */
export class MembershipPlanRepository extends BaseRepository {
  /**
   * Find all membership plans ordered by sortOrder.
   */
  async findAll(): Promise<MembershipPlan[]> {
    try {
      return await this.db.query.membershipPlans.findMany({
        orderBy: [asc(membershipPlans.sortOrder)],
      });
    } catch (error) {
      throw new RepositoryError('Failed to find all membership plans', 'FIND_ERROR', error);
    }
  }

  /**
   * Find a membership plan by ID.
   */
  async findById(id: string): Promise<MembershipPlan | null> {
    try {
      const result = await this.db.query.membershipPlans.findFirst({
        where: eq(membershipPlans.id, id),
      });
      return result ?? null;
    } catch (error) {
      throw new RepositoryError('Failed to find membership plan by id', 'FIND_ERROR', error);
    }
  }

  /**
   * Find all enabled membership plans ordered by sortOrder.
   */
  async findEnabled(): Promise<MembershipPlan[]> {
    try {
      return await this.db.query.membershipPlans.findMany({
        where: eq(membershipPlans.enabled, true),
        orderBy: [asc(membershipPlans.sortOrder)],
      });
    } catch (error) {
      throw new RepositoryError('Failed to find enabled membership plans', 'FIND_ERROR', error);
    }
  }

  /**
   * Create a new membership plan.
   */
  async create(input: CreateMembershipPlanInput): Promise<MembershipPlan> {
    try {
      const [plan] = await this.db.insert(membershipPlans).values({
        id: input.id,
        name: input.name,
        memberLevel: input.memberLevel,
        duration: input.duration,
        price: input.price,
        coinPrice: input.coinPrice,
        enabled: input.enabled ?? true,
        sortOrder: input.sortOrder ?? 0,
        updatedAt: new Date(),
      }).returning();
      return plan;
    } catch (error) {
      throw new RepositoryError('Failed to create membership plan', 'CREATE_ERROR', error);
    }
  }

  /**
   * Update an existing membership plan.
   * Returns null if plan not found.
   */
  async update(id: string, input: UpdateMembershipPlanInput): Promise<MembershipPlan | null> {
    try {
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (input.name !== undefined) updateData.name = input.name;
      if (input.memberLevel !== undefined) updateData.memberLevel = input.memberLevel;
      if (input.duration !== undefined) updateData.duration = input.duration;
      if (input.price !== undefined) updateData.price = input.price;
      if (input.coinPrice !== undefined) updateData.coinPrice = input.coinPrice;
      if (input.enabled !== undefined) updateData.enabled = input.enabled;
      if (input.sortOrder !== undefined) updateData.sortOrder = input.sortOrder;

      const [plan] = await this.db.update(membershipPlans)
        .set(updateData)
        .where(eq(membershipPlans.id, id))
        .returning();
      return plan ?? null;
    } catch (error) {
      throw new RepositoryError('Failed to update membership plan', 'UPDATE_ERROR', error);
    }
  }

  /**
   * Delete a membership plan by ID.
   */
  async delete(id: string): Promise<void> {
    try {
      await this.db.delete(membershipPlans).where(eq(membershipPlans.id, id));
    } catch (error) {
      throw new RepositoryError('Failed to delete membership plan', 'DELETE_ERROR', error);
    }
  }
}
