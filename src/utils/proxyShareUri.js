/**
 * Convert structured proxy objects (Clash / Sing-Box style) into share URIs
 * so the node library can list each node individually.
 */

export function proxiesToShareNodes(parsed, options = {}) {
    const tag = options.tag || 'remote';
    const now = Date.now();
    const out = [];

    if (!parsed) return out;

    if (Array.isArray(parsed)) {
        for (const line of parsed) {
            if (typeof line === 'string' && looksLikeUri(line)) {
                out.push(nodeFromUri(line.trim(), tag, now));
            }
        }
        return out;
    }

    if (parsed && Array.isArray(parsed.proxies)) {
        for (const proxy of parsed.proxies) {
            if (!proxy || typeof proxy !== 'object') continue;
            const uri = proxyToShareUri(proxy);
            if (uri) {
                out.push(nodeFromUri(uri, tag, now, proxy.tag || proxy.name));
            } else {
                // Last resort: keep a stable raw fingerprint so user still sees the node
                const name = proxy.tag || proxy.name || '未命名节点';
                const protocol = normalizeProtocol(proxy.type);
                const raw = `proxy-json://${b64url(JSON.stringify(proxy))}#${encodeURIComponent(name)}`;
                out.push({
                    id: uid(),
                    raw,
                    name: String(name).slice(0, 80),
                    protocol: protocol || 'unknown',
                    tag,
                    enabled: true,
                    selected: false,
                    createdAt: now,
                    updatedAt: now
                });
            }
        }
    }

    return out;
}

export function extractUriLines(content) {
    return String(content || '')
        .split(/\r?\n/)
        .map((l) => l.trim())
        .filter((l) => l && !l.startsWith('#') && !l.startsWith('//'))
        .filter((l) => looksLikeUri(l));
}

function looksLikeUri(line) {
    return /^(ss|ssr|vmess|vless|trojan|hysteria|hysteria2|hy2|tuic|anytls|socks5?):\/\//i.test(line);
}

