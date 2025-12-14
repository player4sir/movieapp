/**
 * TS Segment Proxy API
 * 
 * Proxies .ts video segment requests to bypass CORS restrictions.
 * Uses streaming to avoid memory issues on mobile devices.
 * Includes Cloudflare Worker fallback for 403 errors.
 * 
 * Query Parameters:
 * - url: The .ts segment URL to proxy (URL encoded)
 * 
 * Requirements: 2.3, 2.4
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  FETCH_TIMEOUT,
  USER_AGENTS,
  shouldUseWorkerProxy,
  markDomainNeedsWorker,
  buildWorkerProxyUrl,
  CF_WORKER_PROXY_URL,
} from '@/lib/proxy-config';

// Force dynamic rendering to fix build errors with searchParams
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const url = searchParams.get('url');

    if (!url) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'URL parameter is required' },
        { status: 400 }
      );
    }

    // Decode the URL
    const decodedUrl = decodeURIComponent(url);
    const parsedUrl = new URL(decodedUrl);
    const domain = parsedUrl.hostname;

    // 检查是否应该直接使用 Worker 代理（基于缓存的域名偏好）
    if (shouldUseWorkerProxy(domain) && CF_WORKER_PROXY_URL) {
      console.log(`[TS Proxy] Using cached Worker preference for ${domain}`);
      return await fetchViaWorker(decodedUrl, domain);
    }

    // Use the video source's origin as referer (most natural approach)
    const referers = [
      parsedUrl.origin + '/',
      '', // Also try without referer
    ];

    let response: Response | null = null;
    let lastError: Error | null = null;

    // Try different combinations of User-Agent and Referer
    outer: for (const userAgent of USER_AGENTS) {
      for (const referer of referers) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT.TS);

          const headers: Record<string, string> = {
            'User-Agent': userAgent,
            'Accept': '*/*',
          };

          if (referer) {
            headers['Referer'] = referer;
          }

          response = await fetch(decodedUrl, {
            headers,
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (response.ok) {
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

    // 如果直连返回 403，尝试 Cloudflare Worker 代理
    if (response && response.status === 403 && CF_WORKER_PROXY_URL) {
      console.log('[TS Proxy] Got 403, trying Cloudflare Worker fallback...');
      return await fetchViaWorker(decodedUrl, domain);
    }

    if (!response) {
      throw lastError || new Error('All referer attempts failed');
    }

    if (!response.ok) {
      return NextResponse.json(
        { code: 'PROXY_ERROR', message: `Failed to fetch: ${response.status}` },
        { status: response.status }
      );
    }

    // Stream the response body directly instead of buffering
    // This is critical for mobile devices with limited memory
    return buildStreamingResponse(response);
  } catch (error) {
    // 详细的错误日志（Requirements: 2.4）
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    const isTimeout = errorMessage.includes('timeout') || errorMessage.includes('abort');

    console.error('[TS Proxy] Error:', {
      error: errorMessage,
      isTimeout,
      url: request.nextUrl.searchParams.get('url')?.substring(0, 100),
    });

    // 返回适当的错误响应而非挂起
    return NextResponse.json(
      {
        code: isTimeout ? 'TIMEOUT_ERROR' : 'PROXY_ERROR',
        message: isTimeout ? 'Request timeout' : 'Failed to proxy request'
      },
      { status: isTimeout ? 504 : 502 }
    );
  }
}

/**
 * 通过 Cloudflare Worker 代理获取资源
 */
async function fetchViaWorker(targetUrl: string, domain: string): Promise<NextResponse> {
  try {
    const workerUrl = buildWorkerProxyUrl(targetUrl);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT.TS);

    const response = await fetch(workerUrl, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      // 标记该域名需要使用 Worker 代理
      markDomainNeedsWorker(domain);
      console.log('[TS Proxy] Cloudflare Worker fallback succeeded');
      return buildStreamingResponse(response);
    } else {
      console.error('[TS Proxy] Cloudflare Worker fallback failed:', response.status);
      return NextResponse.json(
        { code: 'PROXY_ERROR', message: `Worker proxy failed: ${response.status}` },
        { status: response.status }
      );
    }
  } catch (err) {
    console.error('[TS Proxy] Cloudflare Worker fallback error:', err);
    return NextResponse.json(
      { code: 'PROXY_ERROR', message: 'Worker proxy request failed' },
      { status: 502 }
    );
  }
}

/**
 * 构建流式响应
 */
function buildStreamingResponse(response: Response): NextResponse {
  const responseHeaders = new Headers({
    'Content-Type': 'video/mp2t',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': '*',
    'Cache-Control': 'public, max-age=31536000',
  });

  // Forward Content-Length if available
  const contentLength = response.headers.get('Content-Length');
  if (contentLength) {
    responseHeaders.set('Content-Length', contentLength);
  }

  // Stream the response body directly
  return new NextResponse(response.body, {
    status: 200,
    headers: responseHeaders,
  });
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
