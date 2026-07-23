import { DurableObject } from 'cloudflare:workers';
import { normalizeSubscription } from '../services/subscriptionStorageService.js';
import { assertNodeLimits } from '../services/nodeStorageService.js';

const NODES_STATE_KEY = 'nodes';
const SUBSCRIPTIONS_STATE_KEY = 'subscriptions';
const MIGRATION_KEY = 'legacy-kv-migrated';

export class StorageCoordinator extends DurableObject {
    constructor(ctx, env) {
        super(ctx, env);
        this.legacyMigration = null;
    }

    async getNodes() {
        await this.ensureLegacyMigration();
        return this.readNodes();
    }

    async replaceNodes(nodes, expectedRevision) {
        await this.ensureLegacyMigration();
        const current = await this.readNodes();
        if (expectedRevision == null ? current.revision !== 0 : Number(expectedRevision) !== current.revision) {
            return conflict();
        }
        const list = Array.isArray(nodes) ? nodes : [];
        try {
            assertNodeLimits(list);
        } catch (error) {
            return { ok: false, status: error.status || 400, error: error.message || 'invalid nodes' };
        }
        const next = {
            nodes: list,
            revision: current.revision + 1
        };
        await this.ctx.storage.put(NODES_STATE_KEY, next);
        return { ok: true, ...next };
    }

    async clearNodes(expectedRevision) {
        return this.replaceNodes([], expectedRevision);
    }

    async listSubscriptions() {
        await this.ensureLegacyMigration();
        return this.readSubscriptions();
    }

    async getSubscriptionById(id) {
        const items = await this.listSubscriptions();
        return items.find((item) => item.id === id) || null;
    }

    async getSubscriptionBySlug(slug) {
        const items = await this.listSubscriptions();
        return items.find((item) => item.slug === slug) || null;
    }

    async createSubscription(input = {}) {
        await this.ensureLegacyMigration();
        if (!String(input.name || '').trim()) {
            return { ok: false, status: 400, error: '订阅名称不能为空' };
        }
        const items = await this.readSubscriptions();
        let item = normalizeSubscription({
            ...input,
            id: input.id || `sub_${crypto.randomUUID()}`,
            slug: input.slug || generateSlug(),
            createdAt: Date.now(),
            updatedAt: Date.now()
        });
        while (items.some((existing) => existing.slug === item.slug)) {
            item = { ...item, slug: generateSlug() };
        }
        items.unshift(item);
        await this.ctx.storage.put(SUBSCRIPTIONS_STATE_KEY, items);
        return { ok: true, item };
    }

    async updateSubscription(id, patch = {}) {
        await this.ensureLegacyMigration();
        if (Object.prototype.hasOwnProperty.call(patch, 'name') && !String(patch.name || '').trim()) {
            return { ok: false, status: 400, error: '订阅名称不能为空' };
        }
        const items = await this.readSubscriptions();
        const index = items.findIndex((item) => item.id === id);
        if (index < 0) return { ok: false, status: 404, error: '订阅不存在' };

        const previous = items[index];
        const item = normalizeSubscription({
            ...previous,
            ...patch,
            id: previous.id,
            createdAt: previous.createdAt,
            updatedAt: Date.now()
        });
        if (items.some((existing, itemIndex) => itemIndex !== index && existing.slug === item.slug)) {
            return { ok: false, status: 400, error: '短链已存在，请换一个' };
        }
        items[index] = item;
        await this.ctx.storage.put(SUBSCRIPTIONS_STATE_KEY, items);
        return { ok: true, item };
    }

    async removeSubscription(id) {
        await this.ensureLegacyMigration();
        const items = await this.readSubscriptions();
        if (!items.some((item) => item.id === id)) {
            return { ok: false, status: 404, error: '订阅不存在' };
        }
        await this.ctx.storage.put(SUBSCRIPTIONS_STATE_KEY, items.filter((item) => item.id !== id));
        return { ok: true };
    }

    async ensureLegacyMigration() {
        if (await this.ctx.storage.get(MIGRATION_KEY)) return;
        if (!this.legacyMigration) {
            // Reset the in-flight promise on failure so the next request can retry.
            this.legacyMigration = this.migrateLegacyKv().catch((error) => {
                this.legacyMigration = null;
                throw error;
            });
        }
        await this.legacyMigration;
    }

    async migrateLegacyKv() {
        if (await this.ctx.storage.get(MIGRATION_KEY)) return;
        if (!this.env?.SUBLINK_KV) {
            // Fresh DO without KV binding: start empty rather than hanging forever.
            await this.ctx.storage.put(NODES_STATE_KEY, { nodes: [], revision: 0 });
            await this.ctx.storage.put(SUBSCRIPTIONS_STATE_KEY, []);
            await this.ctx.storage.put(MIGRATION_KEY, true);
            return;
        }
        const [nodesRaw, subscriptionsRaw] = await Promise.all([
            this.env.SUBLINK_KV.get('nodes:main'),
            this.env.SUBLINK_KV.get('subscriptions:main')
        ]);
        const nodes = parseLegacyNodes(nodesRaw);
        const subscriptions = parseLegacySubscriptions(subscriptionsRaw);
        await this.ctx.storage.put(NODES_STATE_KEY, nodes);
        await this.ctx.storage.put(SUBSCRIPTIONS_STATE_KEY, subscriptions);
        await this.ctx.storage.put(MIGRATION_KEY, true);
        // Keep legacy KV keys as a one-time source of truth snapshot for rollback;
        // runtime reads after migration always use DO storage.
    }

    async readNodes() {
        const state = await this.ctx.storage.get(NODES_STATE_KEY);
        return {
            nodes: Array.isArray(state?.nodes) ? state.nodes : [],
            revision: Number(state?.revision) || 0
        };
    }

    async readSubscriptions() {
        const items = await this.ctx.storage.get(SUBSCRIPTIONS_STATE_KEY);
        return Array.isArray(items) ? items.map(normalizeSubscription).filter(Boolean) : [];
    }
}

function parseLegacyNodes(raw) {
    if (!raw) return { nodes: [], revision: 0 };
    try {
        const data = JSON.parse(raw);
        const nodes = Array.isArray(data?.nodes) ? data.nodes : Array.isArray(data) ? data : [];
        return { nodes, revision: Number(data?.updatedAt) || 0 };
    } catch {
        throw new Error('Legacy node storage is corrupt');
    }
}

function parseLegacySubscriptions(raw) {
    if (!raw) return [];
    try {
        const data = JSON.parse(raw);
        const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        return items.map(normalizeSubscription).filter(Boolean);
    } catch {
        throw new Error('Legacy subscription storage is corrupt');
    }
}

function conflict() {
    return { ok: false, status: 409, error: '节点库已在其他设备更新，请刷新后重试' };
}

function generateSlug() {
    return crypto.randomUUID().replace(/-/g, '').slice(0, 16);
}
