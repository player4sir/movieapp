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
