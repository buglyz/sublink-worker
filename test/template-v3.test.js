import { describe, it, expect } from 'vitest';
import yaml from 'js-yaml';
import { processV3Template, PROXY_NODES_MARKER, PROXY_PROVIDERS_MARKER } from '../src/builders/helpers/templateV3Processor.js';
import { getTemplate, listTemplates } from '../src/templates/index.js';
import { TemplateClashBuilder } from '../src/builders/TemplateClashBuilder.js';

const SAMPLE_TEMPLATE = `
mode: rule
dns:
  enable: true
  enhanced-mode: fake-ip
proxies: null
proxy-groups:
  - name: "🚀 手动选择"
    type: select
    include-all: true
    include-all-proxies: true
    proxies:
      - ♻️ 自动选择
      - __PROXY_NODES__
  - name: ♻️ 自动选择
    type: url-test
    include-all-proxies: true
    proxies:
      - __PROXY_NODES__
    url: https://cp.cloudflare.com/generate_204
    interval: 300
  - name: "🌠 中转节点"
    type: select
    include-all-proxies: true
    filter: 中转|CO
    proxies:
      - __PROXY_NODES__
  - name: "🌄 落地节点"
    type: select
    include-all-proxies: true
    filter: 落地|LD
    proxies:
      - __PROXY_NODES__
    dialer-proxy-group: "🌠 中转节点"
  - name: "🎯 全球直连"
    type: select
    proxies:
      - DIRECT
rules:
  - MATCH,🚀 手动选择
`;

const PROXIES = [
    { name: '香港-01', type: 'ss', server: '1.1.1.1', port: 443, cipher: 'aes-128-gcm', password: 'x' },
    { name: '美国-中转-CO', type: 'ss', server: '2.2.2.2', port: 443, cipher: 'aes-128-gcm', password: 'x' },
    { name: '日本-落地-LD', type: 'vmess', server: '3.3.3.3', port: 443, uuid: 'u', alterId: 0, cipher: 'auto' },
];

describe('listTemplates / getTemplate', () => {
    it('exposes built-in templates', () => {
        expect(listTemplates()).toEqual(expect.arrayContaining(['fake_ip', 'redirhost']));
        expect(getTemplate('fake_ip')).toContain('proxy-groups');
        expect(getTemplate('fake_ip__v3')).toContain('mode: rule');
        expect(getTemplate('nope')).toBeNull();
    });
});

describe('processV3Template', () => {
    it('expands markers and injects proxies', () => {
        const out = processV3Template(SAMPLE_TEMPLATE, PROXIES);
        const cfg = yaml.load(out);

        expect(cfg.proxies).toHaveLength(3);
        expect(cfg.proxies.map(p => p.name).sort()).toEqual(
            ['日本-落地-LD', '美国-中转-CO', '香港-01'].sort()
        );

        const manual = cfg['proxy-groups'].find(g => g.name === '🚀 手动选择');
        expect(manual.proxies).toContain('♻️ 自动选择');
        expect(manual.proxies).toContain('香港-01');
        expect(manual.proxies).not.toContain(PROXY_NODES_MARKER);

        expect(manual['include-all']).toBeUndefined();
        expect(manual.filter).toBeUndefined();
    });

    it('applies filter and dialer-proxy-group', () => {
        const out = processV3Template(SAMPLE_TEMPLATE, PROXIES);
        const cfg = yaml.load(out);

        const relay = cfg['proxy-groups'].find(g => g.name === '🌠 中转节点');
        expect(relay.proxies).toEqual(['美国-中转-CO']);
        expect(relay['dialer-proxy-group']).toBeUndefined();

        const landing = cfg['proxy-groups'].find(g => g.name === '🌄 落地节点');
        expect(landing.proxies).toEqual(['日本-落地-LD']);

        const landingProxy = cfg.proxies.find(p => p.name === '日本-落地-LD');
        expect(landingProxy['dialer-proxy']).toBe('🌠 中转节点');
    });

    it('drops empty filtered groups', () => {
        const proxies = [
            { name: 'only-hk', type: 'ss', server: '1.1.1.1', port: 1, cipher: 'aes-128-gcm', password: 'x' },
        ];
        const out = processV3Template(SAMPLE_TEMPLATE, proxies);
        const cfg = yaml.load(out);
        const names = cfg['proxy-groups'].map(g => g.name);
        expect(names).not.toContain('🌠 中转节点');
        expect(names).not.toContain('🌄 落地节点');
        const manual = cfg['proxy-groups'].find(g => g.name === '🚀 手动选择');
        expect(manual.proxies).not.toContain('🌠 中转节点');
    });

    it('processes real fake_ip template', () => {
        const tpl = getTemplate('fake_ip');
        const out = processV3Template(tpl, PROXIES);
        const cfg = yaml.load(out);
        expect(cfg.mode).toBe('rule');
        expect(cfg.dns['enhanced-mode']).toBe('fake-ip');
        expect(cfg.proxies.length).toBeGreaterThan(0);
        expect(cfg['proxy-groups'].length).toBeGreaterThan(3);
        expect(cfg.rules?.length || 0).toBeGreaterThan(0);
        const dumped = yaml.dump(cfg);
        expect(dumped).not.toContain(PROXY_NODES_MARKER);
        expect(dumped).not.toContain(PROXY_PROVIDERS_MARKER);
    });
});

describe('TemplateClashBuilder', () => {
    it('builds clash yaml from ss uri + template', async () => {
        const uri = 'ss://YWVzLTEyOC1nY206cGFzcw@1.2.3.4:8388#Test-HK';
        const builder = new TemplateClashBuilder(uri, 'fake_ip', { lang: 'zh-CN' });
        await builder.build();
        const text = builder.formatConfig();
        const cfg = yaml.load(text);
        expect(cfg.proxies?.length).toBeGreaterThanOrEqual(1);
        expect(cfg['proxy-groups']?.length).toBeGreaterThan(0);
        expect(cfg.rules?.length).toBeGreaterThan(0);
        expect(text).not.toContain(PROXY_NODES_MARKER);
    });
});
