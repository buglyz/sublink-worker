/**
 * Port of mmwX-plugins substore ConvertACLToV3 / ParseACLConfig.
 * Converts ACL4SSR / Aethersailor .ini rule configs into V3 YAML fragments.
 */

import yaml from 'js-yaml';
import { PROXY_NODES_MARKER } from './templateV3Processor.js';

const GCX_REGEX_PREFIX = '__MMW_GCX_REGEX__:';

/**
 * @param {string} content ACL4SSR-style .ini
 * @returns {{ proxyGroups: object[], rules: string[], ruleProviders: Record<string, object> }}
 */
export function convertAclToV3(content) {
    const { rulesets, proxyGroups } = parseAclConfig(content);
    const result = {
        proxyGroups: proxyGroups.map(convertProxyGroup),
        rules: [],
        ruleProviders: {},
    };
    convertRulesets(rulesets, result);
    return result;
}

/**
 * Wrap converted V3 fragments in a full Clash Meta template shell.
 * @param {ReturnType<typeof convertAclToV3>} v3
 * @param {{ dnsMode?: 'fake-ip' | 'redir-host', name?: string }} [opts]
 * @returns {string} YAML
 */
export function buildV3YamlFromAcl(v3, opts = {}) {
    const dnsMode = opts.dnsMode || 'fake-ip';
    const config = {
        mode: 'rule',
        'mixed-port': 7890,
        'allow-lan': true,
        'log-level': 'info',
        ipv6: false,
        dns: dnsMode === 'redir-host' ? REDIR_HOST_DNS : FAKE_IP_DNS,
        proxies: null,
        'proxy-groups': v3.proxyGroups.map(serializeGroup),
        rules: v3.rules,
    };
    if (Object.keys(v3.ruleProviders).length > 0) {
        config['rule-providers'] = v3.ruleProviders;
    }
    return yaml.dump(config, { lineWidth: -1, noRefs: true, forceQuotes: false });
}

const FAKE_IP_DNS = {
    enable: true,
    'enhanced-mode': 'fake-ip',
    'fake-ip-range': '198.18.0.1/16',
    nameserver: ['tls://8.8.8.8', 'tls://1.1.1.1'],
    'direct-nameserver': ['https://120.53.53.53/dns-query'],
    'nameserver-policy': {
        'geosite:cn': ['223.5.5.5', '119.29.29.29'],
    },
    'proxy-server-nameserver': ['https://120.53.53.53/dns-query'],
    ipv6: false,
    'default-nameserver': ['tls://1.12.12.12'],
    'fake-ip-filter': ['+.lan', '+.local'],
};

const REDIR_HOST_DNS = {
    enable: true,
    'enhanced-mode': 'redir-host',
    nameserver: ['https://120.53.53.53/dns-query', 'tls://8.8.8.8'],
    'direct-nameserver': ['https://120.53.53.53/dns-query'],
    'nameserver-policy': {
        'geosite:cn': ['223.5.5.5', '119.29.29.29'],
    },
    'proxy-server-nameserver': ['https://120.53.53.53/dns-query'],
    ipv6: false,
    'default-nameserver': ['tls://1.12.12.12'],
};

function serializeGroup(g) {
    const out = { name: g.name, type: g.type };
    if (g.includeAll) out['include-all'] = true;
    if (g.includeAllProxies) out['include-all-proxies'] = true;
    if (g.filter) out.filter = g.filter;
    if (g.excludeFilter) out['exclude-filter'] = g.excludeFilter;
    if (g.url) out.url = g.url;
    if (g.interval) out.interval = g.interval;
    if (g.tolerance) out.tolerance = g.tolerance;
    if (g.proxies?.length) out.proxies = g.proxies;
    return out;
}

export function parseAclConfig(content) {
    const rulesets = [];
    const proxyGroups = [];

    for (const raw of String(content || '').split(/\r?\n/)) {
        const line = raw.trim();
        if (!line || line.startsWith(';') || line.startsWith('#')) continue;

        if (line.startsWith('ruleset=')) {
            const body = line.slice(8);
            const idx = body.indexOf(',');
            if (idx > 0) {
                rulesets.push(parseRuleset(body.slice(0, idx).trim(), body.slice(idx + 1).trim()));
            }
            continue;
        }

        if (line.startsWith('custom_proxy_group=')) {
            const pg = parseProxyGroup(line.slice(19));
            if (pg.name) proxyGroups.push(pg);
        }
    }

    return { rulesets, proxyGroups: dedupeProxyGroups(proxyGroups) };
}

