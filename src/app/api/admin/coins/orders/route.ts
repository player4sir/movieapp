import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import { CoinOrderRepository } from '@/repositories/coin-order.repository';

const coinOrderRepository = new CoinOrderRepository();

export async function GET(request: NextRequest) {
    const authResult = await requireAdmin(request);
    if (isAuthError(authResult)) return authResult;

    try {
        const { searchParams } = new URL(request.url);
        const page = parseInt(searchParams.get('page') || '1', 10);
        const pageSize = parseInt(searchParams.get('pageSize') || '20', 10);
        const statusParam = searchParams.get('status');

        // Support comma-separated status values (e.g., "pending,paid")
        type OrderStatus = 'pending' | 'paid' | 'approved' | 'rejected';
        const validStatuses: OrderStatus[] = ['pending', 'paid', 'approved', 'rejected'];
        let status: OrderStatus | OrderStatus[] | undefined;

        if (statusParam) {
            const statusArray = statusParam.split(',').filter(s => validStatuses.includes(s as OrderStatus)) as OrderStatus[];
            status = statusArray.length === 1 ? statusArray[0] : statusArray.length > 1 ? statusArray : undefined;
        }

        const result = await coinOrderRepository.list({
            page,
            pageSize,
            status,
            sortBy: 'createdAt',
            sortOrder: 'desc',
        });

        // Fetch user details for each order (efficiently would be a join, but here loop is ok for admin dashboard scale)
        // Actually, simple repo doesn't support joins yet.
        // We will return data as is, assuming the UI handles userId display or we fetch users separately.
        // For MVP, we pass the raw data. Ideally, we should enrich with user info.

        return NextResponse.json(result);
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : '获取订单列表失败';
        return NextResponse.json(
            { code: 'INTERNAL_ERROR', message: errorMessage },
            { status: 500 }
        );
    }
}
