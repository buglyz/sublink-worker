/**
 * Lightweight smoke test for V3 template path (no workerd / vitest pool).
 * Run: node scripts/smoke-template-v3.mjs
 */
import yaml from 'js-yaml';
import { processV3Template, PROXY_NODES_MARKER, PROXY_PROVIDERS_MARKER } from '../src/builders/helpers/templateV3Processor.js';
import { getTemplate, listTemplates } from '../src/templates/index.js';
import { TemplateClashBuilder } from '../src/builders/TemplateClashBuilder.js';

let passed = 0;
let failed = 0;

function assert(cond, msg) {
    if (cond) {
        passed++;
        console.log('  OK ', msg);
    } else {
        failed++;
        console.error('  FAIL', msg);
    }
}

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

console.log('1) templates');
assert(listTemplates().includes('fake_ip'), 'list has fake_ip');
assert(listTemplates().includes('redirhost'), 'list has redirhost');
assert(listTemplates().includes('ACL4SSR_Online_Mini'), 'list has ACL4SSR_Online_Mini');
assert(listTemplates().includes('Custom_Clash'), 'list has Custom_Clash');
assert(listTemplates().length >= 40, `list has >=40 templates (got ${listTemplates().length})`);
assert(!!getTemplate('fake_ip__v3'), 'alias fake_ip__v3');
assert(!!getTemplate('acl4ssr_online_mini'), 'case-insensitive alias');
assert(getTemplate('nope') === null, 'unknown is null');

console.log('2) processV3Template markers');
{
    const out = processV3Template(SAMPLE_TEMPLATE, PROXIES);
    const cfg = yaml.load(out);
    assert(cfg.proxies.length === 3, '3 proxies injected');
    const manual = cfg['proxy-groups'].find(g => g.name === '🚀 手动选择');
    assert(manual.proxies.includes('香港-01'), 'manual has node');
    assert(!manual.proxies.includes(PROXY_NODES_MARKER), 'marker expanded');
    assert(manual['include-all'] === undefined, 'include-all stripped');
}

console.log('3) filter + dialer-proxy-group');
{
    const out = processV3Template(SAMPLE_TEMPLATE, PROXIES);
    const cfg = yaml.load(out);
    const relay = cfg['proxy-groups'].find(g => g.name === '🌠 中转节点');
    assert(JSON.stringify(relay.proxies) === JSON.stringify(['美国-中转-CO']), 'relay filter');
    const landing = cfg['proxy-groups'].find(g => g.name === '🌄 落地节点');
    assert(JSON.stringify(landing.proxies) === JSON.stringify(['日本-落地-LD']), 'landing filter');
    const lp = cfg.proxies.find(p => p.name === '日本-落地-LD');
    assert(lp['dialer-proxy'] === '🌠 中转节点', 'dialer-proxy applied');
}

console.log('4) drop empty groups');
{
    const out = processV3Template(SAMPLE_TEMPLATE, [
        { name: 'only-hk', type: 'ss', server: '1.1.1.1', port: 1, cipher: 'aes-128-gcm', password: 'x' },
    ]);
    const names = yaml.load(out)['proxy-groups'].map(g => g.name);
    assert(!names.includes('🌠 中转节点'), 'empty relay dropped');
    assert(!names.includes('🌄 落地节点'), 'empty landing dropped');
}

console.log('5) real fake_ip template');
{
    const out = processV3Template(getTemplate('fake_ip'), PROXIES);
    const cfg = yaml.load(out);
    assert(cfg.mode === 'rule', 'mode rule');
    assert(cfg.dns['enhanced-mode'] === 'fake-ip', 'fake-ip dns');
    assert(cfg.proxies.length > 0, 'proxies present');
    assert(cfg['proxy-groups'].length > 3, 'groups present');
    assert((cfg.rules || []).length > 0, 'rules present');
    assert(!out.includes(PROXY_NODES_MARKER), 'no leftover nodes marker');
    assert(!out.includes(PROXY_PROVIDERS_MARKER), 'no leftover providers marker');
}

console.log('6) TemplateClashBuilder with ss URI');
{
    const uri = 'ss://YWVzLTEyOC1nY206cGFzcw@1.2.3.4:8388#Test-HK';
    const builder = new TemplateClashBuilder(uri, 'fake_ip', { lang: 'zh-CN' });
    await builder.build();
    const text = builder.formatConfig();
    const cfg = yaml.load(text);
    assert((cfg.proxies || []).length >= 1, 'builder proxies');
    assert((cfg['proxy-groups'] || []).length > 0, 'builder groups');
    assert((cfg.rules || []).length > 0, 'builder rules');
    assert(!text.includes(PROXY_NODES_MARKER), 'builder no marker');
}

console.log(`\nResult: ${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
