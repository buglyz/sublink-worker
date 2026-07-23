import { CloudflareKVAdapter } from '../adapters/kv/cloudflareKv.js';

export function createCloudflareRuntime(env) {
    return {
        kv: env?.SUBLINK_KV ? new CloudflareKVAdapter(env.SUBLINK_KV) : null,
        assetFetcher: env?.ASSETS ? (request) => env.ASSETS.fetch(request) : null,
        logger: console,
        config: {},
        env: env || {},
        authPassword: env?.AUTH_PASSWORD || env?.SUBLINK_PASSWORD || '',
        storageCoordinator: getStorageCoordinatorStub(env?.SUBLINK_STORAGE_COORDINATOR)
    };
}

/** Prefer getByName when available; fall back to classic idFromName + get. */
function getStorageCoordinatorStub(binding) {
    if (!binding) return null;
    if (typeof binding.getByName === 'function') {
        return binding.getByName('primary');
    }
    if (typeof binding.idFromName === 'function' && typeof binding.get === 'function') {
        return binding.get(binding.idFromName('primary'));
    }
    return null;
}
