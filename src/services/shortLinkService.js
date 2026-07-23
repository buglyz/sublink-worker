import { generateWebPath } from '../utils.js';
import { InvalidPayloadError, MissingDependencyError, ServiceError } from './errors.js';

const SHORT_LINK_PREFIX = 'shortlink:';
const SHORT_CODE_PATTERN = /^[A-Za-z0-9_-]{7,64}$/;
const LEGACY_SHORT_CODE_PATTERN = /^[A-Za-z0-9]{7}$/;

export class ShortLinkService {
    constructor(kv, options = {}) {
        this.kv = kv;
        this.options = options;
    }

    ensureKv() {
        if (!this.kv) {
            throw new MissingDependencyError('Short link service requires a KV store');
        }
        return this.kv;
    }

    async createShortLink(queryString, providedCode) {
        const kv = this.ensureKv();
        const shortCode = providedCode ? normalizeShortCode(providedCode) : generateWebPath(16);
        const key = storageKey(shortCode);
        if (providedCode && await kv.get(key)) {
            throw new ServiceError('Short URL code already exists', 409);
        }
        const ttl = this.options.shortLinkTtlSeconds;
        const putOptions = ttl ? { expirationTtl: ttl } : undefined;
        await kv.put(key, queryString, putOptions);
        return shortCode;
    }

    async resolveShortCode(code) {
        const kv = this.ensureKv();
        const shortCode = String(code || '');
        if (!SHORT_CODE_PATTERN.test(shortCode)) {
            return null;
        }

        const stored = await kv.get(storageKey(shortCode));
        if (stored != null) {
            return stored;
        }

        // Previous releases stored generated seven-character codes at the KV root.
        // Only this exact legacy shape can be read safely without exposing internal keys.
        if (!LEGACY_SHORT_CODE_PATTERN.test(shortCode)) {
            return null;
        }
        const legacy = await kv.get(shortCode);
        return typeof legacy === 'string' && legacy.startsWith('?') ? legacy : null;
    }
}

function normalizeShortCode(value) {
    const shortCode = String(value || '').trim();
    if (!SHORT_CODE_PATTERN.test(shortCode)) {
        throw new InvalidPayloadError('Short URL code must contain 7-64 letters, numbers, underscores, or hyphens');
    }
    return shortCode;
}

function storageKey(shortCode) {
    return SHORT_LINK_PREFIX + shortCode;
}
