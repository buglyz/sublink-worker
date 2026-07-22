import { ServiceError } from './errors.js';

const EXPORT_TOKEN_KEY = 'export:token:main';
const SHORT_PREFIX = 'export:short:';

/**
 * Subscription export token (long-lived, independent of login sessions).
 * Preferred client URL form: /sub/<shortId>
 * Also accepts /api/nodes/subscription?token=<token|shortId>
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
            return raw ? { token: raw, shortId: null, createdAt: null, rotatedAt: null } : null;
        }
    }

    async getOrCreate() {
        const existing = await this.get();
        if (existing?.token) {
            if (!existing.shortId) {
                return this.ensureShortId(existing);
            }
            return existing;
        }
        return this.rotate();
    }

    async ensureShortId(record) {
        const kv = this.ensureKv();
        let shortId = record.shortId;
        if (!shortId) {
            shortId = generateShortId();
            record = { ...record, shortId, rotatedAt: record.rotatedAt || Date.now() };
            await kv.put(EXPORT_TOKEN_KEY, JSON.stringify(record));
        }
        await kv.put(SHORT_PREFIX + shortId, record.token);
        return record;
    }

    async rotate() {
        const kv = this.ensureKv();
        const prev = await this.get();
        if (prev?.shortId) {
            try { await kv.delete(SHORT_PREFIX + prev.shortId); } catch {}
        }
        const token = generateToken();
        const shortId = generateShortId();
        const record = {
            token,
            shortId,
            createdAt: prev?.createdAt || Date.now(),
            rotatedAt: Date.now()
        };
        await kv.put(EXPORT_TOKEN_KEY, JSON.stringify(record));
        await kv.put(SHORT_PREFIX + shortId, token);
        return record;
    }

    async resolve(id) {
        if (!id) return null;
        const record = await this.get();
        if (!record?.token) return null;
        if (id === record.token) return record;
        if (record.shortId && id === record.shortId) return record;
        // reverse lookup short map (handles legacy)
        const kv = this.ensureKv();
        const mapped = await kv.get(SHORT_PREFIX + id);
        if (mapped && mapped === record.token) return record;
        if (mapped && mapped === id) return record;
        return null;
    }

    async validate(token) {
        if (!token) return false;
        const hit = await this.resolve(token);
        return Boolean(hit?.token);
    }

    subscriptionPath(record) {
        const id = record.shortId || record.token;
        return `/sub/${encodeURIComponent(id)}`;
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

function generateShortId() {
    // URL-safe short id (~10 chars)
    const bytes = new Uint8Array(8);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(bytes);
    } else {
        for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').slice(0, 12);
}
