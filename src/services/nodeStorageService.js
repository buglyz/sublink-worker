import { InvalidPayloadError, MissingDependencyError, ServiceError } from './errors.js';

const NODES_KEY = 'nodes:main';
/** Soft product cap — keeps DO/KV payloads manageable for single-admin use. */
export const MAX_NODE_COUNT = 5000;
/** Approximate serialized size of the nodes array only (UTF-8). */
export const MAX_NODES_PAYLOAD_BYTES = 1_500_000;
export const MAX_NODE_RAW_CHARS = 16_384;

export class NodeStorageService {
    constructor(kv, coordinator = null) {
        this.kv = kv;
        this.coordinator = coordinator;
    }

    ensureKv() {
        if (!this.kv) {
            throw new MissingDependencyError('Node storage requires a KV store');
        }
        return this.kv;
    }

    async list() {
        const snapshot = await this.getSnapshot();
        return snapshot.nodes;
    }

    async getSnapshot() {
        if (this.coordinator) {
            const snapshot = await this.coordinator.getNodes();
            return {
                nodes: Array.isArray(snapshot?.nodes)
                    ? snapshot.nodes.map((n) => (n && typeof n === 'object' ? { ...n } : n))
                    : [],
                revision: Number(snapshot?.revision) || 0
            };
        }
        const kv = this.ensureKv();
        const raw = await kv.get(NODES_KEY);
        if (!raw) return { nodes: [], revision: 0 };
        try {
            const data = JSON.parse(raw);
            const nodes = Array.isArray(data?.nodes) ? data.nodes : Array.isArray(data) ? data : [];
            return { nodes, revision: Number(data?.updatedAt) || 0 };
        } catch {
            throw new ServiceError('Stored nodes are corrupt', 500);
        }
    }

    async replace(nodes, expectedRevision) {
        if (!Array.isArray(nodes)) {
            throw new InvalidPayloadError('nodes must be an array');
        }
        const normalized = nodes.map(normalizeNode).filter(Boolean);
        assertNodeLimits(normalized);
        if (this.coordinator) {
            const result = await this.coordinator.replaceNodes(normalized, normalizeRevision(expectedRevision));
            return unwrapCoordinatorResult(result);
        }

        const current = await this.getSnapshot();
        assertRevision(current.revision, expectedRevision);
        const kv = this.ensureKv();
        // Monotonic even when Date.now() stalls within the same millisecond.
        const revision = Math.max(Number(current.revision) + 1, Date.now());
        const payload = JSON.stringify({
            updatedAt: revision,
            nodes: normalized
        });
        await kv.put(NODES_KEY, payload);
        return { nodes: normalized, revision };
    }

    async save(nodes, expectedRevision) {
        const snapshot = await this.replace(nodes, expectedRevision);
        return snapshot.nodes;
    }

    async clear(expectedRevision) {
        // Keep an empty snapshot key so revision stays readable after clear.
        // Deleting the key would make getSnapshot() report revision 0 while the
        // client still holds a non-zero revision and every later write 409s.
        return this.replace([], expectedRevision);
    }
}

export function assertNodeLimits(nodes) {
    if (!Array.isArray(nodes)) {
        throw new InvalidPayloadError('nodes must be an array');
    }
    if (nodes.length > MAX_NODE_COUNT) {
        throw new InvalidPayloadError(`节点数量不能超过 ${MAX_NODE_COUNT}`);
    }
    let bytes = 2; // []
    for (let i = 0; i < nodes.length; i += 1) {
        const piece = JSON.stringify(nodes[i]);
        bytes += new TextEncoder().encode(piece).byteLength + (i > 0 ? 1 : 0);
        if (bytes > MAX_NODES_PAYLOAD_BYTES) {
            throw new InvalidPayloadError(`节点库过大（上限约 ${Math.floor(MAX_NODES_PAYLOAD_BYTES / 1024)}KB）`);
        }
    }
}

function normalizeNode(node) {
    if (!node || typeof node !== 'object') return null;
    const raw = String(node.raw || '').trim();
    if (!raw) return null;
    if (raw.length > MAX_NODE_RAW_CHARS) {
        throw new InvalidPayloadError(`单条节点过长（上限 ${MAX_NODE_RAW_CHARS} 字符）`);
    }
    const out = {
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
    // Keep subscription provenance for replace/update imports
    if (node.source) out.source = String(node.source).slice(0, 512);
    if (node.sourceUrl) out.sourceUrl = String(node.sourceUrl).slice(0, 512);
    return out;
}

function genId() {
    return 'n_' + crypto.randomUUID();
}

function normalizeRevision(value) {
    return value == null ? null : Number(value);
}

function assertRevision(current, expected) {
    if (expected == null) {
        if (Number(current) !== 0) {
            throw new ServiceError('节点库已在其他设备更新，请刷新后重试', 409);
        }
        return;
    }
    if (!Number.isFinite(Number(expected)) || Number(expected) !== Number(current)) {
        throw new ServiceError('节点库已在其他设备更新，请刷新后重试', 409);
    }
}

function unwrapCoordinatorResult(result) {
    if (!result?.ok) {
        throw new ServiceError(result?.error || '节点库更新失败', result?.status || 500);
    }
    return { nodes: result.nodes || [], revision: result.revision || 0 };
}
