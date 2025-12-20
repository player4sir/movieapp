import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import { AgentProfileRepository } from '@/repositories/agent-profile.repository';
import { approveAgent, rejectAgent, updateAgentProfile } from '@/services/agent-profile.service';

/**
 * GET /api/admin/agent-profiles
 * List agent profiles with pagination and filters
 */
export async function GET(request: NextRequest) {
    const authResult = await requireAdmin(request);
    if (isAuthError(authResult)) return authResult;

    try {
        const { searchParams } = new URL(request.url);
        const repository = new AgentProfileRepository();
        // @ts-ignore
        const result = await repository.list(searchParams);

        return NextResponse.json(result);
    } catch (error: any) {
        return NextResponse.json({ message: error.message || 'Failed to fetch profiles' }, { status: 500 });
    }
}

/**
 * PUT /api/admin/agent-profiles
 * Audit agent: Approve/Reject OR Update Details
 */
export async function PUT(request: NextRequest) {
    const authResult = await requireAdmin(request);
    if (isAuthError(authResult)) return authResult;

    try {
        const body = await request.json();
        const { userId, action, ...updateData } = body;

        if (!userId) {
            return NextResponse.json({ message: 'Missing userId' }, { status: 400 });
        }

        let result;
        if (action) {
            // Handle specific actions (approve/reject)
            if (action === 'approve') {
                result = await approveAgent(userId);
            } else if (action === 'reject') {
                result = await rejectAgent(userId);
            } else {
                return NextResponse.json({ message: 'Invalid action' }, { status: 400 });
            }
        } else {
            // Handle generic update
            result = await updateAgentProfile(userId, updateData);
        }

        return NextResponse.json({ data: result });
    } catch (error: any) {
        return NextResponse.json({ message: error.message || 'Action failed' }, { status: 500 });
    }
}

/**
 * DELETE /api/admin/agent-profiles
 * Delete an agent profile
 */
export async function DELETE(request: NextRequest) {
    const authResult = await requireAdmin(request);
    if (isAuthError(authResult)) return authResult;

    try {
        const { searchParams } = new URL(request.url);
        const userId = searchParams.get('userId');

        if (!userId) {
            return NextResponse.json({ message: 'Missing userId' }, { status: 400 });
        }

        const repository = new AgentProfileRepository();

        // Check if agent has pending balance
        const profile = await repository.findByUserId(userId);
        if (profile && profile.balance > 0) {
            return NextResponse.json(
                { message: '该代理商还有未结算余额，请先完成结算后再删除' },
                { status: 400 }
            );
        }

        const deleted = await repository.delete(userId);

        if (!deleted) {
            return NextResponse.json({ message: '代理商不存在' }, { status: 404 });
        }

        return NextResponse.json({ success: true, message: '删除成功' });
    } catch (error: any) {
        return NextResponse.json({ message: error.message || '删除失败' }, { status: 500 });
    }
}