function dedupeProxyGroups(groups) {
    if (groups.length <= 1) return groups;
    const lastIndex = new Map();
    groups.forEach((g, i) => lastIndex.set(g.name, i));
    const seen = new Set();
    const result = [];
    groups.forEach((g, i) => {
        if (lastIndex.get(g.name) === i && !seen.has(g.name)) {
            result.push(g);
            seen.add(g.name);
        }
    });
    return result;
}

function parseRuleset(group, ruleSpec) {
    const rs = { group, ruleURL: ruleSpec, behavior: 'classical', interval: 86400 };

    const lastComma = ruleSpec.lastIndexOf(',');
    if (lastComma > 0) {
        const suffix = ruleSpec.slice(lastComma + 1);
        if (/^\d+$/.test(suffix)) {
            rs.interval = Number(suffix);
            ruleSpec = ruleSpec.slice(0, lastComma);
        }
    }

    if (ruleSpec.startsWith('clash-classic:')) {
        rs.behavior = 'classical';
        rs.ruleURL = ruleSpec.slice(14);
    } else if (ruleSpec.startsWith('clash-domain:')) {
        rs.behavior = 'domain';
        rs.ruleURL = ruleSpec.slice(13);
    } else if (ruleSpec.startsWith('clash-ipcidr:')) {
        rs.behavior = 'ipcidr';
        rs.ruleURL = ruleSpec.slice(13);
    } else if (ruleSpec.startsWith('[]') || ruleSpec.startsWith('http')) {
        rs.ruleURL = ruleSpec;
    } else if (ruleSpec.startsWith('rules/ACL4SSR/')) {
        rs.ruleURL =
            'https://testingcf.jsdelivr.net/gh/ACL4SSR/ACL4SSR@master/' +
            ruleSpec.slice('rules/ACL4SSR/'.length);
    } else {
        rs.ruleURL = ruleSpec;
    }

    return rs;
}

function parseProxyGroup(line) {
    const parts = line.split('`');
    if (parts.length < 2) return { name: '', type: '', proxies: [], hasWildcard: false };

    const pg = {
        name: parts[0],
        type: parts[1],
        proxies: [],
        hasWildcard: false,
        url: '',
        interval: 0,
        tolerance: 0,
    };

    let expectGCX = false;
    for (let i = 2; i < parts.length; i++) {
        const part = parts[i].trim();
        if (isGcxMarker(part)) {
            expectGCX = true;
            continue;
        }
        if (expectGCX) {
            const pattern = part.startsWith('[]') ? part.slice(2) : part;
            if (pattern) pg.proxies.push(GCX_REGEX_PREFIX + pattern);
            expectGCX = false;
            continue;
        }
        if (part.startsWith('http://') || part.startsWith('https://')) {
            pg.url = part;
            continue;
        }
        if (/^\d/.test(part)) {
            if (part.includes(',')) {
                const numParts = part.split(',');
                if (numParts[0]) pg.interval = parseInt(numParts[0], 10) || 0;
                for (let j = numParts.length - 1; j >= 1; j--) {
                    if (numParts[j]) {
                        pg.tolerance = parseInt(numParts[j], 10) || 0;
                        break;
                    }
                }
            } else {
                pg.interval = parseInt(part, 10) || 0;
            }
            continue;
        }

        let proxyName = part.startsWith('[]') ? part.slice(2) : part;
        if (!proxyName) continue;
        if (proxyName === '.*') {
            pg.hasWildcard = true;
            continue;
        }
        pg.proxies.push(proxyName);
    }

    return pg;
}

function isGcxMarker(value) {
    return String(value).trim().replace(/^\[\]/, '').toUpperCase() === 'GCX';
}

export function isRegexProxyPattern(proxy) {
    proxy = String(proxy || '').trim();
    if (proxy.startsWith(GCX_REGEX_PREFIX)) return true;
    if (proxy.length < 2) return false;
    return (
        (proxy.startsWith('(') && proxy.endsWith(')')) ||
        proxy.includes('.*') ||
        proxy.includes('.+') ||
        proxy.includes('.?') ||
        proxy.startsWith('^') ||
        proxy.endsWith('$') ||
        proxy.includes('(?<!') ||
        proxy.includes('(?<=')
    );
}

