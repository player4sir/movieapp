/**
 * TS Segment Proxy API
 * 
 * Proxies .ts video segment requests to bypass CORS restrictions.
 * Uses streaming to avoid memory issues on mobile devices.
 * 
 * Query Parameters:
 * - url: The .ts segment URL to proxy (URL encoded)
 * 
 * Requirements: 2.3, 2.4
 */

import { NextRequest, NextResponse } from 'next/server';

// Force dynamic rendering to fix build errors with searchParams
export const dynamic = 'force-dynamic';

// 移动端使用更长的超时时间（Requirements: 2.4）
const FETCH_TIMEOUT = 25000; // 25秒，比M3U8稍长因为分段文件更大

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

    // User-Agent strategies - generic ones that work for most video sources
    const userAgents = [
      'AptvPlayer/1.4.10',
      'Dalvik/2.1.0 (Linux; U; Android 12; Pixel 6 Build/SD1A.210817.023)',
      'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
    ];

    // Use the video source's origin as referer (most natural approach)
    const referers = [
      parsedUrl.origin + '/',
      '', // Also try without referer
    ];

    let response: Response | null = null;
    let lastError: Error | null = null;

    // Try different combinations
    outer: for (const userAgent of userAgents) {
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
