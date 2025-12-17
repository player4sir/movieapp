/**
 * Agent Record Detail API Route
 * GET: Get agent record by ID
 * PUT: Update agent record
 * DELETE: Delete agent record
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import * as agentService from '@/services/agent.service';

interface RouteParams {
    params: Promise<{ id: string }>;
}

/**
 * GET /api/admin/agents/[id]
 * Get agent record by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAdmin(request);
    if (isAuthError(authResult)) {
        return authResult;
    }

    try {
        const { id } = await params;
        const record = await agentService.getAgentRecordById(id);

        if (!record) {
            return NextResponse.json(
                { code: 'NOT_FOUND', message: '代理记录不存在' },
                { status: 404 }
            );
        }

        return NextResponse.json({ data: record });
    } catch (error) {
        console.error('Get agent record error:', error);
        return NextResponse.json(
            { code: 'INTERNAL_ERROR', message: '获取代理记录失败' },
            { status: 500 }
        );
    }
}

/**
 * PUT /api/admin/agents/[id]
 * Update agent record
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAdmin(request);
    if (isAuthError(authResult)) {
        return authResult;
    }

    try {
        const { id } = await params;
        const body = await request.json();

        const record = await agentService.updateAgentRecord(id, {
            agentName: body.agentName,
            agentContact: body.agentContact,
            levelId: body.levelId,
            month: body.month,
            recruitCount: body.recruitCount,
            dailySales: body.dailySales,
            totalSales: body.totalSales,
            status: body.status,
            note: body.note,
        });

        return NextResponse.json({ data: record });
    } catch (error: unknown) {
        const err = error as { code?: string; message?: string };

        if (err.code === 'RECORD_NOT_FOUND') {
            return NextResponse.json(
                { code: err.code, message: err.message },
                { status: 404 }
            );
        }

        if (err.code === 'LEVEL_NOT_FOUND') {
            return NextResponse.json(
                { code: err.code, message: err.message },
                { status: 400 }
            );
        }

        console.error('Update agent record error:', error);
        return NextResponse.json(
            { code: 'INTERNAL_ERROR', message: '更新代理记录失败' },
            { status: 500 }
        );
    }
}

/**
 * DELETE /api/admin/agents/[id]
 * Delete agent record
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
    const authResult = await requireAdmin(request);
    if (isAuthError(authResult)) {
        return authResult;
    }

    try {
        const { id } = await params;
        await agentService.deleteAgentRecord(id);

        return NextResponse.json({ success: true });
    } catch (error: unknown) {
        const err = error as { code?: string; message?: string };

        if (err.code === 'RECORD_NOT_FOUND') {
            return NextResponse.json(
                { code: err.code, message: err.message },
                { status: 404 }
            );
        }

        console.error('Delete agent record error:', error);
        return NextResponse.json(
            { code: 'INTERNAL_ERROR', message: '删除代理记录失败' },
            { status: 500 }
        );
    }
}
