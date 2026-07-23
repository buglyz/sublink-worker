import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app/createApp.jsx';
import { MemoryKVAdapter } from '../src/adapters/kv/memoryKv.js';
import { AuthService } from '../src/services/authService.js';
import { NodeStorageService } from '../src/services/nodeStorageService.js';
import { NodeImportService } from '../src/services/nodeImportService.js';
import { SubscriptionStorageService } from '../src/services/subscriptionStorageService.js';
import { normalizeRuntime } from '../src/runtime/runtimeConfig.js';
import { fetchRemoteText } from '../src/parsers/subscription/remoteFetch.js';

const testNode = 'ss://YWVzLTEyOC1nY206cGFzc3dvcmQ=@example.com:443#audit';

function createTestApp(kv, authPassword = '', extra = {}) {
    return createApp({
        kv,
        authPassword,
        logger: console,
        config: { configTtlSeconds: 60, shortLinkTtlSeconds: null },
        ...extra
    });
}

describe('security regressions', () => {
    it('does not resolve internal KV records as short links', async () => {
        const kv = new MemoryKVAdapter();
        await kv.put('export:token:main', JSON.stringify({ token: 'audit-secret-token' }));
        const app = createTestApp(kv);

        const res = await app.request('http://localhost/resolve?url=https%3A%2F%2Fexample.invalid%2Fc%2Fexport%3Atoken%3Amain');

        expect(res.status).toBe(404);
        expect(await res.text()).not.toContain('audit-secret-token');
    });

    it('rejects reserved KV names as public short-link codes', async () => {
        const kv = new MemoryKVAdapter();
        const app = createTestApp(kv, 'owner-password');
        await kv.put('nodes:main', JSON.stringify({ nodes: [{ id: 'n1', raw: testNode, enabled: true }] }));

        const write = await app.request('http://localhost/shorten-v2?url=https%3A%2F%2Fexample.com%2F%3Fp%3D1&shortCode=export%3Atoken%3Amain');
        const exportResult = await app.request('http://localhost/sub/%3Fattacker%3Dknown?format=raw');

        expect(write.status).toBe(400);
        expect(exportResult.status).toBe(401);
        expect(await kv.get('nodes:main')).toContain(testNode);
    });

    it('does not use internal KV JSON as a public base config', async () => {
        const kv = new MemoryKVAdapter();
        await kv.put('export:token:main', JSON.stringify({ token: 'audit-secret-token' }));
        const app = createTestApp(kv);

        const res = await app.request(`http://localhost/clash?config=${encodeURIComponent(testNode)}&configId=export%3Atoken%3Amain`);

        expect(res.status).toBe(200);
        expect(await res.text()).not.toContain('audit-secret-token');
    });

    it('keeps default memory-KV sessions alive and invalidates them after password rotation', async () => {
        const kv = new MemoryKVAdapter();
        const firstAuth = new AuthService(kv, { password: 'old-password' });
        const { token } = await firstAuth.login('old-password');
        await new Promise((resolve) => setTimeout(resolve, 20));

        expect(await firstAuth.validateToken(token)).toBe(true);
        expect(await new AuthService(kv, { password: 'new-password' }).validateToken(token)).toBe(false);
    });

    it('rejects stale node writes through the storage coordinator', async () => {
        let snapshot = { nodes: [], revision: 0 };
        const coordinator = {
            async getNodes() {
                return snapshot;
            },
            async replaceNodes(nodes, revision) {
                if (revision !== snapshot.revision) {
                    return { ok: false, status: 409, error: 'conflict' };
                }
                snapshot = { nodes, revision: snapshot.revision + 1 };
                return { ok: true, ...snapshot };
            },
            async clearNodes(revision) {
                return this.replaceNodes([], revision);
            }
        };
        const storage = new NodeStorageService(new MemoryKVAdapter(), coordinator);
        const initial = await storage.getSnapshot();

        const results = await Promise.allSettled([
            storage.replace([{ raw: testNode }], initial.revision),
            storage.replace([{ raw: `${testNode}-second` }], initial.revision)
        ]);

        expect(results.filter((result) => result.status === 'fulfilled')).toHaveLength(1);
        expect(results.filter((result) => result.status === 'rejected')).toHaveLength(1);
    });

    it('keeps node revision usable after clear on pure KV storage', async () => {
        const kv = new MemoryKVAdapter();
        const storage = new NodeStorageService(kv);
        const first = await storage.replace([{ raw: testNode }], 0);
        expect(first.nodes).toHaveLength(1);
        expect(first.revision).toBeGreaterThan(0);

        const cleared = await storage.clear(first.revision);
        expect(cleared.nodes).toEqual([]);
        expect(cleared.revision).toBeGreaterThan(first.revision);

        const snapshot = await storage.getSnapshot();
        expect(snapshot.revision).toBe(cleared.revision);

        const restored = await storage.replace([{ raw: testNode }], cleared.revision);
        expect(restored.nodes).toHaveLength(1);
        expect(restored.revision).toBeGreaterThan(cleared.revision);
    });

    it('preserves storageCoordinator through normalizeRuntime into createApp', async () => {
        const coordinator = {
            async getNodes() {
                return {
                    nodes: [{ id: 'n1', raw: testNode, enabled: true, name: 'a', protocol: 'ss' }],
                    revision: 7
                };
            },
            async listSubscriptions() {
                return [];
            }
        };
        const kv = new MemoryKVAdapter();
        const runtime = normalizeRuntime({
            kv,
            storageCoordinator: coordinator,
            config: { configTtlSeconds: 60, shortLinkTtlSeconds: null }
        });
        expect(runtime.storageCoordinator).toBe(coordinator);

        const app = createApp({ ...runtime, authPassword: '' });
        const res = await app.request('http://localhost/api/nodes');
        expect(res.status).toBe(200);
        const body = await res.json();
        expect(body.nodes).toHaveLength(1);
        expect(body.revision).toBe(7);
    });

    it('retries remote import after a single revision conflict', async () => {
        let snapshot = {
            nodes: [{ id: 'keep', raw: `${testNode}-keep`, name: 'keep', protocol: 'ss', enabled: true }],
            revision: 1
        };
        let forceConflictOnce = true;
        const storage = {
            async getSnapshot() {
                return { nodes: snapshot.nodes.map((n) => ({ ...n })), revision: snapshot.revision };
            },
            async replace(nodes, expected) {
                if (forceConflictOnce) {
                    forceConflictOnce = false;
                    snapshot = {
                        nodes: [
                            ...snapshot.nodes,
                            { id: 'peer', raw: `${testNode}-peer`, name: 'peer', protocol: 'ss', enabled: true }
                        ],
                        revision: snapshot.revision + 1
                    };
                    const err = new Error('节点库已在其他设备更新，请刷新后重试');
                    err.status = 409;
                    throw err;
                }
                if (expected !== snapshot.revision) {
                    const err = new Error('conflict');
                    err.status = 409;
                    throw err;
                }
                snapshot = { nodes, revision: snapshot.revision + 1 };
                return snapshot;
            }
        };
        const importer = new NodeImportService(storage);
        vi.stubGlobal('fetch', vi.fn(async () => new Response(testNode, { status: 200 })));
        const result = await importer.importFromUrl('https://example.com/sub', { mode: 'merge' });
        vi.unstubAllGlobals();

        expect(result.added).toBeGreaterThanOrEqual(1);
        expect(result.nodes.some((n) => n.raw === testNode || String(n.raw).includes('audit'))).toBe(true);
        expect(result.nodes.some((n) => n.id === 'peer' || String(n.raw).includes('peer'))).toBe(true);
        expect(forceConflictOnce).toBe(false);
    });

    it('regenerates subscription slug on collision for pure KV create', async () => {
        const kv = new MemoryKVAdapter();
        const service = new SubscriptionStorageService(kv);
        const first = await service.create({ name: 'A', slug: 'taken-slug' });
        expect(first.slug).toBe('taken-slug');

        await expect(service.create({ name: 'B', slug: 'taken-slug' })).rejects.toThrow('短链已存在');

        const second = await service.create({ name: 'C' });
        expect(second.slug).toBeTruthy();
        expect(second.slug).not.toBe('taken-slug');
    });

    it('does not mutate coordinator snapshot objects during merge import', async () => {
        const shared = {
            id: 'shared',
            raw: testNode,
            name: 'old',
            protocol: 'ss',
            enabled: true,
            tag: 'old-tag'
        };
        let revision = 3;
        const coordinator = {
            async getNodes() {
                return { nodes: [shared], revision };
            },
            async replaceNodes(nodes, expected) {
                if (expected !== revision) {
                    return { ok: false, status: 409, error: 'conflict' };
                }
                revision += 1;
                return { ok: true, nodes, revision };
            }
        };
        const storage = new NodeStorageService(new MemoryKVAdapter(), coordinator);
        const importer = new NodeImportService(storage);
        vi.stubGlobal('fetch', vi.fn(async () => new Response(testNode + '\n', { status: 200 })));
        await importer.importFromUrl('https://example.com/sub', { mode: 'merge', tag: 'new-tag' });
        vi.unstubAllGlobals();

        // Original object held by coordinator must stay untouched.
        expect(shared.name).toBe('old');
        expect(shared.tag).toBe('old-tag');
        expect(shared.source).toBeUndefined();
    });

    it('blocks private remote targets and oversized response bodies', async () => {
        await expect(fetchRemoteText('http://127.0.0.1/private')).rejects.toThrow('不允许访问本地或私有网络地址');
        await expect(fetchRemoteText('http://[::1]/private')).rejects.toThrow('不允许访问本地或私有网络地址');
        await expect(fetchRemoteText('http://[fd12::1]/private')).rejects.toThrow('不允许访问本地或私有网络地址');

        const fetchMock = vi.fn(async (input) => {
            const url = String(input);
            if (url.includes('fd-example.com')) {
                return new Response('ss://YWVzLTEyOC1nY206cGFzc3dvcmQ=@example.com:443#ok', {
                    status: 200,
                    headers: { 'content-type': 'text/plain' }
                });
            }
            return new Response('1234', { status: 200 });
        });
        vi.stubGlobal('fetch', fetchMock);
        const allowed = await fetchRemoteText('https://fd-example.com/sub');
        expect(allowed.text).toContain('ss://');
        await expect(fetchRemoteText('https://example.com/sub', { maxBytes: 3 })).rejects.toThrow('too large');
        vi.unstubAllGlobals();
    });
});
