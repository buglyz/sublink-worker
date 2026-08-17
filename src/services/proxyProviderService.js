import yaml from 'js-yaml';
import { generateWebPath } from '../utils.js';
import { InvalidPayloadError, MissingDependencyError, ServiceError } from './errors.js';
import { fetchSubscriptionWithFormat } from '../parsers/subscription/httpSubscriptionFetcher.js';
import { parseSubscriptionContent } from '../parsers/subscription/subscriptionContentParser.js';
import { proxiesToShareNodes } from '../utils/proxyShareUri.js';
import { ProxyParser } from '../parsers/ProxyParser.js';

const PROVIDER_PREFIX = 'pp:';
const PROVIDER_PATTERN = /^[A-Za-z0-9]{12}$/;
const CACHE_PREFIX = 'pp:cache:';
const CACHE_TTL_SECONDS = 5 * 60;

/**
 * Proxy Provider 服务：持久化外部订阅配置，并提供
 * "妙妙屋处理" 模式的转换输出（Clash proxies YAML）。
 *
 * KV 数据模型：
 *   pp:{id}       -> 配置 JSON（url, userAgent, name, processMode）
 *   pp:cache:{id} -> { yaml, nodeCount, fetchedAt }（带 5 分钟 TTL）
 */
export class ProxyProviderService {
    constructor(kv) {
        this.kv = kv;
    }

    ensureKv() {
        if (!this.kv) {
            throw new MissingDependencyError('Proxy Provider 服务需要 KV 存储');
        }
        return this.kv;
    }

    /**
     * 创建 proxy-provider 配置
     * @param {{name?: string, url: string, userAgent?: string, processMode?: string}} payload
     * @returns {Promise<{id: string, name: string, url: string, userAgent: string, processMode: string}>}
     */
    async create(payload = {}) {
        const kv = this.ensureKv();

        const url = String(payload.url || '').trim();
        if (!/^https?:\/\//i.test(url)) {
            throw new InvalidPayloadError('请提供有效的 http(s) 订阅地址');
        }

        const name = String(payload.name || '').trim().slice(0, 80) || hostnameOf(url) || 'provider';
        const userAgent = String(payload.userAgent || '').trim().slice(0, 200) || 'clash.meta/1.0';
        const processMode = payload.processMode === 'client' ? 'client' : 'mmw';

        const id = generateWebPath(12);
        const record = { id, name, url, userAgent, processMode, createdAt: Date.now() };
        await kv.put(configKey(id), JSON.stringify(record));

        return record;
    }

    /**
     * 读取配置
     * @param {string} id
     * @returns {Promise<object|null>}
     */
    async get(id) {
        const kv = this.ensureKv();
        const code = String(id || '').trim();
        if (!PROVIDER_PATTERN.test(code)) {
            return null;
        }
        const raw = await kv.get(configKey(code));
        if (!raw) return null;
        try {
            return JSON.parse(raw);
        } catch {
            return null;
        }
    }

    /**
     * 输出 Clash proxies YAML。优先用缓存，否则拉取订阅解析后重新生成。
     * @param {string} id
     * @returns {Promise<{yaml: string, nodeCount: number, cached: boolean}>}
     */
    async serve(id) {
        const kv = this.ensureKv();
        const config = await this.get(id);
        if (!config) {
            throw new ServiceError('Proxy Provider 配置不存在', 404);
        }

        if (config.processMode !== 'mmw') {
            throw new ServiceError('该配置为客户端处理模式，不提供服务端转换', 400);
        }

        // 尝试缓存
        const cached = await kv.get(cacheKey(id));
        if (cached) {
            try {
                const entry = JSON.parse(cached);
                if (entry && typeof entry.yaml === 'string') {
                    return { yaml: entry.yaml, nodeCount: entry.nodeCount, cached: true };
                }
            } catch {
                // 缓存损坏，忽略
            }
        }

        return this.refresh(id);
    }

    /**
     * 删除 proxy-provider 配置及缓存
     * @param {string} id
     */
    async remove(id) {
        const kv = this.ensureKv();
        const code = String(id || '').trim();
        if (!PROVIDER_PATTERN.test(code)) return;
        await kv.delete(configKey(code)).catch(() => {});
        await kv.delete(cacheKey(code)).catch(() => {});
    }

    /**
     * 刷新缓存：删除旧缓存，拉取订阅并重新生成 proxies YAML。
     * @param {string} id
     * @returns {Promise<{yaml: string, nodeCount: number, cached: boolean}>}
     */
    async refresh(id) {
        const kv = this.ensureKv();
        const code = String(id || '').trim();
        await kv.delete(cacheKey(code)).catch(() => {});

        const config = await this.get(code);
        if (!config) {
            throw new ServiceError('Proxy Provider 配置不存在', 404);
        }

        // 拉取订阅并解析
        const fetched = await fetchSubscriptionWithFormat(config.url, config.userAgent);
        if (!fetched || !fetched.content) {
            throw new ServiceError('无法拉取订阅内容（网络错误或响应为空）', 502);
        }

        const parsed = parseSubscriptionContent(fetched.content);
        const nodes = proxiesToShareNodes(parsed, { tag: config.name });
        if (!nodes.length) {
            throw new ServiceError(
                `订阅已拉取，但未能解析出节点（格式: ${fetched.format || 'unknown'}）`,
                422
            );
        }

        // 把 share URI 转回 Clash proxy 对象
        const proxies = [];
        for (const node of nodes) {
            try {
                const proxy = await ProxyParser.parse(node.raw);
                if (proxy) {
                    if (node.name) proxy.name = node.name;
                    proxies.push(proxy);
                }
            } catch {
                // 跳过无法解析的节点
            }
        }

        if (!proxies.length) {
            throw new ServiceError('订阅节点解析失败：无法转换为 Clash 代理', 422);
        }

        const yamlText = yaml.dump({ proxies }, { lineWidth: -1, noRefs: true });
        const entry = { yaml: yamlText, nodeCount: proxies.length, fetchedAt: Date.now() };
        await kv.put(cacheKey(code), JSON.stringify(entry), { expirationTtl: CACHE_TTL_SECONDS });

        return { yaml: yamlText, nodeCount: proxies.length, cached: false };
    }
}

function configKey(id) {
    return PROVIDER_PREFIX + id;
}

function cacheKey(id) {
    return CACHE_PREFIX + id;
}

function hostnameOf(url) {
    try {
        return new URL(url).hostname;
    } catch {
        return '';
    }
}
