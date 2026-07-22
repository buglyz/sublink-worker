/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */
import { PREDEFINED_RULE_SETS, UNIFIED_RULES } from '../config/index.js';
import { listTemplateDetails } from '../templates/index.js';
import { CustomRules } from './CustomRules.jsx';
import { formLogicFn } from './formLogic.js';

const LINK_FIELDS = [
  { key: 'xray', labelKey: 'xrayLink', short: 'Xray' },
  { key: 'singbox', labelKey: 'singboxLink', short: 'Sing-Box' },
  { key: 'clash', labelKey: 'clashLink', short: 'Clash' },
  { key: 'surge', labelKey: 'surgeLink', short: 'Surge' }
];

export const Form = (props) => {
  const { t, lang } = props;

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
    <div id="workspace" x-data="formData()" x-init="init()" class="space-y-5">
      <form {...{ 'x-on:submit.prevent': 'submitForm' }} class="space-y-5">
        <div class="grid grid-cols-1 gap-5 xl:grid-cols-12">
          {/* Left: source + actions */}
          <section class="xl:col-span-5 space-y-5">
            <div class="mm-card p-4 sm:p-5">
              <div class="mm-section-head">
                <div class="flex items-start gap-3">
                  <span class="icon"><i class="fas fa-file-import text-sm"></i></span>
                  <div>
                    <div class="mm-title">{t('shareUrls')}</div>
                    <p class="mm-desc mt-0.5">{t('urlPlaceholder')}</p>
                  </div>
                </div>
                <div class="flex gap-1.5">
                  <button
                    type="button"
                    class="mm-btn mm-btn-ghost px-2.5 py-1.5 text-xs"
                    title={t('paste')}
                    x-on:click="navigator.clipboard.readText().then(text => input = text).catch(() => {})"
                  >
                    <i class="fas fa-paste"></i>
                    <span class="hidden sm:inline">{t('paste')}</span>
                  </button>
                  <button
                    type="button"
                    class="mm-btn mm-btn-ghost px-2.5 py-1.5 text-xs"
                    title={t('clear')}
                    x-show="input"
                    x-on:click="input = ''"
                  >
                    <i class="fas fa-times"></i>
                  </button>
                </div>
              </div>
              <textarea
                id="input"
                name="input"
                x-model="input"
                required
                rows={10}
                class="mm-textarea font-mono text-[13px] min-h-[14rem]"
                placeholder={t('urlPlaceholder')}
              ></textarea>
              <div class="mt-4 flex flex-col sm:flex-row gap-2.5">
                <button type="submit" class="mm-btn mm-btn-primary flex-1 py-2.5" x-bind:disabled="loading">
                  <i class="fas" x-bind:class="loading ? 'fa-spinner fa-spin' : 'fa-bolt'"></i>
                  <span x-text="loading ? processingText : convertText">{t('convert')}</span>
                </button>
                <button type="button" class="mm-btn mm-btn-ghost py-2.5" x-on:click="clearAll()">
                  <i class="fas fa-trash-alt text-xs"></i>
                  {t('clear')}
                </button>
              </div>
            </div>

            {/* Results (sticky on large screens) */}
            <div id="results" x-cloak x-show="generatedLinks" x-data="{ copied: null }" class="mm-card p-4 sm:p-5 xl:sticky xl:top-20">
              <div class="mm-section-head mb-4">
                <div class="flex items-start gap-3">
                  <span class="icon !bg-emerald-500/15 !text-emerald-600">
                    <i class="fas fa-link text-sm"></i>
                  </span>
                  <div>
                    <div class="mm-title">{t('subscriptionLinks')}</div>
                    <p class="mm-desc mt-0.5">Clash / Sing-Box / Xray / Surge</p>
                  </div>
                </div>
              </div>

              <div class="space-y-3">
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
              </div>

              <div class="mt-5 border-t border-[var(--border)] pt-4 space-y-3">
                <div>
                  <label class="mm-label text-center sm:text-left">
                    {t('customShortCode')} <span class="font-normal opacity-70">({t('optional')})</span>
                  </label>
                  <input
                    type="text"
                    x-model="customShortCode"
                    placeholder={t('customShortCodePlaceholder')}
                    class="mm-input text-center sm:text-left"
                  />
                </div>
                <button
                  type="button"
                  class="mm-btn w-full py-2.5"
                  x-on:click="shortenedLinks ? shortenedLinks = null : shortenLinks()"
                  x-bind:disabled="!shortenedLinks && shortening"
                  x-bind:class="shortenedLinks ? 'mm-btn-ghost' : 'mm-btn-primary'"
                >
                  <i class="fas" x-bind:class="shortenedLinks ? 'fa-expand-alt' : (shortening ? 'fa-spinner fa-spin' : 'fa-compress-alt')"></i>
                  <span x-text="shortenedLinks ? showFullLinksText : (shortening ? shorteningText : shortenLinksText)"></span>
                </button>
              </div>
            </div>
          </section>

          {/* Right: config console */}
          <section class="xl:col-span-7 space-y-5">
            {/* Template */}
            <div class="mm-card p-4 sm:p-5">
              <div class="mm-section-head">
                <div class="flex items-start gap-3">
                  <span class="icon"><i class="fas fa-layer-group text-sm"></i></span>
                  <div>
                    <div class="mm-title">{t('clashTemplate')}</div>
                    <p class="mm-desc mt-0.5">{t('clashTemplateHint')}</p>
                  </div>
                </div>
              </div>
              <label class="mm-label">{t('clashTemplate')}</label>
              <select x-model="selectedTemplate" class="mm-select">
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
              <p class="mm-desc mt-2 text-[var(--primary)]" x-show="selectedTemplate" x-text="templateLabel()"></p>
            </div>

            {/* Rules */}
            <div class="mm-card p-4 sm:p-5" x-bind:class="selectedTemplate ? 'opacity-55 pointer-events-none' : ''">
              <div class="mm-section-head">
                <div class="flex items-start gap-3">
                  <span class="icon"><i class="fas fa-filter text-sm"></i></span>
                  <div>
                    <div class="mm-title">{t('ruleSelection')}</div>
                    <p class="mm-desc mt-0.5">预设或自定义策略出站</p>
                  </div>
                </div>
                <select
                  x-model="selectedPredefinedRule"
                  x-on:change="applyPredefinedRule()"
                  class="mm-select w-auto min-w-[8.5rem]"
                  x-bind:disabled="!!selectedTemplate"
                >
                  <option value="custom">{t('custom')}</option>
                  <option value="minimal">{t('minimal')}</option>
                  <option value="balanced">{t('balanced')}</option>
                  <option value="comprehensive">{t('comprehensive')}</option>
                </select>
              </div>
              <p class="mm-desc mb-3 text-amber-700 dark:text-amber-400" x-show="selectedTemplate">
                {t('clashTemplateOverridesRules')}
              </p>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {UNIFIED_RULES.map((rule) => (
                  <label class="flex items-center gap-2.5 rounded-[calc(var(--radius)-2px)] border border-[var(--border)] bg-[color-mix(in_srgb,var(--muted)_35%,transparent)] px-3 py-2.5 cursor-pointer hover:border-[color-mix(in_srgb,var(--primary)_40%,var(--border))] transition-colors">
                    <input
                      type="checkbox"
                      value={rule.name}
                      x-model="selectedRules"
                      x-on:change="selectedPredefinedRule = 'custom'"
                      class="mm-check"
                      x-bind:disabled="!!selectedTemplate"
                    />
                    <span class="text-sm font-medium text-[var(--foreground)]">
                      {t(`outboundNames.${rule.name}`)}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            <CustomRules t={t} />

            {/* General */}
            <div class="mm-card p-4 sm:p-5">
              <div class="mm-section-head">
                <div class="flex items-start gap-3">
                  <span class="icon"><i class="fas fa-sliders-h text-sm"></i></span>
                  <div>
                    <div class="mm-title">{t('generalSettings')}</div>
                    <p class="mm-desc mt-0.5">分组与 Clash UI</p>
                  </div>
                </div>
              </div>
              <div class="space-y-2">
                <label class="flex items-center justify-between gap-3 rounded-[calc(var(--radius)-2px)] border border-[var(--border)] px-3 py-2.5 cursor-pointer">
                  <span class="text-sm font-medium">{t('groupByCountry')}</span>
                  <span class="relative inline-flex">
                    <input type="checkbox" x-model="groupByCountry" class="sr-only peer" />
                    <span class="mm-switch"></span>
                  </span>
                </label>
                <label class="flex items-center justify-between gap-3 rounded-[calc(var(--radius)-2px)] border border-[var(--border)] px-3 py-2.5 cursor-pointer">
                  <span class="text-sm font-medium">{t('includeAutoSelect')}</span>
                  <span class="relative inline-flex">
                    <input type="checkbox" x-model="includeAutoSelect" class="sr-only peer" />
                    <span class="mm-switch"></span>
                  </span>
                </label>
                <label class="flex items-center justify-between gap-3 rounded-[calc(var(--radius)-2px)] border border-[var(--border)] px-3 py-2.5 cursor-pointer">
                  <span class="text-sm font-medium">{t('enableClashUI')}</span>
                  <span class="relative inline-flex">
                    <input type="checkbox" x-model="enableClashUI" class="sr-only peer" />
                    <span class="mm-switch"></span>
                  </span>
                </label>
                <div x-show="enableClashUI" class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
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

            {/* Subconverter */}
            <div class="mm-card p-4 sm:p-5">
              <div class="mm-section-head">
                <div class="flex items-start gap-3">
                  <span class="icon"><i class="fas fa-file-export text-sm"></i></span>
                  <div>
                    <div class="mm-title">{t('subconverterConfigTitle')}</div>
                    <p class="mm-desc mt-0.5">{t('subconverterConfigDesc')}</p>
                  </div>
                </div>
              </div>
              <div class="rounded-[calc(var(--radius)-2px)] border border-[var(--border)] bg-[color-mix(in_srgb,var(--muted)_40%,transparent)] px-3 py-2.5">
                <p class="font-mono text-xs break-all text-[var(--muted-foreground)]" x-text="getSubconverterUrl()"></p>
              </div>
              <div class="mt-3 flex justify-end">
                <button
                  type="button"
                  x-on:click="copySubconverterUrl()"
                  class="mm-btn mm-btn-secondary text-sm"
                >
                  <i class="fas" x-bind:class="subconverterCopied ? 'fa-check' : 'fa-copy'"></i>
                  <span x-text={`subconverterCopied ? '${t('copiedSubconverterUrl')}' : '${t('copySubconverterUrl')}'`}></span>
                </button>
              </div>
            </div>

            {/* Base config */}
            <div class="mm-card p-4 sm:p-5">
              <div class="mm-section-head">
                <div class="flex items-start gap-3">
                  <span class="icon"><i class="fas fa-file-code text-sm"></i></span>
                  <div>
                    <div class="mm-title">{t('baseConfigSettings')}</div>
                    <p class="mm-desc mt-0.5">覆盖默认基础配置</p>
                  </div>
                </div>
                <select x-model="configType" class="mm-select w-auto">
                  <option value="singbox">SingBox (JSON)</option>
                  <option value="clash">Clash (YAML)</option>
                  <option value="surge">Surge (JSON/INI)</option>
                </select>
              </div>
              <textarea
                id="configEditor"
                name="configEditor"
                x-model="configEditor"
                rows={6}
                class="mm-textarea font-mono text-[13px]"
                placeholder="Paste your custom config here..."
              ></textarea>
              <div class="mt-3 flex flex-wrap items-center justify-between gap-2">
                <div class="text-xs">
                  <span class="text-emerald-600" x-show="configValidationState === 'success'" x-text="configValidationMessage"></span>
                  <span class="text-red-500" x-show="configValidationState === 'error'" x-text="configValidationMessage"></span>
                </div>
                <div class="flex flex-wrap gap-2">
                  <button type="button" class="mm-btn mm-btn-ghost text-sm" x-on:click="validateBaseConfig()">
                    <i class="fas fa-check-double text-xs"></i>
                    {t('validateConfig')}
                  </button>
                  <button type="button" class="mm-btn mm-btn-secondary text-sm" x-on:click="saveBaseConfig()" x-bind:disabled="savingConfig">
                    <i class="fas" x-bind:class="savingConfig ? 'fa-spinner fa-spin' : 'fa-save'"></i>
                    <span x-text="savingConfig ? savingConfigText : saveConfigText">{t('saveConfig')}</span>
                  </button>
                  <button type="button" class="mm-btn mm-btn-danger text-sm" x-on:click="clearBaseConfig()">
                    {t('clearConfig')}
                  </button>
                </div>
              </div>
            </div>

            {/* UA */}
            <div class="mm-card p-4 sm:p-5">
              <div class="mm-section-head mb-3">
                <div class="flex items-start gap-3">
                  <span class="icon"><i class="fas fa-user-secret text-sm"></i></span>
                  <div>
                    <div class="mm-title">{t('UASettings')}</div>
                    <p class="mm-desc mt-0.5">拉取远程订阅时的 User-Agent</p>
                  </div>
                </div>
              </div>
              <input type="text" x-model="customUA" class="mm-input font-mono text-sm" placeholder="curl/7.74.0" />
            </div>
          </section>
        </div>
      </form>

      <script dangerouslySetInnerHTML={{ __html: scriptContent }} />
    </div>
  );
};
