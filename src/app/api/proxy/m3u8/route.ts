/**
 * M3U8 Proxy API
 * 
 * Proxies m3u8 video stream requests to bypass CORS restrictions.
 * This allows the frontend to play videos from third-party sources.
 * 
 * Query Parameters:
 * - token: Playback token containing the URL (preferred)
 * - url: The m3u8 URL to proxy (legacy, URL encoded)
 * - adFree: Enable ad filtering (requires premium subscription)
 * 
 * Requirements: 2.1, 2.2, 2.4, 2.5
 */

import { NextRequest, NextResponse } from 'next/server';
import { filterM3U8Ads, AdFilterConfig } from '@/lib/ad-filter';
import { verifyPlaybackToken, generatePlaybackToken } from '@/services/playback-token.service';
import {
  FETCH_TIMEOUT,
  USER_AGENTS,
  CF_WORKER_PROXY_URL,
  shouldUseWorkerProxy,
  markDomainNeedsWorker,
  buildWorkerProxyUrl,
} from '@/lib/proxy-config';

// Force dynamic rendering to fix build errors with searchParams
export const dynamic = 'force-dynamic';

/**
 * 解析URL中的相对路径，返回绝对URL
 * 支持多种相对路径格式：
 * - 绝对URL: http://example.com/path
 * - 绝对路径: /path/to/file
 * - 相对路径: path/to/file 或 ./path/to/file 或 ../path/to/file
 * 
 * Requirements: 2.2
 */
