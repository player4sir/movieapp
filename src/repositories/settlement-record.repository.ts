
import { BaseRepository } from './base.repository';
import {
    settlementRecords,
    SettlementRecord,
    NewSettlementRecord,
} from '@/db/schema';
import { eq, desc, and, count } from 'drizzle-orm';

export interface CreateSettlementRecordInput extends NewSettlementRecord { }

export interface SettlementRecordListParams {
    userId?: string;
    page?: number;
    pageSize?: number;
}

export interface SettlementRecordListResult {
    data: SettlementRecord[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
}

export class SettlementRecordRepository extends BaseRepository {
    /**
     * Create a new settlement record
     */
    async create(input: CreateSettlementRecordInput): Promise<SettlementRecord> {
        const [record] = await this.db.insert(settlementRecords).values(input).returning();
        return record;
    }

    /**
     * Find settlement record by ID
     */
    async findById(id: string): Promise<SettlementRecord | null> {
        return this.db.query.settlementRecords.findFirst({
            where: eq(settlementRecords.id, id),
        }) || null;
    }

    /**
     * List settlement records with pagination
     */
    async list(params: SettlementRecordListParams): Promise<SettlementRecordListResult> {
        const { userId, page = 1, pageSize = 20 } = params;
        const offset = (page - 1) * pageSize;

        const whereConditions = [];
        if (userId) {
            whereConditions.push(eq(settlementRecords.userId, userId));
        }

        const where = whereConditions.length > 0 ? and(...whereConditions) : undefined;

        const data = await this.db.query.settlementRecords.findMany({
            where,
            limit: pageSize,
            offset,
            orderBy: [desc(settlementRecords.createdAt)],
        });

        // Get total count
        const totalResult = await this.db
            .select({ count: count() })
            .from(settlementRecords)
            .where(where);

        const total = Number(totalResult[0]?.count || 0);

        return {
            data,
            pagination: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize),
            },
        };
    }
}
