/**
 * Agent Report API Route
 * GET: Get report summary for a specific month
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import * as agentService from '@/services/agent.service';

/**
 * GET /api/admin/agents/report
 * Get report summary for a specific month
 */
export async function GET(request: NextRequest) {
    const authResult = await requireAdmin(request);
    if (isAuthError(authResult)) {
        return authResult;
    }

    try {
        const { searchParams } = new URL(request.url);
        const month = searchParams.get('month') ?? agentService.getCurrentMonth();

        const [summary, availableMonths] = await Promise.all([
            agentService.getAgentReportSummary(month),
            agentService.getAvailableMonths(),
        ]);

        return NextResponse.json({
            data: {
                month,
                summary,
                availableMonths,
            },
        });
    } catch (error) {
        console.error('Get agent report error:', error);
        return NextResponse.json(
            { code: 'INTERNAL_ERROR', message: '获取代理报表失败' },
            { status: 500 }
        );
    }
}
