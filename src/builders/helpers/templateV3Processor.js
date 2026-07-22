/**
 * Miaomiaowu-style V3 template processor (JS port of mmwX-plugins TemplateV3Processor).
 *
 * Expands proxy-groups with:
 *   - __PROXY_NODES__ / __PROXY_PROVIDERS__ / __REGION_PROXY_GROUPS__ markers
 *   - include-all / include-all-proxies / include-all-providers
 *   - filter / exclude-filter / include-type / exclude-type
 *   - dialer-proxy-group → dialer-proxy on leaf proxies
 *   - optional region proxy groups
 *
 * Mihomo-only group fields are stripped from the output.
 */

import yaml from 'js-yaml';

export const PROXY_NODES_MARKER = '__PROXY_NODES__';
export const PROXY_PROVIDERS_MARKER = '__PROXY_PROVIDERS__';
export const REGION_PROXY_GROUPS_MARKER = '__REGION_PROXY_GROUPS__';

const BUILTIN_NAMES = new Set(['DIRECT', 'REJECT', 'PASS']);

export const REGION_PROXY_GROUPS = [
    { name: '🇭🇰 香港节点', filter: '🇭🇰|港|\\bHK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|hk|Hong Kong|HongKong|hongkong|HONG KONG|HONGKONG|深港|HKG|九龙|Kowloon|新界|沙田|荃湾|葵涌' },
    { name: '🇺🇸 美国节点', filter: '🇺🇸|美|波特兰|达拉斯|俄勒冈|凤凰城|费利蒙|硅谷|拉斯维加斯|洛杉矶|圣何塞|圣克拉拉|西雅图|芝加哥|纽约|纽纽|亚特兰大|迈阿密|华盛顿|\\bUS(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|United States|UnitedStates|UNITED STATES|USA|America|AMERICA|JFK|EWR|IAD|ATL|ORD|MIA|NYC|LAX|SFO|SEA|DFW|SJC' },
    { name: '🇯🇵 日本节点', filter: '🇯🇵|日本|川日|东京|大阪|泉日|埼玉|沪日|深日|(?<!尼|-)日|\\bJP(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Japan|JAPAN|JPN|NRT|HND|KIX|TYO|OSA|关西|Kansai|KANSAI' },
    { name: '🇸🇬 新加坡节点', filter: '🇸🇬|新加坡|坡|狮城|\\bSG(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Singapore|SINGAPORE|SIN' },
    { name: '🇼🇸 台湾节点', filter: '🇹🇼|🇼🇸|台|新北|彰化|\\bTW(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Taiwan|TAIWAN|TWN|TPE|ROC' },
    { name: '🇰🇷 韩国节点', filter: '🇰🇷|\\bKR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Korea|KOREA|KOR|首尔|韩|韓|春川|Chuncheon|ICN' },
    { name: '🇨🇦 加拿大节点', filter: '🇨🇦|加拿大|\\bCA(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|Canada|CANADA|CAN|渥太华|温哥华|卡尔加里|蒙特利尔|Montreal|YVR|YYZ|YUL' },
    { name: '🇬🇧 英国节点', filter: '🇬🇧|英国|Britain|United Kingdom|UNITED KINGDOM|England|伦敦|曼彻斯特|Manchester|\\bUK(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|GBR|LHR|MAN' },
    { name: '🇫🇷 法国节点', filter: '🇫🇷|法国|\\bFR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|France|FRANCE|FRA|巴黎|马赛|Marseille|CDG|MRS' },
    { name: '🇩🇪 德国节点', filter: '🇩🇪|德国|Germany|GERMANY|\\bDE(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|DEU|柏林|法兰克福|慕尼黑|Munich|MUC' },
    { name: '🇳🇱 荷兰节点', filter: '🇳🇱|荷兰|Netherlands|NETHERLANDS|\\bNL(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|NLD|阿姆斯特丹|AMS' },
    { name: '🇹🇷 土耳其节点', filter: '🇹🇷|土耳其|Turkey|TURKEY|Türkiye|\\bTR(?:[-_ ]?\\d+(?:[-_ ]?[A-Za-z]{2,})?)?\\b|TUR|IST|ANK' },
];

const OTHER_REGIONS_EXCLUDE = REGION_PROXY_GROUPS.map(r => r.filter).join('|');

const STANDARD_TOP_LEVEL_KEYS = new Set([
    'port', 'socks-port', 'redir-port', 'tproxy-port', 'mixed-port',
    'allow-lan', 'bind-address', 'mode', 'log-level', 'external-controller',
    'external-ui', 'ipv6', 'dns', 'proxies', 'proxy-groups', 'proxy-providers',
    'rules', 'rule-providers', 'hosts', 'profile', 'tun', 'sniffer',
    'authentication', 'unified-delay', 'tcp-concurrent', 'find-process-mode',
    'global-client-fingerprint', 'keep-alive-interval', 'geodata-mode',
    'geo-auto-update', 'geo-update-interval', 'geox-url',
    'add-region-proxy-groups',
]);

