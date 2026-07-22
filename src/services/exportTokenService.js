import { ServiceError } from './errors.js';

const EXPORT_TOKEN_KEY = 'export:token:main';

/**
 * Long-lived subscription export token, independent of login sessions.
 * Clients should use /api/nodes/subscription?token=<exportToken>
 */
export class ExportTokenService {
    constructor(kv) {
        this.kv = kv;
    }

    ensureKv() {
        if (!this.kv) {
            throw new ServiceError('Export token requires KV storage', 501);
        }
        return this.kv;
    }

    async get() {
        const kv = this.ensureKv();
        const raw = await kv.get(EXPORT_TOKEN_KEY);
        if (!raw) return null;
        try {
            const data = JSON.parse(raw);
            return data && data.token ? data : null;
        } catch {
            // legacy plain token string
            return raw ? { token: raw, createdAt: null, rotatedAt: null } : null;
        }
    }

    async getOrCreate() {
        const existing = await this.get();
        if (existing?.token) return existing;
        return this.rotate();
    }

    async rotate() {
        const kv = this.ensureKv();
        const token = generateToken();
        const prev = await this.get();
        const record = {
            token,
            createdAt: prev?.createdAt || Date.now(),
            rotatedAt: Date.now()
        };
        // No expirationTtl — long-lived until manually rotated
        await kv.put(EXPORT_TOKEN_KEY, JSON.stringify(record));
        return record;
    }

    async validate(token) {
        if (!token) return false;
        const record = await this.get();
        return Boolean(record?.token && record.token === token);
    }
}

function generateToken() {
    const bytes = new Uint8Array(24);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(bytes);
    } else {
        for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}
