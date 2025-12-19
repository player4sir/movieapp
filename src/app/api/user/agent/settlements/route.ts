
import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, isAuthError } from '@/lib/auth-middleware';
import { SettlementRecordRepository } from '@/repositories';

const settlementRecordRepository = new SettlementRecordRepository();

export async function GET(req: NextRequest) {
    const authResult = await requireAuth(req);
    if (isAuthError(authResult)) {
        return authResult;
    }
    const { user } = authResult;

    try {
        const searchParams = req.nextUrl.searchParams;
        const page = parseInt(searchParams.get('page') || '1');
        const pageSize = parseInt(searchParams.get('pageSize') || '20');

        const result = await settlementRecordRepository.list({
            userId: user.id,
            page,
            pageSize,
        });

        return NextResponse.json(result);
    } catch (error) {
        console.error('Failed to fetch settlement history:', error);
        return NextResponse.json(
            { error: 'Internal server error' },
            { status: 500 }
        );
    }
}
