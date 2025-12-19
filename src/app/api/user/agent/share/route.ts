import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-middleware';
import { db } from '@/db';
import { agentProfiles, agentLevels, users } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

/**
 * GET /api/user/agent/share
 * Returns agent share data including agent code, commission rate, and stats
 */
export async function GET(req: NextRequest) {
    const authResult = await requireAuth(req);
    if (isAuthError(authResult)) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { user } = authResult;
    const userId = user.id;

    try {
        // Get agent profile with level
        const profile = await db.query.agentProfiles.findFirst({
            where: eq(agentProfiles.userId, userId),
        });

        if (!profile) {
            return NextResponse.json({ message: '您还不是代理商' }, { status: 403 });
        }

        if (profile.status !== 'active') {
            return NextResponse.json({ message: '您的代理账号未激活' }, { status: 403 });
        }

        if (!profile.agentCode) {
            return NextResponse.json({ message: '代理推广码尚未生成，请联系管理员' }, { status: 403 });
        }

        // Get level info
        const level = await db.query.agentLevels.findFirst({
            where: eq(agentLevels.id, profile.levelId),
        });

        if (!level) {
            return NextResponse.json({ message: '代理等级信息不存在' }, { status: 500 });
        }

        // Count total referrals (users who registered with this agent's code)
        const [referralCountResult] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(users)
            .where(eq(users.referredBy, userId));
        const totalReferrals = referralCountResult?.count || 0;

        return NextResponse.json({
            data: {
                agentCode: profile.agentCode,
                level: {
                    name: level.name,
                    commissionRate: level.commissionRate, // in basis points
                },
                totalIncome: profile.totalIncome, // in cents
                totalReferrals,
            }
        });
    } catch (error) {
        console.error('Failed to fetch agent share data:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