function resolveUrl(urlStr: string, baseUrl: string, origin: string): string {
  const trimmed = urlStr.trim();

  // 已经是绝对URL
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // 绝对路径（以/开头）
  if (trimmed.startsWith('/')) {
    return origin + trimmed;
  }

  // 处理 ./ 开头的相对路径
  let relativePath = trimmed;
  if (relativePath.startsWith('./')) {
    relativePath = relativePath.substring(2);
  }

  // 处理 ../ 开头的相对路径
  if (relativePath.startsWith('../')) {
    try {
      return new URL(relativePath, baseUrl).toString();
    } catch {
      // 如果URL构造失败，回退到简单拼接
      return baseUrl + relativePath;
    }
  }

  // 普通相对路径
  return baseUrl + relativePath;
}

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const token = searchParams.get('token');

    // SECURITY: Token is required - no legacy URL fallback allowed
    if (!token) {
      return NextResponse.json(
        { code: 'FORBIDDEN', message: 'Valid playback token required' },
        { status: 403 }
      );
    }

    const payload = verifyPlaybackToken(token);
    if (!payload) {
      console.error('[M3U8 Proxy] Token verification failed', {
        tokenLength: token.length,
        tokenPrefix: token.substring(0, 20) + '...',
      });
      return NextResponse.json(
        { code: 'FORBIDDEN', message: 'Invalid or expired playback token' },
        { status: 403 }
      );
    }

    const targetUrl = payload.url;
    if (!targetUrl) {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Token missing URL' },
        { status: 400 }
      );
    }

    // 解码URL（legacy模式的URL是编码的）
    const decodedUrl = decodeURIComponent(targetUrl);
    const adFree = searchParams.get('adFree') === 'true';

    // 验证URL格式
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(decodedUrl);
    } catch {
      return NextResponse.json(
        { code: 'VALIDATION_ERROR', message: 'Invalid URL format' },
        { status: 400 }
      );
    }

    const domain = parsedUrl.hostname;

    // 检查是否应该直接使用 Worker 代理（基于缓存的域名偏好）
    let response: Response | null = null;
    let lastError: Error | null = null;
    let usedCachedWorker = false;

    if (shouldUseWorkerProxy(domain) && CF_WORKER_PROXY_URL) {
      console.log(`[M3U8 Proxy] Using cached Worker preference for ${domain}`);
      const workerUrl = buildWorkerProxyUrl(decodedUrl);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT.M3U8);

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
        console.error('[M3U8 Proxy] Cached Worker request failed:', err);
        response = null;
      }
    }

    // 使用视频源的origin作为referer
    const referers = [
      parsedUrl.origin + '/',
      '',
    ];

    // 如果缓存的 Worker 没有成功，尝试直连
    if (!usedCachedWorker) {
      // Try different combinations of User-Agent and Referer
      outer: for (const userAgent of USER_AGENTS) {
        for (const referer of referers) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT.M3U8);

            // Build headers - some servers reject requests with Origin header
            const headers: Record<string, string> = {
              'User-Agent': userAgent,
              'Accept': '*/*',
              'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.8',
            };

            // Only add Referer if not empty
            if (referer) {
              headers['Referer'] = referer;
            }

            response = await fetch(decodedUrl, {
              headers,
              signal: controller.signal,
            });

            clearTimeout(timeoutId);

            if (response.ok) {
              break outer; // Success, exit both loops
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
        console.log('[M3U8 Proxy] Got 403, trying Cloudflare Worker fallback...');
        try {
          const workerUrl = buildWorkerProxyUrl(decodedUrl);

          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), FETCH_TIMEOUT.M3U8);

          response = await fetch(workerUrl, {
            signal: controller.signal,
          });

          clearTimeout(timeoutId);

          if (response.ok) {
            // 标记该域名需要使用 Worker 代理
            markDomainNeedsWorker(domain);
            console.log('[M3U8 Proxy] Cloudflare Worker fallback succeeded');
          } else {
            console.error('[M3U8 Proxy] Cloudflare Worker fallback failed:', response.status);
          }
        } catch (err) {
          console.error('[M3U8 Proxy] Cloudflare Worker fallback error:', err);
          // Keep the original 403 response
        }
      }
    } // end of if (!usedCachedWorker)

    if (!response) {
      throw lastError || new Error('All referer attempts failed');
    }

    if (!response.ok) {
      return NextResponse.json(
        { code: 'PROXY_ERROR', message: `Failed to fetch: ${response.status}` },
        { status: response.status }
      );
    }

    const contentType = response.headers.get('content-type') || '';
    const content = await response.text();

    if (contentType.includes('mpegurl') || decodedUrl.endsWith('.m3u8')) {
      // 使用重定向后的最终URL作为基础URL（Requirements: 2.5）
      const finalUrl = response.url || decodedUrl;
      const baseUrl = finalUrl.substring(0, finalUrl.lastIndexOf('/') + 1);

      // 解析最终URL以获取origin
      let finalOrigin: string;
      try {
        finalOrigin = new URL(finalUrl).origin;
      } catch {
        finalOrigin = parsedUrl.origin;
      }

      let processedContent = content;

      // Note: Preview mode truncation has been removed.
      // All authenticated users with access get full content.

      // 广告过滤
      let adFilterStats = { filtered: 0, total: 0 };
      if (adFree) {
        const adFilterConfig: Partial<AdFilterConfig> = {
          enabled: true,
          filterDiscontinuitySections: true,
          filterDiscontinuity: true,
          maxAdSectionDuration: 120,
          minMainContentSegments: 10,
        };

        const filterResult = filterM3U8Ads(processedContent, baseUrl, adFilterConfig);
        processedContent = filterResult.filteredContent;
        adFilterStats = {
          filtered: filterResult.filteredSegments,
          total: filterResult.totalSegments,
        };
      }

      // URL重写（Requirements: 2.2）
      const rewrittenContent = processedContent.split('\n').map(line => {
        const trimmedLine = line.trim();

        // 跳过空行
        if (!trimmedLine) {
          return line;
        }

        // 处理EXT-X-KEY中的URI
        if (trimmedLine.includes('URI="')) {
          return trimmedLine.replace(/URI="([^"]+)"/, (match, uri) => {
            const absoluteUri = resolveUrl(uri, baseUrl, finalOrigin);
            const keyToken = generatePlaybackToken({
              url: absoluteUri,
              isPreview: false
            });
            return `URI="/api/proxy/m3u8?token=${keyToken}"`;
          });
        }

        // 跳过其他注释/标签
        if (trimmedLine.startsWith('#')) {
          return line;
        }

        // 解析相对URL为绝对URL
        const absoluteUrl = resolveUrl(trimmedLine, baseUrl, finalOrigin);

        // 为资源生成播放 token
        const resToken = generatePlaybackToken({
          url: absoluteUrl,
          isPreview: false
        });

        // 代理嵌套的m3u8文件
        if (trimmedLine.endsWith('.m3u8') || trimmedLine.includes('.m3u8?') ||
          trimmedLine.includes('.m3u8#') || /\.m3u8\b/.test(trimmedLine)) {
          const adFreeParam = adFree ? '&adFree=true' : '';
          return `/api/proxy/m3u8?token=${resToken}${adFreeParam}`;
        }

        // 其他所有资源（.ts, .key, .png 等）通过 ts 代理处理签名验证和直连/Worker回退
        return `/api/proxy/ts?token=${resToken}`;

        return line;
      }).join('\n');

      // 设置响应头（Requirements: 2.1）
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

      return new NextResponse(rewrittenContent, {
        status: 200,
        headers: responseHeaders,
      });
    }

    return new NextResponse(content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error) {
    console.error('M3U8 proxy error:', error);
    return NextResponse.json(
      { code: 'PROXY_ERROR', message: 'Failed to proxy request' },
      { status: 500 }
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
