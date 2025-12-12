import { eq, lt, gt, and, ne, desc, sql } from 'drizzle-orm';
import { BaseRepository } from './base.repository';
import { userSessions, UserSession, User } from '@/db/schema';
import { RepositoryError } from './errors';

// ============================================
// Input Types
// ============================================

export interface CreateSessionInput {
  id: string;
  userId: string;
  refreshToken: string;
  deviceInfo?: string;
  ipAddress?: string;
  userAgent?: string;
  expiresAt: Date;
}

export interface SessionWithUser extends UserSession {
  user: User;
}

// ============================================
// SessionRepository Implementation
// ============================================

/**
 * Repository for user session-related database operations.
 * Encapsulates all session queries using Drizzle ORM.
 * 
 * Requirements: 5.4, 5.5
 */
export class SessionRepository extends BaseRepository {
  /**
   * Find a session by its refresh token.
   * Includes the associated user data.
   */
  async findByRefreshToken(refreshToken: string): Promise<SessionWithUser | null> {
    try {
      const result = await this.db.query.userSessions.findFirst({
        where: eq(userSessions.refreshToken, refreshToken),
        with: { user: true },
      });
      return result as SessionWithUser | null ?? null;
    } catch (error) {
      throw new RepositoryError('Failed to find session by refresh token', 'FIND_ERROR', error);
    }
  }

  /**
   * Find a session by its ID.
   */
  async findById(id: string): Promise<UserSession | null> {
    try {
      const result = await this.db.query.userSessions.findFirst({
        where: eq(userSessions.id, id),
      });
      return result ?? null;
    } catch (error) {
      throw new RepositoryError('Failed to find session by id', 'FIND_ERROR', error);
    }
  }

  /**
   * Find all active (non-expired) sessions for a user, ordered by last activity (newest first).
   */
  async findActiveByUser(userId: string): Promise<UserSession[]> {
    try {
      return await this.db.query.userSessions.findMany({
        where: and(
          eq(userSessions.userId, userId),
          gt(userSessions.expiresAt, new Date())
        ),
        orderBy: [desc(userSessions.lastActivityAt)],
      });
    } catch (error) {
      throw new RepositoryError('Failed to find active user sessions', 'FIND_ERROR', error);
    }
  }

  /**
   * Count active sessions for a user.
   */
  async countActiveByUser(userId: string): Promise<number> {
    try {
      const result = await this.db.select({ count: sql<number>`count(*)` })
        .from(userSessions)
        .where(and(
          eq(userSessions.userId, userId),
          gt(userSessions.expiresAt, new Date())
        ));
      return Number(result[0]?.count ?? 0);
    } catch (error) {
      throw new RepositoryError('Failed to count active sessions', 'FIND_ERROR', error);
    }
  }

  /**
   * Delete all sessions for a user except the specified one.
   * Returns the number of deleted sessions.
   */
  async deleteOthersByUser(userId: string, exceptSessionId: string): Promise<number> {
    try {
      const result = await this.db.delete(userSessions)
        .where(and(
          eq(userSessions.userId, userId),
          ne(userSessions.id, exceptSessionId)
        ))
        .returning();
      return result.length;
    } catch (error) {
      throw new RepositoryError('Failed to delete other sessions', 'DELETE_ERROR', error);
    }
  }

  /**
   * Delete all sessions for a user and return the count.
   */
  async deleteAllByUserWithCount(userId: string): Promise<number> {
    try {
      const result = await this.db.delete(userSessions)
        .where(eq(userSessions.userId, userId))
        .returning();
      return result.length;
    } catch (error) {
      throw new RepositoryError('Failed to delete user sessions', 'DELETE_ERROR', error);
    }
  }

  /**
   * Delete all expired sessions and return the count.
   */
  async deleteExpiredWithCount(): Promise<number> {
    try {
      const result = await this.db.delete(userSessions)
        .where(lt(userSessions.expiresAt, new Date()))
        .returning();
      return result.length;
    } catch (error) {
      throw new RepositoryError('Failed to delete expired sessions', 'DELETE_ERROR', error);
    }
  }

  /**
   * Find all sessions for a user, ordered by creation date (newest first).
   */
  async findByUser(userId: string): Promise<UserSession[]> {
    try {
      return await this.db.query.userSessions.findMany({
        where: eq(userSessions.userId, userId),
        orderBy: [desc(userSessions.createdAt)],
      });
    } catch (error) {
      throw new RepositoryError('Failed to find user sessions', 'FIND_ERROR', error);
    }
  }

  /**
   * Create a new session.
   */
  async create(input: CreateSessionInput): Promise<UserSession> {
    try {
      const [session] = await this.db.insert(userSessions)
        .values({
          id: input.id,
          userId: input.userId,
          refreshToken: input.refreshToken,
          deviceInfo: input.deviceInfo ?? '',
          ipAddress: input.ipAddress ?? '',
          userAgent: input.userAgent ?? '',
          expiresAt: input.expiresAt,
          lastActivityAt: new Date(),
          createdAt: new Date(),
        })
        .returning();
      return session;
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('unique constraint')) {
        throw new RepositoryError('Session with this refresh token already exists', 'DUPLICATE', error);
      }
      throw new RepositoryError('Failed to create session', 'CREATE_ERROR', error);
    }
  }

  /**
   * Update the last activity timestamp for a session.
   */
  async updateActivity(id: string): Promise<void> {
    try {
      await this.db.update(userSessions)
        .set({ lastActivityAt: new Date() })
        .where(eq(userSessions.id, id));
    } catch (error) {
      throw new RepositoryError('Failed to update session activity', 'UPDATE_ERROR', error);
    }
  }

  /**
   * Delete a session by its ID.
   */
  async delete(id: string): Promise<void> {
    try {
      await this.db.delete(userSessions)
        .where(eq(userSessions.id, id));
    } catch (error) {
      throw new RepositoryError('Failed to delete session', 'DELETE_ERROR', error);
    }
  }

  /**
   * Delete a session by its refresh token.
   */
  async deleteByRefreshToken(refreshToken: string): Promise<void> {
    try {
      await this.db.delete(userSessions)
        .where(eq(userSessions.refreshToken, refreshToken));
    } catch (error) {
      throw new RepositoryError('Failed to delete session by refresh token', 'DELETE_ERROR', error);
    }
  }

  /**
   * Delete all sessions for a user.
   * Used when logging out from all devices or deleting a user account.
   */
  async deleteAllByUser(userId: string): Promise<void> {
    try {
      await this.db.delete(userSessions)
        .where(eq(userSessions.userId, userId));
    } catch (error) {
      throw new RepositoryError('Failed to delete user sessions', 'DELETE_ERROR', error);
    }
  }

  /**
   * Delete all expired sessions.
   * Should be called periodically to clean up stale sessions.
   */
  async deleteExpired(): Promise<void> {
    try {
      await this.db.delete(userSessions)
        .where(lt(userSessions.expiresAt, new Date()));
    } catch (error) {
      throw new RepositoryError('Failed to delete expired sessions', 'DELETE_ERROR', error);
    }
  }
}
