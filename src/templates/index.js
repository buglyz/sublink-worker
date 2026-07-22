/**
 * Built-in + generated V3 rule templates (miaomiaowu-style full YAML).
 * Keys are URL-friendly template ids for ?template=...
 */
import fakeIp from './fake_ip__v3.js';
import redirhost from './redirhost__v3.js';
import { GENERATED_TEMPLATES, GENERATED_META } from './generated/index.js';
import { normalizeTemplateId } from './presets.js';

const BUILTIN_V3 = {
    fake_ip: fakeIp,
    redirhost: redirhost,
};

const BUILTIN_META = {
    fake_ip: {
        label: '妙妙屋 V3 - fake-ip DNS',
        source: 'miaomiaowu-v3',
    },
    redirhost: {
        label: '妙妙屋 V3 - redir-host DNS',
        source: 'miaomiaowu-v3',
    },
};

/** id → YAML string */
export const BUILTIN_TEMPLATES = {
    ...BUILTIN_V3,
    ...GENERATED_TEMPLATES,
};

const ALIASES = {
    fake_ip: 'fake_ip',
    fakeip: 'fake_ip',
    fake_ip_v3: 'fake_ip',
    fake_ip__v3: 'fake_ip',
    redirhost: 'redirhost',
    redir_host: 'redirhost',
    redirhost_v3: 'redirhost',
    redirhost__v3: 'redirhost',
};

// Build case-insensitive lookup for all template ids
const ID_LOOKUP = new Map();
for (const id of Object.keys(BUILTIN_TEMPLATES)) {
    ID_LOOKUP.set(normalizeTemplateId(id), id);
    ID_LOOKUP.set(id, id);
}
for (const [alias, target] of Object.entries(ALIASES)) {
    ID_LOOKUP.set(normalizeTemplateId(alias), target);
}

export function listTemplates() {
    return Object.keys(BUILTIN_TEMPLATES);
}

export function listTemplateDetails() {
    return listTemplates().map((id) => {
        const meta = BUILTIN_META[id] || GENERATED_META[id] || {};
        return {
            id,
            label: meta.label || id,
            source: meta.source || 'builtin',
        };
    });
}

export function getTemplate(id) {
    if (!id) return null;
    const key = String(id).trim();
    if (BUILTIN_TEMPLATES[key]) return BUILTIN_TEMPLATES[key];
    const resolved = ID_LOOKUP.get(normalizeTemplateId(key)) || ID_LOOKUP.get(key.toLowerCase());
    return (resolved && BUILTIN_TEMPLATES[resolved]) || null;
}
