/**
 * Clash builder that injects parsed proxies into a full V3 YAML rule template
 * (miaomiaowu-style) instead of generating rules from selectedRules presets.
 */

import yaml from 'js-yaml';
import { ClashConfigBuilder } from './ClashConfigBuilder.js';
import { CLASH_CONFIG } from '../config/index.js';
import { getTemplate, listTemplates, listTemplateDetails } from '../templates/index.js';
import { processV3Template } from './helpers/templateV3Processor.js';
import { InvalidConfigError } from '../services/errors.js';

export { listTemplates, listTemplateDetails };

export class TemplateClashBuilder extends ClashConfigBuilder {
    /**
     * @param {string} inputString subscription content / URIs / URLs
     * @param {string} templateId built-in template id (fake_ip | redirhost)
     * @param {object} [opts]
     * @param {string} [opts.lang]
     * @param {string} [opts.userAgent]
     * @param {string} [opts.templateYaml] override built-in with raw YAML
     * @param {Record<string, string[]>} [opts.providers] optional provider name → member names
     */
    constructor(inputString, templateId, opts = {}) {
        super(
            inputString,
            [],
            [],
            CLASH_CONFIG,
            opts.lang || 'zh-CN',
            opts.userAgent,
            false,
            false,
            undefined,
            undefined,
            false
        );
        this.templateId = templateId;
        this.templateYaml = opts.templateYaml || null;
        this.providers = opts.providers || {};
        this._formatted = null;
    }

    async build() {
        const customItems = await this.parseCustomItems();
        this.addCustomItems(customItems);
        this._formatted = this.formatConfig();
        return this._formatted;
    }

    formatConfig() {
        if (this._formatted) return this._formatted;

        const templateContent = this.templateYaml || getTemplate(this.templateId);
        if (!templateContent) {
            throw new InvalidConfigError(
                `Unknown template "${this.templateId}". Available: ${listTemplates().join(', ')}`
            );
        }

        const proxies = this.getProxies() || [];
        const extraProviders = this.generateProxyProviders();
        const hasProviders = Object.keys(extraProviders).length > 0
            || Object.keys(this.providers).length > 0;

        if (proxies.length === 0 && !hasProviders) {
            throw new InvalidConfigError('No proxies parsed from input');
        }

        const providersMeta = { ...this.providers };
        for (const name of Object.keys(extraProviders)) {
            if (!providersMeta[name]) providersMeta[name] = [];
        }

        let yamlOut = processV3Template(templateContent, proxies, { providers: providersMeta });

        if (Object.keys(extraProviders).length > 0) {
            const parsed = yaml.load(yamlOut);
            parsed['proxy-providers'] = {
                ...(parsed['proxy-providers'] || {}),
                ...extraProviders,
            };
            const providerNames = Object.keys(parsed['proxy-providers']);
            if (Array.isArray(parsed['proxy-groups'])) {
                for (const g of parsed['proxy-groups']) {
                    if (!g) continue;
                    if (!Array.isArray(g.use) || g.use.length === 0) {
                        if (g.type === 'url-test' || g.type === 'select' || g.type === 'fallback') {
                            g.use = providerNames;
                        }
                    }
                }
            }
            yamlOut = yaml.dump(parsed, { lineWidth: -1, noRefs: true, forceQuotes: false });
        }

        this.config = yaml.load(yamlOut);
        this._formatted = yamlOut;
        return yamlOut;
    }
}
