import { InvalidPayloadError, ServiceError } from './errors.js';
import { fetchSubscriptionWithFormat } from '../parsers/subscription/httpSubscriptionFetcher.js';
import { parseSubscriptionContent } from '../parsers/subscription/subscriptionContentParser.js';
import { extractUriLines, proxiesToShareNodes } from '../utils/proxyShareUri.js';

/**
 * Import nodes from a remote subscription URL into the node library.
 * Expands Clash / Sing-Box / URI-list subscriptions into individual nodes.
 */
export class NodeImportService {
    constructor(nodeStorage) {
        this.nodeStorage = nodeStorage;
    }

    async importFromUrl(url, options = {}) {
        const target = String(url || '').trim();
        if (!/^https?:\/\//i.test(target)) {
            throw new InvalidPayloadError('请提供有效的 http(s) 订阅地址');
        }

        const ua = options.userAgent || 'clash.meta/1.0';
        const fetched = await fetchSubscriptionWithFormat(target, ua);
        if (!fetched || !fetched.content) {
            throw new ServiceError('无法拉取订阅内容（网络错误或响应为空）', 502);
        }

        const tag = options.tag || hostnameOf(target) || 'remote';
        const parsed = parseSubscriptionContent(fetched.content);

        // 1) Structured proxies (Clash / Sing-Box / Surge) → one node per proxy
        let candidates = proxiesToShareNodes(parsed, { tag });

        // 2) Plain URI list lines from raw content / line array
        if (!candidates.length) {
            const uriLines = [
                ...extractUriLines(fetched.content),
                ...(Array.isArray(parsed) ? parsed.filter((l) => typeof l === 'string') : [])
            ];
            candidates = proxiesToShareNodes(uriLines, { tag });
        }

        if (!candidates.length) {
            throw new ServiceError(
                `订阅已拉取，但未能解析出节点（格式: ${fetched.format || 'unknown'}）。请确认链接返回的是节点列表/Clash/Sing-box 配置。`,
                422
            );
        }

        const existing = await this.nodeStorage.list();
        const existingRaws = new Set(existing.map((n) => n.raw));
        let added = 0;
        let skipped = 0;

        for (const node of candidates) {
            if (existingRaws.has(node.raw)) {
                skipped += 1;
                continue;
            }
            existing.push(node);
            existingRaws.add(node.raw);
            added += 1;
        }

        const nodes = await this.nodeStorage.save(existing);
        return {
            added,
            skipped,
            total: nodes.length,
            format: fetched.format || 'unknown',
            source: target,
            nodes,
            message: added
                ? `成功导入 ${added} 个节点${skipped ? `，跳过重复 ${skipped}` : ''}（格式: ${fetched.format || 'unknown'}）`
                : `未新增节点（${skipped} 个已存在，格式: ${fetched.format || 'unknown'}）`
        };
    }
}

function hostnameOf(url) {
    try {
        return new URL(url).hostname;
    } catch {
        return '';
    }
}
