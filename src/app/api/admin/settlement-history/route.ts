/**
 * Admin Settlement History API
 * GET /api/admin/settlement-history - List all settlement records with pagination
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import { db } from '@/db';
import { settlementRecords, agentProfiles, users } from '@/db/schema';
import { desc, eq, sql, and, gte, lte } from 'drizzle-orm';

export async function GET(request: NextRequest) {
    const authResult = await requireAdmin(request);
    if (isAuthError(authResult)) return authResult;

    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
        const userId = searchParams.get('userId');
        const startDate = searchParams.get('startDate');
        const endDate = searchParams.get('endDate');
        const offset = (page - 1) * pageSize;

        // Build where conditions
        const conditions = [];
        if (userId) {
            conditions.push(eq(settlementRecords.userId, userId));
        }
        if (startDate) {
            conditions.push(gte(settlementRecords.createdAt, new Date(startDate)));
        }
        if (endDate) {
            conditions.push(lte(settlementRecords.createdAt, new Date(endDate)));
        }

        const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

        // Get total count
        const [countResult] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(settlementRecords)
            .where(whereClause);
        const total = countResult?.count || 0;

        // Get records with agent info
        const records = await db
            .select({
                id: settlementRecords.id,
                userId: settlementRecords.userId,
                amount: settlementRecords.amount,
                method: settlementRecords.method,
                account: settlementRecords.account,
                transactionId: settlementRecords.transactionId,
                note: settlementRecords.note,
                settledBy: settlementRecords.settledBy,
                createdAt: settlementRecords.createdAt,
            })
            .from(settlementRecords)
            .where(whereClause)
            .orderBy(desc(settlementRecords.createdAt))
            .limit(pageSize)
            .offset(offset);

        // Enrich with agent and admin info
        const enrichedRecords = await Promise.all(
            records.map(async (record) => {
                // Get agent profile
                const agent = await db.query.agentProfiles.findFirst({
                    where: eq(agentProfiles.userId, record.userId),
                    columns: { realName: true, contact: true },
                });

                // Get admin who processed
                let admin = null;
                if (record.settledBy) {
                    admin = await db.query.users.findFirst({
                        where: eq(users.id, record.settledBy),
                        columns: { nickname: true, username: true },
                    });
                }

                return {
                    ...record,
                    agent,
                    admin,
                };
            })
        );

        // Get summary stats
        const [summaryResult] = await db
            .select({
                totalAmount: sql<number>`COALESCE(SUM(${settlementRecords.amount}), 0)::int`,
                totalCount: sql<number>`count(*)::int`,
            })
            .from(settlementRecords)
            .where(whereClause);

        return NextResponse.json({
            data: enrichedRecords,
            total,
            page,
            pageSize,
            summary: {
                totalAmount: summaryResult?.totalAmount || 0,
                totalCount: summaryResult?.totalCount || 0,
            },
        });
    } catch (error) {
        console.error('Failed to get settlement history:', error);
        return NextResponse.json(
            { code: 'INTERNAL_ERROR', message: '获取结算历史失败' },
            { status: 500 }
        );
    }
}
