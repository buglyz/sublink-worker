import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import yaml from 'js-yaml';

// Mock httpSubscriptionFetcher 以避免真实网络请求
vi.mock('../src/parsers/subscription/httpSubscriptionFetcher.js', async (importOriginal) => {
    const original = await importOriginal();
    return {
        ...original,
        fetchSubscriptionWithFormat: vi.fn()
    };
});

import { fetchSubscriptionWithFormat } from '../src/parsers/subscription/httpSubscriptionFetcher.js';
import { createApp } from '../src/app/createApp.jsx';
import { MemoryKVAdapter } from '../src/adapters/kv/memoryKv.js';

// 一条可被各 parser 解析的 vmess 节点
const VMESS_URI =
    'vmess://ew0KICAidiI6ICIyIiwNCiAgInBzIjogInRlc3QiLA0KICAiYWRkIjogIjEuMS4xLjEiLA0KICAicG9ydCI6ICI0NDMiLA0KICAiaWQiOiAiYWRkNjY2NjYtODg4OC04ODg4LTg4ODgtODg4ODg4ODg4ODg4IiwNCiAgImFpZCI6ICIwIiwNCiAgInNjeSI6ICJhdXRvIiwNCiAgIm5ldCI6ICJ3cyIsDQogICJ0eXBlIjogIm5vbmUiLA0KICAiaG9zdCI6ICIiLA0KICAicGF0aCI6ICIvIiwNCiAgInRscyI6ICJ0bHMiDQp9';

const VLESS_URI =
    'vless://add66666-8888-8888-8888-888888888888@1.1.1.1:443?encryption=none&security=tls&type=ws&path=%2F#test-vless';

// Mock Clash YAML 订阅内容（两条 ss 节点）
const mockClashYaml = `
proxies:
  - name: HK-Node
    type: ss
    server: hk.example.com
    port: 443
    cipher: aes-128-gcm
    password: test123
  - name: JP-Node
    type: ss
    server: jp.example.com
    port: 443
    cipher: aes-128-gcm
    password: test456
`;

const createTestApp = (overrides = {}) => {
    const runtime = {
        kv: overrides.kv ?? new MemoryKVAdapter(),
        assetFetcher: overrides.assetFetcher ?? null,
        logger: console,
        config: {
            configTtlSeconds: 60,
            shortLinkTtlSeconds: null,
            ...(overrides.config || {})
        }
    };
    return createApp(runtime);
};

afterEach(() => {
    vi.clearAllMocks();
});

