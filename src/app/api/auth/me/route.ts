import { NextRequest, NextResponse } from 'next/server';
import { extractBearerToken, validateToken } from '@/services/auth.service';
import { AUTH_ERRORS } from '@/types/auth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
    try {
        const token = extractBearerToken(req);

        if (!token) {
            return NextResponse.json(
                { code: AUTH_ERRORS.UNAUTHORIZED.code, message: AUTH_ERRORS.UNAUTHORIZED.message },
                { status: 401 }
            );
        }

        const userProfile = await validateToken(token);

        return NextResponse.json({ user: userProfile });
    } catch (error: unknown) {
        // Safely check for code property
        const err = error as { code?: string; message?: string };
        if (err.code) {
            return NextResponse.json(
                { code: err.code, message: err.message },
                { status: 401 }
            );
        }

        console.error('Me API Error:', error);
        return NextResponse.json(
            { code: 'INTERNAL_ERROR', message: 'Internal server error' },
            { status: 500 }
        );
    }
}
