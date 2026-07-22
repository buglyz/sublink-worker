/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */
import { PREDEFINED_RULE_SETS, UNIFIED_RULES } from '../config/index.js';
import { listTemplateDetails } from '../templates/index.js';
import { CustomRules } from './CustomRules.jsx';
import { NodeLibrary } from './NodeLibrary.jsx';
import { formLogicFn } from './formLogic.js';

const LINK_FIELDS = [
  { key: 'xray', labelKey: 'xrayLink', short: 'Xray' },
  { key: 'singbox', labelKey: 'singboxLink', short: 'Sing-Box' },
  { key: 'clash', labelKey: 'clashLink', short: 'Clash' },
  { key: 'surge', labelKey: 'surgeLink', short: 'Surge' }
];

/** Collapsible section shell — uses accordionSections from formData() */
const AccordionCard = (props) => {
  const { section, title, desc, badge, children, defaultOpenHint } = props;
  return (
    <div class="mm-card overflow-hidden">
      <button
        type="button"
        class="w-full px-5 py-4 flex items-start justify-between gap-3 text-left hover:bg-[color-mix(in_srgb,var(--muted)_35%,transparent)] transition-colors"
        x-on:click={`toggleAccordion('${section}')`}
      >
        <div class="min-w-0">
          <div class="flex flex-wrap items-center gap-2">
            <h2 class="text-base sm:text-lg font-semibold tracking-tight">{title}</h2>
            {badge}
          </div>
          {desc ? <p class="mm-desc mt-1">{desc}</p> : null}
          {defaultOpenHint}
        </div>
        <span
          class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[calc(var(--radius)-2px)] border border-[var(--border)] text-[var(--muted-foreground)] transition-transform"
          x-bind:class={`accordionSections.${section} ? 'rotate-180 text-[var(--primary)]' : ''`}
        >
          <i class="fas fa-chevron-down text-xs"></i>
        </span>
      </button>
      <div
        x-show={`accordionSections.${section}`}
        x-collapse
        class="border-t border-[var(--border)]"
      >
        {children}
      </div>
    </div>
  );
};

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
  `;

  return (
    <div id="workspace" x-data="formData()" x-init="init()">
      {/* ========== Page: 生成订阅 ========== */}
      <section x-show="$store.ui.page === 'generate'" class="mx-auto space-y-5">
        <div class="space-y-2">
          <h1 class="text-3xl font-bold tracking-tight text-[var(--foreground)]">订阅链接生成器</h1>
          <p class="text-[var(--muted-foreground)]">
            {subtitle || '粘贴节点 / 订阅源，选择模板与规则，生成多客户端订阅链接。'}
          </p>
        </div>

        <form {...{ 'x-on:submit.prevent': 'submitForm' }} class="space-y-4">
          <div class="space-y-1">
            <p class="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">配置</p>
            <p class="mm-desc">先选模板与规则，再在下方粘贴源并生成（布局对标妙妙屋：设置在上）。</p>
          </div>

{/* 栏目导航条（设置在上） */}
          <div class="flex flex-wrap gap-2 px-0.5">
            <button type="button" class="mm-chip cursor-pointer hover:border-[var(--primary)]" x-on:click="accordionSections.template = true">
              <i class="fas fa-layer-group text-[10px]"></i> 模板
            </button>
            <button type="button" class="mm-chip cursor-pointer hover:border-[var(--primary)]" x-on:click="accordionSections.rules = true">
              <i class="fas fa-filter text-[10px]"></i> 规则
            </button>
            <button type="button" class="mm-chip cursor-pointer hover:border-[var(--primary)]" x-on:click="accordionSections.customRules = true">
              <i class="fas fa-stream text-[10px]"></i> 自定义
            </button>
            <button type="button" class="mm-chip cursor-pointer hover:border-[var(--primary)]" x-on:click="accordionSections.general = true">
              <i class="fas fa-sliders-h text-[10px]"></i> 通用
            </button>
            <button type="button" class="mm-chip cursor-pointer hover:border-[var(--primary)]" x-on:click="accordionSections.advanced = true">
              <i class="fas fa-gears text-[10px]"></i> 进阶
            </button>
            <button
              type="button"
              class="mm-chip cursor-pointer ml-auto"
              x-on:click="accordionSections = { template: true, rules: true, customRules: true, general: true, advanced: true, baseConfig: true, ua: true }"
            >
              全部展开
            </button>
            <button
              type="button"
              class="mm-chip cursor-pointer"
              x-on:click="accordionSections = { template: false, rules: false, customRules: false, general: false, advanced: false, baseConfig: false, ua: false }"
            >
              全部收起
            </button>
          </div>

          
{/* —— 模板 —— */}
          <div class="mm-card overflow-hidden">
            <button type="button" class="w-full px-5 py-4 flex items-start justify-between gap-3 text-left hover:bg-[color-mix(in_srgb,var(--muted)_35%,transparent)]" x-on:click="toggleAccordion('template')">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="mm-chip text-[10px]">1</span>
                  <h2 class="text-base sm:text-lg font-semibold tracking-tight">{t('clashTemplate')}</h2>
                  <span class="mm-chip text-[10px]" x-show="selectedTemplate" x-text="templateLabel()"></span>
                </div>
                <p class="mm-desc mt-1">{t('clashTemplateHint')}</p>
              </div>
              <span class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[calc(var(--radius)-2px)] border border-[var(--border)] transition-transform" x-bind:class="accordionSections.template ? 'rotate-180 text-[var(--primary)]' : 'text-[var(--muted-foreground)]'">
                <i class="fas fa-chevron-down text-xs"></i>
              </span>
            </button>
            <div x-show="accordionSections.template" class="border-t border-[var(--border)] p-5 space-y-3">
              <label class="mm-label">{t('clashTemplate')}</label>
              <select x-model="selectedTemplate" class="mm-select max-w-xl">
                <option value="">{t('clashTemplateNone')}</option>
                <optgroup label={t('clashTemplateGroupV3')}>
                  {templateGroups.v3.map((tpl) => (
                    <option value={tpl.id}>{tpl.label}</option>
                  ))}
                </optgroup>
                <optgroup label={t('clashTemplateGroupAethersailor')}>
                  {templateGroups.aethersailor.map((tpl) => (
                    <option value={tpl.id}>{tpl.label}</option>
                  ))}
                </optgroup>
                <optgroup label={t('clashTemplateGroupAcl4ssr')}>
                  {templateGroups.acl4ssr.map((tpl) => (
                    <option value={tpl.id}>{tpl.label}</option>
                  ))}
                </optgroup>
              </select>
            </div>
          </div>

          
{/* —— 规则 —— */}
          <div class="mm-card overflow-hidden" x-bind:class="selectedTemplate ? 'opacity-70' : ''">
            <button type="button" class="w-full px-5 py-4 flex items-start justify-between gap-3 text-left hover:bg-[color-mix(in_srgb,var(--muted)_35%,transparent)]" x-on:click="toggleAccordion('rules')">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="mm-chip text-[10px]">2</span>
                  <h2 class="text-base sm:text-lg font-semibold tracking-tight">{t('ruleSelection')}</h2>
                  <span class="mm-chip text-[10px]" x-text="selectedPredefinedRule"></span>
                  <span class="mm-chip text-[10px]" x-text="(selectedRules||[]).length + ' 项'"></span>
                </div>
                <p class="mm-desc mt-1">预设或自定义策略出站（选模板时由模板接管 Clash）</p>
              </div>
              <span class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[calc(var(--radius)-2px)] border border-[var(--border)] transition-transform" x-bind:class="accordionSections.rules ? 'rotate-180 text-[var(--primary)]' : 'text-[var(--muted-foreground)]'">
                <i class="fas fa-chevron-down text-xs"></i>
              </span>
            </button>
            <div x-show="accordionSections.rules" class="border-t border-[var(--border)] p-5 space-y-4">
              <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <p class="mm-desc text-amber-700 dark:text-amber-400" x-show="selectedTemplate">{t('clashTemplateOverridesRules')}</p>
                <select
                  x-model="selectedPredefinedRule"
                  x-on:change="applyPredefinedRule()"
                  class="mm-select w-full sm:w-auto min-w-[10rem]"
                  x-bind:disabled="!!selectedTemplate"
                >
                  <option value="custom">{t('custom')}</option>
                  <option value="minimal">{t('minimal')}</option>
                  <option value="balanced">{t('balanced')}</option>
                  <option value="comprehensive">{t('comprehensive')}</option>
                </select>
              </div>
              <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                {UNIFIED_RULES.map((rule) => (
                  <label class="flex items-center gap-2.5 rounded-[calc(var(--radius)-2px)] border border-[var(--border)] px-3 py-2.5 cursor-pointer hover:bg-[color-mix(in_srgb,var(--muted)_40%,transparent)]">
                    <input
                      type="checkbox"
                      value={rule.name}
                      x-model="selectedRules"
                      x-on:change="selectedPredefinedRule = 'custom'"
                      class="mm-check"
                      x-bind:disabled="!!selectedTemplate"
                    />
                    <span class="text-sm font-medium">{t(`outboundNames.${rule.name}`)}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          
{/* —— 自定义规则 —— */}
          <div class="mm-card overflow-hidden">
            <button type="button" class="w-full px-5 py-4 flex items-start justify-between gap-3 text-left hover:bg-[color-mix(in_srgb,var(--muted)_35%,transparent)]" x-on:click="toggleAccordion('customRules')">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="mm-chip text-[10px]">3</span>
                  <h2 class="text-base sm:text-lg font-semibold tracking-tight">{t('customRulesSection')}</h2>
                </div>
                <p class="mm-desc mt-1">{t('customRulesSectionTooltip')}</p>
              </div>
              <span class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[calc(var(--radius)-2px)] border border-[var(--border)] transition-transform" x-bind:class="accordionSections.customRules ? 'rotate-180 text-[var(--primary)]' : 'text-[var(--muted-foreground)]'">
                <i class="fas fa-chevron-down text-xs"></i>
              </span>
            </button>
            <div x-show="accordionSections.customRules" class="border-t border-[var(--border)] p-4 sm:p-5">
              <CustomRules t={t} />
            </div>
          </div>

          
{/* —— 通用设置 —— */}
          <div class="mm-card overflow-hidden">
            <button type="button" class="w-full px-5 py-4 flex items-start justify-between gap-3 text-left hover:bg-[color-mix(in_srgb,var(--muted)_35%,transparent)]" x-on:click="toggleAccordion('general')">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="mm-chip text-[10px]">4</span>
                  <h2 class="text-base sm:text-lg font-semibold tracking-tight">{t('generalSettings')}</h2>
                </div>
                <p class="mm-desc mt-1">国家分组 · 自动选择 · Clash UI</p>
              </div>
              <span class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[calc(var(--radius)-2px)] border border-[var(--border)] transition-transform" x-bind:class="accordionSections.general ? 'rotate-180 text-[var(--primary)]' : 'text-[var(--muted-foreground)]'">
                <i class="fas fa-chevron-down text-xs"></i>
              </span>
            </button>
            <div x-show="accordionSections.general" class="border-t border-[var(--border)] p-5 space-y-2">
              <label class="flex items-center justify-between gap-3 rounded-[calc(var(--radius)-2px)] border border-[var(--border)] px-3 py-3 cursor-pointer">
                <span class="text-sm font-medium">{t('groupByCountry')}</span>
                <span class="relative inline-flex">
                  <input type="checkbox" x-model="groupByCountry" class="sr-only peer" />
                  <span class="mm-switch"></span>
                </span>
              </label>
              <label class="flex items-center justify-between gap-3 rounded-[calc(var(--radius)-2px)] border border-[var(--border)] px-3 py-3 cursor-pointer">
                <span class="text-sm font-medium">{t('includeAutoSelect')}</span>
                <span class="relative inline-flex">
                  <input type="checkbox" x-model="includeAutoSelect" class="sr-only peer" />
                  <span class="mm-switch"></span>
                </span>
              </label>
              <label class="flex items-center justify-between gap-3 rounded-[calc(var(--radius)-2px)] border border-[var(--border)] px-3 py-3 cursor-pointer">
                <span class="text-sm font-medium">{t('enableClashUI')}</span>
                <span class="relative inline-flex">
                  <input type="checkbox" x-model="enableClashUI" class="sr-only peer" />
                  <span class="mm-switch"></span>
                </span>
              </label>
              <div x-show="enableClashUI" class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2">
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

          
{/* —— 进阶（Subconverter + Base + UA 收纳）—— */}
          <div class="mm-card overflow-hidden">
            <button type="button" class="w-full px-5 py-4 flex items-start justify-between gap-3 text-left hover:bg-[color-mix(in_srgb,var(--muted)_35%,transparent)]" x-on:click="toggleAccordion('advanced')">
              <div class="min-w-0">
                <div class="flex flex-wrap items-center gap-2">
                  <span class="mm-chip text-[10px]">5</span>
                  <h2 class="text-base sm:text-lg font-semibold tracking-tight">进阶配置</h2>
                  <span class="mm-chip text-[10px]">Subconverter · Base Config · UA</span>
                </div>
                <p class="mm-desc mt-1">外部配置地址、自定义基础配置、拉取订阅 UA</p>
              </div>
              <span class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-[calc(var(--radius)-2px)] border border-[var(--border)] transition-transform" x-bind:class="accordionSections.advanced ? 'rotate-180 text-[var(--primary)]' : 'text-[var(--muted-foreground)]'">
                <i class="fas fa-chevron-down text-xs"></i>
              </span>
            </button>
            <div x-show="accordionSections.advanced" class="border-t border-[var(--border)] p-5 space-y-6">
              {/* Subconverter */}
              <div class="space-y-3">
                <div>
                  <h3 class="text-sm font-semibold">{t('subconverterConfigTitle')}</h3>
                  <p class="mm-desc mt-0.5">{t('subconverterConfigDesc')}</p>
                </div>
                <div class="rounded-[calc(var(--radius)-2px)] border border-[var(--border)] bg-[color-mix(in_srgb,var(--muted)_40%,transparent)] px-3 py-2.5">
                  <p class="font-mono text-xs break-all text-[var(--muted-foreground)]" x-text="getSubconverterUrl()"></p>
                </div>
                <div class="flex justify-end">
                  <button type="button" x-on:click="copySubconverterUrl()" class="mm-btn mm-btn-secondary text-sm">
                    <i class="fas" x-bind:class="subconverterCopied ? 'fa-check' : 'fa-copy'"></i>
                    <span x-text={`subconverterCopied ? '${t('copiedSubconverterUrl')}' : '${t('copySubconverterUrl')}'`}></span>
                  </button>
                </div>
              </div>

              <div class="border-t border-[var(--border)]"></div>

              {/* Base config */}
              <div class="space-y-3">
                <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div>
                    <h3 class="text-sm font-semibold">{t('baseConfigSettings')}</h3>
                    <p class="mm-desc mt-0.5">覆盖默认基础配置</p>
                  </div>
                  <select x-model="configType" class="mm-select w-full sm:w-auto">
                    <option value="singbox">SingBox (JSON)</option>
                    <option value="clash">Clash (YAML)</option>
                    <option value="surge">Surge (JSON/INI)</option>
                  </select>
                </div>
                <textarea
                  id="configEditor"
                  name="configEditor"
                  x-model="configEditor"
                  rows={5}
                  class="mm-textarea font-mono text-[13px]"
                  placeholder="Paste your custom config here..."
                ></textarea>
                <div class="flex flex-wrap items-center justify-between gap-2">
                  <div class="text-xs">
                    <span class="text-emerald-600" x-show="configValidationState === 'success'" x-text="configValidationMessage"></span>
                    <span class="text-red-500" x-show="configValidationState === 'error'" x-text="configValidationMessage"></span>
                  </div>
                  <div class="flex flex-wrap gap-2">
                    <button type="button" class="mm-btn mm-btn-ghost text-sm" x-on:click="validateBaseConfig()">{t('validateConfig')}</button>
                    <button type="button" class="mm-btn mm-btn-secondary text-sm" x-on:click="saveBaseConfig()" x-bind:disabled="savingConfig">
                      <i class="fas" x-bind:class="savingConfig ? 'fa-spinner fa-spin' : 'fa-save'"></i>
                      <span x-text="savingConfig ? savingConfigText : saveConfigText">{t('saveConfig')}</span>
                    </button>
                    <button type="button" class="mm-btn mm-btn-danger text-sm" x-on:click="clearBaseConfig()">{t('clearConfig')}</button>
                  </div>
                </div>
              </div>

              <div class="border-t border-[var(--border)]"></div>

              {/* UA */}
              <div class="space-y-2">
                <h3 class="text-sm font-semibold">{t('UASettings')}</h3>
                <p class="mm-desc">拉取远程订阅时的 User-Agent</p>
                <input type="text" x-model="customUA" class="mm-input font-mono text-sm max-w-xl" placeholder="curl/7.74.0" />
              </div>
            </div>
          </div>
        
          <div class="pt-2 space-y-1">
            <p class="text-xs font-medium uppercase tracking-wide text-[var(--muted-foreground)]">生成</p>
          </div>

{/* —— 主流程：输入 + 转换（置底，始终展开）—— */}
          <div class="mm-card">
            <div class="border-b border-[var(--border)] px-5 py-4">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="mm-chip text-[10px] bg-[color-mix(in_srgb,var(--primary)_14%,transparent)] text-[var(--primary)] border-[color-mix(in_srgb,var(--primary)_30%,var(--border))]">主操作</span>
                    <h2 class="text-lg font-semibold tracking-tight">{t('shareUrls')}</h2>
                  </div>
                  <p class="mm-desc mt-1">{t('urlPlaceholder')}</p>
                </div>
                <div class="flex gap-1.5 shrink-0">
                  <button type="button" class="mm-btn mm-btn-ghost text-xs py-1.5" x-on:click="navigator.clipboard.readText().then(text => input = text).catch(() => {})">
                    <i class="fas fa-paste"></i>{t('paste')}
                  </button>
                  <button type="button" class="mm-btn mm-btn-ghost text-xs py-1.5" x-show="input" x-on:click="input = ''">
                    <i class="fas fa-times"></i>{t('clear')}
                  </button>
                </div>
              </div>
            </div>
            <div class="p-5 space-y-4">
              <textarea
                id="input"
                name="input"
                x-model="input"
                required
                rows={7}
                class="mm-textarea font-mono text-[13px] min-h-[10rem]"
                placeholder={t('urlPlaceholder')}
              ></textarea>
              <div class="flex flex-col sm:flex-row gap-2.5">
                <button type="submit" class="mm-btn mm-btn-primary flex-1 py-2.5" x-bind:disabled="loading">
                  <i class="fas" x-bind:class="loading ? 'fa-spinner fa-spin' : 'fa-bolt'"></i>
                  <span x-text="loading ? processingText : convertText">{t('convert')}</span>
                </button>
                <button
                  type="button"
                  class="mm-btn mm-btn-secondary py-2.5"
                  x-on:click="window.dispatchEvent(new CustomEvent('nodes-import-from-input')); window.__SUBLINK_UI__.setPage('nodes')"
                >
                  <i class="fas fa-bookmark text-xs"></i>
                  存入节点库
                </button>
                <button type="button" class="mm-btn mm-btn-ghost py-2.5" x-on:click="clearAll()">
                  <i class="fas fa-trash-alt text-xs"></i>
                  {t('clear')}
                </button>
              </div>
            </div>
          </div>

          
        </form>
      </section>

      {/* ========== Page: 节点管理 ========== */}
      <section x-show="$store.ui.page === 'nodes'" class="space-y-4">
        <div>
          <h1 class="text-3xl font-semibold tracking-tight">节点管理</h1>
          <p class="text-[var(--muted-foreground)] mt-2">
            登录后节点同步到服务端 KV，可跨设备管理；勾选后批量生成订阅。
          </p>
        </div>
        <NodeLibrary t={t} />
      </section>

      {/* ========== Page: 订阅链接 ========== */}
      <section
        x-show="$store.ui.page === 'subscribe' || ($store.ui.page === 'generate' && generatedLinks)"
        class="space-y-4"
        x-bind:class="$store.ui.page === 'generate' ? 'mt-6' : ''"
      >
        <div x-show="$store.ui.page === 'subscribe'">
          <h1 class="text-3xl font-semibold tracking-tight">订阅链接</h1>
          <p class="text-[var(--muted-foreground)] mt-2">
            生成后的 Xray / Sing-Box / Clash / Surge 链接，可短链与复制。
          </p>
        </div>

        <div id="results" x-show="generatedLinks" x-data="{ copied: null }" class="mm-card">
          <div class="border-b border-[var(--border)] px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold tracking-tight">{t('subscriptionLinks')}</h2>
              <p class="mm-desc mt-1">Clash / Sing-Box / Xray / Surge</p>
            </div>
            <button type="button" class="mm-btn mm-btn-ghost text-sm" x-show="$store.ui.page !== 'generate'" x-on:click="window.__SUBLINK_UI__.setPage('generate')">
              <i class="fas fa-bolt text-xs"></i>
              返回生成
            </button>
          </div>
          <div class="p-5 space-y-4">
            <div x-show="generatedLinks" class="space-y-3">
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
                      class="mm-btn mm-btn-ghost mm-btn-icon shrink-0"
                      x-on:click={`navigator.clipboard.writeText((shortenedLinks || generatedLinks)?.${field.key}); copied = '${field.key}'; setTimeout(() => copied = null, 2000)`}
                      x-bind:class={`copied === '${field.key}' ? 'text-emerald-600 border-emerald-300' : ''`}
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
                  class="mm-btn py-2.5"
                  x-on:click="shortenedLinks ? shortenedLinks = null : shortenLinks()"
                  x-bind:disabled="!shortenedLinks && shortening"
                  x-bind:class="shortenedLinks ? 'mm-btn-ghost' : 'mm-btn-primary'"
                >
                  <i class="fas" x-bind:class="shortenedLinks ? 'fa-expand-alt' : (shortening ? 'fa-spinner fa-spin' : 'fa-compress-alt')"></i>
                  <span x-text="shortenedLinks ? showFullLinksText : (shortening ? shorteningText : shortenLinksText)"></span>
                </button>
              </div>
            </div>
          </div>
        </div>

        <div x-show="$store.ui.page === 'subscribe' && !generatedLinks" class="mm-card p-10 text-center">
          <p class="mm-desc mb-4">暂无订阅链接，请先生成。</p>
          <button type="button" class="mm-btn mm-btn-primary" x-on:click="window.__SUBLINK_UI__.setPage('generate')">
            <i class="fas fa-bolt text-xs"></i>
            去生成订阅
          </button>
        </div>
      </section>

      <script dangerouslySetInnerHTML={{ __html: scriptContent }} />
    </div>
  );
};
