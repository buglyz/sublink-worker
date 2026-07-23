import { RateLimitError } from './errors.js';

/**
 * Lightweight fixed-window counters keyed by client id (per isolate).
 * Not a global rate limiter — good enough for abuse damping on Workers.
 */
export function createRateLimiter({
    name = 'default',
    max = 30,
    windowMs = 15 * 60 * 1000,
    maxKeys = 2000
} = {}) {
    const buckets = new Map();

    function prune(now) {
        for (const [key, entry] of buckets) {
            if (now - entry.windowStart >= windowMs) {
                buckets.delete(key);
            }
        }
        if (buckets.size > maxKeys) {
            const overflow = buckets.size - maxKeys;
            const keys = buckets.keys();
            for (let i = 0; i < overflow; i += 1) {
                const next = keys.next();
                if (next.done) break;
                buckets.delete(next.value);
            }
        }
    }

    function consume(clientKey, label = name) {
        const key = String(clientKey || 'unknown').trim().slice(0, 128) || 'unknown';
        const now = Date.now();
        prune(now);
        let entry = buckets.get(key);
        if (!entry || now - entry.windowStart >= windowMs) {
            entry = { windowStart: now, count: 0 };
        }
        entry.count += 1;
        buckets.set(key, entry);
        if (entry.count > max) {
            const retryAfter = Math.max(1, Math.ceil((entry.windowStart + windowMs - now) / 1000));
            throw new RateLimitError(`${label} 请求过于频繁，请 ${retryAfter} 秒后重试`, retryAfter);
        }
        return {
            remaining: Math.max(0, max - entry.count),
            resetAt: entry.windowStart + windowMs
        };
    }

    function reset() {
        buckets.clear();
    }

    return { consume, reset, max, windowMs };
}
