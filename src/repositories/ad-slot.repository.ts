import { eq, desc } from 'drizzle-orm';
import { BaseRepository } from './base.repository';
import { adSlots, AdSlot, RotationStrategy } from '@/db/schema';
import { RepositoryError, DuplicateError } from './errors';

// ============================================
// Input Types
// ============================================

export interface CreateAdSlotInput {
  id: string;
  name: string;
  position: string;
  width: number;
  height: number;
  rotationStrategy?: RotationStrategy;
  enabled?: boolean;
  // Multi-ad display settings
  displayMode?: 'cover' | 'contain';
  maxVisible?: number;
  carouselInterval?: number;
}

export interface UpdateAdSlotInput {
  name?: string;
  position?: string;
  width?: number;
  height?: number;
  rotationStrategy?: RotationStrategy;
  enabled?: boolean;
  // Multi-ad display settings
  displayMode?: 'cover' | 'contain';
  maxVisible?: number;
  carouselInterval?: number;
}

// ============================================
// AdSlotRepository Implementation
// ============================================

/**
 * Repository for ad slot database operations.
 * Encapsulates all ad slot queries using Drizzle ORM.
 * 
 * Requirements: 2.1
 */
export class AdSlotRepository extends BaseRepository {
  /**
   * Find an ad slot by ID.
   */
  async findById(id: string): Promise<AdSlot | null> {
    try {
      const result = await this.db.query.adSlots.findFirst({
        where: eq(adSlots.id, id),
      });
      return result ?? null;
    } catch (error) {
      throw new RepositoryError('Failed to find ad slot by id', 'FIND_ERROR', error);
    }
  }

  /**
   * Find an ad slot by position.
   * Used for client-side queries to get the slot for a specific page position.
   */
  async findByPosition(position: string): Promise<AdSlot | null> {
    try {
      const result = await this.db.query.adSlots.findFirst({
        where: eq(adSlots.position, position),
      });
      return result ?? null;
    } catch (error) {
      throw new RepositoryError('Failed to find ad slot by position', 'FIND_ERROR', error);
    }
  }

  /**
   * Find all ad slots.
   * Returns slots ordered by creation date (newest first).
   */
  async findAll(): Promise<AdSlot[]> {
    try {
      return await this.db.query.adSlots.findMany({
        orderBy: [desc(adSlots.createdAt)],
      });
    } catch (error) {
      throw new RepositoryError('Failed to find all ad slots', 'FIND_ERROR', error);
    }
  }

  /**
   * Find all enabled ad slots.
   */
  async findEnabled(): Promise<AdSlot[]> {
    try {
      return await this.db.query.adSlots.findMany({
        where: eq(adSlots.enabled, true),
        orderBy: [desc(adSlots.createdAt)],
      });
    } catch (error) {
      throw new RepositoryError('Failed to find enabled ad slots', 'FIND_ERROR', error);
    }
  }

  /**
   * Create a new ad slot.
   */
  async create(input: CreateAdSlotInput): Promise<AdSlot> {
    try {
      const [slot] = await this.db.insert(adSlots).values({
        id: input.id,
        name: input.name,
        position: input.position,
        width: input.width,
        height: input.height,
        rotationStrategy: input.rotationStrategy ?? 'random',
        enabled: input.enabled ?? true,
        // Multi-ad display settings
        displayMode: input.displayMode ?? 'cover',
        maxVisible: input.maxVisible ?? 3,
        carouselInterval: input.carouselInterval ?? 5,
        updatedAt: new Date(),
      }).returning();
      return slot;
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('unique constraint')) {
        throw new DuplicateError('AdSlot', 'position');
      }
      throw new RepositoryError('Failed to create ad slot', 'CREATE_ERROR', error);
    }
  }

  /**
   * Update an existing ad slot.
   * Returns null if slot not found.
   */
  async update(id: string, input: UpdateAdSlotInput): Promise<AdSlot | null> {
    try {
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (input.name !== undefined) updateData.name = input.name;
      if (input.position !== undefined) updateData.position = input.position;
      if (input.width !== undefined) updateData.width = input.width;
      if (input.height !== undefined) updateData.height = input.height;
      if (input.rotationStrategy !== undefined) updateData.rotationStrategy = input.rotationStrategy;
      if (input.enabled !== undefined) updateData.enabled = input.enabled;
      // Multi-ad display settings
      if (input.displayMode !== undefined) updateData.displayMode = input.displayMode;
      if (input.maxVisible !== undefined) updateData.maxVisible = input.maxVisible;
      if (input.carouselInterval !== undefined) updateData.carouselInterval = input.carouselInterval;

      const [slot] = await this.db.update(adSlots)
        .set(updateData)
        .where(eq(adSlots.id, id))
        .returning();
      return slot ?? null;
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('unique constraint')) {
        throw new DuplicateError('AdSlot', 'position');
      }
      throw new RepositoryError('Failed to update ad slot', 'UPDATE_ERROR', error);
    }
  }

  /**
   * Delete an ad slot by ID.
   */
  async delete(id: string): Promise<void> {
    try {
      await this.db.delete(adSlots).where(eq(adSlots.id, id));
    } catch (error) {
      throw new RepositoryError('Failed to delete ad slot', 'DELETE_ERROR', error);
    }
  }
}
