import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import { approveCoinOrder, rejectCoinOrder } from '@/services/coin-order.service';

export async function PUT(
    request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    const authResult = await requireAdmin(request);
    if (isAuthError(authResult)) return authResult;
    const { user: admin } = authResult;

    try {
        const { id } = await params;
        const body = await request.json();
        const { action, reason } = body;

        if (!action || !['approve', 'reject'].includes(action)) {
            return NextResponse.json(
                { code: 'INVALID_INPUT', message: '无效的操作' },
                { status: 400 }
            );
        }

        let updatedOrder;
        if (action === 'approve') {
            updatedOrder = await approveCoinOrder(id, admin.id);
        } else {
            if (!reason) {
                return NextResponse.json(
                    { code: 'INVALID_INPUT', message: '请输入拒绝原因' },
                    { status: 400 }
                );
            }
            updatedOrder = await rejectCoinOrder(id, admin.id, reason);
        }

        return NextResponse.json({ order: updatedOrder });
    } catch (error: unknown) {
        // Keeping 'any' temporarily or asserting specific type if known.
        // Better: cast to a known AppError type or use unknown.
        // Given existing code uses error.code, we can assume it might be structured.
        const err = error as { code?: string; message?: string };
        return NextResponse.json(
            { code: err.code || 'INTERNAL_ERROR', message: err.message || '操作失败' },
            { status: 400 }
        );
    }
}
