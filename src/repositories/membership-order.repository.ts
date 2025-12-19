import { eq, and, desc, sql } from 'drizzle-orm';
import { BaseRepository } from './base.repository';
import { membershipOrders, MembershipOrder } from '@/db/schema';
import { RepositoryError } from './errors';

// ============================================
// Input Types
// ============================================

export interface CreateMembershipOrderInput {
  id: string;
  orderNo: string;
  userId: string;
  planId: string;
  memberLevel: 'vip' | 'svip';
  duration: number;
  price: number;
  paymentType?: 'wechat' | 'alipay';
  remarkCode?: string;
}

export interface UpdateMembershipOrderInput {
  status?: 'pending' | 'paid' | 'approved' | 'rejected';
  paymentType?: 'wechat' | 'alipay';
  paymentScreenshot?: string;
  transactionNote?: string;
  reviewedBy?: string;
  reviewedAt?: Date;
  rejectReason?: string;
}

export interface OrderListParams {
  page?: number;
  pageSize?: number;
  status?: ('pending' | 'paid' | 'approved' | 'rejected') | ('pending' | 'paid' | 'approved' | 'rejected')[];
  userId?: string;
  sortBy?: 'createdAt' | 'updatedAt';
  sortOrder?: 'asc' | 'desc';
}


export interface MembershipOrderWithUser extends MembershipOrder {
  user?: {
    id: string;
    username: string;
    nickname: string | null;
  } | null;
}

export interface OrderListResult {
  data: MembershipOrderWithUser[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
}

export class MembershipOrderRepository extends BaseRepository {
  /**
   * Create a new membership order.
   */
  async create(input: CreateMembershipOrderInput): Promise<MembershipOrder> {
    try {
      const [order] = await this.db.insert(membershipOrders).values({
        id: input.id,
        orderNo: input.orderNo,
        userId: input.userId,
        planId: input.planId,
        memberLevel: input.memberLevel,
        duration: input.duration,
        price: input.price,
        status: 'pending',
        paymentType: input.paymentType,
        remarkCode: input.remarkCode,
        updatedAt: new Date(),
      }).returning();
      return order;
    } catch (error: unknown) {
      if (error instanceof Error && error.message.includes('unique constraint')) {
        throw new RepositoryError('Order number already exists', 'DUPLICATE', error);
      }
      throw new RepositoryError('Failed to create membership order', 'CREATE_ERROR', error);
    }
  }

  /**
   * Find a membership order by ID.
   */
  async findById(id: string): Promise<MembershipOrder | null> {
    try {
      const result = await this.db.query.membershipOrders.findFirst({
        where: eq(membershipOrders.id, id),
      });
      return result ?? null;
    } catch (error) {
      throw new RepositoryError('Failed to find membership order by id', 'FIND_ERROR', error);
    }
  }

  /**
   * Find a membership order by order number.
   */
  async findByOrderNo(orderNo: string): Promise<MembershipOrder | null> {
    try {
      const result = await this.db.query.membershipOrders.findFirst({
        where: eq(membershipOrders.orderNo, orderNo),
      });
      return result ?? null;
    } catch (error) {
      throw new RepositoryError('Failed to find membership order by order number', 'FIND_ERROR', error);
    }
  }

  /**
   * Find all orders for a specific user.
   */
  async findByUser(userId: string): Promise<MembershipOrder[]> {
    try {
      return await this.db.query.membershipOrders.findMany({
        where: eq(membershipOrders.userId, userId),
        orderBy: [desc(membershipOrders.createdAt)],
      });
    } catch (error) {
      throw new RepositoryError('Failed to find membership orders by user', 'FIND_ERROR', error);
    }
  }

  /**
   * Find all orders with a specific status.
   */
  async findByStatus(status: 'pending' | 'approved' | 'rejected'): Promise<MembershipOrder[]> {
    try {
      return await this.db.query.membershipOrders.findMany({
        where: eq(membershipOrders.status, status),
        orderBy: [desc(membershipOrders.createdAt)],
      });
    } catch (error) {
      throw new RepositoryError('Failed to find membership orders by status', 'FIND_ERROR', error);
    }
  }

  /**
   * Check if user has a pending order for a specific plan.
   * Used to prevent duplicate pending orders.
   */
  async hasPendingOrder(userId: string, planId: string): Promise<boolean> {
    try {
      const result = await this.db.query.membershipOrders.findFirst({
        where: and(
          eq(membershipOrders.userId, userId),
          eq(membershipOrders.planId, planId),
          eq(membershipOrders.status, 'pending')
        ),
      });
      return result !== undefined;
    } catch (error) {
      throw new RepositoryError('Failed to check for pending order', 'FIND_ERROR', error);
    }
  }

