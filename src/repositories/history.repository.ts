import { eq, and, desc } from 'drizzle-orm';
import { BaseRepository } from './base.repository';
import { watchHistory, WatchHistory } from '@/db/schema';
import { RepositoryError } from './errors';

// ============================================
// Input Types
// ============================================

export interface UpsertHistoryInput {
  userId: string;
  vodId: number;
  vodName: string;
  vodPic: string;
  episodeIndex?: number;
  episodeName?: string;
  position?: number;
  duration?: number;
  sourceIndex?: number;
  sourceCategory?: 'normal' | 'adult';
}

// ============================================
// WatchHistoryRepository Implementation
// ============================================

/**
 * Repository for watch history-related database operations.
 * Encapsulates all watch history queries using Drizzle ORM.
 * 
 * Requirements: 5.3, 5.5
 */
export class WatchHistoryRepository extends BaseRepository {
  /**
   * Find a watch history entry by user ID, VOD ID, and source category.
   */
  async findByUserAndVod(userId: string, vodId: number, sourceCategory: 'normal' | 'adult' = 'normal'): Promise<WatchHistory | null> {
    try {
      const result = await this.db.query.watchHistory.findFirst({
        where: and(
          eq(watchHistory.userId, userId),
          eq(watchHistory.vodId, vodId),
          eq(watchHistory.sourceCategory, sourceCategory)
        ),
      });
      return result ?? null;
    } catch (error) {
      throw new RepositoryError('Failed to find watch history', 'FIND_ERROR', error);
    }
  }

  /**
   * Find all watch history entries for a user, ordered by watch date (newest first).
   * @param userId - The user's ID
   * @param limit - Maximum number of entries to return (default: 50)
   */
  async findByUser(userId: string, limit = 50): Promise<WatchHistory[]> {
    try {
      return await this.db.query.watchHistory.findMany({
        where: eq(watchHistory.userId, userId),
        orderBy: [desc(watchHistory.watchedAt)],
        limit,
      });
    } catch (error) {
      throw new RepositoryError('Failed to find user watch history', 'FIND_ERROR', error);
    }
  }

  /**
   * Create or update a watch history entry.
   * If an entry exists for the user/VOD combination, it updates the existing entry.
   * Otherwise, it creates a new entry.
   */
  async upsert(input: UpsertHistoryInput): Promise<WatchHistory> {
    try {
      const sourceCategory = input.sourceCategory ?? 'normal';
      const existing = await this.findByUserAndVod(input.userId, input.vodId, sourceCategory);

      if (existing) {
        // Update existing entry
        const [updated] = await this.db.update(watchHistory)
          .set({
            vodName: input.vodName,
            vodPic: input.vodPic,
            episodeIndex: input.episodeIndex ?? existing.episodeIndex,
            episodeName: input.episodeName ?? existing.episodeName,
            position: input.position ?? existing.position,
            duration: input.duration ?? existing.duration,
            sourceIndex: input.sourceIndex ?? existing.sourceIndex,
            watchedAt: new Date(),
          })
          .where(eq(watchHistory.id, existing.id))
          .returning();
        return updated;
      }

      // Create new entry
      const [created] = await this.db.insert(watchHistory)
        .values({
          id: crypto.randomUUID(),
          userId: input.userId,
          vodId: input.vodId,
          vodName: input.vodName,
          vodPic: input.vodPic,
          episodeIndex: input.episodeIndex ?? 0,
          episodeName: input.episodeName ?? '',
          position: input.position ?? 0,
          duration: input.duration ?? 0,
          sourceIndex: input.sourceIndex ?? 0,
          sourceCategory: sourceCategory,
          watchedAt: new Date(),
        })
        .returning();
      return created;
    } catch (error) {
      // Re-throw RepositoryError as-is (from findByUserAndVod)
      if (error instanceof RepositoryError) {
        throw error;
      }
      throw new RepositoryError('Failed to upsert watch history', 'UPSERT_ERROR', error);
    }
  }

  /**
   * Delete all watch history entries for a user.
   * Used when deleting a user account.
   */
  async deleteAllByUser(userId: string): Promise<void> {
    try {
      await this.db.delete(watchHistory)
        .where(eq(watchHistory.userId, userId));
    } catch (error) {
      throw new RepositoryError('Failed to delete user watch history', 'DELETE_ERROR', error);
    }
  }
}
