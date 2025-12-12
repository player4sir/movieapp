import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering
export const dynamic = 'force-dynamic';

// 移动端使用更长的超时时间（Requirements: 2.4）
const FETCH_TIMEOUT = 20000; // 20秒

// User-Agent strategies - generic ones that work for most video sources
const USER_AGENTS = [
  'AptvPlayer/1.4.10',
  'Dalvik/2.1.0 (Linux; U; Android 12; Pixel 6 Build/SD1A.210817.023)',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
];

export async function GET(request: NextRequest) {
    const urlStr = request.nextUrl.searchParams.get('url');

    if (!urlStr) {
        return new NextResponse('Missing URL parameter', { status: 400 });
    }

    try {
        const decodedUrl = decodeURIComponent(urlStr);
        const targetUrl = new URL(decodedUrl);

        // Forward Range header for video seeking support
        const range = request.headers.get('range');
        
        // Use the video source's origin as referer (most natural approach)
        const referers = [
            targetUrl.origin + '/',
            '', // Also try without referer
        ];
        
        let response: Response | null = null;
        let lastError: Error | null = null;

        // Try different combinations of User-Agent and Referer
        outer: for (const userAgent of USER_AGENTS) {
            for (const referer of referers) {
                try {
                    const controller = new AbortController();
                    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT);

                    const headers: Record<string, string> = {
                        'User-Agent': userAgent,
                        'Accept': '*/*',
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
            const text = await response.text();
            const origin = request.nextUrl.origin;
            const proxyBase = `${origin}/api/proxy/video?url=`;

            // Use the final URL after redirects for base path calculation
            const finalUrl = response.url || decodedUrl;
            const basePath = finalUrl.substring(0, finalUrl.lastIndexOf('/') + 1);

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
                            return `URI="${proxyBase}${encodeURIComponent(absoluteUri)}"`;
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
                    return `${proxyBase}${encodeURIComponent(fullUrl)}`;
                } catch {
                    return line;
                }
            });

            return new NextResponse(rewrittenLines.join('\n'), {
                status: 200,
                headers: {
                    'Content-Type': 'application/vnd.apple.mpegurl',
                    'Access-Control-Allow-Origin': '*',
                    'Access-Control-Allow-Methods': 'GET, OPTIONS',
                    'Access-Control-Allow-Headers': '*',
                    'Cache-Control': 'no-cache, no-store, must-revalidate',
                }
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
        
        // Cache segments for better mobile performance
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
