import { eq, sql, and, desc } from 'drizzle-orm';
import { BaseRepository } from './base.repository';
import { agentProfiles, AgentProfile, NewAgentProfile } from '@/db/schema';
import { RepositoryError } from './errors';

export class AgentProfileRepository extends BaseRepository {
    /**
     * Find agent profile by User ID
     */
    async findByUserId(userId: string): Promise<AgentProfile | null> {
        try {
            const profile = await this.db.query.agentProfiles.findFirst({
                where: eq(agentProfiles.userId, userId),
                with: { level: true },
            });
            return profile ?? null;
        } catch (error) {
            throw new RepositoryError('Failed to find agent profile', 'FIND_ERROR', error);
        }
    }

    /**
     * Create new agent profile
     */
    async create(input: NewAgentProfile): Promise<AgentProfile> {
        try {
            const [profile] = await this.db.insert(agentProfiles)
                .values(input)
                .returning();
            return profile;
        } catch (error) {
            throw new RepositoryError('Failed to create agent profile', 'CREATE_ERROR', error);
        }
    }

    /**
     * Update agent profile
     */
    async update(userId: string, data: Partial<AgentProfile>): Promise<AgentProfile | null> {
        const [updated] = await this.db
            .update(agentProfiles)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(agentProfiles.userId, userId))
            .returning();
        return updated || null;
    }

    async updatePaymentInfo(
        userId: string,
        info: { paymentMethod: 'alipay' | 'wechat' | 'bank' | 'kangxun'; paymentAccount: string; realName: string }
    ): Promise<AgentProfile | null> {
        return this.update(userId, info);
    }

    /**
     * Increment agent income and balance (atomic update)
     */
    async addIncome(userId: string, amount: number): Promise<void> {
        try {
            await this.db.update(agentProfiles)
                .set({
                    totalIncome: sql`${agentProfiles.totalIncome} + ${amount}`,
                    balance: sql`${agentProfiles.balance} + ${amount}`,
                    updatedAt: new Date(),
                })
                .where(eq(agentProfiles.userId, userId));
        } catch (error) {
            throw new RepositoryError('Failed to add income', 'UPDATE_ERROR', error);
        }
    }

    /**
     * Deduct balance (for settlement)
     * Only affects balance, not totalIncome
     */
    async deductBalance(userId: string, amount: number): Promise<void> {
        try {
            await this.db.update(agentProfiles)
                .set({
                    balance: sql`${agentProfiles.balance} - ${amount}`,
                    updatedAt: new Date(),
                })
                .where(eq(agentProfiles.userId, userId));
        } catch (error) {
            throw new RepositoryError('Failed to deduct balance', 'UPDATE_ERROR', error);
        }
    }

    /**
     * Delete agent profile by User ID
     */
    async delete(userId: string): Promise<boolean> {
        try {
            const result = await this.db.delete(agentProfiles)
                .where(eq(agentProfiles.userId, userId))
                .returning();
            return result.length > 0;
        } catch (error) {
            throw new RepositoryError('Failed to delete agent profile', 'DELETE_ERROR', error);
        }
    }

    /**
     * List all agent profiles (for admin)
     */
    async list(params: URLSearchParams | Record<string, string> = {}): Promise<any> {
        try {

            // Support both URLSearchParams and plain object
            const getParam = (key: string): string | null => {
                if (params instanceof URLSearchParams) {
                    return params.get(key);
                }
                return (params as Record<string, string>)[key] || null;
            };

            const status = getParam('status') as 'pending' | 'active' | 'rejected' | 'disabled' | null;

            // Simple list for now
            const data = await this.db.query.agentProfiles.findMany({
                where: status ? eq(agentProfiles.status, status) : undefined,
                with: { level: true },
                orderBy: [desc(agentProfiles.createdAt)],
            });

            return { data };
        } catch (error) {
            throw new RepositoryError('Failed to list profiles', 'LIST_ERROR', error);
        }
    }

    /**
     * Find agent profile by agent code (for invitation)
     */
    async findByAgentCode(agentCode: string): Promise<AgentProfile | null> {
        try {
            const profile = await this.db.query.agentProfiles.findFirst({
                where: eq(agentProfiles.agentCode, agentCode),
                with: { level: true },
            });
            return profile ?? null;
        } catch (error) {
            throw new RepositoryError('Failed to find agent by code', 'FIND_ERROR', error);
        }
    }

    /**
     * Get sub agents (direct children) of an agent
     */
    async getSubAgents(parentAgentId: string): Promise<AgentProfile[]> {
        try {
            const data = await this.db.query.agentProfiles.findMany({
                where: and(
                    eq(agentProfiles.parentAgentId, parentAgentId),
                    eq(agentProfiles.status, 'active')
                ),
                with: { level: true },
                orderBy: [desc(agentProfiles.createdAt)],
            });
            return data;
        } catch (error) {
            throw new RepositoryError('Failed to get sub agents', 'FIND_ERROR', error);
        }
    }

    /**
     * Count total team size (all levels of sub agents)
     */
    async getTeamCount(agentId: string): Promise<{ direct: number; total: number }> {
        try {
            // Direct sub-agents
            const directResult = await this.db
                .select({ count: sql<number>`count(*)::int` })
                .from(agentProfiles)
                .where(and(
                    eq(agentProfiles.parentAgentId, agentId),
                    eq(agentProfiles.status, 'active')
                ));

            // All sub-agents (level1 or level2 = agentId)
            const totalResult = await this.db
                .select({ count: sql<number>`count(*)::int` })
                .from(agentProfiles)
                .where(and(
                    sql`(${agentProfiles.parentAgentId} = ${agentId} OR ${agentProfiles.level1AgentId} = ${agentId} OR ${agentProfiles.level2AgentId} = ${agentId})`,
                    eq(agentProfiles.status, 'active')
                ));

            return {
                direct: directResult[0]?.count ?? 0,
                total: totalResult[0]?.count ?? 0,
            };
        } catch (error) {
            throw new RepositoryError('Failed to get team count', 'FIND_ERROR', error);
        }
    }

    /**
     * Update sub-agent commission rate
     */
    async updateSubAgentRate(userId: string, subAgentRate: number): Promise<AgentProfile | null> {
        return this.update(userId, { subAgentRate });
    }
}
