import { eq, and, or, ilike, desc, asc, sql, inArray, sum, gte } from 'drizzle-orm';
import { BaseRepository } from './base.repository';
import { users, userSessions, watchHistory, favorites, User, UserGroup } from '@/db/schema';
import { DuplicateError, RepositoryError } from './errors';

// ============================================
// Input Types
// ============================================

export interface CreateUserInput {
  id: string;
  username: string;
  passwordHash: string;
  nickname?: string;
  avatar?: string;
  role?: 'user' | 'admin';
  status?: 'active' | 'disabled';
  memberLevel?: 'free' | 'vip' | 'svip';
  memberExpiry?: Date | null;
  groupId?: string | null;
  referralCode?: string;
  referredBy?: string;
}

export interface UpdateUserInput {
  username?: string;
  passwordHash?: string;
  nickname?: string;
  avatar?: string;
  status?: 'active' | 'disabled';
  role?: 'user' | 'admin';
  memberLevel?: 'free' | 'vip' | 'svip';
  memberExpiry?: Date | null;
  groupId?: string | null;
  lastLoginAt?: Date;
}

export interface UserListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  status?: 'active' | 'disabled';
  role?: 'user' | 'admin';
  groupId?: string;
  memberLevel?: 'free' | 'vip' | 'svip';
  sortBy?: 'createdAt' | 'lastLoginAt' | 'username';
  sortOrder?: 'asc' | 'desc';
}

export interface UserStats {
  favoritesCount: number;
  watchHistoryCount: number;
  totalWatchTime: number;
  activeSessionsCount: number;
}

export interface UserListResult {
  data: (User & { group: UserGroup | null })[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

// ============================================
// UserRepository Implementation
// ============================================

/**
 * Repository for user-related database operations.
 * Encapsulates all user queries using Drizzle ORM.
 * 
 * Requirements: 5.1, 5.5
 */
export class UserRepository extends BaseRepository {
  /**
   * Find a user by their ID, including their group relation.
   */
  async findById(id: string): Promise<(User & { group: UserGroup | null }) | null> {
    try {
      const result = await this.db.query.users.findFirst({
        where: eq(users.id, id),
        with: { group: true },
      });
      return result ?? null;
    } catch (error) {
      throw new RepositoryError('Failed to find user by id', 'FIND_ERROR', error);
    }
  }

  /**
   * Find a user by their username.
   */
  async findByUsername(username: string): Promise<User | null> {
    try {
      const result = await this.db.query.users.findFirst({
        where: eq(users.username, username),
      });
      return result ?? null;
    } catch (error) {
      throw new RepositoryError('Failed to find user by username', 'FIND_ERROR', error);
    }
  }

  /**
   * Create a new user.
   * Throws DuplicateError if username already exists.
   */
  async create(input: CreateUserInput): Promise<User> {
    try {
      const [user] = await this.db.insert(users).values({
        id: input.id,
        username: input.username,
        passwordHash: input.passwordHash,
        nickname: input.nickname ?? '',
        avatar: input.avatar ?? '',
        role: input.role ?? 'user',
        status: input.status ?? 'active',
        memberLevel: input.memberLevel ?? 'free',
        memberExpiry: input.memberExpiry ?? null,
        groupId: input.groupId ?? null,
        referralCode: input.referralCode,
        referredBy: input.referredBy,
        updatedAt: new Date(),
      }).returning();
      return user;
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('unique constraint')) {
        throw new DuplicateError('User', 'username');
      }
      throw new RepositoryError('Failed to create user', 'CREATE_ERROR', error);
    }
  }

  /**
   * Update an existing user.
   * Returns null if user not found.
   */
  async update(id: string, input: UpdateUserInput): Promise<User | null> {
    try {
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      // Only include fields that are explicitly provided
      if (input.username !== undefined) updateData.username = input.username;
      if (input.passwordHash !== undefined) updateData.passwordHash = input.passwordHash;
      if (input.nickname !== undefined) updateData.nickname = input.nickname;
      if (input.avatar !== undefined) updateData.avatar = input.avatar;
      if (input.status !== undefined) updateData.status = input.status;
      if (input.role !== undefined) updateData.role = input.role;
      if (input.memberLevel !== undefined) updateData.memberLevel = input.memberLevel;
      if (input.memberExpiry !== undefined) updateData.memberExpiry = input.memberExpiry;
      if (input.groupId !== undefined) updateData.groupId = input.groupId;
      if (input.lastLoginAt !== undefined) updateData.lastLoginAt = input.lastLoginAt;

      const [user] = await this.db.update(users)
        .set(updateData)
        .where(eq(users.id, id))
        .returning();
      return user ?? null;
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('unique constraint')) {
        throw new DuplicateError('User', 'username');
      }
      throw new RepositoryError('Failed to update user', 'UPDATE_ERROR', error);
    }
  }

