
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-middleware';
import {
    createCoinOrder,
    getCoinOrders,
} from '@/services/coin-order.service';
import { PaymentType } from '@/db/schema';

/**
 * POST /api/user/coins/orders
 * Create a new coin recharge order
 */
export async function POST(request: NextRequest) {
    const authResult = await requireAuth(request);
    if (isAuthError(authResult)) return authResult;
    const { user } = authResult;

    try {
        const body = await request.json();
        const { amount, price, paymentType } = body;

        // Basic validation
        if (!amount || !price) {
            return NextResponse.json(
                { code: 'INVALID_INPUT', message: '金额无效' },
                { status: 400 }
            );
        }

        // Resolve agent code if provided
        // Agent codes start with 'A' and are 8 chars (stored in agentProfiles)
        // Regular referral codes are 6 chars (stored in users.referralCode)
        let agentId: string | undefined;
        if (body.agentCode) {
            const { db } = await import('@/db');
            const { users, agentProfiles } = await import('@/db/schema');
            const { eq } = await import('drizzle-orm');

            const code = String(body.agentCode).trim().toUpperCase();
            const isAgentCode = code.startsWith('A') && code.length === 8;

            if (isAgentCode) {
                // Look for agent promotion code in agentProfiles table
                const agentProfile = await db.query.agentProfiles.findFirst({
                    where: eq(agentProfiles.agentCode, code),
                    columns: { userId: true, status: true }
                });

                if (agentProfile?.status === 'active') {
                    agentId = agentProfile.userId;
                }
            } else {
                // Fall back to regular user referral code
                const agent = await db.query.users.findFirst({
                    where: eq(users.referralCode, code),
                    columns: { id: true }
                });

                if (agent) {
                    agentId = agent.id;
                }
            }
        }

        const order = await createCoinOrder({
            userId: user.id,
            amount: Number(amount),
            price: Number(price),
            paymentType: paymentType as PaymentType,
            agentId,
        });

        return NextResponse.json({ order }, { status: 201 });
    } catch (error: unknown) {
        const err = error as { code?: string; message?: string };
        return NextResponse.json(
            { code: err.code || 'INTERNAL_ERROR', message: err.message || '创建订单失败' },
            { status: err.code ? 400 : 500 }
        );
    }
}

/**
 * GET /api/user/coins/orders
 * Get recharge history
 */
export async function GET(request: NextRequest) {
    const authResult = await requireAuth(request);
    if (isAuthError(authResult)) return authResult;
    const { user } = authResult;

    try {
        const result = await getCoinOrders(user.id);
        return NextResponse.json(result);
    } catch {
        return NextResponse.json(
            { code: 'INTERNAL_ERROR', message: '获取订单失败' },
            { status: 500 }
        );
    }
}
