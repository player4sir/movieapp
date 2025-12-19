import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-middleware';
import { db } from '@/db';
import { users, agentRecords, agentProfiles } from '@/db/schema';
import { eq, and, gte, sql } from 'drizzle-orm';

/**
 * GET /api/user/agent/stats
 * Returns monthly statistics for the current agent
 */
export async function GET(req: NextRequest) {
    const authResult = await requireAuth(req);
    if (isAuthError(authResult)) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { user } = authResult;
    const userId = user.id;

    try {
        // Check if user is an active agent
        const profile = await db.query.agentProfiles.findFirst({
            where: eq(agentProfiles.userId, userId),
        });

        if (!profile || profile.status !== 'active') {
            return NextResponse.json({ message: 'Not an active agent' }, { status: 403 });
        }

        // Get current month in YYYY-MM format
        const now = new Date();
        const currentMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

        // Get start of current month
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        // 1. Count new referrals this month
        const [referralCountResult] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(users)
            .where(
                and(
                    eq(users.referredBy, userId),
                    gte(users.createdAt, monthStart)
                )
            );
        const newReferralsThisMonth = referralCountResult?.count || 0;

        // 2. Get total referrals
        const [totalReferralResult] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(users)
            .where(eq(users.referredBy, userId));
        const totalReferrals = totalReferralResult?.count || 0;

        // 3. Get monthly record for commission stats
        const monthlyRecord = await db.query.agentRecords.findFirst({
            where: and(
                eq(agentRecords.userId, userId),
                eq(agentRecords.month, currentMonth)
            ),
        });

        // 4. Get all-time records for historical stats
        const allRecords = await db.query.agentRecords.findMany({
            where: eq(agentRecords.userId, userId),
            orderBy: (records, { desc }) => [desc(records.month)],
            limit: 12, // Last 12 months
        });

        return NextResponse.json({
            data: {
                currentMonth,
                // This month stats
                thisMonth: {
                    newReferrals: newReferralsThisMonth,
                    recruitCount: monthlyRecord?.recruitCount || 0,
                    totalSales: monthlyRecord?.totalSales || 0, // in yuan
                    commissionAmount: monthlyRecord?.commissionAmount || 0, // in cents
                    bonusAmount: monthlyRecord?.bonusAmount || 0, // in cents
                    totalEarnings: monthlyRecord?.totalEarnings || 0, // in cents
                    status: monthlyRecord?.status || 'pending',
                },
                // All-time stats
                allTime: {
                    totalReferrals,
                    totalIncome: profile.totalIncome, // in cents
                    balance: profile.balance, // in cents
                },
                // Historical records
                history: allRecords.map(r => ({
                    month: r.month,
                    totalSales: r.totalSales,
                    totalEarnings: r.totalEarnings,
                    status: r.status,
                })),
            }
        });
    } catch (error) {
        console.error('Failed to fetch agent stats:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
