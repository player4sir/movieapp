/**
 * Admin Agent Detail API
 * GET /api/admin/agent-detail/[userId] - Get detailed info for a specific agent
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import { db } from '@/db';
import { agentProfiles, agentLevels, agentRecords, users, settlementRecords } from '@/db/schema';
import { eq, desc, sql, and, gte } from 'drizzle-orm';

export async function GET(
    request: NextRequest,
    { params }: { params: Promise<{ userId: string }> }
) {
    const authResult = await requireAdmin(request);
    if (isAuthError(authResult)) return authResult;

    const { userId } = await params;

    try {
        // Get agent profile with level
        const profile = await db.query.agentProfiles.findFirst({
            where: eq(agentProfiles.userId, userId),
            with: { level: true },
        });

        if (!profile) {
            return NextResponse.json(
                { code: 'NOT_FOUND', message: '代理商不存在' },
                { status: 404 }
            );
        }

        // Get user info
        const user = await db.query.users.findFirst({
            where: eq(users.id, userId),
            columns: { nickname: true, username: true, createdAt: true },
        });

        // Get recent records (last 6 months)
        const records = await db
            .select()
            .from(agentRecords)
            .where(eq(agentRecords.userId, userId))
            .orderBy(desc(agentRecords.month))
            .limit(6);

        // Get referral count (下级代理/用户数量)
        const [referralCount] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(users)
            .where(eq(users.referredBy, userId));

        // Get recent referrals (最近推荐的用户)
        const recentReferrals = await db
            .select({
                id: users.id,
                nickname: users.nickname,
                username: users.username,
                memberLevel: users.memberLevel,
                createdAt: users.createdAt,
            })
            .from(users)
            .where(eq(users.referredBy, userId))
            .orderBy(desc(users.createdAt))
            .limit(10);

        // Get settlement history
        const [settlementStats] = await db
            .select({
                totalSettled: sql<number>`COALESCE(SUM(${settlementRecords.amount}), 0)::int`,
                settlementCount: sql<number>`count(*)::int`,
            })
            .from(settlementRecords)
            .where(eq(settlementRecords.userId, userId));

        // Get recent settlements
        const recentSettlements = await db
            .select()
            .from(settlementRecords)
            .where(eq(settlementRecords.userId, userId))
            .orderBy(desc(settlementRecords.createdAt))
            .limit(5);

        return NextResponse.json({
            profile: {
                ...profile,
                user,
            },
            stats: {
                totalReferrals: referralCount?.count || 0,
                totalSettled: settlementStats?.totalSettled || 0,
                settlementCount: settlementStats?.settlementCount || 0,
                pendingBalance: profile.balance,
            },
            records,
            recentReferrals,
            recentSettlements,
        });
    } catch (error) {
        console.error('Failed to get agent detail:', error);
        return NextResponse.json(
            { code: 'INTERNAL_ERROR', message: '获取代理商详情失败' },
            { status: 500 }
        );
    }
}
