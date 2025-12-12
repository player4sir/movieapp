import { eq, and, desc } from 'drizzle-orm';
import { BaseRepository } from './base.repository';
import { favorites, Favorite } from '@/db/schema';
import { DuplicateError, RepositoryError } from './errors';

// ============================================
// Input Types
// ============================================

export interface CreateFavoriteInput {
  id: string;
  userId: string;
  vodId: number;
  vodName: string;
  vodPic: string;
  typeName: string;
}

export interface UpsertFavoriteInput {
  userId: string;
  vodId: number;
  vodName: string;
  vodPic: string;
  typeName: string;
}

// ============================================
// FavoriteRepository Implementation
// ============================================

/**
 * Repository for favorite-related database operations.
 * Encapsulates all favorite queries using Drizzle ORM.
 * 
 * Requirements: 5.2, 5.5
 */
export class FavoriteRepository extends BaseRepository {
  /**
   * Find a favorite by user ID and VOD ID.
   */
  async findByUserAndVod(userId: string, vodId: number): Promise<Favorite | null> {
    try {
      const result = await this.db.query.favorites.findFirst({
        where: and(
          eq(favorites.userId, userId),
          eq(favorites.vodId, vodId)
        ),
      });
      return result ?? null;
    } catch (error) {
      throw new RepositoryError('Failed to find favorite', 'FIND_ERROR', error);
    }
  }

  /**
   * Find all favorites for a user, ordered by creation date (newest first).
   */
  async findByUser(userId: string): Promise<Favorite[]> {
    try {
      return await this.db.query.favorites.findMany({
        where: eq(favorites.userId, userId),
        orderBy: [desc(favorites.createdAt)],
      });
    } catch (error) {
      throw new RepositoryError('Failed to find user favorites', 'FIND_ERROR', error);
    }
  }

  /**
   * Create a new favorite.
   * Throws DuplicateError if the user already has this VOD favorited.
   */
  async create(input: CreateFavoriteInput): Promise<Favorite> {
    try {
      const [favorite] = await this.db.insert(favorites)
        .values({
          id: input.id,
          userId: input.userId,
          vodId: input.vodId,
          vodName: input.vodName,
          vodPic: input.vodPic,
          typeName: input.typeName,
        })
        .returning();
      return favorite;
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('unique constraint')) {
        throw new DuplicateError('Favorite', 'userId_vodId');
      }
      throw new RepositoryError('Failed to create favorite', 'CREATE_ERROR', error);
    }
  }

  /**
   * Upsert a favorite - create if not exists, update if exists.
   * Used for adding favorites where we want to update metadata if already favorited.
   */
  async upsert(input: UpsertFavoriteInput): Promise<Favorite> {
    try {
      const existing = await this.findByUserAndVod(input.userId, input.vodId);
      
      if (existing) {
        // Update existing favorite
        const [updated] = await this.db.update(favorites)
          .set({
            vodName: input.vodName,
            vodPic: input.vodPic,
            typeName: input.typeName,
          })
          .where(eq(favorites.id, existing.id))
          .returning();
        return updated;
      }
      
      // Create new favorite
      const [created] = await this.db.insert(favorites)
        .values({
          id: crypto.randomUUID(),
          userId: input.userId,
          vodId: input.vodId,
          vodName: input.vodName,
          vodPic: input.vodPic,
          typeName: input.typeName,
        })
        .returning();
      return created;
    } catch (error: unknown) {
      throw new RepositoryError('Failed to upsert favorite', 'UPSERT_ERROR', error);
    }
  }

  /**
   * Delete a favorite by user ID and VOD ID.
   */
  async delete(userId: string, vodId: number): Promise<void> {
    try {
      await this.db.delete(favorites)
        .where(and(
          eq(favorites.userId, userId),
          eq(favorites.vodId, vodId)
        ));
    } catch (error) {
      throw new RepositoryError('Failed to delete favorite', 'DELETE_ERROR', error);
    }
  }

  /**
   * Delete all favorites for a user.
   * Used when deleting a user account.
   */
  async deleteAllByUser(userId: string): Promise<void> {
    try {
      await this.db.delete(favorites)
        .where(eq(favorites.userId, userId));
    } catch (error) {
      throw new RepositoryError('Failed to delete user favorites', 'DELETE_ERROR', error);
    }
  }
}
