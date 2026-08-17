import { generateWebPath } from '../utils.js';
import { InvalidPayloadError, MissingDependencyError, ServiceError } from './errors.js';

const TEMP_SUB_PREFIX = 'tempsub:';
const TEMP_SUB_META_PREFIX = 'tempsub:meta:';
const TEMP_SUB_PATTERN = /^[A-Za-z0-9]{12}$/;

const DEFAULT_MAX_ACCESS = 1;
const DEFAULT_EXPIRE_SECONDS = 60;
const MAX_MAX_ACCESS = 100;
const MAX_EXPIRE_SECONDS = 3600;

/**
 * 临时订阅服务：把一组 proxy（Clash YAML proxies 段）写入 KV，
 * 生成限次/限时访问的临时链接 /t/{id}。
 *
 * KV 数据模型：
 *   tempsub:{id}       -> proxies JSON 数组（带 TTL）
 *   tempsub:meta:{id}  -> { maxAccess, expireAt, accessCount }（带 TTL）
 *
 * Worker 无常驻内存，所以访问计数与过期校验都基于 KV 元数据。
 */
export class TempSubscriptionService {
    constructor(kv, options = {}) {
        this.kv = kv;
        this.options = options;
    }

    ensureKv() {
        if (!this.kv) {
            throw new MissingDependencyError('临时订阅服务需要 KV 存储');
        }
        return this.kv;
    }

    /**
     * 创建临时订阅
     * @param {any[]} proxies - proxy 数组（Clash 风格对象）
     * @param {number} maxAccess - 最大访问次数
     * @param {number} expireSeconds - 过期秒数
     * @returns {Promise<{id: string, maxAccess: number, expireAt: number}>}
     */
    async create(proxies, maxAccess, expireSeconds) {
        const kv = this.ensureKv();

        if (!Array.isArray(proxies) || proxies.length === 0) {
            throw new InvalidPayloadError('proxies 不能为空');
        }

        const access = clampInt(maxAccess, DEFAULT_MAX_ACCESS, MAX_MAX_ACCESS);
        const expire = clampInt(expireSeconds, DEFAULT_EXPIRE_SECONDS, MAX_EXPIRE_SECONDS);
        const now = Date.now();
        const expireAt = now + expire * 1000;

        const id = generateWebPath(12);
        const ttl = Math.max(1, expire);

        await kv.put(
            dataKey(id),
            JSON.stringify(proxies),
            { expirationTtl: ttl }
        );
        await kv.put(
            metaKey(id),
            JSON.stringify({ maxAccess: access, expireAt, accessCount: 0 }),
            { expirationTtl: ttl }
        );

        return { id, maxAccess: access, expireAt };
    }

    /**
     * 访问临时订阅：校验有效期与次数，自增访问计数，返回 proxies。
     * @param {string} id
     * @returns {Promise<any[]|null>} proxies 数组，不可用返回 null
     */
    async access(id) {
        const kv = this.ensureKv();
        const code = String(id || '').trim();
        if (!TEMP_SUB_PATTERN.test(code)) {
            return null;
        }

        const dk = dataKey(code);
        const mk = metaKey(code);

        // 先读元数据，没有则已过期/不存在
        const metaRaw = await kv.get(mk);
        if (!metaRaw) {
            return null;
        }

        let meta;
        try {
            meta = JSON.parse(metaRaw);
        } catch {
            return null;
        }

        if (Date.now() >= meta.expireAt) {
            // 尽力清理
            await kv.delete(dk).catch(() => {});
            await kv.delete(mk).catch(() => {});
            return null;
        }

        if (meta.accessCount >= meta.maxAccess) {
            await kv.delete(dk).catch(() => {});
            await kv.delete(mk).catch(() => {});
            return null;
        }

        const dataRaw = await kv.get(dk);
        if (!dataRaw) {
            return null;
        }

        // 自增计数并回写
        meta.accessCount += 1;
        const remaining = Math.max(1, Math.ceil((meta.expireAt - Date.now()) / 1000));
        await kv.put(mk, JSON.stringify(meta), { expirationTtl: remaining });

        if (meta.accessCount >= meta.maxAccess) {
            await kv.delete(dk).catch(() => {});
            await kv.delete(mk).catch(() => {});
        }

        try {
            const proxies = JSON.parse(dataRaw);
            return Array.isArray(proxies) ? proxies : null;
        } catch {
            return null;
        }
    }
}

function dataKey(id) {
    return TEMP_SUB_PREFIX + id;
}

function metaKey(id) {
    return TEMP_SUB_META_PREFIX + id;
}

function clampInt(value, fallback, max) {
    const n = Number(value);
    if (!Number.isFinite(n) || n <= 0) return fallback;
    if (n > max) return max;
    return Math.floor(n);
}
