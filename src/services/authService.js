import { ServiceError, UnauthorizedError, RateLimitError } from './errors.js';

/** Best-effort per-isolate login throttle (Workers may have multiple isolates). */
const loginAttempts = new Map();
const MAX_FAILED_LOGINS = 8;
const LOGIN_WINDOW_MS = 15 * 60 * 1000;
const MAX_TRACKED_CLIENTS = 2000;

export class AuthService {
    /**
     * @param {import('../runtime/runtimeConfig.js').KeyValueStore | null} kv
     * @param {{ password?: string, sessionTtlSeconds?: number }} options
     */
    constructor(kv, options = {}) {
        this.kv = kv;
        this.password = (options.password || '').trim();
        this.sessionTtlSeconds = options.sessionTtlSeconds || 60 * 60 * 24 * 30;
    }

    isEnabled() {
        return Boolean(this.password);
    }

    ensureKv() {
        if (!this.kv) {
            throw new ServiceError('Auth requires KV storage', 501);
        }
        return this.kv;
    }

    /**
     * @param {string} password
     * @param {{ clientKey?: string }} [meta]
     */
    async login(password, meta = {}) {
        if (!this.isEnabled()) {
            throw new ServiceError('AUTH_PASSWORD is not configured', 501);
        }
        const clientKey = normalizeClientKey(meta.clientKey);
        assertNotRateLimited(clientKey);

        if (!password || !await secureEquals(password, this.password)) {
            recordFailedLogin(clientKey);
            throw new UnauthorizedError('Invalid password');
        }
        clearFailedLogins(clientKey);
        const token = generateToken();
        const kv = this.ensureKv();
        const record = JSON.stringify({
            createdAt: Date.now(),
            expiresAt: Date.now() + this.sessionTtlSeconds * 1000,
            passwordFingerprint: await fingerprint(this.password)
        });
        await kv.put(sessionKey(token), record, { expirationTtl: this.sessionTtlSeconds });
        return { token, expiresIn: this.sessionTtlSeconds };
    }

    async logout(token) {
        if (!token || !this.kv) return;
        await this.kv.delete(sessionKey(token));
    }

    async validateToken(token) {
        if (!this.isEnabled()) return true;
        if (!token) return false;
        const kv = this.ensureKv();
        const raw = await kv.get(sessionKey(token));
        if (!raw) return false;
        try {
            const data = JSON.parse(raw);
            if (data.expiresAt && data.expiresAt < Date.now()) {
                await kv.delete(sessionKey(token));
                return false;
            }
            if (!data.passwordFingerprint || !await secureEquals(data.passwordFingerprint, await fingerprint(this.password))) {
                await kv.delete(sessionKey(token));
                return false;
            }
        } catch {
            return false;
        }
        return true;
    }
}

function sessionKey(token) {
    return `auth:sess:${token}`;
}

function generateToken() {
    const bytes = new Uint8Array(24);
    crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

async function fingerprint(value) {
    const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value));
    return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function secureEquals(left, right) {
    const [leftDigest, rightDigest] = await Promise.all([
        crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(left))),
        crypto.subtle.digest('SHA-256', new TextEncoder().encode(String(right)))
    ]);
    const leftBytes = new Uint8Array(leftDigest);
    const rightBytes = new Uint8Array(rightDigest);
    let difference = 0;
    for (let i = 0; i < leftBytes.length; i += 1) {
        difference |= leftBytes[i] ^ rightBytes[i];
    }
    return difference === 0;
}

function normalizeClientKey(value) {
    const key = String(value || 'unknown').trim().slice(0, 128);
    return key || 'unknown';
}

function pruneLoginAttempts(now = Date.now()) {
    for (const [key, entry] of loginAttempts) {
        entry.failures = entry.failures.filter((ts) => now - ts < LOGIN_WINDOW_MS);
        if (!entry.failures.length && (!entry.blockedUntil || entry.blockedUntil <= now)) {
            loginAttempts.delete(key);
        }
    }
    if (loginAttempts.size > MAX_TRACKED_CLIENTS) {
        const overflow = loginAttempts.size - MAX_TRACKED_CLIENTS;
        const keys = loginAttempts.keys();
        for (let i = 0; i < overflow; i += 1) {
            const next = keys.next();
            if (next.done) break;
            loginAttempts.delete(next.value);
        }
    }
}

function assertNotRateLimited(clientKey) {
    const now = Date.now();
    pruneLoginAttempts(now);
    const entry = loginAttempts.get(clientKey);
    if (!entry) return;
    if (entry.blockedUntil && entry.blockedUntil > now) {
        const retryAfterSec = Math.ceil((entry.blockedUntil - now) / 1000);
        throw new RateLimitError(`登录尝试过于频繁，请 ${retryAfterSec} 秒后重试`, retryAfterSec);
    }
}

function recordFailedLogin(clientKey) {
    const now = Date.now();
    pruneLoginAttempts(now);
    const entry = loginAttempts.get(clientKey) || { failures: [], blockedUntil: 0 };
    entry.failures.push(now);
    entry.failures = entry.failures.filter((ts) => now - ts < LOGIN_WINDOW_MS);
    if (entry.failures.length >= MAX_FAILED_LOGINS) {
        entry.blockedUntil = now + LOGIN_WINDOW_MS;
        entry.failures = [];
    }
    loginAttempts.set(clientKey, entry);
}

function clearFailedLogins(clientKey) {
    loginAttempts.delete(clientKey);
}

/** @internal test helper */
export function _resetLoginRateLimitForTests() {
    loginAttempts.clear();
}
