/**
 * Agent Levels API Route
 * GET: List all agent levels
 * POST: Create new agent level or initialize defaults
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import * as agentService from '@/services/agent.service';

/**
 * GET /api/admin/agent-levels
 * List all agent levels
 */
export async function GET(request: NextRequest) {
    const authResult = await requireAdmin(request);
    if (isAuthError(authResult)) {
        return authResult;
    }

    try {
        const { searchParams } = new URL(request.url);
        const enabledOnly = searchParams.get('enabledOnly') === 'true';

        const levels = enabledOnly
            ? await agentService.getEnabledAgentLevels()
            : await agentService.getAgentLevels();

        return NextResponse.json({ data: levels });
    } catch (error) {
        console.error('Get agent levels error:', error);
        return NextResponse.json(
            { code: 'INTERNAL_ERROR', message: '获取代理等级失败' },
            { status: 500 }
        );
    }
}

/**
 * POST /api/admin/agent-levels
 * Create a new agent level
 */
export async function POST(request: NextRequest) {
    const authResult = await requireAdmin(request);
    if (isAuthError(authResult)) {
        return authResult;
    }

    try {
        const body = await request.json();

        // Check if requesting to initialize defaults
        if (body.initializeDefaults) {
            const levels = await agentService.initializeDefaultLevels();
            return NextResponse.json({ data: levels }, { status: 201 });
        }

        // Validate required fields
        if (!body.name || typeof body.name !== 'string' || body.name.trim().length === 0) {
            return NextResponse.json(
                { code: 'VALIDATION_ERROR', message: '等级名称不能为空' },
                { status: 400 }
            );
        }

        const level = await agentService.createAgentLevel({
            name: body.name.trim(),
            sortOrder: body.sortOrder ?? 0,
            recruitRequirement: body.recruitRequirement ?? '',
            dailyPerformance: body.dailyPerformance ?? 0,
            commissionRate: body.commissionRate ?? 1000,
            hasBonus: body.hasBonus ?? false,
            bonusRate: body.bonusRate ?? 0,
            enabled: body.enabled ?? true,
        });

        return NextResponse.json({ data: level }, { status: 201 });
    } catch (error) {
        console.error('Create agent level error:', error);
        return NextResponse.json(
            { code: 'INTERNAL_ERROR', message: '创建代理等级失败' },
            { status: 500 }
        );
    }
}
