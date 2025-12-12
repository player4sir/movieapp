import { NextRequest, NextResponse } from 'next/server';
import { requireAdmin, isAuthError } from '@/lib/auth-middleware';
import { getVideoAPI } from '@/services/video-api.service';

export async function GET(req: NextRequest) {
    // 1. Auth check
    const authResult = await requireAdmin(req);
    if (isAuthError(authResult)) {
        return authResult;
    }

    // 2. Parse params
    const searchParams = req.nextUrl.searchParams;
    const sourceId = searchParams.get('sourceId');
    const page = parseInt(searchParams.get('page') || '1');
    const typeId = searchParams.get('t') ? parseInt(searchParams.get('t')!) : undefined;
    const keyword = searchParams.get('wd') || undefined;

    if (!sourceId) {
        return NextResponse.json({ error: 'Missing sourceId' }, { status: 400 });
    }

    try {
        // 3. Fetch from specific source
        const api = getVideoAPI();
        const data = await api.fetchFromSource(sourceId, {
            ac: keyword ? 'detail' : 'list', // Use detail if searching to get pics, else list
            pg: page,
            t: typeId,
            wd: keyword,
        });

        return NextResponse.json(data);
    } catch (error) {
        console.error('Resource fetch error:', error);
        return NextResponse.json(
            { error: error instanceof Error ? error.message : 'Failed to fetch resources' },
            { status: 500 }
        );
    }
}
