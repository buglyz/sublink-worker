import { InvalidPayloadError } from './errors.js';
import { fetchRemoteText } from '../parsers/subscription/remoteFetch.js';
import { tryDecodeSubscriptionLines } from '../utils.js';

const MAX_REMOTE_SOURCES = 3;

export async function resolveXraySubscriptionLines(input, userAgent, logger = console) {
    const sources = String(input || '').split('\n').map((source) => source.trim()).filter(Boolean);
    let remoteSourceCount = 0;
    const results = await Promise.all(sources.map(async (source) => {
        if (!/^https?:\/\//i.test(source)) {
            return { lines: decodeLines(source) };
        }
        remoteSourceCount += 1;
        if (remoteSourceCount > MAX_REMOTE_SOURCES) {
            throw new InvalidPayloadError(`一次最多拉取 ${MAX_REMOTE_SOURCES} 个远程订阅`);
        }
        try {
            const { text, response } = await fetchRemoteText(source, { userAgent });
            return {
                lines: decodeLines(text),
                subscriptionUserinfo: response.headers.get('subscription-userinfo') || undefined
            };
        } catch (error) {
            logger.warn('Failed to fetch the proxy', error);
            return { lines: [] };
        }
    }));

    return {
        lines: results.flatMap((result) => result.lines),
        subscriptionUserinfo: results.find((result) => result.subscriptionUserinfo)?.subscriptionUserinfo
    };
}

function decodeLines(value) {
    const decoded = tryDecodeSubscriptionLines(value, { decodeUriComponent: true });
    const lines = Array.isArray(decoded) ? decoded : [decoded];
    return lines.filter((line) => typeof line === 'string' && line.trim() !== '');
}
