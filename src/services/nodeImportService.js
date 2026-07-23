import { InvalidPayloadError, ServiceError } from './errors.js';
import { fetchSubscriptionWithFormat } from '../parsers/subscription/httpSubscriptionFetcher.js';
import { parseSubscriptionContent } from '../parsers/subscription/subscriptionContentParser.js';
import { extractUriLines, proxiesToShareNodes } from '../utils/proxyShareUri.js';

/**
 * Import nodes from a remote subscription URL into the node library.
 * Same source URL can be re-imported with replace mode to refresh nodes.
 */
export class NodeImportService {
    constructor(nodeStorage) {
        this.nodeStorage = nodeStorage;
    }

    /**
     * @param {string} url
     * @param {{
     *   tag?: string,
     *   name?: string,
     *   userAgent?: string,
     *   mode?: 'merge' | 'replace',
     *   replaceSource?: string
     * }} options
     *  - merge (default): append new nodes, skip exact raw duplicates
     *  - replace: remove previous nodes from the same source, then insert fresh set
     */
    async importFromUrl(url, options = {}) {
        const target = String(url || '').trim();
        if (!/^https?:\/\//i.test(target)) {
            throw new InvalidPayloadError('请提供有效的 http(s) 订阅地址');
        }

        const mode = options.mode === 'replace' ? 'replace' : 'merge';
        const ua = options.userAgent || 'clash.meta/1.0';
        const fetched = await fetchSubscriptionWithFormat(target, ua);
        if (!fetched || !fetched.content) {
            throw new ServiceError('无法拉取订阅内容（网络错误或响应为空）', 502);
        }

        const sourceKey = normalizeSource(target);
        const tag = options.tag || hostnameOf(target) || 'remote';
        const parsed = parseSubscriptionContent(fetched.content);

        let candidates = proxiesToShareNodes(parsed, { tag });
        if (!candidates.length) {
            const uriLines = [
                ...extractUriLines(fetched.content),
                ...(Array.isArray(parsed) ? parsed.filter((l) => typeof l === 'string') : [])
            ];
            candidates = proxiesToShareNodes(uriLines, { tag });
        }

        // Stamp source metadata on every imported node
        const now = Date.now();
        candidates = candidates.map((n) => ({
            ...n,
            tag: n.tag || tag,
            source: sourceKey,
            sourceUrl: target,
            updatedAt: now,
            createdAt: n.createdAt || now
        }));

        if (!candidates.length) {
            throw new ServiceError(
                `订阅已拉取，但未能解析出节点（格式: ${fetched.format || 'unknown'}）。请确认链接返回的是节点列表/Clash/Sing-box 配置。`,
                422
            );
        }

        const format = fetched.format || 'unknown';
        // Optimistic concurrency: re-read + re-apply on 409 (pure KV races / multi-tab).
        const maxAttempts = 3;
        let lastError;
        for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
            const snapshot = await this.nodeStorage.getSnapshot();
            const applied = applyImport(snapshot.nodes, candidates, {
                mode,
                sourceKey,
                target,
                now
            });
            try {
                const saved = await this.nodeStorage.replace(applied.nodes, snapshot.revision);
                const message = buildMessage({
                    mode,
                    added: applied.added,
                    updated: applied.updated,
                    removed: applied.removed,
                    skipped: applied.skipped,
                    format,
                    totalCandidates: candidates.length
                });
                return {
                    mode,
                    added: applied.added,
                    updated: applied.updated,
                    removed: applied.removed,
                    skipped: applied.skipped,
                    parsed: candidates.length,
                    total: saved.nodes.length,
                    format,
                    source: target,
                    sourceKey,
                    samples: applied.samples,
                    nodes: saved.nodes,
                    revision: saved.revision,
                    message
                };
            } catch (error) {
                lastError = error;
                if (error?.status !== 409 || attempt === maxAttempts - 1) {
                    throw error;
                }
            }
        }
        throw lastError || new ServiceError('导入失败：节点库版本冲突', 409);
    }
}

function applyImport(existingNodes, candidates, { mode, sourceKey, target, now }) {
    let existing = Array.isArray(existingNodes) ? existingNodes.slice() : [];
    let removed = 0;
    let added = 0;
    let updated = 0;
    let skipped = 0;
    const samples = [];

    if (mode === 'replace') {
        const before = existing.length;
        existing = existing.filter((n) => !belongsToSource(n, sourceKey, target));
        removed = before - existing.length;

        const existingRaws = new Set(existing.map((n) => n.raw));
        for (const node of candidates) {
            if (existingRaws.has(node.raw)) {
                skipped += 1;
                continue;
            }
            existing.push(node);
            existingRaws.add(node.raw);
            added += 1;
            if (samples.length < 5) samples.push(node.name);
        }
    } else {
        const byRaw = new Map(existing.map((n) => [n.raw, n]));
        for (const node of candidates) {
            const prev = byRaw.get(node.raw);
            if (prev) {
                prev.name = node.name || prev.name;
                prev.protocol = node.protocol || prev.protocol;
                prev.tag = node.tag || prev.tag;
                prev.source = sourceKey;
                prev.sourceUrl = target;
                prev.updatedAt = now;
                updated += 1;
            } else {
                existing.push(node);
                byRaw.set(node.raw, node);
                added += 1;
                if (samples.length < 5) samples.push(node.name);
            }
        }
        skipped = Math.max(0, candidates.length - added - updated);
    }

    return { nodes: existing, added, updated, removed, skipped, samples };
}

function belongsToSource(node, sourceKey, targetUrl) {
    if (!node) return false;
    if (node.source && normalizeSource(node.source) === sourceKey) return true;
    if (node.sourceUrl && normalizeSource(node.sourceUrl) === sourceKey) return true;
    // legacy: whole-url stored as a single http-sub node
    if (node.protocol === 'http-sub' && node.raw && normalizeSource(node.raw) === sourceKey) return true;
    // loose match: tag equals hostname from earlier imports
    const host = hostnameOf(targetUrl);
    if (host && node.tag === host && !node.source && !node.sourceUrl) {
        // only treat as same source when tag is hostname AND node was remote-tagged style
        return true;
    }
    return false;
}

function normalizeSource(url) {
    try {
        const u = new URL(String(url).trim());
        u.hash = '';
        // strip common trailing slash only on pathname root
        let href = u.toString();
        if (href.endsWith('/') && u.pathname === '/') {
            // keep
        } else if (href.endsWith('/') && u.search === '') {
            href = href.slice(0, -1);
        }
        return href;
    } catch {
        return String(url || '').trim();
    }
}

function hostnameOf(url) {
    try {
        return new URL(url).hostname;
    } catch {
        return '';
    }
}

function buildMessage({ mode, added, updated, removed, skipped, format, totalCandidates }) {
    const bits = [];
    if (mode === 'replace') {
        bits.push(`已更新订阅（替换模式）`);
        if (removed) bits.push(`移除旧节点 ${removed}`);
        if (added) bits.push(`写入 ${added}`);
        if (skipped) bits.push(`跳过 ${skipped}`);
    } else {
        bits.push(`导入完成`);
        if (added) bits.push(`新增 ${added}`);
        if (updated) bits.push(`更新 ${updated}`);
        if (skipped) bits.push(`已存在 ${skipped}`);
    }
    bits.push(`解析 ${totalCandidates} · 格式 ${format}`);
    return bits.join(' · ');
}
