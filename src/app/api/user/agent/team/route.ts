'use server';

/**
 * Agent Team API
 * GET: Get agent's team info with level breakdown
 * PUT: Update sub-agent commission rate (self or specific sub-agent)
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-middleware';
import { getTeamInfo, setSubAgentRate, getAgentProfile } from '@/services/agent-profile.service';
import { AgentProfileRepository } from '@/repositories/agent-profile.repository';

const agentProfileRepository = new AgentProfileRepository();

/**
 * GET /api/user/agent/team
 * Get agent's team info with level breakdown
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

        // Get level 2 and level 3 sub-agents
        const level2Agents = await agentProfileRepository.getLevel2Agents(userId);
        const level3Agents = await agentProfileRepository.getLevel3Agents(userId);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const mapAgent = (a: any) => ({
            userId: a.userId,
            realName: a.realName,
            contact: a.contact,
            commissionRate: a.commissionRate,
            totalIncome: a.totalIncome,
            createdAt: a.createdAt instanceof Date ? a.createdAt.toISOString() : a.createdAt,
            parentAgentId: a.parentAgentId,
        });

        return NextResponse.json({
            level1Agents: subAgents.map(mapAgent),
            level2Agents: level2Agents.map(mapAgent),
            level3Agents: level3Agents.map(mapAgent),
            teamCount,
            myCommissionRate: profile.commissionRate,
            mySubAgentRate: profile.subAgentRate,
            canInvite: !profile.level2AgentId, // Level 3 agents cannot invite
            inviteCode: profile.agentCode,
        });
    } catch (error) {
        console.error('Get team error:', error);
        const message = error instanceof Error ? error.message : '获取团队信息失败';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}

/**
 * PUT /api/user/agent/team
 * Update commission rate
 * - If targetUserId is provided: update specific sub-agent's commission rate
 * - Otherwise: update own subAgentRate (default rate for new sub-agents)
 */
export async function PUT(request: NextRequest) {
    const authResult = await requireAuth(request);
    if (isAuthError(authResult)) return authResult;
    const userId = authResult.user.id;

    try {
        const body = await request.json();
        const { subAgentRate, targetUserId, newRate } = body;

        const profile = await getAgentProfile(userId);
        if (!profile || profile.status !== 'active') {
            return NextResponse.json({ error: '您还不是代理商' }, { status: 403 });
        }

        // Mode 1: Update specific sub-agent's commission rate
        if (targetUserId && typeof newRate === 'number') {
            // Verify the target is a direct sub-agent
            const targetProfile = await agentProfileRepository.findByUserId(targetUserId);
            if (!targetProfile || targetProfile.parentAgentId !== userId) {
                return NextResponse.json({ error: '只能修改直属下级的佣金率' }, { status: 400 });
            }

            // Validate: new rate must be less than parent's commission rate
            if (newRate >= profile.commissionRate) {
                return NextResponse.json({ error: '下级佣金率必须小于您的佣金率' }, { status: 400 });
            }
            if (newRate < 0) {
                return NextResponse.json({ error: '佣金率不能为负数' }, { status: 400 });
            }

            await agentProfileRepository.update(targetUserId, { commissionRate: newRate });

            return NextResponse.json({
                success: true,
                message: `已将 ${targetProfile.realName || '该代理'} 的佣金率设置为 ${(newRate / 100).toFixed(1)}%`,
            });
        }

        // Mode 2: Update own subAgentRate (default for new sub-agents)
        if (typeof subAgentRate === 'number') {
            if (profile.level2AgentId) {
                return NextResponse.json({ error: '三级代理无法再发展下级' }, { status: 400 });
            }

            const updated = await setSubAgentRate(userId, subAgentRate);

            return NextResponse.json({
                success: true,
                subAgentRate: updated.subAgentRate,
                myEarningRate: updated.commissionRate - updated.subAgentRate,
                message: subAgentRate > 0
                    ? `设置成功！新下级将获得 ${subAgentRate / 100}% 佣金`
                    : '已关闭下级邀请功能',
            });
        }

        return NextResponse.json({ error: '参数错误' }, { status: 400 });
    } catch (error) {
        console.error('Update commission rate error:', error);
        const message = error instanceof Error ? error.message : '设置失败';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
