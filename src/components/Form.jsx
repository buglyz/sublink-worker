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
        get selectedCount() {
          return this.nodes.filter((n) => n.picked && n.enabled !== false).length;
        },
        get allSelected() {
          const en = this.nodes.filter((n) => n.enabled !== false);
          return en.length > 0 && en.every((n) => n.picked);
        },
        token() {
          try { return Alpine.store('auth')?.token || localStorage.getItem('sublink_auth_token') || ''; } catch (e) { return localStorage.getItem('sublink_auth_token') || ''; }
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
          try { authed = Alpine.store('auth')?.authenticated; } catch (e) {}
          if (authed === false) {
            this.nodes = [];
            return;
          }
          this.loading = true;
          try {
            const headers = {};
            const t = this.token();
            if (t) headers.Authorization = 'Bearer ' + t;
            const res = await fetch('/api/nodes', { headers });
            if (res.status === 401) {
              this.nodes = [];
              this.error = '未登录';
              return;
            }
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
        toggleAll() {
          const val = !this.allSelected;
          this.nodes.forEach((n) => {
            if (n.enabled !== false) n.picked = val;
          });
        },
        fillSelected({ append }) {
          const lines = this.nodes.filter((n) => n.picked && n.enabled !== false).map((n) => n.raw).filter(Boolean);
          if (!lines.length) return;
          const root = document.querySelector('#workspace');
          try {
            if (root && root._x_dataStack && root._x_dataStack[0]) {
              const data = root._x_dataStack[0];
              const block = lines.join('\\n');
               data.input = append && data.input ? (String(data.input).trim() + '\\n' + block) : block;
            }
          } catch (e) {}
        }
      };
    }
  `;

  return (
    <div id="workspace" x-data="formData()" x-init="init()" class="space-y-6">
      {/* ========== 生成订阅 (miaomiaowu /generator layout) ========== */}
      <section x-show="$store.ui.page === 'generate'" class="space-y-6">
        <div class="space-y-2">
          <h1 class="text-3xl font-bold tracking-tight">订阅链接生成器</h1>
          <p class="text-muted">
            {subtitle || '选择节点 / 粘贴订阅源，配置规则模板，快速生成多客户端订阅'}
          </p>
        </div>

        <form {...{ 'x-on:submit.prevent': 'submitForm' }} class="space-y-6">
          {/* Card: 输入源 + 规则模式（对标「选择节点」主卡片） */}
          <div class="pixel-card mm-card">
            <div class="card-header border-b border-[var(--border)] pb-4">
              <div class="card-title text-base">{t('shareUrls')}</div>
              <div class="card-desc">{t('urlPlaceholder')}</div>
            </div>
                        <div class="card-content space-y-5 pt-4">
              {/* 顶部操作：解析 / 保存 */}
              <div class="flex flex-col sm:flex-row gap-2">
                <button type="button" class="mm-btn mm-btn-primary flex-1" x-on:click="parseNodes()" x-bind:disabled="!input || !String(input).trim()">
                  <i class="fas fa-magnifying-glass"></i>
                  解析节点
                </button>
                <button
                  type="button"
                  class="mm-btn mm-btn-outline flex-1"
                  x-on:click="saveNodes()"
                  x-bind:disabled="!input || !String(input).trim()"
                >
                  <i class="fas fa-floppy-disk"></i>
                  保存节点
                </button>
                <button type="button" class="mm-btn mm-btn-outline mm-btn-sm" x-on:click="navigator.clipboard.readText().then(text => input = text).catch(() => {})">
                  <i class="fas fa-paste"></i>粘贴
                </button>
                <button type="button" class="mm-btn mm-btn-outline mm-btn-sm" x-show="input" x-on:click="input = ''; parsePreview = null; parseMessage = ''">
                  <i class="fas fa-times"></i>清空
                </button>
              </div>
              <p class="text-sm text-[var(--primary)]" x-show="parseMessage" x-text="parseMessage"></p>
              <div
                class="border-2 border-[var(--border)] bg-[color-mix(in_srgb,var(--muted)_35%,transparent)] px-3 py-2.5 text-sm space-y-1"
                x-show="parsePreview"
              >
                <div class="font-medium">解析预览</div>
                <div class="text-muted font-mono text-xs" x-text="parsePreview ? ('行数 ' + parsePreview.lines + ' · 节点 ' + parsePreview.linkCount + ' · 订阅 ' + parsePreview.subCount) : ''"></div>
              </div>

              <textarea
                id="input"
                name="input"
                x-model="input"
                required
                rows={6}
                class="mm-textarea font-mono text-[13px] min-h-[9rem]"
                placeholder="粘贴节点链接 / 订阅 URL（每行一条）…"
              ></textarea>

              {/* 输入下方：节点列表 */}
              <div
                class="space-y-3 border-2 border-[var(--border)] p-3"
                x-data="nodePickerData()"
                x-init="init()"
              >
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div>
                    <div class="mm-label mb-0">节点列表</div>
                    <p class="text-muted text-xs">登录后显示 KV 节点库；勾选后填入输入框再点顶栏「转换订阅」</p>
                  </div>
                  <div class="flex flex-wrap gap-1.5">
                    <button type="button" class="mm-btn mm-btn-outline mm-btn-sm" x-on:click="load()" x-bind:disabled="loading">
                      <i class="fas" x-bind:class="loading ? 'fa-spinner fa-spin' : 'fa-rotate'"></i>
                      刷新
                    </button>
                    <button type="button" class="mm-btn mm-btn-outline mm-btn-sm" x-on:click="fillSelected({ append: false })" x-bind:disabled="!selectedCount">
                      填入选中
                    </button>
                    <button type="button" class="mm-btn mm-btn-primary mm-btn-sm" x-on:click="fillSelected({ append: true })" x-bind:disabled="!selectedCount">
                      追加选中
                    </button>
                  </div>
                </div>
                <template x-if="!$store.auth.authenticated && $store.auth.authRequired">
                  <p class="text-sm text-amber-700 dark:text-amber-400">请先登录（右上角）后查看节点列表</p>
                </template>
                <template x-if="$store.auth.authenticated">
                  <div class="space-y-2">
                    <div class="flex flex-wrap items-center gap-2 text-xs text-muted">
                      <label class="inline-flex items-center gap-1.5 cursor-pointer">
                        <input type="checkbox" class="mm-check" x-bind:checked="allSelected" x-on:change="toggleAll()" />
                        全选启用节点
                      </label>
                      <span x-text="(nodes?.length || 0) + ' 个 · 选中 ' + selectedCount"></span>
                      <span x-show="error" class="text-red-500" x-text="error"></span>
                    </div>
                    <div class="max-h-56 overflow-y-auto border-2 border-[var(--border)] divide-y divide-[var(--border)]">
                      <template x-if="!nodes.length">
                        <div class="px-3 py-6 text-center text-muted text-sm">暂无节点。上方粘贴后点「保存节点」，或到节点管理页添加。</div>
                      </template>
                      <template x-for="n in nodes" x-bind:key="n.id">
                        <label class="flex items-center gap-2 px-3 py-2.5 cursor-pointer hover:bg-[color-mix(in_srgb,var(--muted)_40%,transparent)]" x-bind:class="n.enabled === false ? 'opacity-40' : ''">
                          <input type="checkbox" class="mm-check" x-model="n.picked" x-bind:disabled="n.enabled === false" />
                          <span class="mm-chip text-[10px] uppercase" x-text="n.protocol || '?'"></span>
                          <span class="text-sm font-medium truncate flex-1" x-text="n.name"></span>
                          <span class="font-mono text-[10px] text-muted truncate max-w-[8rem] hidden sm:inline" x-text="n.raw"></span>
                        </label>
                      </template>
                    </div>
                  </div>
                </template>
              </div>

              {/* 规则模式 */}
              <div class="space-y-3">
                <label class="mm-label">规则模式</label>
                <div class="flex gap-2">
                  <button
                    type="button"
                    class="mm-btn flex-1"
                    x-on:click="setRuleMode('custom')"
                    x-bind:class="ruleMode === 'custom' ? 'mm-btn-primary' : 'mm-btn-outline'"
                  >
                    自定义规则
                  </button>
                  <button
                    type="button"
                    class="mm-btn flex-1"
                    x-on:click="setRuleMode('template')"
                    x-bind:class="ruleMode === 'template' ? 'mm-btn-primary' : 'mm-btn-outline'"
                  >
                    使用模板
                  </button>
                </div>
              </div>

{/* 模板模式：卡片网格直接展示全部模板 */}
              <div class="space-y-4" x-show="ruleMode === 'template'" x-cloak>
                <div class="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
                  <div class="space-y-1">
                    <label class="mm-label mb-0">{t('clashTemplate')}</label>
                    <p class="text-muted text-sm">{t('clashTemplateHint')}</p>
                  </div>
                  <button
                    type="button"
                    class="mm-btn mm-btn-outline mm-btn-sm self-start"
                    x-on:click="selectedTemplate = ''"
                    x-show="selectedTemplate"
                  >
                    <i class="fas fa-times text-[10px]"></i>
                    清除选择
                  </button>
                </div>

                <div class="space-y-4">
                  <div class="space-y-2">
                    <div class="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                      {t('clashTemplateGroupV3')}
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {templateGroups.v3.map((tpl) => (
                        <button
                          type="button"
                          class="mm-btn mm-btn-outline w-full justify-start text-left h-auto py-3 px-3 whitespace-normal"
                          data-tpl={tpl.id}
                          x-on:click="selectedTemplate = $el.dataset.tpl"
                          x-bind:class={`selectedTemplate === '${tpl.id}' ? 'mm-btn-primary border-[color:rgba(217,119,87,0.55)]' : ''`}
                        >
                          <span class="flex flex-col items-start gap-0.5 min-w-0">
                            <span class="font-semibold text-sm leading-snug">{tpl.label}</span>
                            <span class="font-mono text-[10px] opacity-70 truncate max-w-full">{tpl.id}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div class="space-y-2">
                    <div class="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                      {t('clashTemplateGroupAethersailor')}
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {templateGroups.aethersailor.map((tpl) => (
                        <button
                          type="button"
                          class="mm-btn mm-btn-outline w-full justify-start text-left h-auto py-3 px-3 whitespace-normal"
                          data-tpl={tpl.id}
                          x-on:click="selectedTemplate = $el.dataset.tpl"
                          x-bind:class={`selectedTemplate === '${tpl.id}' ? 'mm-btn-primary border-[color:rgba(217,119,87,0.55)]' : ''`}
                        >
                          <span class="flex flex-col items-start gap-0.5 min-w-0">
                            <span class="font-semibold text-sm leading-snug">{tpl.label}</span>
                            <span class="font-mono text-[10px] opacity-70 truncate max-w-full">{tpl.id}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <div class="space-y-2">
                    <div class="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
                      {t('clashTemplateGroupAcl4ssr')}
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[22rem] overflow-y-auto pr-1">
                      {templateGroups.acl4ssr.map((tpl) => (
                        <button
                          type="button"
                          class="mm-btn mm-btn-outline w-full justify-start text-left h-auto py-2.5 px-3 whitespace-normal"
                          data-tpl={tpl.id}
                          x-on:click="selectedTemplate = $el.dataset.tpl"
                          x-bind:class={`selectedTemplate === '${tpl.id}' ? 'mm-btn-primary border-[color:rgba(217,119,87,0.55)]' : ''`}
                        >
                          <span class="flex flex-col items-start gap-0.5 min-w-0">
                            <span class="font-semibold text-sm leading-snug">{tpl.label}</span>
                            <span class="font-mono text-[10px] opacity-70 truncate max-w-full">{tpl.id}</span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <p class="text-sm text-[var(--primary)]" x-show="selectedTemplate">
                  已选：<span class="font-medium" x-text="templateLabel()"></span>
                </p>
                <p class="text-sm text-amber-700 dark:text-amber-400" x-show="!selectedTemplate">
                  请点选上方模板（未选时仍可转换，但不会套用模板规则）。
                </p>
              </div>

              {/* 自定义规则勾选：仅自定义模式显示 */}
              <div class="space-y-3" x-show="ruleMode === 'custom'" x-cloak>
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <label class="mm-label mb-0">{t('ruleSelection')}</label>
                  <select
                    x-model="selectedPredefinedRule"
                    x-on:change="applyPredefinedRule()"
                    class="mm-select w-full sm:w-auto min-w-[10rem]"
                  >
                    <option value="custom">{t('custom')}</option>
                    <option value="minimal">{t('minimal')}</option>
                    <option value="balanced">{t('balanced')}</option>
                    <option value="comprehensive">{t('comprehensive')}</option>
                  </select>
                </div>
                <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 max-h-[280px] overflow-y-auto pr-1">
                  {UNIFIED_RULES.map((rule) => (
                    <label class="flex items-center gap-2.5 border-2 border-[var(--border)] px-3 py-2.5 cursor-pointer hover:border-[color-mix(in_srgb,var(--primary)_40%,var(--border))] hover:bg-[color-mix(in_srgb,var(--accent)_20%,transparent)]">
                      <input
                        type="checkbox"
                        value={rule.name}
                        x-model="selectedRules"
                        x-on:change="selectedPredefinedRule = 'custom'"
                        class="mm-check"
                      />
                      <span class="text-sm font-medium">{t(`outboundNames.${rule.name}`)}</span>
                    </label>
                  ))}
                </div>
              </div>

              
              {/* 通用开关一行 */}
              <div class="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <label class="flex items-center justify-between gap-2 border-2 border-[var(--border)] px-3 py-2.5 cursor-pointer">
                  <span class="text-sm font-medium">{t('groupByCountry')}</span>
                  <span class="relative inline-flex">
                    <input type="checkbox" x-model="groupByCountry" class="sr-only peer" />
                    <span class="mm-switch"></span>
                  </span>
                </label>
                <label class="flex items-center justify-between gap-2 border-2 border-[var(--border)] px-3 py-2.5 cursor-pointer">
                  <span class="text-sm font-medium">{t('includeAutoSelect')}</span>
                  <span class="relative inline-flex">
                    <input type="checkbox" x-model="includeAutoSelect" class="sr-only peer" />
                    <span class="mm-switch"></span>
                  </span>
                </label>
                <label class="flex items-center justify-between gap-2 border-2 border-[var(--border)] px-3 py-2.5 cursor-pointer">
                  <span class="text-sm font-medium">{t('enableClashUI')}</span>
                  <span class="relative inline-flex">
                    <input type="checkbox" x-model="enableClashUI" class="sr-only peer" />
                    <span class="mm-switch"></span>
                  </span>
                </label>
              </div>
              <div x-show="enableClashUI" class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label class="mm-label">{t('externalController')}</label>
                  <input type="text" x-model="externalController" class="mm-input" placeholder={t('externalControllerPlaceholder')} />
                </div>
                <div>
                  <label class="mm-label">{t('externalUiDownloadUrl')}</label>
                  <input type="text" x-model="externalUiDownloadUrl" class="mm-input" placeholder={t('externalUiDownloadUrlPlaceholder')} />
                </div>
              </div>
            </div>
          </div>

          {/* 自定义规则编辑器卡片 */}
          <div class="pixel-card mm-card">
            <div class="card-header border-b border-[var(--border)] pb-4">
              <div class="card-title text-base">{t('customRulesSection')}</div>
              <div class="card-desc">{t('customRulesSectionTooltip')}</div>
            </div>
            <div class="card-content pt-4">
              <CustomRules t={t} />
            </div>
          </div>

          {/* 进阶：可折叠 */}
          <div class="pixel-card mm-card">
            <button type="button" class="w-full card-header pb-4 text-left flex items-start justify-between gap-3 hover:bg-[color-mix(in_srgb,var(--muted)_30%,transparent)]" x-on:click="toggleAccordion('advanced')">
              <div>
                <div class="card-title text-base">进阶配置</div>
                <div class="card-desc">Subconverter 外部配置 · 基础配置 · User-Agent</div>
              </div>
              <i class="fas fa-chevron-down text-xs mt-1 transition-transform" x-bind:class="accordionSections.advanced ? 'rotate-180 text-[var(--primary)]' : ''"></i>
            </button>
            <div x-show="accordionSections.advanced" class="card-content border-t border-[var(--border)] pt-4 space-y-6">
              <div class="space-y-2">
                <div class="card-title text-sm">{t('subconverterConfigTitle')}</div>
                <p class="card-desc">{t('subconverterConfigDesc')}</p>
                <div class="border-2 border-[var(--border)] bg-[color-mix(in_srgb,var(--muted)_40%,transparent)] px-3 py-2.5">
                  <p class="font-mono text-xs break-all text-muted" x-text="getSubconverterUrl()"></p>
                </div>
                <div class="flex justify-end">
                  <button type="button" x-on:click="copySubconverterUrl()" class="mm-btn mm-btn-outline mm-btn-sm">
                    <i class="fas" x-bind:class="subconverterCopied ? 'fa-check' : 'fa-copy'"></i>
                    <span x-text={`subconverterCopied ? '${t('copiedSubconverterUrl')}' : '${t('copySubconverterUrl')}'`}></span>
                  </button>
                </div>
              </div>
              <div class="border-t border-[var(--border)] pt-4 space-y-3">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                  <div class="card-title text-sm">{t('baseConfigSettings')}</div>
                  <select x-model="configType" class="mm-select w-full sm:w-auto">
                    <option value="singbox">SingBox (JSON)</option>
                    <option value="clash">Clash (YAML)</option>
                    <option value="surge">Surge (JSON/INI)</option>
                  </select>
                </div>
                <textarea id="configEditor" name="configEditor" x-model="configEditor" rows={5} class="mm-textarea font-mono text-[13px]" placeholder="Paste your custom config here..."></textarea>
                <div class="flex flex-wrap gap-2 justify-end">
                  <button type="button" class="mm-btn mm-btn-outline mm-btn-sm" x-on:click="validateBaseConfig()">{t('validateConfig')}</button>
                  <button type="button" class="mm-btn mm-btn-secondary mm-btn-sm" x-on:click="saveBaseConfig()" x-bind:disabled="savingConfig">
                    <span x-text="savingConfig ? savingConfigText : saveConfigText">{t('saveConfig')}</span>
                  </button>
                  <button type="button" class="mm-btn mm-btn-danger mm-btn-sm" x-on:click="clearBaseConfig()">{t('clearConfig')}</button>
                </div>
              </div>
              <div class="border-t border-[var(--border)] pt-4 space-y-2">
                <div class="card-title text-sm">{t('UASettings')}</div>
                <input type="text" x-model="customUA" class="mm-input font-mono text-sm max-w-xl" placeholder="curl/7.74.0" />
              </div>
            </div>
          </div>
        </form>

        {/* 生成结果（同页下方，对标生成后配置卡片） */}
        <div
          id="results"
          x-show="generatedLinks"
          x-data="{ copied: null }"
          class="pixel-card mm-card"
        >
          <div class="card-header border-b border-[var(--border)] pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <div class="card-title text-base flex items-center gap-2">
                <i class="fas fa-link text-[var(--primary)]"></i>
                {t('subscriptionLinks')}
              </div>
              <div class="card-desc">Clash / Sing-Box / Xray / Surge</div>
            </div>
          </div>
          <div class="card-content pt-4 space-y-3">
            {LINK_FIELDS.map((field) => (
              <div key={field.key}>
                <label class="mm-label">{t(field.labelKey)}</label>
                <div class="flex gap-2">
                  <input
                    type="text"
                    readonly
                    x-bind:value={`shortenedLinks ? shortenedLinks?.${field.key} : generatedLinks?.${field.key}`}
                    class="mm-input font-mono text-xs"
                    x-bind:class="shortenedLinks ? 'text-[var(--primary)] font-medium' : ''"
                  />
                  <button
                    type="button"
                    class="mm-btn mm-btn-outline mm-btn-icon shrink-0"
                    x-on:click={`navigator.clipboard.writeText((shortenedLinks || generatedLinks)?.${field.key}); copied = '${field.key}'; setTimeout(() => copied = null, 2000)`}
                    x-bind:class={`copied === '${field.key}' ? 'text-emerald-600 border-emerald-400' : ''`}
                  >
                    <i class="fas" x-bind:class={`copied === '${field.key}' ? 'fa-check' : 'fa-copy'`}></i>
                  </button>
                </div>
              </div>
            ))}
            <div class="border-t border-[var(--border)] pt-4 space-y-3">
              <div class="max-w-md">
                <label class="mm-label">
                  {t('customShortCode')} <span class="font-normal opacity-70">({t('optional')})</span>
                </label>
                <input type="text" x-model="customShortCode" placeholder={t('customShortCodePlaceholder')} class="mm-input" />
              </div>
              <button
                type="button"
                class="mm-btn"
                x-on:click="shortenedLinks ? shortenedLinks = null : shortenLinks()"
                x-bind:disabled="!shortenedLinks && shortening"
                x-bind:class="shortenedLinks ? 'mm-btn-outline' : 'mm-btn-primary'"
              >
                <i class="fas" x-bind:class="shortenedLinks ? 'fa-expand-alt' : (shortening ? 'fa-spinner fa-spin' : 'fa-compress-alt')"></i>
                <span x-text="shortenedLinks ? showFullLinksText : (shortening ? shorteningText : shortenLinksText)"></span>
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ========== 节点管理 ========== */}
      <section x-show="$store.ui.page === 'nodes'" class="space-y-4">
        <div class="space-y-2">
          <h1 class="text-3xl font-bold tracking-tight">节点管理</h1>
          <p class="text-muted">登录后节点同步到服务端 KV，可跨设备管理；勾选后批量生成订阅。</p>
        </div>
        <NodeLibrary t={t} />
      </section>

      {/* ========== 订阅链接页 ========== */}
      <section x-show="$store.ui.page === 'subscribe'" class="space-y-4">
        <div class="space-y-2">
          <h1 class="text-3xl font-bold tracking-tight">订阅链接</h1>
          <p class="text-muted">查看并复制已生成的客户端订阅地址。</p>
        </div>
        <div x-show="!generatedLinks" class="pixel-card mm-card p-10 text-center">
          <p class="text-muted mb-4">暂无订阅链接，请先生成。</p>
          <button type="button" class="mm-btn mm-btn-primary" x-on:click="window.__SUBLINK_UI__.setPage('generate')">
            <i class="fas fa-bolt"></i>
            去生成订阅
          </button>
        </div>
        <div x-show="generatedLinks" class="pixel-card mm-card p-6 text-center">
          <p class="text-muted mb-3">结果已在「生成订阅」页底部展示。</p>
          <button type="button" class="mm-btn mm-btn-primary" x-on:click="window.__SUBLINK_UI__.setPage('generate')">
            返回生成页查看
          </button>
        </div>
      </section>

      <script dangerouslySetInnerHTML={{ __html: scriptContent }} />
    </div>
  );
};
