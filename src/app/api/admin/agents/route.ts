/**
 * Agent Records API Route
 * GET: List agent records with filters
 * POST: Create new agent record
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import * as agentService from '@/services/agent.service';

/**
 * GET /api/admin/agents
 * List agent records with pagination and filters
 */
export async function GET(request: NextRequest) {
    const authResult = await requireAdmin(request);
    if (isAuthError(authResult)) {
        return authResult;
    }

    try {
        const { searchParams } = new URL(request.url);

        const page = parseInt(searchParams.get('page') ?? '1', 10);
        const pageSize = parseInt(searchParams.get('pageSize') ?? '20', 10);
        const month = searchParams.get('month') ?? undefined;
        const levelId = searchParams.get('levelId') ?? undefined;
        const status = searchParams.get('status') as 'pending' | 'settled' | undefined;
        const search = searchParams.get('search') ?? undefined;
        const sortBy = searchParams.get('sortBy') as 'createdAt' | 'agentName' | 'totalSales' | 'totalEarnings' | undefined;
        const sortOrder = searchParams.get('sortOrder') as 'asc' | 'desc' | undefined;

        const result = await agentService.listAgentRecords({
            page,
            pageSize,
            month,
            levelId,
            status,
            search,
            sortBy,
            sortOrder,
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('List agent records error:', error);
        return NextResponse.json(
            { code: 'INTERNAL_ERROR', message: '获取代理列表失败' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/admin/agents
 * Create a new agent record
 */
export async function POST(request: NextRequest) {
    const authResult = await requireAdmin(request);
    if (isAuthError(authResult)) {
        return authResult;
    }

    try {
        const body = await request.json();

        // Validate required fields
        if (!body.agentName || typeof body.agentName !== 'string' || body.agentName.trim().length === 0) {
            return NextResponse.json(
                { code: 'VALIDATION_ERROR', message: '代理商名称不能为空' },
                { status: 400 }
            );
        }

        if (!body.levelId) {
            return NextResponse.json(
                { code: 'VALIDATION_ERROR', message: '请选择代理等级' },
                { status: 400 }
            );
        }

        if (!body.month) {
            return NextResponse.json(
                { code: 'VALIDATION_ERROR', message: '请选择月份' },
                { status: 400 }
            );
        }

        const record = await agentService.createAgentRecord({
            agentName: body.agentName.trim(),
            agentContact: body.agentContact ?? '',
            levelId: body.levelId,
            month: body.month,
            recruitCount: body.recruitCount ?? 0,
            dailySales: body.dailySales ?? 0,
            totalSales: body.totalSales ?? 0,
            note: body.note ?? '',
        });

        return NextResponse.json({ data: record }, { status: 201 });
    } catch (error: unknown) {
        const err = error as { code?: string; message?: string };

        if (err.code === 'LEVEL_NOT_FOUND') {
            return NextResponse.json(
                { code: err.code, message: err.message },
                { status: 400 }
            );
        }

        console.error('Create agent record error:', error);
        return NextResponse.json(
            { code: 'INTERNAL_ERROR', message: '创建代理记录失败' },
            { status: 500 }
        );
    }
}
