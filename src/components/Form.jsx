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
      {/* ========== Page: 生成订阅 (like /generator) ========== */}
      <section x-show="$store.ui.page === 'generate'" class="mx-auto space-y-6">
        <div class="space-y-2">
          <h1 class="text-3xl font-bold tracking-tight text-[var(--foreground)]">订阅链接生成器</h1>
          <p class="text-[var(--muted-foreground)]">
            {subtitle || '粘贴节点 / 订阅源，选择模板与规则，生成多客户端订阅链接。'}
          </p>
        </div>

        <form {...{ 'x-on:submit.prevent': 'submitForm' }} class="space-y-6">
          {/* Card: 输入源 */}
          <div class="mm-card">
            <div class="border-b border-[var(--border)] px-5 py-4">
              <div class="flex items-start justify-between gap-3">
                <div>
                  <h2 class="text-lg font-semibold tracking-tight">{t('shareUrls')}</h2>
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
                rows={8}
                class="mm-textarea font-mono text-[13px] min-h-[12rem]"
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

          {/* Card: 选择模板 */}
          <div class="mm-card">
            <div class="border-b border-[var(--border)] px-5 py-4">
              <h2 class="text-lg font-semibold tracking-tight">{t('clashTemplate')}</h2>
              <p class="mm-desc mt-1">{t('clashTemplateHint')}</p>
            </div>
            <div class="p-5 space-y-3">
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
              <p class="mm-desc text-[var(--primary)]" x-show="selectedTemplate" x-text="templateLabel()"></p>
            </div>
          </div>

          {/* Card: 规则选择 */}
          <div class="mm-card" x-bind:class="selectedTemplate ? 'opacity-55' : ''">
            <div class="border-b border-[var(--border)] px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 class="text-lg font-semibold tracking-tight">{t('ruleSelection')}</h2>
                <p class="mm-desc mt-1">预设或自定义策略出站（模板模式下由模板接管）</p>
              </div>
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
            <div class="p-5">
              <p class="mm-desc mb-3 text-amber-700 dark:text-amber-400" x-show="selectedTemplate">
                {t('clashTemplateOverridesRules')}
              </p>
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

          {/* Card: 自定义规则 */}
          <CustomRules t={t} />

          {/* Card: 通用设置 */}
          <div class="mm-card">
            <div class="border-b border-[var(--border)] px-5 py-4">
              <h2 class="text-lg font-semibold tracking-tight">{t('generalSettings')}</h2>
              <p class="mm-desc mt-1">分组、自动选择与 Clash 外部 UI</p>
            </div>
            <div class="p-5 space-y-2">
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

          {/* Card: Subconverter */}
          <div class="mm-card">
            <div class="border-b border-[var(--border)] px-5 py-4">
              <h2 class="text-lg font-semibold tracking-tight">{t('subconverterConfigTitle')}</h2>
              <p class="mm-desc mt-1">{t('subconverterConfigDesc')}</p>
            </div>
            <div class="p-5 space-y-3">
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
          </div>

          {/* Card: Base config */}
          <div class="mm-card">
            <div class="border-b border-[var(--border)] px-5 py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 class="text-lg font-semibold tracking-tight">{t('baseConfigSettings')}</h2>
                <p class="mm-desc mt-1">覆盖默认基础配置</p>
              </div>
              <select x-model="configType" class="mm-select w-full sm:w-auto">
                <option value="singbox">SingBox (JSON)</option>
                <option value="clash">Clash (YAML)</option>
                <option value="surge">Surge (JSON/INI)</option>
              </select>
            </div>
            <div class="p-5 space-y-3">
              <textarea
                id="configEditor"
                name="configEditor"
                x-model="configEditor"
                rows={6}
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
          </div>

          {/* Card: UA */}
          <div class="mm-card">
            <div class="border-b border-[var(--border)] px-5 py-4">
              <h2 class="text-lg font-semibold tracking-tight">{t('UASettings')}</h2>
              <p class="mm-desc mt-1">拉取远程订阅时的 User-Agent</p>
            </div>
            <div class="p-5">
              <input type="text" x-model="customUA" class="mm-input font-mono text-sm max-w-xl" placeholder="curl/7.74.0" />
            </div>
          </div>
        </form>
      </section>

      {/* ========== Page: 节点管理 (like /nodes) ========== */}
      <section x-show="$store.ui.page === 'nodes'" class="space-y-4">
        <div>
          <h1 class="text-3xl font-semibold tracking-tight">节点管理</h1>
          <p class="text-[var(--muted-foreground)] mt-2">
            登录后节点同步到服务端 KV，可跨设备管理；勾选后批量生成订阅。
          </p>
        </div>
        <NodeLibrary t={t} />
      </section>

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

        <div
          id="results"
          x-show="generatedLinks"
          x-data="{ copied: null }"
          class="mm-card"
        >
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
