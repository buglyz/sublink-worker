/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */
import { PREDEFINED_RULE_SETS, UNIFIED_RULES } from '../config/index.js';
import { listTemplateDetails } from '../templates/index.js';
import { CustomRules } from './CustomRules.jsx';
import { NodeLibrary } from './NodeLibrary.jsx';
import { SubscriptionManager } from './SubscriptionManager.jsx';
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
      {/* ================= Generate Page ================= */}
      <section x-show={'$store.ui.page === "generate"'} class="mx-auto space-y-6">
        <div class="space-y-1">
          <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground)]">订阅链接生成器</h1>
          <p class="text-sm text-[var(--muted-foreground)]">从节点管理中挑选节点，一键生成 Clash、Sing-Box、Surge 等订阅配置</p>
        </div>

        <form {...{ 'x-on:submit.prevent': 'submitForm' }} class="space-y-5">
          {/* Main Card: Node Selection & Rules */}
          <div class="rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm overflow-hidden">
            <div class="border-b border-[var(--border)] px-5 py-4 bg-[var(--secondary)]/30">
              <div class="font-semibold text-base text-[var(--foreground)] flex items-center gap-2">
                <i class="fas fa-layer-group text-[var(--primary)] text-sm"></i>
                <span>选择节点与规则</span>
              </div>
              <div class="text-sm text-[var(--muted-foreground)] mt-0.5">勾选参与订阅转换的节点并选择规则体系</div>
            </div>

            <div class="p-5 space-y-5">
              {/* Node Picker */}
              <div x-data="nodePickerData()" x-init="init()" class="space-y-4">
                <div class="flex flex-wrap items-center gap-2" x-show="$store.auth.authenticated">
                  <button
                    type="button"
                    class="px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all"
                    x-on:click="selectAllFiltered()"
                    x-bind:class={'allSelected ? "border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)]" : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"'}
                  >
                    全部 (<span x-text="enabledNodes.length">0</span>)
                  </button>
                  <template x-for="p in protocols" x-bind:key="p.id">
                    <button
                      type="button"
                      class="px-3 py-1.5 rounded-lg text-xs font-semibold border uppercase transition-all"
                      x-on:click="toggleProtocol(p.id)"
                      x-bind:class={'selectedProtocols[p.id] ? "border-[var(--primary)] bg-[var(--primary-light)] text-[var(--primary)]" : "border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"'}
                    >
                      <span x-text="p.id"></span> (<span x-text="p.count"></span>)
                    </button>
                  </template>
                  <div class="flex-1 min-w-[0.5rem]"></div>
                  <div class="flex items-center gap-1.5 w-full sm:w-auto">
                    <input
                      type="search"
                      class="mm-input h-9 text-sm max-w-full sm:max-w-[13rem]"
                      placeholder="搜索节点…"
                      x-model="filter"
                    />
                    <button
                      type="button"
                      class="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--secondary)] text-sm text-[var(--foreground)] transition-colors shrink-0"
                      x-on:click="load()"
                      x-bind:disabled="loading"
                      title="刷新节点"
                    >
                      <i class="fas" x-bind:class={'loading ? "fa-spinner fa-spin" : "fa-rotate"'}></i>
                    </button>
                  </div>
                </div>

                <template x-if="!$store.auth.authenticated && $store.auth.authRequired">
                  <div class="text-center py-10 rounded-xl border border-dashed border-[var(--border)] bg-[var(--secondary)]/30 text-[var(--muted-foreground)] text-sm">
                    请先登录（右上角），再在「节点管理」添加节点
                  </div>
                </template>

                <template x-if="$store.auth.authenticated">
                  <div>
                    <template x-if="!enabledNodes.length">
                      <div class="text-center py-10 rounded-xl border border-dashed border-[var(--border)] bg-[var(--secondary)]/30 text-[var(--muted-foreground)] text-sm">
                        暂无可用节点。请前往「节点管理」粘贴节点或拉取远程订阅导入。
                      </div>
                    </template>
                    <template x-if="enabledNodes.length">
                      <div class="space-y-2">
                        <div class="flex items-center justify-between text-sm text-[var(--muted-foreground)] px-1">
                          <div>
                            已选 <span class="font-bold text-[var(--primary)]" x-text="selectedCount">0</span> 个节点 · 共匹配 <span x-text="filtered.length">0</span> 个
                          </div>
                        </div>
                        <div class="max-h-[380px] overflow-y-auto rounded-xl border border-[var(--border)] bg-[var(--card)] divide-y divide-[var(--border)]">
                          <div class="hidden sm:grid grid-cols-[40px_1fr_100px_minmax(0,1.2fr)] gap-2 px-3.5 py-2.5 bg-[var(--secondary)]/60 text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)] sticky top-0 z-10 backdrop-blur-sm">
                            <label class="flex items-center justify-center cursor-pointer">
                              <input type="checkbox" class="mm-check" x-bind:checked="allSelected" x-on:change="selectAllFiltered()" />
                            </label>
                            <div>节点名称</div>
                            <div>协议</div>
                            <div>原始配置</div>
                          </div>
                          <template x-for="n in filtered" x-bind:key="n.id">
                            <label
                              class="grid grid-cols-[40px_1fr] sm:grid-cols-[40px_1fr_100px_minmax(0,1.2fr)] gap-2 px-3.5 py-2.5 cursor-pointer hover:bg-[var(--secondary)]/50 items-center transition-colors text-sm"
                              x-bind:class={'n.picked ? "bg-[var(--primary-light)]" : ""'}
                            >
                              <span class="flex items-center justify-center">
                                <input type="checkbox" class="mm-check" x-model="n.picked" />
                              </span>
                              <span class="font-medium truncate text-[var(--foreground)]" x-text="n.name"></span>
                              <span class="hidden sm:inline">
                                <span class="mm-chip text-xs uppercase font-mono" x-text="n.protocol || '?'"></span>
                              </span>
                              <span class="hidden sm:block font-mono text-xs text-[var(--muted-foreground)] truncate" x-text="n.raw"></span>
                            </label>
                          </template>
                        </div>
                      </div>
                    </template>
                  </div>
                </template>
              </div>

              {/* Mode Toggle */}
              <div class="pt-3 border-t border-[var(--border)] space-y-3">
                <div class="flex items-center justify-between">
                  <label class="block text-sm font-semibold text-[var(--foreground)]">规则体系模式</label>
                  <div class="inline-flex bg-[var(--secondary)] p-1 rounded-lg border border-[var(--border)]">
                    <button
                      type="button"
                      class="px-3.5 py-1.5 rounded-md text-sm font-medium transition-all"
                      x-on:click={'setRuleMode("custom")'}
                      x-bind:class={'ruleMode === "custom" ? "bg-[var(--card)] text-[var(--primary)] shadow-xs font-semibold" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"'}
                    >
                      自定义规则
                    </button>
                    <button
                      type="button"
                      class="px-3.5 py-1.5 rounded-md text-sm font-medium transition-all"
                      x-on:click={'setRuleMode("template")'}
                      x-bind:class={'ruleMode === "template" ? "bg-[var(--card)] text-[var(--primary)] shadow-xs font-semibold" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"'}
                    >
                      使用模板
                    </button>
                  </div>
                </div>

                {/* Custom Rules Selector */}
                <div class="space-y-3" x-show={'ruleMode === "custom"'} x-cloak>
                  <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <span class="text-sm text-[var(--muted-foreground)]">{t('ruleSelection')}</span>
                    <select x-model="selectedPredefinedRule" x-on:change="applyPredefinedRule()" class="mm-select text-sm w-full sm:w-auto min-w-[11rem]">
                      <option value="custom">{t('custom')}</option>
                      <option value="minimal">{t('minimal')}</option>
                      <option value="balanced">{t('balanced')}</option>
                      <option value="comprehensive">{t('comprehensive')}</option>
                    </select>
                  </div>
                  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[260px] overflow-y-auto pr-1">
                    {UNIFIED_RULES.map((rule) => (
                      <label class="flex items-center gap-2.5 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3.5 py-2.5 cursor-pointer hover:border-[var(--primary)] hover:bg-[var(--secondary)]/40 transition-all text-sm">
                        <input type="checkbox" value={rule.name} x-model="selectedRules" x-on:change="selectedPredefinedRule = 'custom'" class="mm-check" />
                        <span class="font-medium text-[var(--foreground)]">{t(`outboundNames.${rule.name}`)}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Template Mode Selector */}
                <div class="space-y-4" x-show={'ruleMode === "template"'} x-cloak>
                  <div class="space-y-1">
                    <p class="text-sm text-[var(--muted-foreground)]">{t('clashTemplateHint')}</p>
                  </div>
                  <div class="space-y-2">
                    <div class="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">{t('clashTemplateGroupV3')}</div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {templateGroups.v3.map((tpl) => (
                        <button
                          type="button"
                          class="rounded-lg border p-3 text-left transition-all hover:border-[var(--primary)] group"
                          data-tpl={tpl.id}
                          x-on:click="selectedTemplate = $el.dataset.tpl"
                          x-bind:class={`selectedTemplate === "${tpl.id}" ? "border-[var(--primary)] bg-[var(--primary-light)] ring-1 ring-[var(--primary)]" : "border-[var(--border)] bg-[var(--card)] hover:bg-[var(--secondary)]/30"`}
                        >
                          <div class="font-semibold text-sm text-[var(--foreground)]">{tpl.label}</div>
                          <div class="font-mono text-xs text-[var(--muted-foreground)] mt-0.5">{tpl.id}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div class="space-y-2">
                    <div class="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">{t('clashTemplateGroupAethersailor')}</div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {templateGroups.aethersailor.map((tpl) => (
                        <button
                          type="button"
                          class="rounded-lg border p-3 text-left transition-all hover:border-[var(--primary)] group"
                          data-tpl={tpl.id}
                          x-on:click="selectedTemplate = $el.dataset.tpl"
                          x-bind:class={`selectedTemplate === "${tpl.id}" ? "border-[var(--primary)] bg-[var(--primary-light)] ring-1 ring-[var(--primary)]" : "border-[var(--border)] bg-[var(--card)] hover:bg-[var(--secondary)]/30"`}
                        >
                          <div class="font-semibold text-sm text-[var(--foreground)]">{tpl.label}</div>
                          <div class="font-mono text-xs text-[var(--muted-foreground)] mt-0.5">{tpl.id}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div class="space-y-2">
                    <div class="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">{t('clashTemplateGroupAcl4ssr')}</div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 max-h-[18rem] overflow-y-auto pr-1">
                      {templateGroups.acl4ssr.map((tpl) => (
                        <button
                          type="button"
                          class="rounded-lg border p-3 text-left transition-all hover:border-[var(--primary)] group"
                          data-tpl={tpl.id}
                          x-on:click="selectedTemplate = $el.dataset.tpl"
                          x-bind:class={`selectedTemplate === "${tpl.id}" ? "border-[var(--primary)] bg-[var(--primary-light)] ring-1 ring-[var(--primary)]" : "border-[var(--border)] bg-[var(--card)] hover:bg-[var(--secondary)]/30"`}
                        >
                          <div class="font-semibold text-sm text-[var(--foreground)] truncate">{tpl.label}</div>
                          <div class="font-mono text-xs text-[var(--muted-foreground)] mt-0.5 truncate">{tpl.id}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                  <p class="text-sm font-semibold text-[var(--primary)]" x-show="selectedTemplate">已选模板：<span x-text="templateLabel()"></span></p>
                </div>
              </div>

              {/* Switches */}
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                <label class="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--secondary)]/20 px-3.5 py-2.5 cursor-pointer hover:border-[var(--border-hover)] transition-colors">
                  <span class="text-sm font-medium text-[var(--foreground)]">{t('groupByCountry')}</span>
                  <span class="relative inline-flex"><input type="checkbox" x-model="groupByCountry" class="sr-only peer" /><span class="mm-switch"></span></span>
                </label>
                <label class="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--secondary)]/20 px-3.5 py-2.5 cursor-pointer hover:border-[var(--border-hover)] transition-colors">
                  <span class="text-sm font-medium text-[var(--foreground)]">{t('includeAutoSelect')}</span>
                  <span class="relative inline-flex"><input type="checkbox" x-model="includeAutoSelect" class="sr-only peer" /><span class="mm-switch"></span></span>
                </label>
                <label class="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--secondary)]/20 px-3.5 py-2.5 cursor-pointer hover:border-[var(--border-hover)] transition-colors">
                  <span class="text-sm font-medium text-[var(--foreground)]">{t('enableClashUI')}</span>
                  <span class="relative inline-flex"><input type="checkbox" x-model="enableClashUI" class="sr-only peer" /><span class="mm-switch"></span></span>
                </label>
              </div>

              {/* Actions */}
              <div class="flex flex-col sm:flex-row gap-2.5 pt-2">
                <button
                  type="button"
                  class="mm-btn mm-btn-primary flex-1 py-3 font-semibold text-base shadow-xs"
                  x-on:click="generateWithPicker()"
                  x-bind:disabled="loading"
                >
                  <i class="fas" x-bind:class={'loading ? "fa-spinner fa-spin" : "fa-bolt"'}></i>
                  <span x-text={'loading ? processingText : "生成订阅配置"'}></span>
                </button>
                <button type="button" class="mm-btn mm-btn-outline px-5 text-sm" x-on:click="clearAll()">重置选择</button>
              </div>
            </div>
          </div>

          <textarea id="input" name="input" x-model="input" class="sr-only" aria-hidden="true" tabindex="-1"></textarea>

          {/* Custom Rules Accordion/Card */}
          <div class="rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm overflow-hidden">
            <div class="border-b border-[var(--border)] px-5 py-4 bg-[var(--secondary)]/30">
              <div class="font-semibold text-base text-[var(--foreground)] flex items-center gap-2">
                <i class="fas fa-sliders text-[var(--primary)] text-sm"></i>
                <span>{t('customRulesSection')}</span>
              </div>
              <div class="text-sm text-[var(--muted-foreground)] mt-0.5">{t('customRulesSectionTooltip')}</div>
            </div>
            <div class="p-5">
              <CustomRules t={t} />
            </div>
          </div>

          {/* Advanced Config */}
          <div class="rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm overflow-hidden">
            <button
              type="button"
              class="w-full px-5 py-4 text-left flex items-center justify-between gap-3 bg-[var(--secondary)]/30 hover:bg-[var(--secondary)]/50 transition-colors"
              x-on:click={'toggleAccordion("advanced")'}
            >
              <div>
                <div class="font-semibold text-base text-[var(--foreground)] flex items-center gap-2">
                  <i class="fas fa-gear text-[var(--primary)] text-sm"></i>
                  <span>进阶配置</span>
                </div>
                <div class="text-sm text-[var(--muted-foreground)] mt-0.5">Subconverter · Base Config · User-Agent</div>
              </div>
              <i class="fas fa-chevron-down text-sm text-[var(--muted-foreground)] transition-transform duration-200" x-bind:class={'accordionSections.advanced ? "rotate-180 text-[var(--primary)]" : ""'}></i>
            </button>
            <div x-show="accordionSections.advanced" class="border-t border-[var(--border)] p-5 space-y-5">
              <div class="space-y-2">
                <div class="text-sm font-semibold text-[var(--foreground)]">{t('subconverterConfigTitle')}</div>
                <div class="rounded-lg border border-[var(--border)] bg-[var(--secondary)]/50 px-3.5 py-2.5">
                  <p class="font-mono text-xs break-all text-[var(--muted-foreground)]" x-text="getSubconverterUrl()"></p>
                </div>
                <div class="flex justify-end">
                  <button type="button" x-on:click="copySubconverterUrl()" class="mm-btn mm-btn-outline mm-btn-sm text-xs">
                    <i class="fas" x-bind:class={'subconverterCopied ? "fa-check text-emerald-500" : "fa-copy"'}></i>
                    <span x-text={`subconverterCopied ? '${t('copiedSubconverterUrl')}' : '${t('copySubconverterUrl')}'`}></span>
                  </button>
                </div>
              </div>

              <div class="space-y-2">
                <div class="text-sm font-semibold text-[var(--foreground)]">{t('baseConfig')}</div>
                <div class="flex flex-wrap gap-2">
                  <button type="button" class="mm-btn mm-btn-primary mm-btn-sm text-xs" x-on:click="saveBaseConfig()" x-bind:disabled="isSaving">{t('saveConfig')}</button>
                  <button type="button" class="mm-btn mm-btn-danger mm-btn-sm text-xs" x-on:click="clearBaseConfig()">{t('clearConfig')}</button>
                </div>
                <textarea x-model="configEditor" rows={7} class="mm-textarea font-mono text-xs" placeholder={t('baseConfigPlaceholder')}></textarea>
              </div>

              <div>
                <label class="mm-label" for="customUA">{t('customUA')}</label>
                <input type="text" id="customUA" x-model="customUA" class="mm-input text-sm" placeholder="curl/7.74.0" />
              </div>
            </div>
          </div>
        </form>

        {/* Results Card */}
        <div id="results" class="rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm overflow-hidden" x-show="generatedLinks" x-cloak>
          <div class="border-b border-[var(--border)] px-5 py-4 bg-[var(--secondary)]/30 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <div>
              <div class="font-semibold text-base text-[var(--foreground)] flex items-center gap-2">
                <i class="fas fa-circle-check text-emerald-500 text-sm"></i>
                <span>生成的订阅链接</span>
              </div>
              <div class="text-sm text-[var(--muted-foreground)] mt-0.5">复制对应客户端订阅地址</div>
            </div>
            <button type="button" class="mm-btn mm-btn-outline mm-btn-sm text-xs" x-on:click="shortenAllLinks()" x-bind:disabled="isShortening || !generatedLinks">
              <i class="fas" x-bind:class={'isShortening ? "fa-spinner fa-spin" : "fa-link"'}></i>
              <span x-text="isShortening ? shorteningText : (shortenedLinks ? alreadyShortenedText : shortenLinksText)">{t('shortenLinks')}</span>
            </button>
          </div>
          <div class="p-5 space-y-4">
            {LINK_FIELDS.map((field) => (
              <div class="space-y-1.5">
                <div class="flex items-center justify-between gap-2">
                  <label class="text-sm font-semibold text-[var(--foreground)]">{t(field.labelKey)}</label>
                  <button type="button" class="mm-btn mm-btn-outline mm-btn-sm text-xs py-1" x-on:click={`copyToClipboard(shortenedLinks?.${field.key} || generatedLinks?.${field.key})`}>
                    <i class="fas fa-copy text-xs"></i> 复制
                  </button>
                </div>
                <input type="text" class="mm-input font-mono text-xs bg-[var(--secondary)]/50" readOnly x-bind:value={`shortenedLinks?.${field.key} || generatedLinks?.${field.key} || ''`} />
              </div>
            ))}
            <div class="rounded-xl border border-[var(--border)] bg-[var(--secondary)]/30 p-4 text-xs text-[var(--muted-foreground)] space-y-1">
              <div class="font-semibold text-[var(--foreground)] mb-1">使用说明</div>
              <p>• 转换链接可直接填入支持对应协议的客户端中</p>
              <p>• 如需持久化订阅，请在「订阅管理」中创建可随时修改节点的固定订阅</p>
            </div>
          </div>
        </div>
      </section>

      {/* ================= Nodes Page ================= */}
      <section x-show={'$store.ui.page === "nodes"'} class="space-y-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground)]">节点管理</h1>
          <p class="text-sm text-[var(--muted-foreground)] mt-1">导入、筛选与管理节点库，支持自动同步至服务端持久化保存</p>
        </div>
        <NodeLibrary t={t} />
      </section>

      {/* ================= Subscriptions Page ================= */}
      <section x-show={'$store.ui.page === "subs"'} class="space-y-4">
        <SubscriptionManager />
      </section>

      {/* ================= Subscribe Links Page ================= */}
      <section x-show={'$store.ui.page === "subscribe"'} class="space-y-4">
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground)]">订阅链接</h1>
          <p class="text-sm text-[var(--muted-foreground)] mt-1">快速复制节点库全量订阅或最近生成的客户端链接</p>
        </div>

        {/* Empty State */}
        <div class="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-8 text-center space-y-3" x-show="!generatedLinks && !$store.auth.exportSubUrl">
          <div class="w-12 h-12 mx-auto rounded-xl bg-[var(--secondary)] flex items-center justify-center text-[var(--muted-foreground)]">
            <i class="fas fa-link-slash text-base"></i>
          </div>
          <div>
            <div class="font-semibold text-base text-[var(--foreground)]">暂无可用订阅</div>
            <p class="text-sm text-[var(--muted-foreground)] mt-0.5">请先导入节点，再前往「生成订阅」或「订阅管理」创建订阅链接</p>
          </div>
          <div class="flex flex-wrap justify-center gap-2 pt-2">
            <button type="button" class="mm-btn mm-btn-outline mm-btn-sm text-sm" x-on:click={'window.__SUBLINK_UI__.setPage("nodes")'}>导入节点</button>
            <button type="button" class="mm-btn mm-btn-primary mm-btn-sm text-sm" x-on:click={'window.__SUBLINK_UI__.setPage("generate")'}>生成订阅</button>
          </div>
        </div>

        <div class="space-y-4" x-show="generatedLinks || $store.auth.exportSubUrl" x-cloak>
          {/* Managed Sub Link */}
          <div class="rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm overflow-hidden" x-show="generatedLinks && generatedLinks.managed">
            <div class="border-b border-[var(--border)] px-5 py-4 bg-[var(--secondary)]/30">
              <div class="font-semibold text-base text-[var(--foreground)] flex items-center gap-2">
                <i class="fas fa-bookmark text-[var(--primary)] text-sm"></i>
                <span>已保存的固定订阅</span>
              </div>
              <div class="text-sm text-[var(--muted-foreground)] mt-0.5">已写入订阅管理，可随时更新节点/模板；客户端可长期使用此链接</div>
            </div>
            <div class="p-5 space-y-3">
              <input type="text" class="mm-input font-mono text-xs bg-[var(--secondary)]/50" readOnly x-bind:value="generatedLinks?.managed || ''" x-on:click="$el.select()" />
              <div class="flex flex-wrap gap-2">
                <button type="button" class="mm-btn mm-btn-primary mm-btn-sm text-xs" x-on:click={'const u = generatedLinks?.managed; if (!u) return; navigator.clipboard.writeText(u).then(() => alert("已复制")).catch(() => alert(u));'}>
                  <i class="fas fa-copy text-xs"></i> 复制订阅链接
                </button>
                <button type="button" class="mm-btn mm-btn-outline mm-btn-sm text-xs" x-on:click={'window.__SUBLINK_UI__.setPage("subs")'}>
                  前往订阅管理
                </button>
              </div>
            </div>
          </div>

          {/* Library-wide Export Link */}
          <div class="rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm overflow-hidden" x-show="$store.auth.exportSubUrl">
            <div class="border-b border-[var(--border)] px-5 py-4 bg-[var(--secondary)]/30">
              <div class="font-semibold text-base text-[var(--foreground)] flex items-center gap-2">
                <i class="fas fa-server text-[var(--primary)] text-sm"></i>
                <span>节点库全量订阅（全部启用节点）</span>
              </div>
              <div class="text-sm text-[var(--muted-foreground)] mt-0.5">自动包含节点库中所有已启用的节点，无需每次手动重新导出</div>
            </div>
            <div class="p-5 space-y-3">
              <input
                type="text"
                class="mm-input font-mono text-xs bg-[var(--secondary)]/50"
                readOnly
                x-bind:value="$store.auth.exportSubUrl || ''"
                x-on:click="$el.select()"
              />
              <div class="flex flex-wrap gap-2">
                <button
                  type="button"
                  class="mm-btn mm-btn-outline mm-btn-sm text-xs"
                  x-on:click={'const u = $store.auth.exportSubUrl; if (!u) return; navigator.clipboard.writeText(u).then(() => alert("已复制")).catch(() => alert(u));'}
                >
                  <i class="fas fa-copy text-xs"></i> 复制全量订阅
                </button>
              </div>
            </div>
          </div>

          {/* Multi-client Links */}
          <div class="rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm overflow-hidden" x-show="generatedLinks">
            <div class="border-b border-[var(--border)] px-5 py-4 bg-[var(--secondary)]/30">
              <div class="font-semibold text-base text-[var(--foreground)] flex items-center gap-2">
                <i class="fas fa-shuffle text-[var(--primary)] text-sm"></i>
                <span>多客户端转换链接</span>
              </div>
              <div class="text-sm text-[var(--muted-foreground)] mt-0.5">本次生成的 Clash / Sing-Box / Surge / Xray 转换参数链接</div>
            </div>
            <div class="p-5 space-y-3.5">
              {LINK_FIELDS.map((field) => (
                <div class="space-y-1">
                  <div class="flex items-center justify-between gap-2">
                    <label class="text-sm font-semibold text-[var(--foreground)]">{t(field.labelKey)}</label>
                    <button type="button" class="mm-btn mm-btn-outline mm-btn-sm text-xs py-1" x-on:click={`copyToClipboard(shortenedLinks?.${field.key} || generatedLinks?.${field.key})`}>
                      <i class="fas fa-copy text-xs"></i> 复制
                    </button>
                  </div>
                  <input type="text" class="mm-input font-mono text-xs bg-[var(--secondary)]/50" readOnly x-bind:value={`shortenedLinks?.${field.key} || generatedLinks?.${field.key} || ''`} />
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