  /**
   * Delete a user by ID.
   */
  async delete(id: string): Promise<void> {
    try {
      await this.db.delete(users).where(eq(users.id, id));
    } catch (error) {
      throw new RepositoryError('Failed to delete user', 'DELETE_ERROR', error);
    }
  }

  /**
   * List users with pagination, search, and sorting.
   * Search supports OR condition on username and nickname (case-insensitive).
   */
  async list(params: UserListParams = {}): Promise<UserListResult> {
    try {
      const {
        page = 1,
        pageSize = 20,
        search,
        status,
        role,
        groupId,
        memberLevel,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = params;

      const offset = (page - 1) * pageSize;

      // Build where conditions
      const conditions = [];

      // Search by username OR nickname (case-insensitive)
      if (search) {
        conditions.push(
          or(
            ilike(users.username, `%${search}%`),
            ilike(users.nickname, `%${search}%`)
          )
        );
      }
      if (status) {
        conditions.push(eq(users.status, status));
      }
      if (role) {
        conditions.push(eq(users.role, role));
      }
      if (groupId) {
        conditions.push(eq(users.groupId, groupId));
      }
      if (memberLevel) {
        conditions.push(eq(users.memberLevel, memberLevel));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
      const orderFn = sortOrder === 'asc' ? asc : desc;

      // Execute queries in parallel
      const [data, countResult] = await Promise.all([
        this.db.query.users.findMany({
          where: whereClause,
          with: { group: true },
          limit: pageSize,
          offset,
          orderBy: [orderFn(users[sortBy])],
        }),
        this.db.select({ count: sql<number>`count(*)` })
          .from(users)
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
      throw new RepositoryError('Failed to list users', 'LIST_ERROR', error);
    }
  }

  /**
   * Invalidate all sessions for a user.
   * Used when user status changes or password is reset.
   */
  async invalidateAllSessions(userId: string): Promise<void> {
    try {
      await this.db.delete(userSessions).where(eq(userSessions.userId, userId));
    } catch (error) {
      throw new RepositoryError('Failed to invalidate user sessions', 'DELETE_ERROR', error);
    }
  }

  /**
   * Get user statistics (favorites count, watch history count, total watch time, active sessions).
   */
  async getUserStats(userId: string): Promise<UserStats> {
    try {
      const now = new Date();

      const [favoritesResult, historyResult, watchTimeResult, sessionsResult] = await Promise.all([
        this.db.select({ count: sql<number>`count(*)` })
          .from(favorites)
          .where(eq(favorites.userId, userId)),
        this.db.select({ count: sql<number>`count(*)` })
          .from(watchHistory)
          .where(eq(watchHistory.userId, userId)),
        this.db.select({ total: sum(watchHistory.position) })
          .from(watchHistory)
          .where(eq(watchHistory.userId, userId)),
        this.db.select({ count: sql<number>`count(*)` })
          .from(userSessions)
          .where(and(
            eq(userSessions.userId, userId),
            sql`${userSessions.expiresAt} > ${now}`
          )),
      ]);

      return {
        favoritesCount: Number(favoritesResult[0]?.count ?? 0),
        watchHistoryCount: Number(historyResult[0]?.count ?? 0),
        totalWatchTime: Number(watchTimeResult[0]?.total ?? 0),
        activeSessionsCount: Number(sessionsResult[0]?.count ?? 0),
      };
    } catch (error) {
      throw new RepositoryError('Failed to get user stats', 'QUERY_ERROR', error);
    }
  }

  /**
   * Update multiple users at once.
   * Returns the count of affected rows.
   */
  async updateMany(
    userIds: string[],
    input: Partial<Pick<UpdateUserInput, 'status' | 'groupId' | 'memberLevel'>>
  ): Promise<number> {
    try {
      if (userIds.length === 0) return 0;

      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (input.status !== undefined) updateData.status = input.status;
      if (input.groupId !== undefined) updateData.groupId = input.groupId;
      if (input.memberLevel !== undefined) updateData.memberLevel = input.memberLevel;

      const result = await this.db.update(users)
        .set(updateData)
        .where(inArray(users.id, userIds));

      return result.rowCount ?? 0;
    } catch (error) {
      throw new RepositoryError('Failed to update multiple users', 'UPDATE_ERROR', error);
    }
  }

  /**
   * Find multiple users by their IDs.
   */
  async findByIds(ids: string[]): Promise<User[]> {
    try {
      if (ids.length === 0) return [];

      return await this.db.query.users.findMany({
        where: inArray(users.id, ids),
      });
    } catch (error) {
      throw new RepositoryError('Failed to find users by ids', 'FIND_ERROR', error);
    }
  }

  /**
   * Count users matching the given criteria.
   */
  async count(params: Omit<UserListParams, 'page' | 'pageSize' | 'sortBy' | 'sortOrder'> = {}): Promise<number> {
    try {
      const { search, status, role, groupId, memberLevel } = params;

      const conditions = [];

      if (search) {
        conditions.push(
          or(
            ilike(users.username, `%${search}%`),
            ilike(users.nickname, `%${search}%`)
          )
        );
      }
      if (status) {
        conditions.push(eq(users.status, status));
      }
      if (role) {
        conditions.push(eq(users.role, role));
      }
      if (groupId) {
        conditions.push(eq(users.groupId, groupId));
      }
      if (memberLevel) {
        conditions.push(eq(users.memberLevel, memberLevel));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const result = await this.db.select({ count: sql<number>`count(*)` })
        .from(users)
        .where(whereClause);

      return Number(result[0]?.count ?? 0);
    } catch (error) {
      throw new RepositoryError('Failed to count users', 'COUNT_ERROR', error);
    }
  }

  /**
   * Count total users.
   */
  async countAll(): Promise<number> {
    try {
      const result = await this.db.select({ count: sql<number>`count(*)` })
        .from(users);
      return Number(result[0]?.count ?? 0);
    } catch (error) {
      throw new RepositoryError('Failed to count all users', 'COUNT_ERROR', error);
    }
  }

  /**
   * Count users created since a given date.
   */
  async countCreatedSince(since: Date): Promise<number> {
    try {
      const result = await this.db.select({ count: sql<number>`count(*)` })
        .from(users)
        .where(gte(users.createdAt, since));
      return Number(result[0]?.count ?? 0);
    } catch (error) {
      throw new RepositoryError('Failed to count users created since date', 'COUNT_ERROR', error);
    }
  }

  /**
   * Count users who logged in since a given date.
   */
  async countActiveUsersSince(since: Date): Promise<number> {
    try {
      const result = await this.db.select({ count: sql<number>`count(*)` })
        .from(users)
        .where(gte(users.lastLoginAt, since));
      return Number(result[0]?.count ?? 0);
    } catch (error) {
      throw new RepositoryError('Failed to count active users since date', 'COUNT_ERROR', error);
    }
  }

  /**
   * Count users grouped by member level.
   * Returns counts for free, vip, and svip users.
   */
  async countByMemberLevel(): Promise<{ free: number; vip: number; svip: number }> {
    try {
      const result = await this.db
        .select({
          memberLevel: users.memberLevel,
          count: sql<number>`count(*)`,
        })
        .from(users)
        .groupBy(users.memberLevel);

      const counts = { free: 0, vip: 0, svip: 0 };
      for (const row of result) {
        if (row.memberLevel === 'free') counts.free = Number(row.count);
        else if (row.memberLevel === 'vip') counts.vip = Number(row.count);
        else if (row.memberLevel === 'svip') counts.svip = Number(row.count);
      }
      return counts;
    } catch (error) {
      throw new RepositoryError('Failed to count users by member level', 'COUNT_ERROR', error);
    }
  }

  /**
   * Get daily registration counts for the past N days.
   * Returns array of { date, count } sorted by date ascending.
   */
  async getDailyRegistrations(days: number = 7): Promise<{ date: string; count: number }[]> {
    try {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);
      startDate.setHours(0, 0, 0, 0);

      const result = await this.db
        .select({
          date: sql<string>`DATE(${users.createdAt})`,
          count: sql<number>`count(*)`,
        })
        .from(users)
        .where(gte(users.createdAt, startDate))
        .groupBy(sql`DATE(${users.createdAt})`)
        .orderBy(sql`DATE(${users.createdAt})`);

      return result.map((row: { date: string; count: number }) => ({
        date: String(row.date),
        count: Number(row.count),
      }));
    } catch (error) {
      throw new RepositoryError('Failed to get daily registrations', 'COUNT_ERROR', error);
    }
  }
}