function nodeFromUri(raw, tag, now, nameOverride) {
    const protocol = (raw.match(/^([a-z0-9+.-]+):\/\//i)?.[1] || 'unknown').toLowerCase();
    return {
        id: uid(),
        raw,
        name: nameOverride || nameFromUri(raw),
        protocol: protocol === 'hy2' ? 'hysteria2' : protocol,
        tag,
        enabled: true,
        selected: false,
        createdAt: now,
        updatedAt: now
    };
}

/**
 * @param {object} p - Clash-like or Sing-Box-like proxy object
 */
export function proxyToShareUri(p) {
    if (!p || typeof p !== 'object') return null;
    const type = normalizeProtocol(p.type);
    const name = p.tag || p.name || 'node';

    try {
        switch (type) {
            case 'ss':
            case 'shadowsocks':
                return ssToUri(p, name);
            case 'vmess':
                return vmessToUri(p, name);
            case 'vless':
                return vlessToUri(p, name);
            case 'trojan':
                return trojanToUri(p, name);
            case 'hysteria2':
            case 'hy2':
                return hy2ToUri(p, name);
            case 'hysteria':
                return hysteriaToUri(p, name);
            case 'tuic':
                return tuicToUri(p, name);
            default:
                return null;
        }
    } catch {
        return null;
    }
}

function normalizeProtocol(t) {
    const s = String(t || '').toLowerCase();
    if (s === 'shadowsocks') return 'ss';
    if (s === 'hy2') return 'hysteria2';
    return s;
}

function ssToUri(p, name) {
    const server = p.server || p.hostname;
    const port = p.server_port || p.port;
    const method = p.method || p.cipher;
    const password = p.password;
    if (!server || !port || !method || password == null) return null;
    const userinfo = b64(`${method}:${password}`).replace(/=+$/, '');
    let uri = `ss://${userinfo}@${hostport(server, port)}`;
    // plugin (SIP003)
    if (p.plugin) {
        const opts = p.plugin_opts || p['plugin-opts'] || {};
        const parts = [p.plugin];
        for (const [k, v] of Object.entries(opts)) {
            if (v === true) parts.push(k);
            else if (v != null && v !== false) parts.push(`${k}=${v}`);
        }
        uri += `?plugin=${encodeURIComponent(parts.join(';'))}`;
    }
    return `${uri}#${encodeURIComponent(name)}`;
}

function vmessToUri(p, name) {
    const server = p.server || p.add;
    const port = p.server_port || p.port;
    const uuid = p.uuid || p.id;
    if (!server || !port || !uuid) return null;
    const tlsObj = p.tls && typeof p.tls === 'object' ? p.tls : null;
    const tlsEnabled = tlsObj ? !!tlsObj.enabled : !!p.tls;
    const transport = p.transport || {};
    const net = transport.type || p.network || p.net || 'tcp';
    const cfg = {
        v: '2',
        ps: name,
        add: server,
        port: String(port),
        id: uuid,
        aid: String(p.alter_id ?? p.alterId ?? 0),
        scy: p.security || p.cipher || 'auto',
        net,
        type: p.type === 'vmess' ? (transport.type === 'http' ? 'http' : 'none') : (p.type || 'none'),
        host: headerHost(transport) || p.host || '',
        path: transport.path || p.path || '',
        tls: tlsEnabled ? 'tls' : '',
        sni: (tlsObj && tlsObj.server_name) || p.servername || p.sni || '',
        alpn: Array.isArray(p.alpn) ? p.alpn.join(',') : (p.alpn || '')
    };
    return `vmess://${b64(JSON.stringify(cfg))}`;
}

function vlessToUri(p, name) {
    const server = p.server;
    const port = p.server_port || p.port;
    const uuid = p.uuid;
    if (!server || !port || !uuid) return null;
    const tlsObj = p.tls && typeof p.tls === 'object' ? p.tls : null;
    const security = tlsObj?.reality?.enabled ? 'reality' : (tlsObj?.enabled || p.tls ? 'tls' : 'none');
    const transport = p.transport || {};
    const type = transport.type || p.network || 'tcp';
    const params = new URLSearchParams();
    params.set('encryption', 'none');
    params.set('security', security);
    params.set('type', type);
    if (p.flow) params.set('flow', p.flow);
    if (security === 'tls' || security === 'reality') {
        const sni = tlsObj?.server_name || p.servername || p.sni;
        if (sni) params.set('sni', sni);
        if (tlsObj?.insecure || p['skip-cert-verify']) params.set('allowInsecure', '1');
        if (tlsObj?.utls?.fingerprint || p['client-fingerprint']) {
            params.set('fp', tlsObj?.utls?.fingerprint || p['client-fingerprint']);
        }
    }
    if (security === 'reality') {
        if (tlsObj.reality.public_key) params.set('pbk', tlsObj.reality.public_key);
        if (tlsObj.reality.short_id) params.set('sid', tlsObj.reality.short_id);
    }
    if (type === 'ws') {
        if (transport.path) params.set('path', transport.path);
        const host = headerHost(transport);
        if (host) params.set('host', host);
    }
    if (type === 'grpc' && (transport.service_name || p['grpc-opts']?.['grpc-service-name'])) {
        params.set('serviceName', transport.service_name || p['grpc-opts']['grpc-service-name']);
    }
    return `vless://${uuid}@${hostport(server, port)}?${params.toString()}#${encodeURIComponent(name)}`;
}

function trojanToUri(p, name) {
    const server = p.server;
    const port = p.server_port || p.port;
    const password = p.password;
    if (!server || !port || !password) return null;
    const tlsObj = p.tls && typeof p.tls === 'object' ? p.tls : null;
    const params = new URLSearchParams();
    const sni = tlsObj?.server_name || p.sni || p.servername;
    if (sni) params.set('sni', sni);
    if (tlsObj?.insecure || p['skip-cert-verify']) params.set('allowInsecure', '1');
    const transport = p.transport || {};
    const type = transport.type || p.network;
    if (type) params.set('type', type);
    if (type === 'ws') {
        if (transport.path) params.set('path', transport.path);
        const host = headerHost(transport);
        if (host) params.set('host', host);
    }
    const q = params.toString();
    return `trojan://${encodeURIComponent(password)}@${hostport(server, port)}${q ? `?${q}` : ''}#${encodeURIComponent(name)}`;
}

function hy2ToUri(p, name) {
    const server = p.server;
    const port = p.server_port || p.port;
    const password = p.password || p.auth;
    if (!server || !port || !password) return null;
    const params = new URLSearchParams();
    if (p.tls?.server_name || p.sni || p.servername) params.set('sni', p.tls?.server_name || p.sni || p.servername);
    if (p.tls?.insecure || p['skip-cert-verify'] || p.insecure) params.set('insecure', '1');
    if (p.obfs || p.obfuscation) params.set('obfs', p.obfs || p.obfuscation);
    if (p['obfs-password'] || p.obfs_password) params.set('obfs-password', p['obfs-password'] || p.obfs_password);
    const q = params.toString();
    return `hysteria2://${encodeURIComponent(password)}@${hostport(server, port)}${q ? `?${q}` : ''}#${encodeURIComponent(name)}`;
}

function hysteriaToUri(p, name) {
    const server = p.server;
    const port = p.server_port || p.port;
    const auth = p.auth_str || p.auth || p.password;
    if (!server || !port) return null;
    const params = new URLSearchParams();
    if (auth) params.set('auth', auth);
    if (p.peer || p.sni) params.set('peer', p.peer || p.sni);
    if (p.up || p.up_mbps) params.set('upmbps', String(p.up || p.up_mbps));
    if (p.down || p.down_mbps) params.set('downmbps', String(p.down || p.down_mbps));
    if (p.alpn) params.set('alpn', Array.isArray(p.alpn) ? p.alpn.join(',') : p.alpn);
    if (p['skip-cert-verify'] || p.insecure) params.set('insecure', '1');
    const q = params.toString();
    return `hysteria://${hostport(server, port)}${q ? `?${q}` : ''}#${encodeURIComponent(name)}`;
}

function tuicToUri(p, name) {
    const server = p.server;
    const port = p.server_port || p.port;
    const uuid = p.uuid;
    const password = p.password;
    if (!server || !port || !uuid) return null;
    const params = new URLSearchParams();
    if (password) params.set('password', password);
    if (p.congestion_control || p['congestion-controller']) {
        params.set('congestion_control', p.congestion_control || p['congestion-controller']);
    }
    if (p.tls?.server_name || p.sni) params.set('sni', p.tls?.server_name || p.sni);
    if (p.tls?.insecure || p['skip-cert-verify']) params.set('allow_insecure', '1');
    if (p.alpn) params.set('alpn', Array.isArray(p.alpn) ? p.alpn.join(',') : p.alpn);
    const q = params.toString();
    return `tuic://${uuid}${password ? `:${encodeURIComponent(password)}` : ''}@${hostport(server, port)}${q ? `?${q}` : ''}#${encodeURIComponent(name)}`;
}

function headerHost(transport) {
    const h = transport?.headers;
    if (!h) return '';
    return h.Host || h.host || '';
}

function hostport(server, port) {
    const host = String(server).includes(':') && !String(server).startsWith('[') ? `[${server}]` : server;
    return `${host}:${port}`;
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
                const json = JSON.parse(atobCompat(line.slice(8).replace(/-/g, '+').replace(/_/g, '/')));
                if (json.ps) return String(json.ps).slice(0, 80);
            } catch {}
        }
        const u = new URL(line);
        if (u.hostname) return (u.hostname + (u.port ? `:${u.port}` : '')).slice(0, 80);
    } catch {}
    return line.slice(0, 40) + (line.length > 40 ? '…' : '');
}

function b64(str) {
    if (typeof Buffer !== 'undefined') return Buffer.from(str, 'utf8').toString('base64');
    return btoa(unescape(encodeURIComponent(str)));
}

function b64url(str) {
    return b64(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function atobCompat(str) {
    if (typeof globalThis.atob === 'function') return globalThis.atob(str);
    return Buffer.from(str, 'base64').toString('utf8');
}

function uid() {
    return 'n_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
