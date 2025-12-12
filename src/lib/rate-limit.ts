/**
 * Simple In-Memory Rate Limiter
 * 
 * Provides IP-based rate limiting using a token bucket approach.
 * Note: This state is local to the running instance (serverless function or container).
 * For distributed environments or strict enforcement across multiple instances, use Redis.
 */

interface RateLimitContext {
    count: number;
    resetAt: number;
}

export class RateLimiter {
    private limits = new Map<string, RateLimitContext>();

    // Basic protection against memory leaks: max keys
    private readonly MAX_KEYS = 10000;

    /**
     * Check if a request from an identifier is allowed.
     */
    public check(identifier: string, limit: number, windowMs: number) {
        const now = Date.now();

        // Lazy cleanup: If map gets too big, clear expired ones or clear all if desperate
        if (this.limits.size > this.MAX_KEYS) {
            this.cleanup(now);
            // If still full, clear all (fail open to prevent OOM)
            if (this.limits.size > this.MAX_KEYS) {
                this.limits.clear();
            }
        }

        const context = this.limits.get(identifier);

        // If no record exists or window has expired, reset
        if (!context || now > context.resetAt) {
            this.limits.set(identifier, {
                count: 1,
                resetAt: now + windowMs,
            });
            return { success: true, remaining: limit - 1, reset: now + windowMs };
        }

        // Check limit
        if (context.count >= limit) {
            return { success: false, remaining: 0, reset: context.resetAt };
        }

        // Increment count
        context.count++;
        return { success: true, remaining: limit - context.count, reset: context.resetAt };
    }

    private cleanup(now: number) {
        this.limits.forEach((context, key) => {
            if (now > context.resetAt) {
                this.limits.delete(key);
            }
        });
    }
}

// Global instance
export const rateLimiter = new RateLimiter();
