import { NextRequest, NextResponse } from 'next/server';
import {
    FETCH_TIMEOUT,
    USER_AGENTS,
    CF_WORKER_PROXY_URL,
    shouldUseWorkerProxy,
    markDomainNeedsWorker,
    buildWorkerProxyUrl,
} from '@/lib/proxy-config';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
    const urlStr = request.nextUrl.searchParams.get('url');

    if (!urlStr) {
        return new NextResponse('Missing URL parameter', { status: 400 });
    }

    try {
        const decodedUrl = decodeURIComponent(urlStr);
        const targetUrl = new URL(decodedUrl);
        const domain = targetUrl.hostname;
        const adFree = request.nextUrl.searchParams.get('adFree') === 'true';
        const adFreeParam = adFree ? '&adFree=true' : '';

        // Forward Range header for video seeking support
        const range = request.headers.get('range');

        // Use the video source's origin as referer (most natural approach)
        const referers = [
            targetUrl.origin + '/',
            '', // Also try without referer
        ];

        let response: Response | null = null;
        let lastError: Error | null = null;
        let usedCachedWorker = false;

        // 检查是否应该直接使用 Worker 代理（基于缓存的域名偏好）
        if (shouldUseWorkerProxy(domain) && CF_WORKER_PROXY_URL) {
            console.log(`[Video Proxy] Using cached Worker preference for ${domain}`);
            const workerUrl = buildWorkerProxyUrl(decodedUrl);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT.TS);

            try {
                response = await fetch(workerUrl, { signal: controller.signal });
                clearTimeout(timeoutId);

                if (response.ok) {
                    usedCachedWorker = true;
                } else {
                    response = null; // Reset to try direct connection
                }
            } catch (err) {
                clearTimeout(timeoutId);
                console.error('[Video Proxy] Cached Worker request failed:', err);
                response = null;
            }
        }

        // 如果没有使用缓存的 Worker，尝试直连
        if (!usedCachedWorker) {
            // Try different combinations of User-Agent and Referer
            outer: for (const userAgent of USER_AGENTS) {
                for (const referer of referers) {
                    try {
                        const controller = new AbortController();
                        const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT.TS);

                        const headers: Record<string, string> = {
                            'User-Agent': userAgent,
                            'Accept': '*/*',
                            'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
                        };

                        if (referer) {
                            headers['Referer'] = referer;
                        }
                        if (range) {
                            headers['Range'] = range;
                        }

                        response = await fetch(decodedUrl, {
                            headers,
                            redirect: 'follow',
                            signal: controller.signal,
                        });

                        clearTimeout(timeoutId);

                        if (response.ok || response.status === 206) {
                            break outer;
                        }
                    } catch (err) {
                        if (err instanceof Error && err.name === 'AbortError') {
                            lastError = new Error('Request timeout');
                        } else {
                            lastError = err instanceof Error ? err : new Error(String(err));
                        }
                    }
                }
            }

            // If response is 403, try Cloudflare Worker proxy as fallback
            if (response && response.status === 403 && CF_WORKER_PROXY_URL) {
                console.log('[Video Proxy] Got 403, trying Cloudflare Worker fallback...');
                try {
                    const workerUrl = buildWorkerProxyUrl(decodedUrl);
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT.TS);

                    response = await fetch(workerUrl, { signal: controller.signal });
                    clearTimeout(timeoutId);

                    if (response.ok) {
                        // 标记该域名需要使用 Worker 代理
                        markDomainNeedsWorker(domain);
                        console.log('[Video Proxy] Cloudflare Worker fallback succeeded');
                    }
                } catch (err) {
                    console.error('[Video Proxy] Cloudflare Worker fallback error:', err);
                    // Keep original response or error
                }
            }
        }

        if (!response) {
            throw lastError || new Error('All fetch attempts failed');
        }

        // Handle M3U8 manifest rewriting for Mixed Content
        const contentType = response.headers.get('Content-Type') || '';
        const isM3U8 = contentType.includes('application/vnd.apple.mpegurl') ||
            contentType.includes('application/x-mpegurl') ||
            contentType.includes('mpegurl') ||
            decodedUrl.endsWith('.m3u8') ||
            decodedUrl.includes('.m3u8?');

        if (isM3U8) {
            let text = await response.text();
            const origin = request.nextUrl.origin;
            const proxyBase = `${origin}/api/proxy/video?url=`;

            // Use the final URL after redirects for base path calculation
            const finalUrl = response.url || decodedUrl;
            const basePath = finalUrl.substring(0, finalUrl.lastIndexOf('/') + 1);

            // 广告过滤
            let adFilterStats = { filtered: 0, total: 0 };
            if (adFree) {
                const { filterM3U8Ads } = await import('@/lib/ad-filter');
                const filterResult = filterM3U8Ads(text, basePath, {
                    enabled: true,
                    filterDiscontinuitySections: true,
                    filterDiscontinuity: true,
                    maxAdSectionDuration: 120,
                    minMainContentSegments: 10,
                });
                text = filterResult.filteredContent;
                adFilterStats = {
                    filtered: filterResult.filteredSegments,
                    total: filterResult.totalSegments,
                };
            }

            // Rewrite manifest with better handling for various URL formats
            const lines = text.split('\n');
            const rewrittenLines = lines.map(line => {
                const trimmed = line.trim();

                // Handle empty lines
                if (!trimmed) {
                    return line;
                }

                // Handle EXT-X-KEY with URI
                if (trimmed.includes('URI="')) {
                    return trimmed.replace(/URI="([^"]+)"/, (match, uri) => {
                        try {
                            const absoluteUri = uri.startsWith('http') ? uri : new URL(uri, basePath).toString();
                            return `URI="${proxyBase}${encodeURIComponent(absoluteUri)}${adFreeParam}"`;
                        } catch {
                            return match;
                        }
                    });
                }

                // Skip other comments/tags
                if (trimmed.startsWith('#')) {
                    return line;
                }

                // It's a URL (absolute or relative)
                try {
                    let fullUrl: string;
                    if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
                        fullUrl = trimmed;
                    } else if (trimmed.startsWith('/')) {
                        // Absolute path
                        const baseUrl = new URL(basePath);
                        fullUrl = `${baseUrl.protocol}//${baseUrl.host}${trimmed}`;
                    } else {
                        // Relative path
                        fullUrl = new URL(trimmed, basePath).toString();
                    }
                    return `${proxyBase}${encodeURIComponent(fullUrl)}${adFreeParam}`;
                } catch {
                    return line;
                }
            });

            const responseHeaders: HeadersInit = {
                'Content-Type': 'application/vnd.apple.mpegurl',
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': '*',
                'Cache-Control': 'no-cache, no-store, must-revalidate',
            };

            if (adFree && adFilterStats.filtered > 0) {
                responseHeaders['X-Ad-Filter-Total'] = adFilterStats.total.toString();
                responseHeaders['X-Ad-Filter-Removed'] = adFilterStats.filtered.toString();
            }

            return new NextResponse(rewrittenLines.join('\n'), {
                status: 200,
                headers: responseHeaders
            });
        }

        // Direct Pass-through for segments and non-m3u8 files
        const responseHeaders = new Headers();

        // Determine content type
        let detectedContentType = response.headers.get('Content-Type') || 'application/octet-stream';

        // Fix content type for .ts segments
        if (decodedUrl.endsWith('.ts') || decodedUrl.includes('.ts?')) {
            detectedContentType = 'video/mp2t';
        }

        responseHeaders.set('Content-Type', detectedContentType);

        const contentLength = response.headers.get('Content-Length');
        if (contentLength) {
            responseHeaders.set('Content-Length', contentLength);
        }

        const contentRange = response.headers.get('Content-Range');
        if (contentRange) {
            responseHeaders.set('Content-Range', contentRange);
        }

        responseHeaders.set('Accept-Ranges', 'bytes');
        responseHeaders.set('Access-Control-Allow-Origin', '*');
        responseHeaders.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
        responseHeaders.set('Access-Control-Allow-Headers', '*');

        // Cache segments for better performance
        if (decodedUrl.endsWith('.ts') || decodedUrl.includes('.ts?')) {
            responseHeaders.set('Cache-Control', 'public, max-age=31536000');
        }

        return new NextResponse(response.body, {
            status: response.status,
            statusText: response.statusText,
            headers: responseHeaders,
        });

    } catch (error) {
        console.error('Proxy error:', error);
        return new NextResponse('Failed to fetch resource', { status: 502 });
    }
}

// Handle OPTIONS requests for CORS preflight
export async function OPTIONS() {
    return new NextResponse(null, {
        status: 204,
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': '*',
            'Access-Control-Max-Age': '86400',
        },
    });
}
