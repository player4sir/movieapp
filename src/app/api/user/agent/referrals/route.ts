import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-middleware';
import { db } from '@/db';
import { users, agentProfiles, membershipOrders } from '@/db/schema';
import { eq, desc, sql, and } from 'drizzle-orm';

/**
 * GET /api/user/agent/referrals
 * Returns list of users referred by the current agent
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

        const searchParams = req.nextUrl.searchParams;
        const page = parseInt(searchParams.get('page') || '1');
        const pageSize = parseInt(searchParams.get('pageSize') || '20');
        const offset = (page - 1) * pageSize;

        // Get referred users count
        const [countResult] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(users)
            .where(eq(users.referredBy, userId));
        const total = countResult?.count || 0;

        // Get referred users with pagination
        const referredUsers = await db
            .select({
                id: users.id,
                nickname: users.nickname,
                memberLevel: users.memberLevel,
                createdAt: users.createdAt,
            })
            .from(users)
            .where(eq(users.referredBy, userId))
            .orderBy(desc(users.createdAt))
            .limit(pageSize)
            .offset(offset);

        // Get order count for each user (simplified - just count approved membership orders)
        const usersWithStats = await Promise.all(
            referredUsers.map(async (u) => {
                const [orderCountResult] = await db
                    .select({ count: sql<number>`count(*)::int` })
                    .from(membershipOrders)
                    .where(
                        and(
                            eq(membershipOrders.userId, u.id),
                            eq(membershipOrders.status, 'approved')
                        )
                    );

                return {
                    ...u,
                    // Mask the ID for privacy
                    id: u.id.substring(0, 4) + '****',
                    hasPurchased: (orderCountResult?.count || 0) > 0,
                };
            })
        );

        return NextResponse.json({
            data: usersWithStats,
            pagination: {
                page,
                pageSize,
                total,
                totalPages: Math.ceil(total / pageSize),
            }
        });
    } catch (error) {
        console.error('Failed to fetch referrals:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
