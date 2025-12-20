/**
 * Agent Level Change Logs API
 * GET /api/admin/agent-level-logs - List level change logs with pagination
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import { db } from '@/db';
import { agentLevelChangeLogs, users } from '@/db/schema';
import { desc, eq, sql } from 'drizzle-orm';

export async function GET(request: NextRequest) {
    const authResult = await requireAdmin(request);
    if (isAuthError(authResult)) return authResult;

    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
        const offset = (page - 1) * pageSize;

        // Get total count
        const [countResult] = await db
            .select({ count: sql<number>`count(*)::int` })
            .from(agentLevelChangeLogs);
        const total = countResult?.count || 0;

        // Get logs with user info
        const logs = await db
            .select({
                id: agentLevelChangeLogs.id,
                userId: agentLevelChangeLogs.userId,
                previousLevelId: agentLevelChangeLogs.previousLevelId,
                previousLevelName: agentLevelChangeLogs.previousLevelName,
                newLevelId: agentLevelChangeLogs.newLevelId,
                newLevelName: agentLevelChangeLogs.newLevelName,
                changeType: agentLevelChangeLogs.changeType,
                changedBy: agentLevelChangeLogs.changedBy,
                reason: agentLevelChangeLogs.reason,
                createdAt: agentLevelChangeLogs.createdAt,
            })
            .from(agentLevelChangeLogs)
            .orderBy(desc(agentLevelChangeLogs.createdAt))
            .limit(pageSize)
            .offset(offset);

        // Enrich with user info
        const enrichedLogs = await Promise.all(
            logs.map(async (log) => {
                const user = await db.query.users.findFirst({
                    where: eq(users.id, log.userId),
                    columns: { nickname: true, username: true },
                });

                let admin = null;
                if (log.changedBy) {
                    admin = await db.query.users.findFirst({
                        where: eq(users.id, log.changedBy),
                        columns: { nickname: true, username: true },
                    });
                }

                return { ...log, user, admin };
            })
        );

        return NextResponse.json({
            data: enrichedLogs,
            total,
            page,
            pageSize,
        });
    } catch (error) {
        console.error('Failed to get agent level logs:', error);
        return NextResponse.json(
            { code: 'INTERNAL_ERROR', message: '获取日志失败' },
            { status: 500 }
        );
    }
}
