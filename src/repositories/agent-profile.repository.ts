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
     * List all agent profiles (for admin)
     */
    async list(params: any = {}): Promise<any> {
        try {
            const conditions = [];
            if (params.get('status')) {
                conditions.push(eq(agentProfiles.status, params.get('status')));
            }

            // Simple list for now
            const data = await this.db.query.agentProfiles.findMany({
                where: conditions.length ? and(...conditions) : undefined,
                with: { level: true },
                orderBy: [desc(agentProfiles.createdAt)],
            });

            return { data };
        } catch (error) {
            throw new RepositoryError('Failed to list profiles', 'LIST_ERROR', error);
        }
    }
}
