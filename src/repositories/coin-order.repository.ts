import { coinOrders, NewCoinOrder, CoinOrder } from '@/db/schema';
import { eq, and, desc, sql } from 'drizzle-orm';
import { BaseRepository } from './base.repository';

// Define pagination types locally
export interface PaginationParams {
    page: number;
    pageSize: number;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
}

export interface PaginationResult<T> {
    data: T[];
    pagination: {
        page: number;
        pageSize: number;
        total: number;
        totalPages: number;
    };
}

export class CoinOrderRepository extends BaseRepository {
    constructor() {
        super();
    }

    async create(data: NewCoinOrder): Promise<CoinOrder> {
        const [order] = await this.db.insert(coinOrders).values(data).returning();
        return order;
    }

    async update(id: string, data: Partial<NewCoinOrder>): Promise<CoinOrder | undefined> {
        const [order] = await this.db
            .update(coinOrders)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(coinOrders.id, id))
            .returning();
        return order;
    }

    /**
     * Atomic conditional update - only updates if conditions are met.
     * This prevents race conditions in approval flow.
     * Returns undefined if conditions not met (e.g., status already changed).
     */
    async updateWithCondition(
        id: string,
        conditions: { status?: string[] },
        data: Partial<NewCoinOrder>
    ): Promise<CoinOrder | undefined> {
        const whereConditions = [eq(coinOrders.id, id)];

        // Add status condition if provided
        if (conditions.status && conditions.status.length > 0) {
            // Use SQL IN clause for multiple possible statuses
            whereConditions.push(
                sql`${coinOrders.status} IN (${sql.join(conditions.status.map(s => sql`${s}`), sql`, `)})`
            );
        }

        const [order] = await this.db
            .update(coinOrders)
            .set({ ...data, updatedAt: new Date() })
            .where(and(...whereConditions))
            .returning();

        return order; // undefined if no rows matched (condition not met)
    }

    async findById(id: string): Promise<CoinOrder | undefined> {
        return this.db.query.coinOrders.findFirst({
            where: eq(coinOrders.id, id),
        });
    }

    async findByOrderNo(orderNo: string): Promise<CoinOrder | undefined> {
        return this.db.query.coinOrders.findFirst({
            where: eq(coinOrders.orderNo, orderNo),
        });
    }

    async findByUserId(userId: string): Promise<CoinOrder[]> {
        return this.db.query.coinOrders.findMany({
            where: eq(coinOrders.userId, userId),
            orderBy: desc(coinOrders.createdAt),
        });
    }

    async hasPendingOrder(userId: string): Promise<boolean> {
        const result = await this.db.query.coinOrders.findFirst({
            where: and(
                eq(coinOrders.userId, userId),
                eq(coinOrders.status, 'pending')
            ),
        });
        return !!result;
    }

    async list(params: PaginationParams & {
        userId?: string;
        status?: 'pending' | 'paid' | 'approved' | 'rejected';
        orderNo?: string;
    }): Promise<PaginationResult<CoinOrder>> {
        const conditions = [];

        if (params.userId) {
            conditions.push(eq(coinOrders.userId, params.userId));
        }

        if (params.status) {
            conditions.push(eq(coinOrders.status, params.status));
        }

        if (params.orderNo) {
            conditions.push(eq(coinOrders.orderNo, params.orderNo));
        }

        const where = conditions.length > 0 ? and(...conditions) : undefined;

        // Safety check for sortBy field
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const sortField = (params.sortBy && (coinOrders as any)[params.sortBy]) ? (coinOrders as any)[params.sortBy] : coinOrders.createdAt;
        const orderBy = params.sortOrder === 'asc' ? sortField : desc(sortField);

        const [countResult] = await this.db
            .select({ count: sql<number>`count(*)` })
            .from(coinOrders)
            .where(where);

        const data = await this.db.query.coinOrders.findMany({
            where,
            limit: params.pageSize,
            offset: (params.page - 1) * params.pageSize,
            orderBy,
        });

        return {
            data,
            pagination: {
                page: params.page,
                pageSize: params.pageSize,
                total: Number(countResult.count),
                totalPages: Math.ceil(Number(countResult.count) / params.pageSize),
            },
        };
    }
}
