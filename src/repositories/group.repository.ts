import { eq, asc, desc, sql } from 'drizzle-orm';
import { BaseRepository } from './base.repository';
import { userGroups, users, UserGroup, User } from '@/db/schema';
import { DuplicateError, RepositoryError } from './errors';

// ============================================
// Input Types
// ============================================

export interface CreateUserGroupInput {
  id: string;
  name: string;
  description?: string;
  color?: string;
  permissions?: Record<string, unknown>;
}

export interface UpdateUserGroupInput {
  name?: string;
  description?: string;
  color?: string;
  permissions?: Record<string, unknown>;
}

// ============================================
// UserGroupRepository Implementation
// ============================================

/**
 * Repository for user group database operations.
 * Encapsulates all user group queries using Drizzle ORM.
 * 
 * Requirements: 5.5
 */
export class UserGroupRepository extends BaseRepository {
  /**
   * Find a user group by ID.
   */
  async findById(id: string): Promise<UserGroup | null> {
    try {
      const result = await this.db.query.userGroups.findFirst({
        where: eq(userGroups.id, id),
      });
      return result ?? null;
    } catch (error) {
      throw new RepositoryError('Failed to find user group by id', 'FIND_ERROR', error);
    }
  }

  /**
   * Find a user group by name.
   */
  async findByName(name: string): Promise<UserGroup | null> {
    try {
      const result = await this.db.query.userGroups.findFirst({
        where: eq(userGroups.name, name),
      });
      return result ?? null;
    } catch (error) {
      throw new RepositoryError('Failed to find user group by name', 'FIND_ERROR', error);
    }
  }

  /**
   * Find all user groups ordered by name.
   */
  async findAll(): Promise<UserGroup[]> {
    try {
      return await this.db.query.userGroups.findMany({
        orderBy: [asc(userGroups.name)],
      });
    } catch (error) {
      throw new RepositoryError('Failed to find all user groups', 'FIND_ERROR', error);
    }
  }

  /**
   * Create a new user group.
   * Throws DuplicateError if name already exists.
   */
  async create(input: CreateUserGroupInput): Promise<UserGroup> {
    try {
      const [group] = await this.db.insert(userGroups).values({
        id: input.id,
        name: input.name,
        description: input.description ?? '',
        color: input.color ?? '#6b7280',
        permissions: input.permissions ?? {},
        updatedAt: new Date(),
      }).returning();
      return group;
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('unique constraint')) {
        throw new DuplicateError('UserGroup', 'name');
      }
      throw new RepositoryError('Failed to create user group', 'CREATE_ERROR', error);
    }
  }

  /**
   * Update an existing user group.
   * Returns null if group not found.
   * Throws DuplicateError if name already exists.
   */
  async update(id: string, input: UpdateUserGroupInput): Promise<UserGroup | null> {
    try {
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (input.name !== undefined) updateData.name = input.name;
      if (input.description !== undefined) updateData.description = input.description;
      if (input.color !== undefined) updateData.color = input.color;
      if (input.permissions !== undefined) updateData.permissions = input.permissions;

      const [group] = await this.db.update(userGroups)
        .set(updateData)
        .where(eq(userGroups.id, id))
        .returning();
      return group ?? null;
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('unique constraint')) {
        throw new DuplicateError('UserGroup', 'name');
      }
      throw new RepositoryError('Failed to update user group', 'UPDATE_ERROR', error);
    }
  }

  /**
   * Delete a user group by ID.
   */
  async delete(id: string): Promise<void> {
    try {
      await this.db.delete(userGroups).where(eq(userGroups.id, id));
    } catch (error) {
      throw new RepositoryError('Failed to delete user group', 'DELETE_ERROR', error);
    }
  }

  /**
   * Find all user groups with user count, ordered by creation date (newest first).
   */
  async findAllWithUserCount(): Promise<(UserGroup & { _count: { users: number } })[]> {
    try {
      const groups = await this.db.query.userGroups.findMany({
        orderBy: [desc(userGroups.createdAt)],
      });

      // Get user counts for each group
      const groupsWithCounts = await Promise.all(
        groups.map(async (group: UserGroup) => {
          const countResult = await this.db.select({ count: sql<number>`count(*)` })
            .from(users)
            .where(eq(users.groupId, group.id));
          
          return {
            ...group,
            _count: { users: Number(countResult[0]?.count ?? 0) },
          };
        })
      );

      return groupsWithCounts;
    } catch (error) {
      throw new RepositoryError('Failed to find all user groups with count', 'FIND_ERROR', error);
    }
  }

  /**
   * Count users in a group.
   */
  async countUsers(groupId: string): Promise<number> {
    try {
      const result = await this.db.select({ count: sql<number>`count(*)` })
        .from(users)
        .where(eq(users.groupId, groupId));
      return Number(result[0]?.count ?? 0);
    } catch (error) {
      throw new RepositoryError('Failed to count users in group', 'COUNT_ERROR', error);
    }
  }

  /**
   * Get paginated users in a group.
   */
  async getUsersInGroup(
    groupId: string,
    page = 1,
    pageSize = 20
  ): Promise<{
    data: Pick<User, 'id' | 'username' | 'nickname' | 'avatar' | 'status' | 'memberLevel' | 'createdAt'>[];
    pagination: { page: number; pageSize: number; total: number; totalPages: number };
  }> {
    try {
      const offset = (page - 1) * pageSize;

      const [data, countResult] = await Promise.all([
        this.db.select({
          id: users.id,
          username: users.username,
          nickname: users.nickname,
          avatar: users.avatar,
          status: users.status,
          memberLevel: users.memberLevel,
          createdAt: users.createdAt,
        })
          .from(users)
          .where(eq(users.groupId, groupId))
          .orderBy(desc(users.createdAt))
          .limit(pageSize)
          .offset(offset),
        this.db.select({ count: sql<number>`count(*)` })
          .from(users)
          .where(eq(users.groupId, groupId)),
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
      throw new RepositoryError('Failed to get users in group', 'FIND_ERROR', error);
    }
  }
}
