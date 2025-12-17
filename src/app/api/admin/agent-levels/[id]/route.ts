/**
 * Agent Level Detail API Route
 * GET: Get agent level by ID
 * PUT: Update agent level
 * DELETE: Delete agent level
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import * as agentService from '@/services/agent.service';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/agent-levels/[id]
 * Get agent level by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAdmin(request);
    if (isAuthError(authResult)) {
        return authResult;
    }

    try {
        const { id } = await params;
        const level = await agentService.getAgentLevelById(id);

        if (!level) {
            return NextResponse.json(
                { code: 'NOT_FOUND', message: '代理等级不存在' },
                { status: 404 }
            );
        }

        return NextResponse.json({ data: level });
    } catch (error) {
        console.error('Get agent level error:', error);
        return NextResponse.json(
            { code: 'INTERNAL_ERROR', message: '获取代理等级失败' },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/admin/agent-levels/[id]
 * Update agent level
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAdmin(request);
    if (isAuthError(authResult)) {
        return authResult;
    }

    try {
        const { id } = await params;
        const body = await request.json();

        const level = await agentService.updateAgentLevel(id, {
            name: body.name,
            sortOrder: body.sortOrder,
            recruitRequirement: body.recruitRequirement,
            dailyPerformance: body.dailyPerformance,
            commissionRate: body.commissionRate,
            hasBonus: body.hasBonus,
            bonusRate: body.bonusRate,
            enabled: body.enabled,
        });

        return NextResponse.json({ data: level });
    } catch (error: unknown) {
        const err = error as { code?: string; message?: string };

        if (err.code === 'LEVEL_NOT_FOUND') {
            return NextResponse.json(
                { code: err.code, message: err.message },
                { status: 404 }
            );
        }

        console.error('Update agent level error:', error);
        return NextResponse.json(
            { code: 'INTERNAL_ERROR', message: '更新代理等级失败' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/admin/agent-levels/[id]
 * Delete agent level
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAdmin(request);
    if (isAuthError(authResult)) {
        return authResult;
    }

    try {
        const { id } = await params;
        await agentService.deleteAgentLevel(id);

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        const err = error as { code?: string; message?: string };

        if (err.code === 'LEVEL_NOT_FOUND') {
            return NextResponse.json(
                { code: err.code, message: err.message },
                { status: 404 }
            );
        }

        if (err.code === 'LEVEL_IN_USE') {
            return NextResponse.json(
                { code: err.code, message: err.message },
                { status: 400 }
            );
        }

        console.error('Delete agent level error:', error);
        return NextResponse.json(
            { code: 'INTERNAL_ERROR', message: '删除代理等级失败' },
            { status: 500 }
        );
    }
}
