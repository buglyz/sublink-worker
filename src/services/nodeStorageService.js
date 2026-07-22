import { InvalidPayloadError, MissingDependencyError, ServiceError } from './errors.js';

const NODES_KEY = 'nodes:main';

export class NodeStorageService {
    constructor(kv) {
        this.kv = kv;
    }

    ensureKv() {
        if (!this.kv) {
            throw new MissingDependencyError('Node storage requires a KV store');
        }
        return this.kv;
    }

    async list() {
        const kv = this.ensureKv();
        const raw = await kv.get(NODES_KEY);
        if (!raw) return [];
        try {
            const data = JSON.parse(raw);
            return Array.isArray(data?.nodes) ? data.nodes : Array.isArray(data) ? data : [];
        } catch {
            throw new ServiceError('Stored nodes are corrupt', 500);
        }
    }

    async save(nodes) {
        if (!Array.isArray(nodes)) {
            throw new InvalidPayloadError('nodes must be an array');
        }
        const normalized = nodes.map(normalizeNode).filter(Boolean);
        const kv = this.ensureKv();
        const payload = JSON.stringify({
            updatedAt: Date.now(),
            nodes: normalized
        });
        // no TTL — persistent node library
        await kv.put(NODES_KEY, payload);
        return normalized;
    }

    async clear() {
        const kv = this.ensureKv();
        await kv.delete(NODES_KEY);
        return [];
    }
}

function normalizeNode(node) {
    if (!node || typeof node !== 'object') return null;
    const raw = String(node.raw || '').trim();
    if (!raw) return null;
    return {
        id: String(node.id || genId()),
        raw,
        name: String(node.name || '未命名').slice(0, 120),
        protocol: String(node.protocol || 'unknown').slice(0, 32),
        tag: String(node.tag || '').slice(0, 64),
        enabled: node.enabled !== false,
        selected: Boolean(node.selected),
        createdAt: Number(node.createdAt) || Date.now(),
        updatedAt: Date.now()
    };
}

function genId() {
    return 'n_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
