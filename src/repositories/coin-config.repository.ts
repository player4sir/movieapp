import { eq } from 'drizzle-orm';
import { BaseRepository } from './base.repository';
import { coinConfigs, CoinConfig } from '@/db/schema';
import { RepositoryError } from './errors';

// ============================================
// Input Types
// ============================================

export interface UpsertCoinConfigInput {
  id: string;
  key: string;
  value: unknown;
  description?: string;
  updatedBy?: string;
}

// ============================================
// CoinConfigRepository Implementation
// ============================================

/**
 * Repository for coin system configuration operations.
 * Encapsulates all config queries using Drizzle ORM.
 * 
 * Requirements: 5.1, 5.2, 5.3
 */
export class CoinConfigRepository extends BaseRepository {
  /**
   * Get a config by its key.
   * Returns null if not found.
   */
  async getByKey(key: string): Promise<CoinConfig | null> {
    try {
      const result = await this.db.query.coinConfigs.findFirst({
        where: eq(coinConfigs.key, key),
      });
      return result ?? null;
    } catch (error) {
      throw new RepositoryError('Failed to get config by key', 'FIND_ERROR', error);
    }
  }

  /**
   * Get all configurations.
   */
  async getAll(): Promise<CoinConfig[]> {
    try {
      return await this.db.query.coinConfigs.findMany();
    } catch (error) {
      throw new RepositoryError('Failed to get all configs', 'FIND_ERROR', error);
    }
  }

  /**
   * Create or update a configuration.
   * If the key exists, updates the value; otherwise creates a new config.
   */
  async upsert(input: UpsertCoinConfigInput): Promise<CoinConfig> {
    try {
      const existing = await this.getByKey(input.key);

      if (existing) {
        // Update existing config
        const [config] = await this.db.update(coinConfigs)
          .set({
            value: input.value,
            description: input.description ?? existing.description,
            updatedAt: new Date(),
            updatedBy: input.updatedBy ?? existing.updatedBy,
          })
          .where(eq(coinConfigs.key, input.key))
          .returning();
        return config;
      } else {
        // Create new config
        const [config] = await this.db.insert(coinConfigs).values({
          id: input.id,
          key: input.key,
          value: input.value,
          description: input.description ?? '',
          updatedAt: new Date(),
          updatedBy: input.updatedBy ?? null,
        }).returning();
        return config;
      }
    } catch (error) {
      throw new RepositoryError('Failed to upsert config', 'UPSERT_ERROR', error);
    }
  }

  /**
   * Delete a configuration by key.
   */
  async deleteByKey(key: string): Promise<void> {
    try {
      await this.db.delete(coinConfigs).where(eq(coinConfigs.key, key));
    } catch (error) {
      throw new RepositoryError('Failed to delete config', 'DELETE_ERROR', error);
    }
  }
}
