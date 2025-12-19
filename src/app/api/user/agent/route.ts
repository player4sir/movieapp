import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-middleware';
import { db } from '@/db';
import { agentProfiles, agentLevels, agentRecords } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

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
    const { realName, contact } = await req.json();

    if (!realName || !contact) {
        return NextResponse.json({ message: '请填写真实姓名和联系方式' }, { status: 400 });
    }

    // Check existing profile
    const existing = await db.query.agentProfiles.findFirst({
        where: eq(agentProfiles.userId, userId),
    });

    if (existing) {
        if (existing.status === 'active') {
            return NextResponse.json({ message: '您已经是代理商了' }, { status: 400 });
        }
        if (existing.status === 'pending') {
            return NextResponse.json({ message: '申请已提交，请耐心等待审核' }, { status: 400 });
        }
        // If rejected, allow re-apply (update)
        await db.update(agentProfiles)
            .set({
                realName,
                contact,
                status: 'pending',
                updatedAt: new Date()
            })
            .where(eq(agentProfiles.userId, userId));

        return NextResponse.json({ message: '申请重新已提交' });
    }

    // Find default level (usually sorted by order 0)
    const defaultLevel = await db.query.agentLevels.findFirst({
        orderBy: (levels, { asc }) => [asc(levels.sortOrder)],
    });

    if (!defaultLevel) {
        return NextResponse.json({ message: '系统未配置代理等级' }, { status: 500 });
    }

    // Create new profile
    await db.insert(agentProfiles).values({
        userId,
        realName,
        contact,
        levelId: defaultLevel.id,
        status: 'pending',
        totalIncome: 0,
        balance: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
    });

    return NextResponse.json({ message: '申请已提交' });
}
