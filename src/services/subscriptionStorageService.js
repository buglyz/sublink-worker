import { InvalidPayloadError, MissingDependencyError, ServiceError } from './errors.js';

const LIST_KEY = 'subscriptions:main';
const SLUG_PREFIX = 'subfile:slug:';

/**
 * Managed subscriptions (miaomiaowu-style subscribe files, KV-backed).
 * Each item can select library node IDs + Clash template/rules and has a public slug URL.
 */
export class SubscriptionStorageService {
    constructor(kv) {
        this.kv = kv;
    }

    ensureKv() {
        if (!this.kv) {
            throw new MissingDependencyError('Subscription storage requires a KV store');
        }
        return this.kv;
    }

    async list() {
        const kv = this.ensureKv();
        const raw = await kv.get(LIST_KEY);
        if (!raw) return [];
        try {
            const data = JSON.parse(raw);
            const list = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
            return list.map(normalizeSubscription).filter(Boolean);
        } catch {
            throw new ServiceError('Stored subscriptions are corrupt', 500);
        }
    }

    async getById(id) {
        const list = await this.list();
        return list.find((s) => s.id === id) || null;
    }

    async getBySlug(slug) {
        const key = String(slug || '').trim();
        if (!key) return null;
        const kv = this.ensureKv();
        const id = await kv.get(SLUG_PREFIX + key);
        if (id) {
            const hit = await this.getById(id);
            if (hit) return hit;
        }
        // fallback scan
        const list = await this.list();
        return list.find((s) => s.slug === key) || null;
    }

    async create(input = {}) {
        const list = await this.list();
        const now = Date.now();
        const item = normalizeSubscription({
            ...input,
            id: input.id || genId(),
            slug: input.slug || genSlug(),
            createdAt: now,
            updatedAt: now
        });
        if (!item.name) throw new InvalidPayloadError('订阅名称不能为空');
        if (list.some((s) => s.slug === item.slug)) {
            item.slug = genSlug();
        }
        list.unshift(item);
        await this.saveAll(list);
        await this.indexSlug(item.slug, item.id);
        return item;
    }

    async update(id, patch = {}) {
        const list = await this.list();
        const idx = list.findIndex((s) => s.id === id);
        if (idx < 0) throw new ServiceError('订阅不存在', 404);
        const prev = list[idx];
        const next = normalizeSubscription({
            ...prev,
            ...patch,
            id: prev.id,
            createdAt: prev.createdAt,
            updatedAt: Date.now()
        });
        if (!next.name) throw new InvalidPayloadError('订阅名称不能为空');
        // slug change
        if (next.slug !== prev.slug) {
            if (list.some((s, i) => i !== idx && s.slug === next.slug)) {
                throw new InvalidPayloadError('短链已存在，请换一个');
            }
            await this.dropSlug(prev.slug);
            await this.indexSlug(next.slug, next.id);
        }
        list[idx] = next;
        await this.saveAll(list);
        return next;
    }

    async remove(id) {
        const list = await this.list();
        const prev = list.find((s) => s.id === id);
        if (!prev) throw new ServiceError('订阅不存在', 404);
        const next = list.filter((s) => s.id !== id);
        await this.saveAll(next);
        await this.dropSlug(prev.slug);
        return true;
    }

    async saveAll(items) {
        const kv = this.ensureKv();
        const normalized = (items || []).map(normalizeSubscription).filter(Boolean);
        await kv.put(LIST_KEY, JSON.stringify({ updatedAt: Date.now(), items: normalized }));
        return normalized;
    }

    async indexSlug(slug, id) {
        if (!slug || !id) return;
        await this.ensureKv().put(SLUG_PREFIX + slug, id);
    }

    async dropSlug(slug) {
        if (!slug) return;
        try { await this.ensureKv().delete(SLUG_PREFIX + slug); } catch {}
    }
}

function normalizeSubscription(raw) {
    if (!raw || typeof raw !== 'object') return null;
    const id = String(raw.id || genId());
    const name = String(raw.name || '').trim().slice(0, 80);
    const nodeIds = Array.isArray(raw.nodeIds)
        ? raw.nodeIds.map(String).filter(Boolean).slice(0, 5000)
        : [];
    return {
        id,
        name: name || '未命名订阅',
        description: String(raw.description || '').slice(0, 200),
        slug: String(raw.slug || genSlug()).replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32) || genSlug(),
        nodeIds,
        // generation prefs
        mode: raw.mode === 'template' ? 'template' : 'custom',
        template: String(raw.template || '').slice(0, 120),
        selectedRules: raw.selectedRules ?? 'balanced',
        customRules: Array.isArray(raw.customRules) ? raw.customRules.slice(0, 100) : [],
        groupByCountry: !!raw.groupByCountry,
        includeAutoSelect: raw.includeAutoSelect !== false,
        enabled: raw.enabled !== false,
        createdAt: Number(raw.createdAt) || Date.now(),
        updatedAt: Number(raw.updatedAt) || Date.now()
    };
}

function genId() {
    return 'sub_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function genSlug() {
    const bytes = new Uint8Array(6);
    if (typeof crypto !== 'undefined' && crypto.getRandomValues) {
        crypto.getRandomValues(bytes);
    } else {
        for (let i = 0; i < bytes.length; i++) bytes[i] = Math.floor(Math.random() * 256);
    }
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('').slice(0, 10);
}