describe('订阅转换功能', () => {
    describe('GET /api/convert - 无状态订阅转换', () => {
        it('缺少 url 参数应返回 400', async () => {
            const app = createTestApp();
            const res = await app.request('http://localhost/api/convert');
            expect(res.status).toBe(400);
        });

        it('非法 url 应返回 400', async () => {
            const app = createTestApp();
            const res = await app.request('http://localhost/api/convert?url=ftp://x');
            expect(res.status).toBe(400);
        });

        it('format=raw 应输出明文 URI 行', async () => {
            fetchSubscriptionWithFormat.mockResolvedValue({
                content: `${VMESS_URI}\n${VLESS_URI}`,
                format: 'unknown',
                url: 'https://sub.example.com/sub'
            });
            const app = createTestApp();
            const res = await app.request(
                `http://localhost/api/convert?url=${encodeURIComponent('https://sub.example.com/sub')}&format=raw`
            );
            expect(res.status).toBe(200);
            expect(res.headers.get('content-type')).toContain('text/plain');
            const text = await res.text();
            expect(text).toContain('vmess://');
            expect(text).toContain('vless://');
        });

        it('format=base64 应输出 Base64 编码内容', async () => {
            fetchSubscriptionWithFormat.mockResolvedValue({
                content: `${VMESS_URI}\n${VLESS_URI}`,
                format: 'unknown',
                url: 'https://sub.example.com/sub'
            });
            const app = createTestApp();
            const res = await app.request(
                `http://localhost/api/convert?url=${encodeURIComponent('https://sub.example.com/sub')}&format=base64`
            );
            expect(res.status).toBe(200);
            const text = await res.text();
            // 解码后应包含原始 URI
            expect(Buffer.from(text, 'base64').toString('utf8')).toContain('vmess://');
        });

        it('format=clash 应输出 Clash YAML 配置', async () => {
            fetchSubscriptionWithFormat.mockResolvedValue({
                content: mockClashYaml,
                format: 'clash',
                url: 'https://sub.example.com/clash'
            });
            const app = createTestApp();
            const res = await app.request(
                `http://localhost/api/convert?url=${encodeURIComponent('https://sub.example.com/clash')}&format=clash`
            );
            expect(res.status).toBe(200);
            expect(res.headers.get('content-type')).toContain('text/yaml');
            const text = await res.text();
            expect(text).toContain('proxies:');
            // ss 节点应被解析进配置
            expect(text).toContain('ss');
        });

        it('format=singbox 应输出 Sing-Box JSON', async () => {
            fetchSubscriptionWithFormat.mockResolvedValue({
                content: mockClashYaml,
                format: 'clash',
                url: 'https://sub.example.com/clash'
            });
            const app = createTestApp();
            const res = await app.request(
                `http://localhost/api/convert?url=${encodeURIComponent('https://sub.example.com/clash')}&format=singbox`
            );
            expect(res.status).toBe(200);
            expect(res.headers.get('content-type')).toContain('application/json');
            const json = await res.json();
            expect(json).toHaveProperty('outbounds');
        });

        it('不支持的 format 应返回 400', async () => {
            fetchSubscriptionWithFormat.mockResolvedValue({
                content: VMESS_URI,
                format: 'unknown',
                url: 'https://sub.example.com/sub'
            });
            const app = createTestApp();
            const res = await app.request(
                `http://localhost/api/convert?url=${encodeURIComponent('https://sub.example.com/sub')}&format=quux`
            );
            expect(res.status).toBe(400);
        });

        it('拉取失败应返回 502', async () => {
            fetchSubscriptionWithFormat.mockResolvedValue(null);
            const app = createTestApp();
            const res = await app.request(
                `http://localhost/api/convert?url=${encodeURIComponent('https://sub.example.com/sub')}`
            );
            expect(res.status).toBe(502);
        });
    });

    describe('POST/GET /api/proxy-providers - Proxy Provider（妙妙屋处理模式）', () => {
        it('缺少 url 创建配置应返回 400', async () => {
            const app = createTestApp();
            const res = await app.request('http://localhost/api/proxy-providers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'test' })
            });
            expect(res.status).toBe(400);
        });

        it('创建配置成功应返回 201 及输出地址', async () => {
            const app = createTestApp();
            const res = await app.request('http://localhost/api/proxy-providers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: 'my-sub', url: 'https://sub.example.com/clash' })
            });
            expect(res.status).toBe(201);
            const json = await res.json();
            expect(json.id).toBeTruthy();
            expect(json.url).toContain('/api/proxy-provider/');
            expect(json.processMode).toBe('mmw');
        });

        it('客户端处理模式 serve 应返回 400', async () => {
            const app = createTestApp();
            const createRes = await app.request('http://localhost/api/proxy-providers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: 'https://sub.example.com/clash', processMode: 'client' })
            });
            const created = await createRes.json();
            const res = await app.request(`http://localhost/api/proxy-provider/${created.id}`);
            expect(res.status).toBe(400);
        });

        it('serve 应输出 Clash proxies YAML 并带缓存', async () => {
            fetchSubscriptionWithFormat.mockResolvedValue({
                content: VMESS_URI,
                format: 'unknown',
                url: 'https://sub.example.com/sub'
            });
            const app = createTestApp();
            const createRes = await app.request('http://localhost/api/proxy-providers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: 'https://sub.example.com/sub' })
            });
            const created = await createRes.json();

            const res1 = await app.request(`http://localhost/api/proxy-provider/${created.id}`);
            expect(res1.status).toBe(200);
            expect(res1.headers.get('content-type')).toContain('text/yaml');
            expect(res1.headers.get('X-Proxy-Provider-Cache')).toBe('miss');
            const text1 = await res1.text();
            expect(text1).toContain('proxies:');

            // 第二次访问应命中缓存
            const res2 = await app.request(`http://localhost/api/proxy-provider/${created.id}`);
            expect(res2.headers.get('X-Proxy-Provider-Cache')).toBe('hit');
            // fetch 应只被调用一次（缓存命中不重新拉取）
            expect(fetchSubscriptionWithFormat).toHaveBeenCalledTimes(1);
        });

        it('手动刷新会重新拉取订阅', async () => {
            fetchSubscriptionWithFormat.mockResolvedValue({
                content: VMESS_URI,
                format: 'unknown',
                url: 'https://sub.example.com/sub'
            });
            const app = createTestApp();
            const createRes = await app.request('http://localhost/api/proxy-providers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: 'https://sub.example.com/sub' })
            });
            const created = await createRes.json();

            // 先访问一次填充缓存
            await app.request(`http://localhost/api/proxy-provider/${created.id}`);
            // 手动刷新
            const refreshRes = await app.request(
                `http://localhost/api/proxy-providers/${created.id}/refresh`,
                { method: 'POST' }
            );
            expect(refreshRes.status).toBe(200);
            expect(fetchSubscriptionWithFormat).toHaveBeenCalledTimes(2);
        });

        it('删除配置后 serve 应返回 404', async () => {
            const app = createTestApp();
            const createRes = await app.request('http://localhost/api/proxy-providers', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ url: 'https://sub.example.com/sub' })
            });
            const created = await createRes.json();

            const delRes = await app.request(`http://localhost/api/proxy-providers/${created.id}`, {
                method: 'DELETE'
            });
            expect(delRes.status).toBe(200);

            const res = await app.request(`http://localhost/api/proxy-provider/${created.id}`);
            expect(res.status).toBe(404);
        });
    });

    describe('POST /api/temp-subscriptions + GET /t/:id - 临时订阅', () => {
        const sampleProxies = [
            { name: 'HK', type: 'ss', server: 'hk.example.com', port: 443, cipher: 'aes-128-gcm', password: 'p' },
            { name: 'JP', type: 'ss', server: 'jp.example.com', port: 443, cipher: 'aes-128-gcm', password: 'p' }
        ];

        it('proxies 为空应返回 400', async () => {
            const app = createTestApp();
            const res = await app.request('http://localhost/api/temp-subscriptions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ proxies: [] })
            });
            expect(res.status).toBe(400);
        });

        it('创建成功应返回 url、max_access、expire_at', async () => {
            const app = createTestApp();
            const res = await app.request('http://localhost/api/temp-subscriptions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ proxies: sampleProxies, max_access: 2, expire_seconds: 300 })
            });
            expect(res.status).toBe(201);
            const json = await res.json();
            expect(json.id).toBeTruthy();
            expect(json.url).toContain('/t/');
            expect(json.max_access).toBe(2);
            expect(json.expire_at).toBeTruthy();
        });

        it('UA 非 Mihomo 访问 /t/:id 应返回 403', async () => {
            const app = createTestApp();
            const createRes = await app.request('http://localhost/api/temp-subscriptions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ proxies: sampleProxies, max_access: 3, expire_seconds: 300 })
            });
            const created = await createRes.json();

            const res = await app.request(`http://localhost/t/${created.id}`, {
                headers: { 'User-Agent': 'Mozilla/5.0' }
            });
            expect(res.status).toBe(403);
        });

        it('Mihomo UA 访问应输出 proxies YAML', async () => {
            const app = createTestApp();
            const createRes = await app.request('http://localhost/api/temp-subscriptions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ proxies: sampleProxies, max_access: 3, expire_seconds: 300 })
            });
            const created = await createRes.json();

            const res = await app.request(`http://localhost/t/${created.id}`, {
                headers: { 'User-Agent': 'clashmetaforandroid/1.0' }
            });
            expect(res.status).toBe(200);
            expect(res.headers.get('content-type')).toContain('text/yaml');
            const text = await res.text();
            expect(text).toContain('proxies:');
            const parsed = yaml.load(text);
            expect(Array.isArray(parsed.proxies)).toBe(true);
            expect(parsed.proxies.length).toBe(2);
        });

        it('超出 max_access 后应返回 404', async () => {
            const app = createTestApp();
            const createRes = await app.request('http://localhost/api/temp-subscriptions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ proxies: sampleProxies, max_access: 1, expire_seconds: 300 })
            });
            const created = await createRes.json();

            // 第一次访问成功
            const okRes = await app.request(`http://localhost/t/${created.id}`, {
                headers: { 'User-Agent': 'mihomo/1.0' }
            });
            expect(okRes.status).toBe(200);

            // 第二次应因次数耗尽返回 404
            const res = await app.request(`http://localhost/t/${created.id}`, {
                headers: { 'User-Agent': 'mihomo/1.0' }
            });
            expect(res.status).toBe(404);
        });

        it('不存在的 id 应返回 404', async () => {
            const app = createTestApp();
            const res = await app.request('http://localhost/t/nonexistent12', {
                headers: { 'User-Agent': 'mihomo/1.0' }
            });
            expect(res.status).toBe(404);
        });
    });
});
