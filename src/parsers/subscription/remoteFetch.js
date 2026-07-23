import { InvalidPayloadError, ServiceError } from '../../services/errors.js';

export const REMOTE_FETCH_TIMEOUT_MS = 8_000;
export const MAX_REMOTE_SUBSCRIPTION_BYTES = 2 * 1024 * 1024;
const MAX_REDIRECTS = 3;

export async function fetchRemoteText(input, options = {}) {
    const timeoutMs = options.timeoutMs ?? REMOTE_FETCH_TIMEOUT_MS;
    const maxBytes = options.maxBytes ?? MAX_REMOTE_SUBSCRIPTION_BYTES;
    const headers = new Headers();
    if (options.userAgent) {
        headers.set('User-Agent', String(options.userAgent).slice(0, 200));
    }

    let url = assertPublicHttpUrl(input);
    for (let redirectCount = 0; redirectCount <= MAX_REDIRECTS; redirectCount += 1) {
        const response = await fetchWithTimeout(url, { headers, timeoutMs });
        if (isRedirect(response.status)) {
            const location = response.headers.get('location');
            if (!location || redirectCount === MAX_REDIRECTS) {
                throw new ServiceError('Remote subscription redirect is invalid', 502);
            }
            url = assertPublicHttpUrl(new URL(location, url).toString());
            continue;
        }
        if (!response.ok) {
            throw new ServiceError(`Remote subscription returned HTTP ${response.status}`, 502);
        }
        return {
            text: await readBoundedText(response, maxBytes),
            response,
            url: url.toString()
        };
    }

    throw new ServiceError('Remote subscription redirect is invalid', 502);
}

function assertPublicHttpUrl(input) {
    let url;
    try {
        url = new URL(String(input || '').trim());
    } catch {
        throw new InvalidPayloadError('请提供有效的 http(s) 订阅地址');
    }
    if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        throw new InvalidPayloadError('仅支持 http(s) 订阅地址');
    }
    if (isPrivateHostname(url.hostname)) {
        throw new InvalidPayloadError('不允许访问本地或私有网络地址');
    }
    return url;
}

function isRedirect(status) {
    return status >= 300 && status < 400;
}

function isPrivateHostname(hostname) {
    const host = String(hostname || '').replace(/^\[|\]$/g, '').replace(/\.$/, '').toLowerCase();
    if (!host || host === 'localhost' || host.endsWith('.localhost')) return true;
    // IPv6 loopback / link-local / ULA only — do not treat domain labels like "fd-example.com" as private.
    if (host === '::1' || host.startsWith('fe80:') || /^f[cd][0-9a-f]{0,2}:/i.test(host)) return true;
    if (host.startsWith('::ffff:')) return isPrivateIpv4(host.slice(7));
    return isPrivateIpv4(host);
}

function isPrivateIpv4(host) {
    const parts = host.split('.');
    if (parts.length !== 4 || parts.some((part) => !/^\d+$/.test(part))) return false;
    const values = parts.map(Number);
    if (values.some((value) => value < 0 || value > 255)) return true;
    return values[0] === 0 ||
        values[0] === 10 ||
        values[0] === 127 ||
        values[0] >= 224 ||
        (values[0] === 100 && values[1] >= 64 && values[1] <= 127) || // CGNAT
        (values[0] === 169 && values[1] === 254) ||
        (values[0] === 172 && values[1] >= 16 && values[1] <= 31) ||
        (values[0] === 192 && values[1] === 0 && values[2] === 0) || // 192.0.0.0/24 IETF
        (values[0] === 192 && values[1] === 0 && values[2] === 2) || // TEST-NET-1
        (values[0] === 192 && values[1] === 168) ||
        (values[0] === 198 && (values[1] === 18 || values[1] === 19)) || // benchmarking
        (values[0] === 198 && values[1] === 51 && values[2] === 100) || // TEST-NET-2
        (values[0] === 203 && values[1] === 0 && values[2] === 113); // TEST-NET-3
}

async function fetchWithTimeout(url, { headers, timeoutMs }) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort('Remote subscription timed out'), timeoutMs);
    try {
        return await fetch(url, {
            method: 'GET',
            headers,
            redirect: 'manual',
            signal: controller.signal
        });
    } catch (error) {
        if (controller.signal.aborted) {
            throw new ServiceError('Remote subscription request timed out', 504);
        }
        throw new ServiceError('Unable to fetch remote subscription', 502);
    } finally {
        clearTimeout(timeout);
    }
}

async function readBoundedText(response, maxBytes) {
    const contentLength = Number(response.headers.get('content-length'));
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
        throw new ServiceError('Remote subscription is too large', 413);
    }
    if (!response.body) {
        // Test doubles and a few non-streaming fetch implementations expose text() only.
        const text = await response.text();
        if (new TextEncoder().encode(text).byteLength > maxBytes) {
            throw new ServiceError('Remote subscription is too large', 413);
        }
        return text;
    }

    const reader = response.body.getReader();
    const chunks = [];
    let total = 0;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            total += value.byteLength;
            if (total > maxBytes) {
                await reader.cancel();
                throw new ServiceError('Remote subscription is too large', 413);
            }
            chunks.push(value);
        }
    } finally {
        reader.releaseLock();
    }

    const body = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) {
        body.set(chunk, offset);
        offset += chunk.byteLength;
    }
    return new TextDecoder().decode(body);
}
