
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-middleware';
import {
    submitCoinOrderProof,
} from '@/services/coin-order.service';

/**
 * PUT /api/user/coins/orders/[id]
 * Submit payment proof
 */
export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authResult = await requireAuth(request);
    if (isAuthError(authResult)) return authResult;
    const { user } = authResult;

    try {
        const { id } = await params;
        const body = await request.json();
        const { screenshot, transactionNote } = body;

        const order = await submitCoinOrderProof(id, user.id, {
            screenshot,
            transactionNote
        });

        return NextResponse.json({ order });
    } catch (error: unknown) {
        const err = error as { code?: string; message?: string };
        return NextResponse.json(
            { code: err.code || 'INTERNAL_ERROR', message: err.message || '提交凭证失败' },
            { status: err.code ? 400 : 500 }
        );
    }
}
