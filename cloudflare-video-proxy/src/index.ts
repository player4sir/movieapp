/**
 * Cloudflare Video Proxy Worker
 * 
 * 代理视频流请求，绕过 403 限制
 * - 支持 M3U8 和 TS 文件代理
 * - 自动处理 Referer/Origin 头
 * - 可选的密钥验证
 * - 边缘缓存支持
 */

interface Env {
    PROXY_SECRET?: string;
    ALLOWED_DOMAINS?: string;
}

// 缓存时间配置
const CACHE_TTL = {
    M3U8: 10,        // M3U8 文件缓存 10 秒（动态播放列表）
    TS: 86400,       // TS 片段缓存 24 小时
    OTHER: 3600,     // 其他文件缓存 1 小时
};

// CORS 响应头
const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Range',
    'Access-Control-Expose-Headers': 'Content-Length, Content-Range',
};

export default {
    async fetch(request: Request, env: Env): Promise<Response> {
        const url = new URL(request.url);

        // 处理 CORS 预检请求
        if (request.method === 'OPTIONS') {
            return new Response(null, { headers: corsHeaders });
        }

        // 健康检查端点
        if (url.pathname === '/health') {
            return new Response('OK', {
                status: 200,
                headers: { 'Content-Type': 'text/plain' }
            });
        }

        // 代理端点
        if (url.pathname === '/proxy' || url.pathname.startsWith('/proxy/')) {
            return handleProxy(request, url, env);
        }

        // 404 for other paths
        return new Response('Not Found', { status: 404 });
    },
};

/**
 * 处理代理请求
 */
