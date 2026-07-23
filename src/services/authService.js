import { ServiceError, UnauthorizedError } from './errors.js';

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

    async login(password) {
        if (!this.isEnabled()) {
            throw new ServiceError('AUTH_PASSWORD is not configured', 501);
        }
        if (!password || !await secureEquals(password, this.password)) {
            throw new UnauthorizedError('Invalid password');
        }
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
