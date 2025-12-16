/**
 * Admin Orders Stats API Route
 * Returns order statistics for the admin dashboard
 */

import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import { MembershipOrderRepository, CoinOrderRepository } from '@/repositories';

const membershipOrderRepository = new MembershipOrderRepository();
const coinOrderRepository = new CoinOrderRepository();

export async function GET(request: NextRequest) {
    const authResult = await requireAdmin(request);
    if (isAuthError(authResult)) {
        return authResult;
    }

    try {
        // Fetch pending orders counts
        const [membershipPending, coinPending] = await Promise.all([
            membershipOrderRepository.list({ page: 1, pageSize: 1, status: 'pending' }),
            coinOrderRepository.list({ page: 1, pageSize: 1, status: 'pending' }),
        ]);

        // Fetch paid orders waiting for approval
        const [membershipPaid, coinPaid] = await Promise.all([
            membershipOrderRepository.list({ page: 1, pageSize: 1, status: 'paid' }),
            coinOrderRepository.list({ page: 1, pageSize: 1, status: 'paid' }),
        ]);

        return NextResponse.json({
            pendingOrders: {
                membership: membershipPending.pagination.total,
                coin: coinPending.pagination.total,
                total: membershipPending.pagination.total + coinPending.pagination.total,
            },
            paidOrders: {
                membership: membershipPaid.pagination.total,
                coin: coinPaid.pagination.total,
                total: membershipPaid.pagination.total + coinPaid.pagination.total,
            },
            // Total orders needing attention (both pending and paid)
            needsAttention:
                membershipPending.pagination.total +
                coinPending.pagination.total +
                membershipPaid.pagination.total +
                coinPaid.pagination.total,
        });
    } catch (error) {
        console.error('Admin orders stats error:', error);
        return NextResponse.json(
            { code: 'INTERNAL_ERROR', message: '获取订单统计失败' },
            { status: 500 }
        );
    }
}