async function handleProxy(request: Request, url: URL, env: Env): Promise<Response> {
    // 获取目标 URL
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
        return new Response(JSON.stringify({ error: 'Missing url parameter' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
    }

    // 验证密钥（如果配置了）
    if (env.PROXY_SECRET) {
        const key = url.searchParams.get('key');
        if (key !== env.PROXY_SECRET) {
            return new Response(JSON.stringify({ error: 'Invalid or missing key' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json', ...corsHeaders },
            });
        }
    }

    // 解析目标 URL
    let parsedTarget: URL;
    try {
        parsedTarget = new URL(targetUrl);
    } catch {
        return new Response(JSON.stringify({ error: 'Invalid url parameter' }), {
            status: 400,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
    }

    // 检查域名白名单（如果配置了）
    if (env.ALLOWED_DOMAINS) {
        const allowedDomains = env.ALLOWED_DOMAINS.split(',').map(d => d.trim().toLowerCase());
        const targetHost = parsedTarget.hostname.toLowerCase();

        const isAllowed = allowedDomains.some(domain =>
            targetHost === domain || targetHost.endsWith('.' + domain)
        );

        if (!isAllowed) {
            return new Response(JSON.stringify({ error: 'Domain not allowed' }), {
                status: 403,
                headers: { 'Content-Type': 'application/json', ...corsHeaders },
            });
        }
    }

    // 构建代理请求
    const proxyRequest = new Request(targetUrl, {
        method: request.method,
        headers: buildProxyHeaders(request, parsedTarget),
    });

    try {
        // 发送请求到源站
        const response = await fetch(proxyRequest);

        // 检查响应状态
        if (!response.ok) {
            console.error(`Upstream error: ${response.status} for ${targetUrl}`);
        }

        // 获取响应内容
        const contentType = response.headers.get('Content-Type') || '';
        const isM3u8 = targetUrl.toLowerCase().includes('.m3u8') ||
            contentType.includes('mpegurl') ||
            contentType.includes('x-mpegURL');

        // 处理 M3U8 文件 - 需要重写内部 URL
        if (isM3u8) {
            return handleM3u8Response(response, parsedTarget, url, env);
        }

        // 其他文件直接返回并添加缓存
        const cacheTtl = getCacheTtl(targetUrl);

        return new Response(response.body, {
            status: response.status,
            headers: {
                ...Object.fromEntries(response.headers.entries()),
                ...corsHeaders,
                'Cache-Control': `public, max-age=${cacheTtl}`,
            },
        });
    } catch (error) {
        console.error('Proxy error:', error);
        return new Response(JSON.stringify({ error: 'Proxy request failed' }), {
            status: 502,
            headers: { 'Content-Type': 'application/json', ...corsHeaders },
        });
    }
}

/**
 * 构建代理请求头
 */
function buildProxyHeaders(originalRequest: Request, targetUrl: URL): Headers {
    const headers = new Headers();

    // 复制必要的请求头
    const headersToForward = ['Range', 'Accept', 'Accept-Encoding', 'Accept-Language'];
    for (const header of headersToForward) {
        const value = originalRequest.headers.get(header);
        if (value) {
            headers.set(header, value);
        }
    }

    // 设置合适的请求头以避免 403
    headers.set('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36');
    headers.set('Referer', targetUrl.origin + '/');
    headers.set('Origin', targetUrl.origin);
    headers.set('Host', targetUrl.host);

    // 移除可能暴露代理的头
    headers.delete('CF-Connecting-IP');
    headers.delete('CF-IPCountry');
    headers.delete('CF-RAY');
    headers.delete('CF-Visitor');
    headers.delete('X-Forwarded-For');
    headers.delete('X-Forwarded-Proto');

    return headers;
}

/**
 * 处理 M3U8 响应 - 重写内部 URL
 */
async function handleM3u8Response(
    response: Response,
    originalTarget: URL,
    proxyUrl: URL,
    env: Env
): Promise<Response> {
    const text = await response.text();

    // 重写 M3U8 内容中的 URL
    const rewrittenContent = rewriteM3u8Content(text, originalTarget, proxyUrl, env);

    return new Response(rewrittenContent, {
        status: response.status,
        headers: {
            'Content-Type': 'application/vnd.apple.mpegurl',
            ...corsHeaders,
            'Cache-Control': `public, max-age=${CACHE_TTL.M3U8}`,
        },
    });
}

/**
 * 重写 M3U8 内容中的 URL
 */
function rewriteM3u8Content(
    content: string,
    originalTarget: URL,
    proxyUrl: URL,
    env: Env
): string {
    const lines = content.split('\n');
    const baseUrl = originalTarget.href.substring(0, originalTarget.href.lastIndexOf('/') + 1);
    const proxyBase = `${proxyUrl.origin}/proxy`;

    // 构建代理 URL 参数
    const keyParam = env.PROXY_SECRET ? `&key=${env.PROXY_SECRET}` : '';

    return lines.map(line => {
        const trimmedLine = line.trim();

        // 跳过注释和空行（但保留 #EXT 标签）
        if (trimmedLine === '' || (trimmedLine.startsWith('#') && !trimmedLine.includes('URI='))) {
            // 处理 #EXT-X-KEY 等带 URI 的标签
            if (trimmedLine.includes('URI="')) {
                return rewriteUriInTag(trimmedLine, baseUrl, proxyBase, keyParam);
            }
            return line;
        }

        // 处理 URL 行
        if (!trimmedLine.startsWith('#')) {
            let absoluteUrl: string;

            if (trimmedLine.startsWith('http://') || trimmedLine.startsWith('https://')) {
                // 已经是绝对 URL
                absoluteUrl = trimmedLine;
            } else if (trimmedLine.startsWith('/')) {
                // 从根路径开始的相对 URL
                absoluteUrl = `${originalTarget.origin}${trimmedLine}`;
            } else {
                // 相对于当前目录的 URL
                absoluteUrl = `${baseUrl}${trimmedLine}`;
            }

            // 重写为代理 URL
            return `${proxyBase}?url=${encodeURIComponent(absoluteUrl)}${keyParam}`;
        }

        return line;
    }).join('\n');
}

/**
 * 重写标签中的 URI 属性
 */
function rewriteUriInTag(
    line: string,
    baseUrl: string,
    proxyBase: string,
    keyParam: string
): string {
    return line.replace(/URI="([^"]+)"/g, (match, uri) => {
        let absoluteUrl: string;

        if (uri.startsWith('http://') || uri.startsWith('https://')) {
            absoluteUrl = uri;
        } else if (uri.startsWith('/')) {
            const origin = new URL(baseUrl).origin;
            absoluteUrl = `${origin}${uri}`;
        } else {
            absoluteUrl = `${baseUrl}${uri}`;
        }

        return `URI="${proxyBase}?url=${encodeURIComponent(absoluteUrl)}${keyParam}"`;
    });
}

/**
 * 根据文件类型获取缓存时间
 */
function getCacheTtl(url: string): number {
    const lowerUrl = url.toLowerCase();

    if (lowerUrl.includes('.m3u8')) {
        return CACHE_TTL.M3U8;
    }

    if (lowerUrl.includes('.ts') || lowerUrl.includes('.m4s')) {
        return CACHE_TTL.TS;
    }

    return CACHE_TTL.OTHER;
}
