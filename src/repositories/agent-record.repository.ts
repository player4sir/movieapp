import { eq, and, desc, asc, ilike, sql } from 'drizzle-orm';
import { BaseRepository } from './base.repository';
import { agentRecords, agentLevels, AgentRecord, AgentLevel } from '@/db/schema';
import { RepositoryError } from './errors';

// ============================================
// Input Types
// ============================================

export interface CreateAgentRecordInput {
    id: string;
    agentName: string;
    agentContact?: string;
    levelId: string;
    month: string;
    recruitCount?: number;
    dailySales?: number;
    totalSales?: number;
    commissionAmount?: number;
    bonusAmount?: number;
    totalEarnings?: number;
    status?: 'pending' | 'settled';
    note?: string;
}

export interface UpdateAgentRecordInput {
    agentName?: string;
    agentContact?: string;
    levelId?: string;
    month?: string;
    recruitCount?: number;
    dailySales?: number;
    totalSales?: number;
    commissionAmount?: number;
    bonusAmount?: number;
    totalEarnings?: number;
    status?: 'pending' | 'settled';
    note?: string;
}

export interface AgentRecordListParams {
    page?: number;
    pageSize?: number;
    month?: string;
    levelId?: string;
    status?: 'pending' | 'settled';
    search?: string;
    sortBy?: 'createdAt' | 'agentName' | 'totalSales' | 'totalEarnings';
    sortOrder?: 'asc' | 'desc';
}

export interface AgentRecordListResult {
    data: (AgentRecord & { level: AgentLevel })[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
}

export interface AgentReportSummary {
    totalAgents: number;
    totalSales: number;
    totalCommission: number;
    totalBonus: number;
    totalEarnings: number;
    byLevel: {
        levelId: string;
        levelName: string;
        count: number;
        sales: number;
        commission: number;
        bonus: number;
    }[];
}

// ============================================
// AgentRecordRepository Implementation
// ============================================

export class AgentRecordRepository extends BaseRepository {
    /**
     * Find agent record by ID with level
     */
    async findById(id: string): Promise<(AgentRecord & { level: AgentLevel }) | null> {
        try {
            const result = await this.db.query.agentRecords.findFirst({
                where: eq(agentRecords.id, id),
                with: { level: true },
            });
            return result ?? null;
        } catch (error) {
            throw new RepositoryError('Failed to find agent record by id', 'FIND_ERROR', error);
        }
    }

