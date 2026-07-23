import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app/createApp.jsx';
import { MemoryKVAdapter } from '../src/adapters/kv/memoryKv.js';
import { AuthService } from '../src/services/authService.js';
import { NodeStorageService } from '../src/services/nodeStorageService.js';
import { fetchRemoteText } from '../src/parsers/subscription/remoteFetch.js';

const testNode = 'ss://YWVzLTEyOC1nY206cGFzc3dvcmQ=@example.com:443#audit';

function createTestApp(kv, authPassword = '') {
    return createApp({
        kv,
        authPassword,
        logger: console,
        config: { configTtlSeconds: 60, shortLinkTtlSeconds: null }
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

    it('blocks private remote targets and oversized response bodies', async () => {
        await expect(fetchRemoteText('http://127.0.0.1/private')).rejects.toThrow('不允许访问本地或私有网络地址');

        const fetchMock = vi.fn(async () => new Response('1234'));
        vi.stubGlobal('fetch', fetchMock);
        await expect(fetchRemoteText('https://example.com/sub', { maxBytes: 3 })).rejects.toThrow('too large');
        vi.unstubAllGlobals();
    });
});