const MIHOMO_GROUP_FIELDS = new Set([
    'include-all',
    'include-type',
    'include-all-proxies',
    'include-all-providers',
    'include-region-proxy-groups',
    'filter',
    'exclude-filter',
    'exclude-type',
    'dialer-proxy-group',
]);

/**
 * @param {string} templateContent
 * @param {Array<Record<string, any>>} proxies Clash-format proxy objects (must have name + type)
 * @param {{ providers?: Record<string, string[]> }} [options]
 * @returns {string} processed YAML
 */
export function processV3Template(templateContent, proxies = [], options = {}) {
    const config = yaml.load(templateContent);
    if (!config || typeof config !== 'object') {
        throw new Error('Invalid template YAML');
    }

    const allProxies = (proxies || [])
        .filter(p => p && p.name && p.type)
        .map(p => ({ name: String(p.name), type: String(p.type).toLowerCase(), raw: p }));

    const providers = options.providers || {};
    const providerNames = Object.keys(providers);

    const variables = {};
    const usedVariables = new Set();
    for (const [key, value] of Object.entries(config)) {
        if (!STANDARD_TOP_LEVEL_KEYS.has(key) && typeof value === 'string') {
            variables[key] = value;
        }
    }

    let groups = Array.isArray(config['proxy-groups']) ? [...config['proxy-groups']] : [];
    let addRegion = config['add-region-proxy-groups'] === true
        || groups.some(g => g && (g['include-region-proxy-groups'] || (g.proxies || []).includes(REGION_PROXY_GROUPS_MARKER)));

    let regionGroupNames = [];
    if (addRegion) {
        const regionGroups = REGION_PROXY_GROUPS.map(r => ({
            name: r.name,
            type: 'select',
            'include-all-proxies': true,
            filter: r.filter,
            proxies: [],
        }));
        regionGroups.push({
            name: '🌐 其他地区',
            type: 'select',
            'include-all-proxies': true,
            'exclude-filter': OTHER_REGIONS_EXCLUDE,
            proxies: [],
        });
        const insertAt = Math.min(2, groups.length);
        groups = [...groups.slice(0, insertAt), ...regionGroups, ...groups.slice(insertAt)];
        regionGroupNames = regionGroups.map(g => g.name);
    }

    let proxyGroupNames = groups.map(g => g?.name).filter(Boolean);

    const dialerGroupMap = {};
    for (const g of groups) {
        if (g?.name && g['dialer-proxy-group']) {
            dialerGroupMap[g.name] = g['dialer-proxy-group'];
        }
    }

    const resolveVar = (value) => {
        if (typeof value === 'string' && variables[value] !== undefined) {
            usedVariables.add(value);
            return variables[value];
        }
        return value;
    };

    const processed = [];
    const removedGroups = new Set();

    for (const group of groups) {
        if (!group || typeof group !== 'object') continue;

        const filter = resolveVar(group.filter || '');
        const excludeFilter = resolveVar(group['exclude-filter'] || '');
        const includeType = group['include-type'] || '';
        const excludeType = group['exclude-type'] || '';
        const includeAll = !!group['include-all'];
        const includeAllProxies = !!group['include-all-proxies'];
        const includeAllProviders = !!group['include-all-providers'];
        const includeRegion = !!group['include-region-proxy-groups'];
        const staticProxies = Array.isArray(group.proxies) ? group.proxies.map(String) : [];
        const useList = Array.isArray(group.use) ? group.use.map(String) : [];

        const hasNodesMarker = staticProxies.includes(PROXY_NODES_MARKER);
        const hasProvidersMarker = staticProxies.includes(PROXY_PROVIDERS_MARKER);
        const hasRegionMarker = staticProxies.includes(REGION_PROXY_GROUPS_MARKER);

        let nodeNames = [];
        const hasExplicitInclude = includeAll || includeAllProxies || includeType || hasNodesMarker;
        if (includeAll || includeAllProxies || hasNodesMarker) {
            nodeNames = allProxies.map(p => p.name);
        } else if (includeType) {
            const types = parseTypeList(includeType);
            nodeNames = allProxies.filter(p => types.includes(p.type)).map(p => p.name);
        } else if (!hasExplicitInclude && (filter || excludeFilter)) {
            nodeNames = allProxies.map(p => p.name);
        }

        let providerMemberNames = [];
        if (includeAll || includeAllProviders) {
            for (const members of Object.values(providers)) {
                providerMemberNames.push(...(members || []));
            }
        } else if (useList.length > 0) {
            for (const name of useList) {
                if (providers[name]) providerMemberNames.push(...providers[name]);
            }
        }

        let result;
        if (hasNodesMarker || hasProvidersMarker || hasRegionMarker) {
            result = [];
            for (const item of staticProxies) {
                if (item === PROXY_NODES_MARKER) result.push(...nodeNames);
                else if (item === PROXY_PROVIDERS_MARKER) result.push(...providerMemberNames);
                else if (item === REGION_PROXY_GROUPS_MARKER) result.push(...regionGroupNames);
                else result.push(item);
            }
        } else {
            result = [];
            if (includeRegion) result.push(...regionGroupNames);
            result.push(...staticProxies);
            result.push(...nodeNames);
            result.push(...providerMemberNames);
        }

        if (filter) {
            result = applyFilterPreservingGroups(result, filter, proxyGroupNames);
        }
        if (excludeFilter) {
            result = applyExcludeFilter(result, excludeFilter);
        }
        if (excludeType) {
            const types = parseTypeList(excludeType);
            const typeByName = new Map(allProxies.map(p => [p.name, p.type]));
            result = result.filter(name => {
                if (proxyGroupNames.includes(name) || BUILTIN_NAMES.has(name)) return true;
                const t = typeByName.get(name);
                return !t || !types.includes(t);
            });
        }

        result = unique(result);

        const cleaned = { ...group };
        for (const field of MIHOMO_GROUP_FIELDS) {
            delete cleaned[field];
        }
        cleaned.proxies = result;

        if ((includeAll || includeAllProviders) && providerNames.length > 0) {
            cleaned.use = unique([...(cleaned.use || []), ...providerNames]);
        }

        if (!cleaned.proxies.length && !(cleaned.use && cleaned.use.length)) {
            removedGroups.add(cleaned.name);
            continue;
        }

        processed.push(cleaned);
    }

    if (removedGroups.size > 0) {
        for (const g of processed) {
            if (Array.isArray(g.proxies)) {
                g.proxies = g.proxies.filter(n => !removedGroups.has(n));
            }
        }
        proxyGroupNames = processed.map(g => g.name).filter(Boolean);
    }

    const groupNameSet = new Set(processed.map(g => g.name).filter(Boolean));
    for (const n of regionGroupNames) groupNameSet.add(n);

    const usedNames = new Set();
    for (const g of processed) {
        for (const name of g.proxies || []) {
            if (!groupNameSet.has(name) && !BUILTIN_NAMES.has(name)) {
                usedNames.add(name);
            }
        }
    }

    const dialerByProxy = new Map();
    for (const g of processed) {
        const dialer = dialerGroupMap[g.name];
        if (!dialer || !groupNameSet.has(dialer)) continue;
        for (const name of g.proxies || []) {
            if (groupNameSet.has(name) || BUILTIN_NAMES.has(name)) continue;
            if (!dialerByProxy.has(name)) dialerByProxy.set(name, dialer);
        }
    }

    const proxyByName = new Map(allProxies.map(p => [p.name, { ...p.raw }]));
    const orderedProxies = [];
    for (const p of allProxies) {
        if (!usedNames.has(p.name)) continue;
        const cfg = { ...proxyByName.get(p.name) };
        const dialer = dialerByProxy.get(p.name);
        if (dialer) cfg['dialer-proxy'] = dialer;
        orderedProxies.push(cfg);
    }

    const out = { ...config };
    out.proxies = orderedProxies;
    out['proxy-groups'] = processed;
    delete out['add-region-proxy-groups'];
    for (const name of usedVariables) {
        delete out[name];
    }

    return yaml.dump(out, {
        lineWidth: -1,
        noRefs: true,
        quotingType: '"',
        forceQuotes: false,
    });
}

