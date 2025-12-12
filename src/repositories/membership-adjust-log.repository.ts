import { eq, desc } from 'drizzle-orm';
import { BaseRepository } from './base.repository';
import { membershipAdjustLogs, MembershipAdjustLog } from '@/db/schema';
import { RepositoryError } from './errors';

// ============================================
// Input Types
// ============================================

export interface CreateMembershipAdjustLogInput {
  id: string;
  userId: string;
  adminId: string;
  previousLevel: 'free' | 'vip' | 'svip';
  newLevel: 'free' | 'vip' | 'svip';
  previousExpiry?: Date | null;
  newExpiry?: Date | null;
  reason: string;
}

// ============================================
// MembershipAdjustLogRepository Implementation
// ============================================

/**
 * Repository for membership adjustment log database operations.
 * Encapsulates all membership adjustment log queries using Drizzle ORM.
 * 
 * Requirements: 8.2
 */
export class MembershipAdjustLogRepository extends BaseRepository {
  /**
   * Create a new membership adjustment log.
   */
  async create(input: CreateMembershipAdjustLogInput): Promise<MembershipAdjustLog> {
    try {
      const [log] = await this.db.insert(membershipAdjustLogs).values({
        id: input.id,
        userId: input.userId,
        adminId: input.adminId,
        previousLevel: input.previousLevel,
        newLevel: input.newLevel,
        previousExpiry: input.previousExpiry ?? null,
        newExpiry: input.newExpiry ?? null,
        reason: input.reason,
      }).returning();
      return log;
    } catch (error) {
      throw new RepositoryError('Failed to create membership adjustment log', 'CREATE_ERROR', error);
    }
  }

  /**
   * Find all adjustment logs for a specific user.
   */
  async findByUser(userId: string): Promise<MembershipAdjustLog[]> {
    try {
      return await this.db.query.membershipAdjustLogs.findMany({
        where: eq(membershipAdjustLogs.userId, userId),
        orderBy: [desc(membershipAdjustLogs.createdAt)],
      });
    } catch (error) {
      throw new RepositoryError('Failed to find membership adjustment logs by user', 'FIND_ERROR', error);
    }
  }
}
