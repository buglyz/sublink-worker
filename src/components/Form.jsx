/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */
import { PREDEFINED_RULE_SETS, UNIFIED_RULES } from '../config/index.js';
import { listTemplateDetails } from '../templates/index.js';
import { CustomRules } from './CustomRules.jsx';
import { NodeLibrary } from './NodeLibrary.jsx';
import { formLogicFn } from './formLogic.js';

const LINK_FIELDS = [
  { key: 'xray', labelKey: 'xrayLink' },
  { key: 'singbox', labelKey: 'singboxLink' },
  { key: 'clash', labelKey: 'clashLink' },
  { key: 'surge', labelKey: 'surgeLink' }
];

export const Form = (props) => {
  const { t, lang, subtitle } = props;

  const translations = {
    processing: t('processing'),
    convert: t('convert'),
    saveConfigSuccess: t('saveConfigSuccess'),
    saveConfig: t('saveConfig'),
    savingConfig: t('savingConfig'),
    configContentRequired: t('configContentRequired'),
    configSaveFailed: t('configSaveFailed'),
    confirmClearConfig: t('confirmClearConfig'),
    confirmClearAll: t('confirmClearAll'),
    errorGeneratingLinks: t('errorGeneratingLinks'),
    shortenLinks: t('shortenLinks'),
    shortening: t('shortening'),
    alreadyShortened: t('alreadyShortened'),
    shortenFailed: t('shortenFailed'),
    customShortCode: t('customShortCode'),
    optional: t('optional'),
    customShortCodePlaceholder: t('customShortCodePlaceholder'),
    showFullLinks: t('showFullLinks')
  };

  const templateOptions = listTemplateDetails();
  const templateGroups = {
    v3: templateOptions.filter((item) => item.source === 'miaomiaowu-v3'),
    aethersailor: templateOptions.filter((item) => item.id.startsWith('Custom_Clash')),
    acl4ssr: templateOptions.filter(
      (item) => item.source === 'acl-ini' && !item.id.startsWith('Custom_Clash')
    )
  };

  const scriptContent = `
    window.APP_TRANSLATIONS = ${JSON.stringify(translations)};
    window.PREDEFINED_RULE_SETS = ${JSON.stringify(PREDEFINED_RULE_SETS)};
    window.RULE_TEMPLATES = ${JSON.stringify(templateOptions)};
    window.APP_LANG = ${JSON.stringify(lang || 'zh-CN')};
    if (typeof __name === 'undefined') { var __name = function(fn) { return fn; }; }
    (${formLogicFn.toString()})();

    function nodePickerData() {
      return {
        nodes: [],
        loading: false,
        error: '',
        filter: '',
        selectedProtocols: {},
        get enabledNodes() {
          return this.nodes.filter((n) => n.enabled !== false);
        },
        get protocols() {
          const set = {};
          this.enabledNodes.forEach((n) => {
            const p = String(n.protocol || 'unknown').toLowerCase();
            set[p] = (set[p] || 0) + 1;
          });
          return Object.keys(set).sort().map((k) => ({ id: k, count: set[k] }));
        },
        get filtered() {
          let list = this.enabledNodes;
          const activeProto = Object.keys(this.selectedProtocols).filter((k) => this.selectedProtocols[k]);
          if (activeProto.length) {
            list = list.filter((n) => activeProto.includes(String(n.protocol || '').toLowerCase()));
          }
          const q = String(this.filter || '').trim().toLowerCase();
          if (q) {
            list = list.filter((n) =>
              String(n.name || '').toLowerCase().includes(q) ||
              String(n.protocol || '').toLowerCase().includes(q) ||
              String(n.raw || '').toLowerCase().includes(q)
            );
          }
          return list;
        },
        get selectedCount() {
          return this.nodes.filter((n) => n.picked && n.enabled !== false).length;
        },
        get allSelected() {
          const list = this.filtered;
          return list.length > 0 && list.every((n) => n.picked);
        },
        token() {
          try { return Alpine.store('auth').token || localStorage.getItem('sublink_auth_token') || ''; }
          catch (e) { return localStorage.getItem('sublink_auth_token') || ''; }
        },
        async init() {
          const self = this;
          window.addEventListener('sublink-auth', () => self.load());
          window.addEventListener('sublink-page', (e) => {
            if (e.detail && e.detail.page === 'generate') self.load();
          });
          await this.load();
        },
        async load() {
          this.error = '';
          let authed = true;
          try { authed = Alpine.store('auth').authenticated; } catch (e) {}
          if (authed === false) { this.nodes = []; return; }
          this.loading = true;
          try {
            const headers = {};
            const tk = this.token();
            if (tk) headers.Authorization = 'Bearer ' + tk;
            const res = await fetch('/api/nodes', { headers });
            if (res.status === 401) { this.nodes = []; this.error = '未登录'; return; }
            if (!res.ok) throw new Error('加载失败');
            const data = await res.json();
            const prev = new Set(this.nodes.filter((n) => n.picked).map((n) => n.id));
            this.nodes = (data.nodes || []).map((n) => ({
              ...n,
              picked: prev.has(n.id) || !!n.selected
            }));
          } catch (e) {
            this.error = e.message || '加载失败';
          } finally {
            this.loading = false;
          }
        },
        toggleProtocol(p) {
          this.selectedProtocols[p] = !this.selectedProtocols[p];
          if (this.selectedProtocols[p]) {
            this.nodes.forEach((n) => {
              if (String(n.protocol || '').toLowerCase() === p && n.enabled !== false) n.picked = true;
            });
          }
        },
        selectAllFiltered() {
          const val = !this.allSelected;
          const ids = new Set(this.filtered.map((n) => n.id));
          this.nodes.forEach((n) => { if (ids.has(n.id)) n.picked = val; });
        },
        clearSelection() {
          this.nodes.forEach((n) => { n.picked = false; });
          this.selectedProtocols = {};
        },
        applyToInput() {
          const lines = this.nodes.filter((n) => n.picked && n.enabled !== false).map((n) => n.raw).filter(Boolean);
          if (!lines.length) return false;
          const root = document.querySelector('#workspace');
          try {
            if (root && root._x_dataStack && root._x_dataStack[0]) {
              root._x_dataStack[0].input = lines.join('\\n');
              return true;
            }
          } catch (e) {}
          return false;
        },
        generateFromSelection() {
          if (!this.applyToInput()) {
            alert('请先选择至少一个节点');
            return;
          }
          const root = document.querySelector('#workspace');
          try {
            const data = root && root._x_dataStack && root._x_dataStack[0];
            if (data && typeof data.submitForm === 'function') data.submitForm();
          } catch (e) { console.error(e); }
        }
      };
    }
  `;

  return (
    <div id="workspace" x-data="formData()" x-init="init()" class="space-y-6">
      <section x-show={'$store.ui.page === "generate"'} class="mx-auto space-y-6">
        <div class="space-y-2">
          <h1 class="text-3xl font-bold tracking-tight">订阅链接生成器</h1>
          <p class="text-muted">从节点管理中选择节点，快速生成 Clash 订阅配置</p>
        </div>

        <form {...{ 'x-on:submit.prevent': 'submitForm' }} class="space-y-6">
          <div class="pixel-card mm-card">
            <div class="card-header border-b border-[var(--border)] pb-4">
              <div class="card-title text-base">选择节点</div>
              <div class="card-desc">从已保存的节点中选择需要添加到订阅的节点</div>
            </div>

            <div class="card-content space-y-5 pt-4">
              <div x-data="nodePickerData()" x-init="init()" class="space-y-4">
                <div class="flex flex-wrap gap-2" x-show="$store.auth.authenticated">
                  <button type="button" class="mm-btn mm-btn-sm" x-on:click="selectAllFiltered()" x-bind:class={'allSelected ? "mm-btn-primary" : "mm-btn-outline"'}>
                    全部 (<span x-text="enabledNodes.length">0</span>)
                  </button>
                  <template x-for="p in protocols" x-bind:key="p.id">
                    <button type="button" class="mm-btn mm-btn-sm uppercase" x-on:click="toggleProtocol(p.id)" x-bind:class={'selectedProtocols[p.id] ? "mm-btn-primary" : "mm-btn-outline"'}>
                      <span x-text="p.id"></span> (<span x-text="p.count"></span>)
                    </button>
                  </template>
                  <div class="flex-1 min-w-[0.5rem]"></div>
                  <input type="search" class="mm-input max-w-[12rem] h-9 text-sm" placeholder="搜索节点…" x-model="filter" />
                  <button type="button" class="mm-btn mm-btn-outline mm-btn-sm" x-on:click="load()" x-bind:disabled="loading">
                    <i class="fas" x-bind:class={'loading ? "fa-spinner fa-spin" : "fa-rotate"'}></i>
                  </button>
                </div>

                <template x-if="!$store.auth.authenticated && $store.auth.authRequired">
                  <div class="text-center py-10 text-muted text-sm">请先登录（右上角），再在「节点管理」添加节点</div>
                </template>

                <template x-if="$store.auth.authenticated">
                  <div>
                    <template x-if="!enabledNodes.length">
                      <div class="text-center py-10 text-muted text-sm">暂无可用节点。请到「节点管理」粘贴节点或远程订阅 URL 导入</div>
                    </template>
                    <template x-if="enabledNodes.length">
                      <div>
                        <div class="text-xs text-muted mb-2">
                          已选择 <span class="font-semibold text-[var(--primary)]" x-text="selectedCount">0</span> 个 · 显示 <span x-text="filtered.length">0</span>
                        </div>
                        <div class="max-h-[440px] overflow-y-auto border-2 border-[var(--border)]">
                          <div class="hidden sm:grid grid-cols-[40px_1fr_100px_minmax(0,1.2fr)] gap-2 px-3 py-2 border-b-2 border-[var(--border)] bg-[color-mix(in_srgb,var(--muted)_40%,transparent)] text-xs font-semibold uppercase tracking-wide sticky top-0 z-10">
                            <label class="flex items-center justify-center">
                              <input type="checkbox" class="mm-check" x-bind:checked="allSelected" x-on:change="selectAllFiltered()" />
                            </label>
                            <div>节点名称</div>
                            <div>协议</div>
                            <div>原始链接</div>
                          </div>
                          <template x-for="n in filtered" x-bind:key="n.id">
                            <label
                              class="grid grid-cols-[40px_1fr] sm:grid-cols-[40px_1fr_100px_minmax(0,1.2fr)] gap-2 px-3 py-2.5 border-b border-[var(--border)] cursor-pointer hover:bg-[color-mix(in_srgb,var(--accent)_25%,transparent)] items-center"
                              x-bind:class={'n.picked ? "bg-[color-mix(in_srgb,var(--accent)_40%,transparent)]" : ""'}
                            >
                              <span class="flex items-center justify-center">
                                <input type="checkbox" class="mm-check" x-model="n.picked" />
                              </span>
                              <span class="font-medium text-sm truncate" x-text="n.name"></span>
                              <span class="hidden sm:inline"><span class="mm-chip text-[10px] uppercase" x-text="n.protocol || '?'"></span></span>
                              <span class="hidden sm:block font-mono text-xs text-muted truncate" x-text="n.raw"></span>
                            </label>
                          </template>
                        </div>
                      </div>
                    </template>
                  </div>
                </template>
              </div>

              <div class="space-y-3 pt-2 border-t-2 border-[var(--border)]">
                <label class="mm-label">规则模式</label>
                <div class="flex gap-2">
                  <button type="button" class="mm-btn flex-1" x-on:click={'setRuleMode("custom")'} x-bind:class={'ruleMode === "custom" ? "mm-btn-primary" : "mm-btn-outline"'}>自定义规则</button>
                  <button type="button" class="mm-btn flex-1" x-on:click={'setRuleMode("template")'} x-bind:class={'ruleMode === "template" ? "mm-btn-primary" : "mm-btn-outline"'}>使用模板</button>
                </div>
              </div>

              <div class="space-y-3" x-show={'ruleMode === "custom"'} x-cloak>
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <label class="mm-label mb-0">{t('ruleSelection')}</label>
                  <select x-model="selectedPredefinedRule" x-on:change="applyPredefinedRule()" class="mm-select w-full sm:w-auto min-w-[10rem]">
                    <option value="custom">{t('custom')}</option>
                    <option value="minimal">{t('minimal')}</option>
                    <option value="balanced">{t('balanced')}</option>
                    <option value="comprehensive">{t('comprehensive')}</option>
                  </select>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[280px] overflow-y-auto pr-1">
                  {UNIFIED_RULES.map((rule) => (
                    <label class="flex items-center gap-2.5 border-2 border-[var(--border)] px-3 py-2.5 cursor-pointer hover:border-[color-mix(in_srgb,var(--primary)_40%,var(--border))]">
                      <input type="checkbox" value={rule.name} x-model="selectedRules" x-on:change="selectedPredefinedRule = 'custom'" class="mm-check" />
                      <span class="text-sm font-medium">{t(`outboundNames.${rule.name}`)}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div class="space-y-4" x-show={'ruleMode === "template"'} x-cloak>
                <div class="space-y-1">
                  <label class="mm-label mb-0">{t('clashTemplate')}</label>
                  <p class="text-muted text-sm">{t('clashTemplateHint')}</p>
                </div>
                <div class="space-y-2">
                  <div class="text-xs font-semibold uppercase tracking-wide text-muted">{t('clashTemplateGroupV3')}</div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {templateGroups.v3.map((tpl) => (
                      <button type="button" class="mm-btn mm-btn-outline w-full justify-start text-left h-auto py-2.5 px-3 whitespace-normal" data-tpl={tpl.id} x-on:click="selectedTemplate = $el.dataset.tpl" x-bind:class={`selectedTemplate === "${tpl.id}" ? "mm-btn-primary" : ""`}>
                        <span class="flex flex-col items-start gap-0.5"><span class="font-semibold text-sm">{tpl.label}</span><span class="font-mono text-[10px] opacity-70">{tpl.id}</span></span>
                      </button>
                    ))}
                  </div>
                </div>
                <div class="space-y-2">
                  <div class="text-xs font-semibold uppercase tracking-wide text-muted">{t('clashTemplateGroupAethersailor')}</div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {templateGroups.aethersailor.map((tpl) => (
                      <button type="button" class="mm-btn mm-btn-outline w-full justify-start text-left h-auto py-2.5 px-3 whitespace-normal" data-tpl={tpl.id} x-on:click="selectedTemplate = $el.dataset.tpl" x-bind:class={`selectedTemplate === "${tpl.id}" ? "mm-btn-primary" : ""`}>
                        <span class="flex flex-col items-start gap-0.5"><span class="font-semibold text-sm">{tpl.label}</span><span class="font-mono text-[10px] opacity-70">{tpl.id}</span></span>
                      </button>
                    ))}
                  </div>
                </div>
                <div class="space-y-2">
                  <div class="text-xs font-semibold uppercase tracking-wide text-muted">{t('clashTemplateGroupAcl4ssr')}</div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[18rem] overflow-y-auto pr-1">
                    {templateGroups.acl4ssr.map((tpl) => (
                      <button type="button" class="mm-btn mm-btn-outline w-full justify-start text-left h-auto py-2.5 px-3 whitespace-normal" data-tpl={tpl.id} x-on:click="selectedTemplate = $el.dataset.tpl" x-bind:class={`selectedTemplate === "${tpl.id}" ? "mm-btn-primary" : ""`}>
                        <span class="flex flex-col items-start gap-0.5"><span class="font-semibold text-sm">{tpl.label}</span><span class="font-mono text-[10px] opacity-70">{tpl.id}</span></span>
                      </button>
                    ))}
                  </div>
                </div>
                <p class="text-sm text-[var(--primary)]" x-show="selectedTemplate">已选：<span x-text="templateLabel()"></span></p>
              </div>

              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <label class="flex items-center justify-between gap-2 border-2 border-[var(--border)] px-3 py-2.5 cursor-pointer">
                  <span class="text-sm font-medium">{t('groupByCountry')}</span>
                  <span class="relative inline-flex"><input type="checkbox" x-model="groupByCountry" class="sr-only peer" /><span class="mm-switch"></span></span>
                </label>
                <label class="flex items-center justify-between gap-2 border-2 border-[var(--border)] px-3 py-2.5 cursor-pointer">
                  <span class="text-sm font-medium">{t('includeAutoSelect')}</span>
                  <span class="relative inline-flex"><input type="checkbox" x-model="includeAutoSelect" class="sr-only peer" /><span class="mm-switch"></span></span>
                </label>
                <label class="flex items-center justify-between gap-2 border-2 border-[var(--border)] px-3 py-2.5 cursor-pointer">
                  <span class="text-sm font-medium">{t('enableClashUI')}</span>
                  <span class="relative inline-flex"><input type="checkbox" x-model="enableClashUI" class="sr-only peer" /><span class="mm-switch"></span></span>
                </label>
              </div>

              <div class="flex flex-col sm:flex-row gap-2 pt-1">
                <button
                  type="button"
                  class="mm-btn mm-btn-primary flex-1"
                  x-on:click="generateWithPicker()"
                  x-bind:disabled="loading"
                >
                  <i class="fas" x-bind:class={'loading ? "fa-spinner fa-spin" : "fa-file-export"'}></i>
                  <span x-text={'loading ? processingText : "生成订阅文件"'}></span>
                </button>
                <button type="button" class="mm-btn mm-btn-outline" x-on:click="clearAll()">清空</button>
              </div>
            </div>
          </div>

          <textarea id="input" name="input" x-model="input" class="sr-only" aria-hidden="true" tabindex="-1"></textarea>

          <div class="pixel-card mm-card">
            <div class="card-header border-b border-[var(--border)] pb-4">
              <div class="card-title text-base">{t('customRulesSection')}</div>
              <div class="card-desc">{t('customRulesSectionTooltip')}</div>
            </div>
            <div class="card-content pt-4">
              <CustomRules t={t} />
            </div>
          </div>

          <div class="pixel-card mm-card">
            <button type="button" class="w-full card-header pb-4 text-left flex items-start justify-between gap-3" x-on:click={'toggleAccordion("advanced")'}>
              <div>
                <div class="card-title text-base">进阶配置</div>
                <div class="card-desc">Subconverter · Base Config · User-Agent</div>
              </div>
              <i class="fas fa-chevron-down text-xs mt-1 transition-transform" x-bind:class={'accordionSections.advanced ? "rotate-180 text-[var(--primary)]" : ""'}></i>
            </button>
            <div x-show="accordionSections.advanced" class="card-content border-t border-[var(--border)] pt-4 space-y-6">
              <div class="space-y-2">
                <div class="card-title text-sm">{t('subconverterConfigTitle')}</div>
                <div class="border-2 border-[var(--border)] bg-[color-mix(in_srgb,var(--muted)_40%,transparent)] px-3 py-2.5">
                  <p class="font-mono text-xs break-all text-muted" x-text="getSubconverterUrl()"></p>
                </div>
                <div class="flex justify-end">
                  <button type="button" x-on:click="copySubconverterUrl()" class="mm-btn mm-btn-outline mm-btn-sm">
                    <i class="fas" x-bind:class={'subconverterCopied ? "fa-check" : "fa-copy"'}></i>
                    <span x-text={`subconverterCopied ? '${t('copiedSubconverterUrl')}' : '${t('copySubconverterUrl')}'`}></span>
                  </button>
                </div>
              </div>
              <div class="space-y-2">
                <div class="card-title text-sm">{t('baseConfig')}</div>
                <div class="flex flex-wrap gap-2">
                  <button type="button" class="mm-btn mm-btn-primary mm-btn-sm" x-on:click="saveBaseConfig()" x-bind:disabled="isSaving">{t('saveConfig')}</button>
                  <button type="button" class="mm-btn mm-btn-danger mm-btn-sm" x-on:click="clearBaseConfig()">{t('clearConfig')}</button>
                </div>
                <textarea x-model="configEditor" rows={8} class="mm-textarea font-mono text-xs" placeholder={t('baseConfigPlaceholder')}></textarea>
              </div>
              <div>
                <label class="mm-label" for="customUA">{t('customUA')}</label>
                <input type="text" id="customUA" x-model="customUA" class="mm-input" placeholder="curl/7.74.0" />
              </div>
            </div>
          </div>
        </form>

        <div id="results" class="pixel-card mm-card" x-show="generatedLinks" x-cloak>
          <div class="card-header border-b border-[var(--border)] pb-4 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <div class="card-title text-base">生成的订阅链接</div>
              <div class="card-desc">预览多客户端订阅地址</div>
            </div>
            <button type="button" class="mm-btn mm-btn-outline mm-btn-sm" x-on:click="shortenAllLinks()" x-bind:disabled="isShortening || !generatedLinks">
              <i class="fas" x-bind:class={'isShortening ? "fa-spinner fa-spin" : "fa-link"'}></i>
              <span x-text="isShortening ? shorteningText : (shortenedLinks ? alreadyShortenedText : shortenLinksText)">{t('shortenLinks')}</span>
            </button>
          </div>
          <div class="card-content pt-4 space-y-4">
            {LINK_FIELDS.map((field) => (
              <div class="space-y-1.5">
                <div class="flex items-center justify-between gap-2">
                  <label class="mm-label mb-0">{t(field.labelKey)}</label>
                  <button type="button" class="mm-btn mm-btn-outline mm-btn-sm" x-on:click={`copyToClipboard(shortenedLinks?.${field.key} || generatedLinks?.${field.key})`}>复制</button>
                </div>
                <input type="text" class="mm-input font-mono text-xs" readOnly x-bind:value={`shortenedLinks?.${field.key} || generatedLinks?.${field.key} || ''`} />
              </div>
            ))}
            <div class="border-2 border-[var(--border)] bg-[color-mix(in_srgb,var(--muted)_35%,transparent)] p-4 text-sm text-muted space-y-1">
              <div class="font-semibold text-[var(--foreground)] mb-1">使用说明</div>
              <p>• 生成后可在「订阅链接」页复制节点库订阅与多客户端链接</p>
              <p>• 节点库订阅使用导出 Token，客户端可持续更新启用节点</p>
              <p>• 可缩短转换链接（依赖 KV）</p>
            </div>
          </div>
        </div>
      </section>

      <section x-show={'$store.ui.page === "nodes"'} class="space-y-4">
        <div>
          <h1 class="text-3xl font-semibold tracking-tight">节点管理</h1>
          <p class="text-muted mt-2">导入与管理节点；保存后在生成订阅页勾选使用</p>
        </div>
        <NodeLibrary t={t} />
      </section>

      <section x-show={'$store.ui.page === "subscribe"'} class="space-y-4">
        <div>
          <h1 class="text-3xl font-semibold tracking-tight">订阅链接</h1>
          <p class="text-muted mt-2">生成订阅后在这里复制客户端链接；节点库订阅在生成后可用</p>
        </div>

        {/* Empty until user has generated OR has nodes with export URL ready after generate flow */}
        <div class="pixel-card mm-card" x-show="!generatedLinks">
          <div class="card-content py-10 text-center space-y-4">
            <p class="text-muted">还没有订阅链接。请先导入节点，再到「生成订阅」创建。</p>
            <div class="flex flex-wrap justify-center gap-2">
              <button type="button" class="mm-btn mm-btn-outline" x-on:click={'window.__SUBLINK_UI__.setPage("nodes")'}>去导入节点</button>
              <button type="button" class="mm-btn mm-btn-primary" x-on:click={'window.__SUBLINK_UI__.setPage("generate")'}>去生成订阅</button>
            </div>
          </div>
        </div>

        <div class="space-y-4" x-show="generatedLinks" x-cloak>
          <div class="pixel-card mm-card" x-show="$store.auth.exportSubUrl">
            <div class="card-header border-b border-[var(--border)] pb-4">
              <div class="card-title text-base">Clash 订阅链接</div>
              <div class="card-desc">默认导出完整 Clash YAML（Mihomo / Clash Meta 可直接导入）</div>
            </div>
            <div class="card-content pt-4 space-y-2">
              <input
                type="text"
                class="mm-input font-mono text-xs"
                readOnly
                x-bind:value="$store.auth.exportSubUrl || ''"
                x-on:click="$el.select()"
              />
              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  class="mm-btn mm-btn-primary mm-btn-sm"
                  x-on:click={'const u = $store.auth.exportSubUrl; if (!u) return; navigator.clipboard.writeText(u).then(() => alert("已复制订阅链接")).catch(() => alert(u));'}
                >
                  复制 Clash 订阅
                </button>
                <button
                  type="button"
                  class="mm-btn mm-btn-outline mm-btn-sm"
                  x-on:click={'if (!confirm("轮换 Token 后旧链接立即失效？")) return; $store.auth.rotateExportToken().then((ok) => alert(ok ? "已轮换" : ($store.auth.error || "失败")));'}
                >
                  轮换 Token
                </button>
              </div>
            </div>
          </div>

          <div class="pixel-card mm-card">
            <div class="card-header border-b border-[var(--border)] pb-4">
              <div class="card-title text-base">多客户端转换链接</div>
              <div class="card-desc">本次生成的 Clash / Sing-box / Surge / Xray 地址</div>
            </div>
            <div class="card-content pt-2 space-y-4">
              {LINK_FIELDS.map((field) => (
                <div class="space-y-1.5">
                  <div class="flex items-center justify-between gap-2">
                    <label class="mm-label mb-0">{t(field.labelKey)}</label>
                    <button type="button" class="mm-btn mm-btn-outline mm-btn-sm" x-on:click={`copyToClipboard(shortenedLinks?.${field.key} || generatedLinks?.${field.key})`}>复制</button>
                  </div>
                  <input type="text" class="mm-input font-mono text-xs" readOnly x-bind:value={`shortenedLinks?.${field.key} || generatedLinks?.${field.key} || ''`} />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <script dangerouslySetInnerHTML={{ __html: scriptContent }} />
    </div>
  );
};