function parseTypeList(typeStr) {
    return String(typeStr).split('|').map(s => s.trim().toLowerCase()).filter(Boolean);
}

function tryMatch(pattern, text) {
    try {
        return new RegExp(pattern).test(text);
    } catch {
        return text.includes(pattern);
    }
}

function applyFilterPreservingGroups(proxies, filterPattern, proxyGroups) {
    const patterns = String(filterPattern).split('`').map(s => s.trim()).filter(Boolean);
    const groupSet = new Set(proxyGroups);
    const result = [];
    for (const name of proxies) {
        if (groupSet.has(name) || BUILTIN_NAMES.has(name)) {
            result.push(name);
            continue;
        }
        for (const pattern of patterns) {
            if (tryMatch(pattern, name)) {
                result.push(name);
                break;
            }
        }
    }
    return result;
}

function applyExcludeFilter(proxies, excludePattern) {
    const patterns = String(excludePattern).split('`').map(s => s.trim()).filter(Boolean);
    return proxies.filter(name => {
        if (BUILTIN_NAMES.has(name)) return true;
        for (const pattern of patterns) {
            if (tryMatch(pattern, name)) return false;
        }
        return true;
    });
}

function unique(items) {
    const seen = new Set();
    const out = [];
    for (const item of items) {
        if (seen.has(item)) continue;
        seen.add(item);
        out.push(item);
    }
    return out;
}
