/**
 * Agent Statistics API
 * GET /api/admin/agent-stats - Get agent system statistics
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import { db } from '@/db';
import { agentProfiles, agentLevels } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
    const authResult = await requireAdmin(request);
    if (isAuthError(authResult)) return authResult;

    try {
        // Total agents count
        const [totalResult] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(agentProfiles);
        const totalAgents = totalResult?.count || 0;

        // Active agents count
        const [activeResult] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(agentProfiles)
            .where(eq(agentProfiles.status, 'active'));
        const activeAgents = activeResult?.count || 0;

        // Pending agents count
        const [pendingResult] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(agentProfiles)
            .where(eq(agentProfiles.status, 'pending'));
        const pendingAgents = pendingResult?.count || 0;

        // Total earnings and balance
        const [financialResult] = await db
            .select({
                totalEarnings: sql<number>`COALESCE(SUM(${agentProfiles.totalIncome}), 0)::int`,
                totalBalance: sql<number>`COALESCE(SUM(${agentProfiles.balance}), 0)::int`,
            })
            .from(agentProfiles)
            .where(eq(agentProfiles.status, 'active'));

        // Level distribution
        const levelDistribution = await db
            .select({
                levelName: agentLevels.name,
                count: sql<number>`count(*)::int`,
            })
            .from(agentProfiles)
            .innerJoin(agentLevels, eq(agentProfiles.levelId, agentLevels.id))
            .where(eq(agentProfiles.status, 'active'))
            .groupBy(agentLevels.name, agentLevels.sortOrder)
            .orderBy(agentLevels.sortOrder);

        return NextResponse.json({
            totalAgents,
            activeAgents,
            pendingAgents,
            totalEarnings: financialResult?.totalEarnings || 0,
            totalBalance: financialResult?.totalBalance || 0,
            levelDistribution,
        });
    } catch (error) {
        console.error('Failed to get agent stats:', error);
        return NextResponse.json(
            { code: 'INTERNAL_ERROR', message: '获取统计失败' },
            { status: 500 }
        );
    }
}
