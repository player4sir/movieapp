/**
 * Proxy Configuration and Domain Preference Cache
 * 
 * 管理代理配置和域名级别的代理偏好缓存。
 * 当某个域名返回 403 并成功通过 Cloudflare Worker 代理后，
 * 记住该域名需要使用 Worker，避免后续请求重复尝试直连。
 */

// Cloudflare Worker 代理配置
export const CF_WORKER_PROXY_URL = process.env.VIDEO_PROXY_WORKER_URL || 'https://video-proxy.player4sir.workers.dev';
export const CF_WORKER_SECRET = process.env.VIDEO_PROXY_WORKER_SECRET || '';

// 请求超时配置
export const FETCH_TIMEOUT = {
    M3U8: 20000,  // M3U8 文件 20 秒
    TS: 25000,    // TS 分段 25 秒（文件更大）
};

// 域名代理偏好缓存
interface DomainPreference {
    needsWorker: boolean;
    timestamp: number;
    successCount: number;
    failCount: number;
}

const domainProxyPreference = new Map<string, DomainPreference>();

// 缓存 TTL：5 分钟
const CACHE_TTL = 5 * 60 * 1000;

/**
 * 检查域名是否需要使用 Worker 代理
 */
export function shouldUseWorkerProxy(domain: string): boolean {
    const pref = domainProxyPreference.get(domain);

    if (!pref) {
        return false;
    }

    // 检查缓存是否过期
    if (Date.now() - pref.timestamp > CACHE_TTL) {
        domainProxyPreference.delete(domain);
        return false;
    }

    return pref.needsWorker;
}

/**
 * 标记域名需要使用 Worker 代理
 */
export function markDomainNeedsWorker(domain: string): void {
    const existing = domainProxyPreference.get(domain);

    domainProxyPreference.set(domain, {
        needsWorker: true,
        timestamp: Date.now(),
        successCount: (existing?.successCount || 0) + 1,
        failCount: existing?.failCount || 0,
    });

    console.log(`[ProxyConfig] Marked domain ${domain} as needing Worker proxy`);
}

/**
 * 标记域名可以直连
 */
export function markDomainDirectOk(domain: string): void {
    const existing = domainProxyPreference.get(domain);

    // 只有在之前标记过需要 Worker 时才更新
    if (existing) {
        domainProxyPreference.set(domain, {
            needsWorker: false,
            timestamp: Date.now(),
            successCount: existing.successCount,
            failCount: existing.failCount,
        });
    }
}

/**
 * 记录 Worker 代理失败
 */
export function markWorkerFailed(domain: string): void {
    const existing = domainProxyPreference.get(domain);

    domainProxyPreference.set(domain, {
        needsWorker: existing?.needsWorker || false,
        timestamp: Date.now(),
        successCount: existing?.successCount || 0,
        failCount: (existing?.failCount || 0) + 1,
    });
}

/**
 * 获取域名统计信息（用于调试）
 */
export function getDomainStats(): Record<string, DomainPreference> {
    const stats: Record<string, DomainPreference> = {};

    domainProxyPreference.forEach((pref, domain) => {
        stats[domain] = pref;
    });

    return stats;
}

/**
 * 清理过期的缓存条目
 */
export function cleanupExpiredCache(): void {
    const now = Date.now();

    domainProxyPreference.forEach((pref, domain) => {
        if (now - pref.timestamp > CACHE_TTL) {
            domainProxyPreference.delete(domain);
        }
    });
}

/**
 * 构建 Cloudflare Worker 代理 URL
 */
export function buildWorkerProxyUrl(targetUrl: string): string {
    const workerUrl = new URL('/proxy', CF_WORKER_PROXY_URL);
    workerUrl.searchParams.set('url', targetUrl);

    if (CF_WORKER_SECRET) {
        workerUrl.searchParams.set('key', CF_WORKER_SECRET);
    }

    return workerUrl.toString();
}

/**
 * 通用的 User-Agent 列表
 */
export const USER_AGENTS = [
    'AptvPlayer/1.4.10',
    'Dalvik/2.1.0 (Linux; U; Android 12; Pixel 6 Build/SD1A.210817.023)',
    'Mozilla/5.0 (iPhone; CPU iPhone OS 16_0 like Mac OS X) AppleWebKit/605.1.15',
];
