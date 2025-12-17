import { eq, desc, asc } from 'drizzle-orm';
import { BaseRepository } from './base.repository';
import { agentLevels, AgentLevel } from '@/db/schema';
import { RepositoryError } from './errors';

// ============================================
// Input Types
// ============================================

export interface CreateAgentLevelInput {
    id: string;
    name: string;
    sortOrder?: number;
    recruitRequirement?: string;
    dailyPerformance?: number;
    commissionRate?: number;
    hasBonus?: boolean;
    bonusRate?: number;
    enabled?: boolean;
}

export interface UpdateAgentLevelInput {
    name?: string;
    sortOrder?: number;
    recruitRequirement?: string;
    dailyPerformance?: number;
    commissionRate?: number;
    hasBonus?: boolean;
    bonusRate?: number;
    enabled?: boolean;
}

// ============================================
// AgentLevelRepository Implementation
// ============================================

export class AgentLevelRepository extends BaseRepository {
    /**
     * Find all agent levels, ordered by sortOrder
     */
    async findAll(): Promise<AgentLevel[]> {
        try {
            return await this.db.query.agentLevels.findMany({
                orderBy: [asc(agentLevels.sortOrder)],
            });
        } catch (error) {
            throw new RepositoryError('Failed to find agent levels', 'FIND_ERROR', error);
        }
    }

    /**
     * Find enabled agent levels only
     */
    async findEnabled(): Promise<AgentLevel[]> {
        try {
            return await this.db.query.agentLevels.findMany({
                where: eq(agentLevels.enabled, true),
                orderBy: [asc(agentLevels.sortOrder)],
            });
        } catch (error) {
            throw new RepositoryError('Failed to find enabled agent levels', 'FIND_ERROR', error);
        }
    }

    /**
     * Find agent level by ID
     */
    async findById(id: string): Promise<AgentLevel | null> {
        try {
            const result = await this.db.query.agentLevels.findFirst({
                where: eq(agentLevels.id, id),
            });
            return result ?? null;
        } catch (error) {
            throw new RepositoryError('Failed to find agent level by id', 'FIND_ERROR', error);
        }
    }

    /**
     * Create a new agent level
     */
    async create(input: CreateAgentLevelInput): Promise<AgentLevel> {
        try {
            const [level] = await this.db.insert(agentLevels).values({
                id: input.id,
                name: input.name,
                sortOrder: input.sortOrder ?? 0,
                recruitRequirement: input.recruitRequirement ?? '',
                dailyPerformance: input.dailyPerformance ?? 0,
                commissionRate: input.commissionRate ?? 1000,
                hasBonus: input.hasBonus ?? false,
                bonusRate: input.bonusRate ?? 0,
                enabled: input.enabled ?? true,
                updatedAt: new Date(),
            }).returning();
            return level;
        } catch (error) {
            throw new RepositoryError('Failed to create agent level', 'CREATE_ERROR', error);
        }
    }

    /**
     * Update an agent level
     */
    async update(id: string, input: UpdateAgentLevelInput): Promise<AgentLevel | null> {
        try {
            const updateData: Record<string, unknown> = {
                updatedAt: new Date(),
            };

            if (input.name !== undefined) updateData.name = input.name;
            if (input.sortOrder !== undefined) updateData.sortOrder = input.sortOrder;
            if (input.recruitRequirement !== undefined) updateData.recruitRequirement = input.recruitRequirement;
            if (input.dailyPerformance !== undefined) updateData.dailyPerformance = input.dailyPerformance;
            if (input.commissionRate !== undefined) updateData.commissionRate = input.commissionRate;
            if (input.hasBonus !== undefined) updateData.hasBonus = input.hasBonus;
            if (input.bonusRate !== undefined) updateData.bonusRate = input.bonusRate;
            if (input.enabled !== undefined) updateData.enabled = input.enabled;

            const [level] = await this.db.update(agentLevels)
                .set(updateData)
                .where(eq(agentLevels.id, id))
                .returning();
            return level ?? null;
        } catch (error) {
            throw new RepositoryError('Failed to update agent level', 'UPDATE_ERROR', error);
        }
    }

    /**
     * Delete an agent level
     */
    async delete(id: string): Promise<void> {
        try {
            await this.db.delete(agentLevels).where(eq(agentLevels.id, id));
        } catch (error) {
            throw new RepositoryError('Failed to delete agent level', 'DELETE_ERROR', error);
        }
    }
}
