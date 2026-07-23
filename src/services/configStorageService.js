import yaml from 'js-yaml';
import { generateWebPath } from '../utils.js';
import { InvalidPayloadError, MissingDependencyError } from './errors.js';

const CONFIG_PREFIX = 'config:';
const CONFIG_TYPES = new Set(['clash', 'singbox', 'surge']);
const CONFIG_ID_PATTERN = /^(clash|singbox|surge)_[A-Za-z0-9]{8}$/;

export class ConfigStorageService {
    constructor(kv, options = {}) {
        this.kv = kv;
        this.options = options;
    }

    ensureKv() {
        if (!this.kv) {
            throw new MissingDependencyError('Config storage requires a KV store');
        }
        return this.kv;
    }

    async getConfigById(configId) {
        const kv = this.ensureKv();
        const id = normalizeConfigId(configId);
        if (!id) return null;

        let stored = await kv.get(storageKey(id));
        if (!stored) {
            // Keep prior user-created configs readable without permitting arbitrary KV reads.
            stored = await kv.get(id);
        }
        if (!stored) return null;
        try {
            return JSON.parse(stored);
        } catch {
            throw new InvalidPayloadError('Stored config is not valid JSON');
        }
    }

    async saveConfig(type, content) {
        if (!CONFIG_TYPES.has(type)) {
            throw new InvalidPayloadError('Unsupported config type');
        }

        const kv = this.ensureKv();
        const configId = `${type}_${generateWebPath(8)}`;
        const configString = this.serializeConfig(type, content);

        // Validate string is JSON before storing
        JSON.parse(configString);

        const ttlSeconds = this.options.configTtlSeconds;
        const putOptions = ttlSeconds ? { expirationTtl: ttlSeconds } : undefined;
        await kv.put(storageKey(configId), configString, putOptions);
        return configId;
    }

    serializeConfig(type, content) {
        if (type === 'clash') {
            if (typeof content === 'string' && (content.trim().startsWith('-') || content.includes(':'))) {
                const yamlConfig = yaml.load(content);
                return JSON.stringify(yamlConfig);
            }
            return typeof content === 'object' ? JSON.stringify(content) : content;
        }

        if (typeof content === 'object') {
            return JSON.stringify(content);
        }
        if (typeof content === 'string') {
            return content;
        }
        throw new InvalidPayloadError('Unsupported config content type');
    }
}

function normalizeConfigId(value) {
    const configId = String(value || '').trim();
    return CONFIG_ID_PATTERN.test(configId) ? configId : null;
}

function storageKey(configId) {
    return CONFIG_PREFIX + configId;
}
