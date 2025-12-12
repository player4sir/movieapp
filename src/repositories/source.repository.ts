import { eq, asc } from 'drizzle-orm';
import { BaseRepository } from './base.repository';
import { videoSources, VideoSource } from '@/db/schema';
import { DuplicateError, RepositoryError } from './errors';

// ============================================
// Input Types
// ============================================

export type SourceCategory = 'normal' | 'adult';

export interface CreateVideoSourceInput {
  id: string;
  name: string;
  category?: SourceCategory;
  apiUrl: string;
  timeout?: number;
  retries?: number;
  enabled?: boolean;
  priority?: number;
}

export interface UpdateVideoSourceInput {
  name?: string;
  category?: SourceCategory;
  apiUrl?: string;
  timeout?: number;
  retries?: number;
  enabled?: boolean;
  priority?: number;
}

export interface UpdateTestResultInput {
  lastTestAt: Date;
  lastTestResult: boolean;
  lastTestResponseTime?: number;
}

export interface ReorderInput {
  id: string;
  priority: number;
}

// ============================================
// VideoSourceRepository Implementation
// ============================================

/**
 * Repository for video source database operations.
 * Encapsulates all video source queries using Drizzle ORM.
 * 
 * Requirements: 5.5
 */
export class VideoSourceRepository extends BaseRepository {
  /**
   * Find a video source by ID.
   */
  async findById(id: string): Promise<VideoSource | null> {
    try {
      const result = await this.db.query.videoSources.findFirst({
        where: eq(videoSources.id, id),
      });
      return result ?? null;
    } catch (error) {
      throw new RepositoryError('Failed to find video source by id', 'FIND_ERROR', error);
    }
  }

  /**
   * Find all video sources ordered by priority.
   */
  async findAll(): Promise<VideoSource[]> {
    try {
      return await this.db.query.videoSources.findMany({
        orderBy: [asc(videoSources.priority)],
      });
    } catch (error) {
      throw new RepositoryError('Failed to find all video sources', 'FIND_ERROR', error);
    }
  }

  /**
   * Find all enabled video sources ordered by priority.
   */
  async findEnabled(): Promise<VideoSource[]> {
    try {
      return await this.db.query.videoSources.findMany({
        where: eq(videoSources.enabled, true),
        orderBy: [asc(videoSources.priority)],
      });
    } catch (error) {
      throw new RepositoryError('Failed to find enabled video sources', 'FIND_ERROR', error);
    }
  }

  /**
   * Create a new video source.
   */
  async create(input: CreateVideoSourceInput): Promise<VideoSource> {
    try {
      const [source] = await this.db.insert(videoSources).values({
        id: input.id,
        name: input.name,
        category: input.category ?? 'normal',
        apiUrl: input.apiUrl,
        timeout: input.timeout ?? 10000,
        retries: input.retries ?? 3,
        enabled: input.enabled ?? true,
        priority: input.priority ?? 0,
        updatedAt: new Date(),
      }).returning();
      return source;
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('unique constraint')) {
        throw new DuplicateError('VideoSource', 'name');
      }
      throw new RepositoryError('Failed to create video source', 'CREATE_ERROR', error);
    }
  }

  /**
   * Update an existing video source.
   * Returns null if source not found.
   */
  async update(id: string, input: UpdateVideoSourceInput): Promise<VideoSource | null> {
    try {
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (input.name !== undefined) updateData.name = input.name;
      if (input.category !== undefined) updateData.category = input.category;
      if (input.apiUrl !== undefined) updateData.apiUrl = input.apiUrl;
      if (input.timeout !== undefined) updateData.timeout = input.timeout;
      if (input.retries !== undefined) updateData.retries = input.retries;
      if (input.enabled !== undefined) updateData.enabled = input.enabled;
      if (input.priority !== undefined) updateData.priority = input.priority;

      const [source] = await this.db.update(videoSources)
        .set(updateData)
        .where(eq(videoSources.id, id))
        .returning();
      return source ?? null;
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('unique constraint')) {
        throw new DuplicateError('VideoSource', 'name');
      }
      throw new RepositoryError('Failed to update video source', 'UPDATE_ERROR', error);
    }
  }

  /**
   * Delete a video source by ID.
   */
  async delete(id: string): Promise<void> {
    try {
      await this.db.delete(videoSources).where(eq(videoSources.id, id));
    } catch (error) {
      throw new RepositoryError('Failed to delete video source', 'DELETE_ERROR', error);
    }
  }

  /**
   * Update test result for a video source.
   */
  async updateTestResult(id: string, input: UpdateTestResultInput): Promise<VideoSource | null> {
    try {
      const updateData: Record<string, unknown> = {
        lastTestAt: input.lastTestAt,
        lastTestResult: input.lastTestResult,
        updatedAt: new Date(),
      };

      if (input.lastTestResponseTime !== undefined) {
        updateData.lastTestResponseTime = input.lastTestResponseTime;
      }

      const [source] = await this.db.update(videoSources)
        .set(updateData)
        .where(eq(videoSources.id, id))
        .returning();
      return source ?? null;
    } catch (error) {
      throw new RepositoryError('Failed to update test result', 'UPDATE_ERROR', error);
    }
  }

  /**
   * Reorder video sources by updating their priorities.
   * Accepts an array of {id, priority} pairs.
   */
  async reorder(items: ReorderInput[]): Promise<void> {
    try {
      // Use a transaction to ensure all updates succeed or fail together
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await this.db.transaction(async (tx: any) => {
        for (const item of items) {
          await tx.update(videoSources)
            .set({ priority: item.priority, updatedAt: new Date() })
            .where(eq(videoSources.id, item.id));
        }
      });
    } catch (error) {
      throw new RepositoryError('Failed to reorder video sources', 'UPDATE_ERROR', error);
    }
  }
}
