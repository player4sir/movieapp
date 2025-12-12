
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

        const order = await createCoinOrder({
            userId: user.id,
            amount: Number(amount),
            price: Number(price), // Assuming frontend sends price in cents or we convert here. Let's assume frontend sends correct units matching schema.
            paymentType: paymentType as PaymentType,
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
