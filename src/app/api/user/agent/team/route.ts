'use server';

/**
 * Agent Team API
 * GET: Get agent's team info (sub-agents and stats)
 * PUT: Update sub-agent commission rate
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-middleware';
import { getTeamInfo, setSubAgentRate, getAgentProfile } from '@/services/agent-profile.service';

/**
 * GET /api/user/agent/team
 * Get agent's team info
 */
export async function GET(request: NextRequest) {
    const authResult = await requireAuth(request);
    if (isAuthError(authResult)) return authResult;
    const userId = authResult.user.id;

    try {
        const profile = await getAgentProfile(userId);
        if (!profile || profile.status !== 'active') {
            return NextResponse.json({ error: '您还不是代理商' }, { status: 403 });
        }

        const { subAgents, teamCount } = await getTeamInfo(userId);

        return NextResponse.json({
            subAgents: subAgents.map(a => ({
                userId: a.userId,
                realName: a.realName,
                contact: a.contact,
                commissionRate: a.commissionRate,
                totalIncome: a.totalIncome,
                createdAt: a.createdAt,
            })),
            teamCount,
            myCommissionRate: profile.commissionRate,
            mySubAgentRate: profile.subAgentRate,
            canInvite: profile.subAgentRate > 0,
            inviteCode: profile.agentCode,
        });
    } catch (error: any) {
        console.error('Get team error:', error);
        return NextResponse.json({ error: error.message || '获取团队信息失败' }, { status: 500 });
    }
}

/**
 * PUT /api/user/agent/team
 * Update sub-agent commission rate (让利设置)
 */
export async function PUT(request: NextRequest) {
    const authResult = await requireAuth(request);
    if (isAuthError(authResult)) return authResult;
    const userId = authResult.user.id;

    try {
        const body = await request.json();
        const { subAgentRate } = body;

        if (typeof subAgentRate !== 'number') {
            return NextResponse.json({ error: '请提供有效的佣金比例' }, { status: 400 });
        }

        const profile = await getAgentProfile(userId);
        if (!profile || profile.status !== 'active') {
            return NextResponse.json({ error: '您还不是代理商' }, { status: 403 });
        }

        // Check if this is a level 3 agent (already has level2AgentId set)
        // Level 3 agents cannot invite more sub-agents (3-tier limit)
        if (profile.level2AgentId) {
            return NextResponse.json({ error: '三级代理无法再发展下级' }, { status: 400 });
        }

        const updated = await setSubAgentRate(userId, subAgentRate);

        return NextResponse.json({
            success: true,
            subAgentRate: updated.subAgentRate,
            myEarningRate: updated.commissionRate - updated.subAgentRate,
            message: subAgentRate > 0
                ? `设置成功！您的下级将获得 ${subAgentRate / 100}% 佣金，您保留 ${(updated.commissionRate - subAgentRate) / 100}%`
                : '已关闭下级邀请功能',
        });
    } catch (error: any) {
        console.error('Set sub-agent rate error:', error);
        return NextResponse.json({ error: error.message || '设置失败' }, { status: 500 });
    }
}
