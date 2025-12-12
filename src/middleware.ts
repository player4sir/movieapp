import { NextResponse, NextRequest } from 'next/server';
import { rateLimiter } from '@/lib/rate-limit';

// Route config
const RATE_LIMIT_RULES = {
    auth: {
        pattern: /^\/api\/auth\//,
        limit: 20, // 20 requests per minute
        window: 60 * 1000,
    },
    proxy: {
        pattern: /^\/api\/proxy\//,
        limit: 100, // 100 requests per minute
        window: 60 * 1000,
    },
    api: {
        pattern: /^\/api\//,
        limit: 300, // 300 requests per minute
        window: 60 * 1000,
    }
};

export async function middleware(request: NextRequest) {
    // In Next.js 15, request.ip is removed. Get IP from headers instead.
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() 
        || request.headers.get('x-real-ip') 
        || '127.0.0.1';
    const pathname = request.nextUrl.pathname;

    // Static files and internal requests exclusion
    if (
        pathname.startsWith('/_next') ||
        pathname.startsWith('/static') ||
        pathname.includes('.')
    ) {
        return NextResponse.next();
    }

    // Determine rate limit based on path
    let limit = 0;
    let window = 0;

    if (RATE_LIMIT_RULES.auth.pattern.test(pathname)) {
        limit = RATE_LIMIT_RULES.auth.limit;
        window = RATE_LIMIT_RULES.auth.window;
    } else if (RATE_LIMIT_RULES.proxy.pattern.test(pathname)) {
        limit = RATE_LIMIT_RULES.proxy.limit;
        window = RATE_LIMIT_RULES.proxy.window;
    } else if (RATE_LIMIT_RULES.api.pattern.test(pathname)) {
        limit = RATE_LIMIT_RULES.api.limit;
        window = RATE_LIMIT_RULES.api.window;
    }

    // If no limit matched (e.g. non-api pages), skip
    if (limit === 0) {
        return NextResponse.next();
    }

    // Use ip + pathname to separate limits per endpoint type?
    // No, we want to share limits across common prefixes (like all auth routes share the same bucket)
    // So we use the prefix key.

    let keyPrefix = 'global';
    if (RATE_LIMIT_RULES.auth.pattern.test(pathname)) keyPrefix = 'auth';
    else if (RATE_LIMIT_RULES.proxy.pattern.test(pathname)) keyPrefix = 'proxy';
    else if (RATE_LIMIT_RULES.api.pattern.test(pathname)) keyPrefix = 'api';

    const checkResult = rateLimiter.check(`${keyPrefix}:${ip}`, limit, window);

    if (!checkResult.success) {
        return new NextResponse('Too Many Requests', {
            status: 429,
            headers: {
                'Retry-After': Math.ceil((checkResult.reset - Date.now()) / 1000).toString(),
                'X-RateLimit-Limit': limit.toString(),
                'X-RateLimit-Remaining': '0',
            },
        });
    }

    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', limit.toString());
    response.headers.set('X-RateLimit-Remaining', checkResult.remaining.toString());

    return response;
}

export const config = {
    matcher: '/api/:path*',
};
