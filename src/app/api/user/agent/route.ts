import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-middleware';
import { db } from '@/db';
import { agentProfiles } from '@/db/schema';
import { eq } from 'drizzle-orm';

// GET: Get current user's agent profile
export async function GET(req: NextRequest) {
    const authResult = await requireAuth(req);

    if (isAuthError(authResult)) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { user } = authResult;
    const userId = user.id;

    // Fetch profile with level
    const profile = await db.query.agentProfiles.findFirst({
        where: eq(agentProfiles.userId, userId),
        with: {
            level: true,
        },
    });

    if (!profile) {
        return NextResponse.json({ data: null });
    }

    return NextResponse.json({ data: profile });
}

// POST: Apply to become an agent
export async function POST(req: NextRequest) {
    const authResult = await requireAuth(req);

    if (isAuthError(authResult)) {
        return NextResponse.json({ message: 'Unauthorized' }, { status: 401 });
    }

    const { user } = authResult;
    const userId = user.id;
    const body = await req.json();
    const { realName, contact, inviteCode } = body;

    if (!realName || !contact) {
        return NextResponse.json({ message: '请填写真实姓名和联系方式' }, { status: 400 });
    }

    try {
        // Use service layer for application (supports inviteCode)
        const { applyForAgent } = await import('@/services/agent-profile.service');
        await applyForAgent(userId, { realName, contact, inviteCode });

        return NextResponse.json({
            message: inviteCode ? '申请已提交（已绑定上级代理）' : '申请已提交'
        });
    } catch (error) {
        const err = error as { code?: string; message?: string };
        if (err.code === 'PROFILE_EXISTS') {
            // Check specific status
            const existing = await db.query.agentProfiles.findFirst({
                where: eq(agentProfiles.userId, userId),
            });
            if (existing?.status === 'active') {
                return NextResponse.json({ message: '您已经是代理商了' }, { status: 400 });
            }
            if (existing?.status === 'pending') {
                return NextResponse.json({ message: '申请已提交，请耐心等待审核' }, { status: 400 });
            }
        }
        const message = err.message || '申请失败';
        return NextResponse.json({ message }, { status: 500 });
    }
}