export function mergeRegexFilters(filters) {
    if (filters.length === 1) {
        const f = filters[0];
        if (f.startsWith(GCX_REGEX_PREFIX)) return f.slice(GCX_REGEX_PREFIX.length);
        return f;
    }
    const parts = filters.map((f) => {
        if (f.startsWith(GCX_REGEX_PREFIX)) return f.slice(GCX_REGEX_PREFIX.length);
        return f.replace(/^\(/, '').replace(/\)$/, '');
    });
    return `(${parts.join('|')})`;
}

function convertProxyGroup(pg) {
    const v3 = { name: pg.name, type: pg.type, proxies: [] };
    const regexFilters = [];
    const proxyRefs = [];

    for (const proxy of pg.proxies) {
        if (isRegexProxyPattern(proxy)) regexFilters.push(proxy);
        else proxyRefs.push(proxy);
    }

    if (pg.hasWildcard) v3.includeAll = true;

    if (regexFilters.length > 0) {
        let filter = mergeRegexFilters(regexFilters);
        filter = filter.replace(/^\(/, '').replace(/\)$/, '');
        v3.filter = filter;
        if (!v3.includeAll) v3.includeAllProxies = true;
    }

    if (proxyRefs.length) v3.proxies = [...proxyRefs];

    if (v3.includeAll || v3.includeAllProxies || v3.filter) {
        v3.proxies = [...(v3.proxies || []), PROXY_NODES_MARKER];
    }

    if (pg.type === 'url-test' || pg.type === 'fallback' || pg.type === 'load-balance') {
        v3.url = pg.url || 'https://cp.cloudflare.com/generate_204';
        v3.interval = pg.interval > 0 ? pg.interval : 300;
        if (pg.type !== 'load-balance') {
            v3.tolerance = pg.tolerance > 0 ? pg.tolerance : 50;
        }
    }

    return v3;
}

function convertRulesets(rulesets, result) {
    let providerIndex = 0;
    const usedNames = new Set();

    for (const rs of rulesets) {
        if (rs.ruleURL.startsWith('[]')) {
            const inlineRule = rs.ruleURL.slice(2);
            const upper = inlineRule.toUpperCase();
            if (upper === 'MATCH' || upper === 'FINAL') {
                result.rules.push(`MATCH,${rs.group}`);
                continue;
            }
            const parts = inlineRule.split(',');
            if (parts.length >= 2) {
                const ruleType = parts[0].toUpperCase();
                const ruleValue = parts[1];
                let suffix = '';
                if (parts.length >= 3 && parts[parts.length - 1].toLowerCase() === 'no-resolve') {
                    suffix = ',no-resolve';
                }
                result.rules.push(`${ruleType},${ruleValue},${rs.group}${suffix}`);
            }
            continue;
        }

        if (rs.ruleURL.startsWith('http')) {
            let name = generateProviderName(rs.ruleURL, providerIndex++);
            while (usedNames.has(name)) name = `${name}_${providerIndex++}`;
            usedNames.add(name);

            const provider = {
                type: 'http',
                behavior: rs.behavior || 'classical',
                url: rs.ruleURL,
                path: `./providers/${name}${rs.ruleURL.endsWith('.list') ? '.txt' : '.yaml'}`,
                interval: rs.interval || 86400,
            };
            if (rs.ruleURL.endsWith('.list')) provider.format = 'text';
            result.ruleProviders[name] = provider;
            result.rules.push(`RULE-SET,${name},${rs.group}`);
            continue;
        }
    }

    const hasMatch = result.rules.some((r) => r.startsWith('MATCH,'));
    if (!hasMatch && result.rules.length > 0) {
        const fallback = result.proxyGroups.find(
            (pg) => pg.name.includes('漏网') || pg.name.includes('其他')
        );
        if (fallback) result.rules.push(`MATCH,${fallback.name}`);
    }
}

function generateProviderName(url, index) {
    const parts = url.split('/');
    let filename = parts[parts.length - 1] || '';
    filename = filename.replace(/\.ya?ml$/i, '').replace(/\.list$/i, '');
    filename = filename.replace(/[^a-zA-Z0-9_-]/g, '_');
    if (filename) return filename;
    return `provider_${index}`;
}
