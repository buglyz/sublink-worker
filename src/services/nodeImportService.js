import { InvalidPayloadError, ServiceError } from './errors.js';
import { fetchSubscriptionWithFormat } from '../parsers/subscription/httpSubscriptionFetcher.js';
import { parseSubscriptionContent } from '../parsers/subscription/subscriptionContentParser.js';

const URI_RE = /^(ss|ssr|vmess|vless|trojan|hysteria|hysteria2|hy2|tuic|anytls|socks5?|wireguard|snell):\/\//i;

/**
 * Import nodes from a remote subscription URL into the node library.
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

        const shareLines = extractShareLines(fetched.content);
        const parsed = parseSubscriptionContent(fetched.content);
        // Also collect URI-like strings if parser returned a line array
        if (Array.isArray(parsed)) {
            for (const line of parsed) {
                if (typeof line === 'string' && URI_RE.test(line.trim())) {
                    shareLines.push(line.trim());
                }
            }
        }

        const uniqueLines = [...new Set(shareLines.filter(Boolean))];
        const existing = await this.nodeStorage.list();
        const existingRaws = new Set(existing.map((n) => n.raw));
        const now = Date.now();
        let added = 0;
        const errors = [];

        if (uniqueLines.length) {
            for (const raw of uniqueLines) {
                if (existingRaws.has(raw)) continue;
                const protocol = (raw.match(URI_RE)?.[1] || 'unknown').toLowerCase();
                existing.push({
                    id: uid(),
                    raw,
                    name: nameFromUri(raw),
                    protocol,
                    tag: options.tag || 'remote',
                    enabled: true,
                    selected: false,
                    createdAt: now,
                    updatedAt: now
                });
                existingRaws.add(raw);
                added += 1;
            }
        } else {
            // Structured sub without share URIs: store the URL itself as a remote source node
            if (!existingRaws.has(target)) {
                existing.push({
                    id: uid(),
                    raw: target,
                    name: options.name || hostnameOf(target) || '远程订阅',
                    protocol: 'http-sub',
                    tag: options.tag || 'remote',
                    enabled: true,
                    selected: false,
                    createdAt: now,
                    updatedAt: now
                });
                added = 1;
            } else {
                errors.push('该订阅 URL 已在节点库中');
            }
        }

        const nodes = await this.nodeStorage.save(existing);
        return {
            added,
            total: nodes.length,
            format: fetched.format || 'unknown',
            nodes,
            errors,
            message: added
                ? `成功导入 ${added} 个节点（格式: ${fetched.format || 'unknown'}）`
                : (errors[0] || '未发现新节点')
        };
    }
}

function extractShareLines(content) {
    return String(content || '')
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#') && !l.startsWith('//'))
        .filter((l) => URI_RE.test(l));
}

function nameFromUri(line) {
    try {
        if (line.includes('#')) {
            const hash = line.split('#').pop();
            const decoded = decodeURIComponent(hash || '');
            if (decoded) return decoded.slice(0, 80);
        }
        if (line.startsWith('vmess://')) {
            try {
                const b64 = line.slice(8).replace(/-/g, '+').replace(/_/g, '/');
                const json = JSON.parse(atob(b64));
                if (json.ps) return String(json.ps).slice(0, 80);
                if (json.add) return String(json.add).slice(0, 80);
            } catch {}
        }
        const u = new URL(line);
        if (u.hostname) return (u.hostname + (u.port ? ':' + u.port : '')).slice(0, 80);
    } catch {}
    return line.slice(0, 40) + (line.length > 40 ? '…' : '');
}

function hostnameOf(url) {
    try { return new URL(url).hostname; } catch { return ''; }
}

function uid() {
    return 'n_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function atob(str) {
    if (typeof globalThis.atob === 'function') return globalThis.atob(str);
    return Buffer.from(str, 'base64').toString('utf8');
}