    /**
     * List agent records with pagination and filters
     */
    async list(params: AgentRecordListParams = {}): Promise<AgentRecordListResult> {
        try {
            const {
                page = 1,
                pageSize = 20,
                month,
                levelId,
                status,
                search,
                sortBy = 'createdAt',
                sortOrder = 'desc',
            } = params;

            const offset = (page - 1) * pageSize;
            const conditions = [];

            if (month) {
                conditions.push(eq(agentRecords.month, month));
            }
            if (levelId) {
                conditions.push(eq(agentRecords.levelId, levelId));
            }
            if (status) {
                conditions.push(eq(agentRecords.status, status));
            }
            if (search) {
                conditions.push(ilike(agentRecords.agentName, `%${search}%`));
            }

            const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
            const orderFn = sortOrder === 'asc' ? asc : desc;

            // Get the correct column for sorting
            const getSortColumn = (sortField: string) => {
                switch (sortField) {
                    case 'agentName': return agentRecords.agentName;
                    case 'totalSales': return agentRecords.totalSales;
                    case 'totalEarnings': return agentRecords.totalEarnings;
                    case 'createdAt':
                    default: return agentRecords.createdAt;
                }
            };

            const [data, countResult] = await Promise.all([
                this.db.query.agentRecords.findMany({
                    where: whereClause,
                    with: { level: true },
                    limit: pageSize,
                    offset,
                    orderBy: [orderFn(getSortColumn(sortBy))],
                }),
                this.db.select({ count: sql<number>`count(*)` })
                    .from(agentRecords)
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
            throw new RepositoryError('Failed to list agent records', 'LIST_ERROR', error);
        }
    }

    /**
     * Create a new agent record
     */
    async create(input: CreateAgentRecordInput): Promise<AgentRecord> {
        try {
            const [record] = await this.db.insert(agentRecords).values({
                id: input.id,
                agentName: input.agentName,
                agentContact: input.agentContact ?? '',
                levelId: input.levelId,
                month: input.month,
                recruitCount: input.recruitCount ?? 0,
                dailySales: input.dailySales ?? 0,
                totalSales: input.totalSales ?? 0,
                commissionAmount: input.commissionAmount ?? 0,
                bonusAmount: input.bonusAmount ?? 0,
                totalEarnings: input.totalEarnings ?? 0,
                status: input.status ?? 'pending',
                note: input.note ?? '',
                updatedAt: new Date(),
            }).returning();
            return record;
        } catch (error) {
            throw new RepositoryError('Failed to create agent record', 'CREATE_ERROR', error);
        }
    }

    /**
     * Update an agent record
     */
    async update(id: string, input: UpdateAgentRecordInput): Promise<AgentRecord | null> {
        try {
            const updateData: Record<string, unknown> = {
                updatedAt: new Date(),
            };

            if (input.agentName !== undefined) updateData.agentName = input.agentName;
            if (input.agentContact !== undefined) updateData.agentContact = input.agentContact;
            if (input.levelId !== undefined) updateData.levelId = input.levelId;
            if (input.month !== undefined) updateData.month = input.month;
            if (input.recruitCount !== undefined) updateData.recruitCount = input.recruitCount;
            if (input.dailySales !== undefined) updateData.dailySales = input.dailySales;
            if (input.totalSales !== undefined) updateData.totalSales = input.totalSales;
            if (input.commissionAmount !== undefined) updateData.commissionAmount = input.commissionAmount;
            if (input.bonusAmount !== undefined) updateData.bonusAmount = input.bonusAmount;
            if (input.totalEarnings !== undefined) updateData.totalEarnings = input.totalEarnings;
            if (input.status !== undefined) updateData.status = input.status;
            if (input.note !== undefined) updateData.note = input.note;

            const [record] = await this.db.update(agentRecords)
                .set(updateData)
                .where(eq(agentRecords.id, id))
                .returning();
            return record ?? null;
        } catch (error) {
            throw new RepositoryError('Failed to update agent record', 'UPDATE_ERROR', error);
        }
    }

    /**
     * Delete an agent record
     */
    async delete(id: string): Promise<void> {
        try {
            await this.db.delete(agentRecords).where(eq(agentRecords.id, id));
        } catch (error) {
            throw new RepositoryError('Failed to delete agent record', 'DELETE_ERROR', error);
        }
    }

    /**
     * Get report summary for a specific month
     */
    async getReportSummary(month: string): Promise<AgentReportSummary> {
        try {
            const records = await this.db.query.agentRecords.findMany({
                where: eq(agentRecords.month, month),
                with: { level: true },
            });

            const levels = await this.db.query.agentLevels.findMany({
                orderBy: [asc(agentLevels.sortOrder)],
            });

            // Calculate totals
            let totalSales = 0;
            let totalCommission = 0;
            let totalBonus = 0;
            let totalEarnings = 0;

            const levelMap = new Map<string, { count: number; sales: number; commission: number; bonus: number }>();

            for (const record of records) {
                totalSales += record.totalSales;
                totalCommission += record.commissionAmount;
                totalBonus += record.bonusAmount;
                totalEarnings += record.totalEarnings;

                const levelStats = levelMap.get(record.levelId) ?? { count: 0, sales: 0, commission: 0, bonus: 0 };
                levelStats.count++;
                levelStats.sales += record.totalSales;
                levelStats.commission += record.commissionAmount;
                levelStats.bonus += record.bonusAmount;
                levelMap.set(record.levelId, levelStats);
            }

            const byLevel = levels.map((level: AgentLevel) => {
                const stats = levelMap.get(level.id) ?? { count: 0, sales: 0, commission: 0, bonus: 0 };
                return {
                    levelId: level.id,
                    levelName: level.name,
                    count: stats.count,
                    sales: stats.sales,
                    commission: stats.commission,
                    bonus: stats.bonus,
                };
            });

            return {
                totalAgents: records.length,
                totalSales,
                totalCommission,
                totalBonus,
                totalEarnings,
                byLevel,
            };
        } catch (error) {
            throw new RepositoryError('Failed to get report summary', 'QUERY_ERROR', error);
        }
    }

    /**
     * Get all unique months that have records
     */
    async getAvailableMonths(): Promise<string[]> {
        try {
            const result = await this.db
                .selectDistinct({ month: agentRecords.month })
                .from(agentRecords)
                .orderBy(desc(agentRecords.month));
            return result.map((r: { month: string }) => r.month);
        } catch (error) {
            throw new RepositoryError('Failed to get available months', 'QUERY_ERROR', error);
        }
    }
}