  /**
   * Update an existing membership order.
   * Returns null if order not found.
   */
  async update(id: string, input: UpdateMembershipOrderInput): Promise<MembershipOrder | null> {
    try {
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (input.status !== undefined) updateData.status = input.status;
      if (input.paymentType !== undefined) updateData.paymentType = input.paymentType;
      if (input.paymentScreenshot !== undefined) updateData.paymentScreenshot = input.paymentScreenshot;
      if (input.transactionNote !== undefined) updateData.transactionNote = input.transactionNote;
      if (input.reviewedBy !== undefined) updateData.reviewedBy = input.reviewedBy;
      if (input.reviewedAt !== undefined) updateData.reviewedAt = input.reviewedAt;
      if (input.rejectReason !== undefined) updateData.rejectReason = input.rejectReason;

      const [order] = await this.db.update(membershipOrders)
        .set(updateData)
        .where(eq(membershipOrders.id, id))
        .returning();
      return order ?? null;
    } catch (error) {
      throw new RepositoryError('Failed to update membership order', 'UPDATE_ERROR', error);
    }
  }

  /**
   * Atomic conditional update - only updates if conditions are met.
   * This prevents race conditions in approval flow.
   * Returns null if conditions not met (e.g., status already changed).
   */
  async updateWithCondition(
    id: string,
    conditions: { status?: string[] },
    input: UpdateMembershipOrderInput
  ): Promise<MembershipOrder | null> {
    try {
      const updateData: Record<string, unknown> = {
        updatedAt: new Date(),
      };

      if (input.status !== undefined) updateData.status = input.status;
      if (input.paymentType !== undefined) updateData.paymentType = input.paymentType;
      if (input.paymentScreenshot !== undefined) updateData.paymentScreenshot = input.paymentScreenshot;
      if (input.transactionNote !== undefined) updateData.transactionNote = input.transactionNote;
      if (input.reviewedBy !== undefined) updateData.reviewedBy = input.reviewedBy;
      if (input.reviewedAt !== undefined) updateData.reviewedAt = input.reviewedAt;
      if (input.rejectReason !== undefined) updateData.rejectReason = input.rejectReason;

      const whereConditions = [eq(membershipOrders.id, id)];

      // Add status condition if provided
      if (conditions.status && conditions.status.length > 0) {
        whereConditions.push(
          sql`${membershipOrders.status} IN (${sql.join(conditions.status.map(s => sql`${s}`), sql`, `)})`
        );
      }

      const [order] = await this.db.update(membershipOrders)
        .set(updateData)
        .where(and(...whereConditions))
        .returning();

      return order ?? null;
    } catch (error) {
      throw new RepositoryError('Failed to update membership order with condition', 'UPDATE_ERROR', error);
    }
  }

  /**
   * List orders with pagination and filters.
   */
  async list(params: OrderListParams = {}): Promise<OrderListResult> {
    try {
      const {
        page = 1,
        pageSize = 20,
        status,
        userId,
        sortBy = 'createdAt',
        sortOrder = 'desc',
      } = params;

      const offset = (page - 1) * pageSize;

      // Build where conditions
      const conditions = [];

      if (status) {
        if (Array.isArray(status)) {
          // Multi-status filter using IN clause
          conditions.push(
            sql`${membershipOrders.status} IN (${sql.join(status.map(s => sql`${s}`), sql`, `)})`
          );
        } else {
          conditions.push(eq(membershipOrders.status, status));
        }
      }
      if (userId) {
        conditions.push(eq(membershipOrders.userId, userId));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      // Execute queries in parallel
      const [data, countResult] = await Promise.all([
        this.db.query.membershipOrders.findMany({
          where: whereClause,
          limit: pageSize,
          offset,
          orderBy: sortOrder === 'desc'
            ? [desc(membershipOrders[sortBy])]
            : [membershipOrders[sortBy]],
          with: {
            user: {
              columns: {
                id: true,
                username: true,
                nickname: true,
              },
            },
          },
        }),
        this.db.select({ count: sql<number>`count(*)` })
          .from(membershipOrders)
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
      throw new RepositoryError('Failed to list membership orders', 'LIST_ERROR', error);
    }
  }

  /**
   * Delete an order by ID.
   * Used when rejecting orders - no need to keep unpaid rejected orders.
   */
  async delete(id: string): Promise<void> {
    try {
      await this.db.delete(membershipOrders).where(eq(membershipOrders.id, id));
    } catch (error) {
      throw new RepositoryError('Failed to delete membership order', 'DELETE_ERROR', error);
    }
  }
}
