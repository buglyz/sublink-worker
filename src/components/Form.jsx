/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */
import { PREDEFINED_RULE_SETS, UNIFIED_RULES } from '../config/index.js';
import { listTemplateDetails } from '../templates/index.js';
import { CustomRules } from './CustomRules.jsx';
import { TextareaWithActions } from './TextareaWithActions.jsx';
import { ValidatedTextarea } from './ValidatedTextarea.jsx';
import { formLogicFn } from './formLogic.js';

const LINK_FIELDS = [
  { key: 'xray', labelKey: 'xrayLink' },
  { key: 'singbox', labelKey: 'singboxLink' },
  { key: 'clash', labelKey: 'clashLink' },
  { key: 'surge', labelKey: 'surgeLink' }
];

const ACTION_BTN =
  'px-2.5 py-1 text-xs font-medium bg-surface-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 rounded-lg border border-transparent hover:border-surface-200 dark:hover:border-white/10 transition-colors flex items-center gap-1';

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
    v3: templateOptions.filter((t) => t.source === 'miaomiaowu-v3'),
    aethersailor: templateOptions.filter((t) => t.id.startsWith('Custom_Clash')),
    acl4ssr: templateOptions.filter(
      (t) => t.source === 'acl-ini' && !t.id.startsWith('Custom_Clash')
    ),
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
    <div x-data="formData()" x-init="init()" class="max-w-3xl mx-auto">
      <form {...{ 'x-on:submit.prevent': 'submitForm' }} class="space-y-5">

        {/* Input Section */}
        <section class="ui-card p-5 sm:p-6 group">
          <TextareaWithActions
            id="input"
            name="input"
            label={t('shareUrls')}
            labelPrefix={
              <span class="w-8 h-8 rounded-lg bg-brand-50 dark:bg-brand-900/25 text-brand-600 dark:text-brand-400 flex items-center justify-center">
                <i class="fas fa-link text-sm"></i>
              </span>
            }
            model="input"
            rows={5}
            placeholder={t('urlPlaceholder')}
            required
            labelActionsWrapperClass="flex gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200"
            labelActions={[
              {
                key: 'paste',
                icon: 'fas fa-paste',
                label: t('paste'),
                hideLabelOnMobile: true,
                className: `${ACTION_BTN} hover:bg-brand-50 dark:hover:bg-brand-900/20 hover:text-brand-700 dark:hover:text-brand-300`,
                title: t('paste'),
                attrs: {
                  'x-on:click': "navigator.clipboard.readText().then(text => input = text).catch(() => {})"
                }
              },
              {
                key: 'clear',
                icon: 'fas fa-times',
                label: t('clear'),
                hideLabelOnMobile: true,
                className: `${ACTION_BTN} hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-600 dark:hover:text-rose-400`,
                title: t('clear'),
                attrs: {
                  'x-on:click': "input = ''",
                  'x-show': 'input'
                }
              }
            ]}
          />
        </section>

        {/* Advanced Options Toggle */}
        <div
          class="ui-card px-4 sm:px-5 py-3.5 flex items-center justify-between cursor-pointer hover:border-brand-300/50 dark:hover:border-brand-700/40 transition-colors"
          x-on:click="showAdvanced = !showAdvanced"
          role="button"
          tabindex="0"
          {...{
            'x-on:keydown.enter.prevent': 'showAdvanced = !showAdvanced',
            'x-on:keydown.space.prevent': 'showAdvanced = !showAdvanced'
          }}
        >
          <div class="flex items-center gap-3">
            <div class="w-9 h-9 rounded-lg bg-surface-100 dark:bg-white/5 text-gray-600 dark:text-gray-300 flex items-center justify-center">
              <i class="fas fa-sliders-h text-sm"></i>
            </div>
            <div>
              <div class="font-semibold text-gray-900 dark:text-white text-[15px]">{t('advancedOptions')}</div>
              <div class="text-xs text-gray-500 dark:text-gray-400 mt-0.5">模板 · 规则 · 基础配置 · UA</div>
            </div>
          </div>
          <div
            class="w-8 h-8 flex items-center justify-center rounded-lg bg-surface-100 dark:bg-white/5 text-gray-500 dark:text-gray-400 transition-transform duration-300"
            x-bind:class="{'rotate-180': showAdvanced}"
          >
            <i class="fas fa-chevron-down text-xs"></i>
          </div>
        </div>

        {/* Advanced Options Content */}
        <div
          x-show="showAdvanced"
          {...{
            'x-transition:enter': 'transition ease-out duration-300',
            'x-transition:enter-start': 'opacity-0 transform -translate-y-2',
            'x-transition:enter-end': 'opacity-100 transform translate-y-0',
            'x-transition:leave': 'transition ease-in duration-200',
            'x-transition:leave-start': 'opacity-100 transform translate-y-0',
            'x-transition:leave-end': 'opacity-0 transform -translate-y-2'
          }}
          class="space-y-5"
        >

          {/* Clash V3 Rule Template */}
          <section class="ui-card p-5 sm:p-6">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-2">
              <h3 class="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <i class="fas fa-layer-group text-gray-400 text-sm"></i>
                {t('clashTemplate')}
              </h3>
              <select
                x-model="selectedTemplate"
                class="w-full sm:w-auto max-w-full sm:min-w-[18rem] px-3 py-2 rounded-xl border border-surface-200 dark:border-white/10 bg-surface-50 dark:bg-black/20 text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/50"
              >
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
            <p class="text-sm text-gray-500 dark:text-gray-400">{t('clashTemplateHint')}</p>
            <p class="text-sm text-brand-600 dark:text-brand-400 mt-2 font-medium" x-show="selectedTemplate" x-text="templateLabel()"></p>
          </section>

          {/* Rule Selection */}
          <section class="ui-card p-5 sm:p-6" x-bind:class="selectedTemplate ? 'opacity-55' : ''">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h3 class="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <i class="fas fa-filter text-gray-400 text-sm"></i>
                {t('ruleSelection')}
              </h3>
              <select
                x-model="selectedPredefinedRule"
                x-on:change="applyPredefinedRule()"
                class="px-3 py-1.5 rounded-xl border border-surface-200 dark:border-white/10 bg-surface-50 dark:bg-black/20 text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                x-bind:disabled="!!selectedTemplate"
              >
                <option value="custom">{t('custom')}</option>
                <option value="minimal">{t('minimal')}</option>
                <option value="balanced">{t('balanced')}</option>
                <option value="comprehensive">{t('comprehensive')}</option>
              </select>
            </div>

            <p class="text-sm text-amber-600 dark:text-amber-400 mb-3" x-show="selectedTemplate">{t('clashTemplateOverridesRules')}</p>

            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {UNIFIED_RULES.map((rule) => (
                <label class="flex items-center p-2.5 rounded-xl border border-surface-200 dark:border-white/10 hover:bg-surface-50 dark:hover:bg-white/[0.03] cursor-pointer transition-colors">
                  <input
                    type="checkbox"
                    value={rule.name}
                    x-model="selectedRules"
                    x-on:change="selectedPredefinedRule = 'custom'"
                    class="w-4 h-4 text-brand-600 rounded border-gray-300 focus:ring-brand-500 dark:bg-surface-850 dark:border-gray-600"
                    x-bind:disabled="!!selectedTemplate"
                  />
                  <span class="ml-2.5 text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t(`outboundNames.${rule.name}`)}
                  </span>
                </label>
              ))}
            </div>
          </section>

          <CustomRules t={t} />

          {/* General Options */}
          <section class="ui-card p-5 sm:p-6">
            <h3 class="text-base font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <i class="fas fa-cog text-gray-400 text-sm"></i>
              {t('generalSettings')}
            </h3>

            <div class="space-y-2">
              <label class="flex items-center justify-between p-3 rounded-xl bg-surface-50 dark:bg-white/[0.03] hover:bg-surface-100 dark:hover:bg-white/[0.05] transition-colors cursor-pointer">
                <span class="font-medium text-sm text-gray-700 dark:text-gray-300">{t('groupByCountry')}</span>
                <div class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" x-model="groupByCountry" class="sr-only peer" />
                  <div class="ui-toggle peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-500/30"></div>
                </div>
              </label>

              <label class="flex items-center justify-between p-3 rounded-xl bg-surface-50 dark:bg-white/[0.03] hover:bg-surface-100 dark:hover:bg-white/[0.05] transition-colors cursor-pointer">
                <span class="font-medium text-sm text-gray-700 dark:text-gray-300">{t('includeAutoSelect')}</span>
                <div class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" x-model="includeAutoSelect" class="sr-only peer" />
                  <div class="ui-toggle peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-500/30"></div>
                </div>
              </label>

              <label class="flex items-center justify-between p-3 rounded-xl bg-surface-50 dark:bg-white/[0.03] hover:bg-surface-100 dark:hover:bg-white/[0.05] transition-colors cursor-pointer">
                <span class="font-medium text-sm text-gray-700 dark:text-gray-300">{t('enableClashUI')}</span>
                <div class="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" x-model="enableClashUI" class="sr-only peer" />
                  <div class="ui-toggle peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-brand-500/30"></div>
                </div>
              </label>

              <div
                x-show="enableClashUI"
                {...{
                  'x-transition:enter': 'transition ease-out duration-200',
                  'x-transition:enter-start': 'opacity-0 transform -translate-y-1',
                  'x-transition:enter-end': 'opacity-100 transform translate-y-0',
                  'x-transition:leave': 'transition ease-in duration-150',
                  'x-transition:leave-start': 'opacity-100 transform translate-y-0',
                  'x-transition:leave-end': 'opacity-0 transform -translate-y-1'
                }}
                class="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2"
              >
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('externalController')}</label>
                  <input type="text" x-model="externalController" class="ui-input" placeholder={t('externalControllerPlaceholder')} />
                </div>
                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('externalUiDownloadUrl')}</label>
                  <input type="text" x-model="externalUiDownloadUrl" class="ui-input" placeholder={t('externalUiDownloadUrlPlaceholder')} />
                </div>
              </div>
            </div>
          </section>

          {/* Subconverter External Config */}
          <section class="ui-card p-5 sm:p-6">
            <h3 class="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-1.5">
              <i class="fas fa-file-export text-gray-400 text-sm"></i>
              {t('subconverterConfigTitle')}
            </h3>
            <p class="text-sm text-gray-500 dark:text-gray-400 mb-3">{t('subconverterConfigDesc')}</p>
            <div class="px-3.5 py-3 rounded-xl border border-surface-200 dark:border-white/10 bg-surface-50 dark:bg-black/25">
              <p class="font-mono text-xs sm:text-sm text-gray-600 dark:text-gray-400 break-all" x-text="getSubconverterUrl()"></p>
            </div>
            <div class="mt-3 flex justify-end">
              <button
                type="button"
                x-on:click="copySubconverterUrl()"
                class="px-3.5 py-2 rounded-xl transition-colors font-medium text-sm flex items-center gap-2 border"
                x-bind:class="subconverterCopied
                  ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800'
                  : 'bg-surface-50 dark:bg-white/5 text-gray-700 dark:text-gray-300 border-surface-200 dark:border-white/10 hover:border-brand-300 dark:hover:border-brand-700'"
              >
                <i class="fas" x-bind:class="subconverterCopied ? 'fa-check' : 'fa-copy'"></i>
                <span x-text={`subconverterCopied ? '${t('copiedSubconverterUrl')}' : '${t('copySubconverterUrl')}'`}></span>
              </button>
            </div>
          </section>

          {/* Base Config */}
          <section class="ui-card p-5 sm:p-6">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
              <h3 class="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <i class="fas fa-file-code text-gray-400 text-sm"></i>
                {t('baseConfigSettings')}
              </h3>
              <select x-model="configType" class="px-3 py-1.5 rounded-xl border border-surface-200 dark:border-white/10 bg-surface-50 dark:bg-black/20 text-sm font-medium text-gray-700 dark:text-gray-200 focus:outline-none focus:ring-2 focus:ring-brand-500/30">
                <option value="singbox">SingBox (JSON)</option>
                <option value="clash">Clash (YAML)</option>
                <option value="surge">Surge (JSON/INI)</option>
              </select>
            </div>

            <ValidatedTextarea
              id="configEditor"
              name="configEditor"
              model="configEditor"
              rows={5}
              placeholder="Paste your custom config here..."
              variant="mono"
              containerClass="mt-0 group"
              labelWrapperClass="flex items-center justify-end mb-2"
              labelActionsWrapperClass="flex gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200"
              pasteLabel={t('paste')}
              clearLabel={t('clear')}
              validation={{
                button: {
                  key: 'validate-config',
                  label: t('validateConfig'),
                  className:
                    'px-3 py-1.5 bg-white dark:bg-surface-850 border border-surface-200 dark:border-white/10 text-gray-700 dark:text-gray-200 rounded-lg text-xs font-medium hover:border-brand-400/50 hover:text-brand-700 dark:hover:text-brand-300 transition-colors flex items-center gap-1.5 shadow-sm',
                  attrs: {
                    'x-on:click': 'validateBaseConfig()'
                  }
                },
                success: {
                  show: "configValidationState === 'success'",
                  textExpr: 'configValidationMessage'
                },
                error: {
                  show: "configValidationState === 'error'",
                  textExpr: 'configValidationMessage'
                }
              }}
              inlineActionsWrapperClass="absolute bottom-3 right-3 flex gap-2"
              preserveLabelSpace={false}
            />

            <div class="flex justify-end gap-2.5 mt-4">
              <button
                type="button"
                x-on:click="saveBaseConfig()"
                x-bind:disabled="savingConfig"
                class="px-3.5 py-2 bg-surface-100 dark:bg-white/5 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-surface-200 dark:hover:bg-white/10 transition-colors font-medium text-sm disabled:opacity-70 disabled:cursor-not-allowed flex items-center gap-2 border border-surface-200 dark:border-white/10"
              >
                <i class="fas" x-bind:class="savingConfig ? 'fa-spinner fa-spin' : 'fa-save'"></i>
                <span x-text="savingConfig ? savingConfigText : saveConfigText">{t('saveConfig')}</span>
              </button>
              <button type="button" x-on:click="clearBaseConfig()" class="px-3.5 py-2 bg-rose-50 dark:bg-rose-900/15 text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors font-medium text-sm border border-rose-100 dark:border-rose-900/40">
                {t('clearConfig')}
              </button>
            </div>
          </section>

          {/* User Agent */}
          <section class="ui-card p-5 sm:p-6">
            <h3 class="text-base font-semibold text-gray-900 dark:text-white mb-3 flex items-center gap-2">
              <i class="fas fa-user-secret text-gray-400 text-sm"></i>
              {t('UASettings')}
            </h3>
            <input
              type="text"
              x-model="customUA"
              class="ui-input font-mono text-sm"
              placeholder="curl/7.74.0"
            />
          </section>
        </div>

        {/* Action Buttons */}
        <div class="flex flex-col sm:flex-row gap-3 pt-1">
          <button
            type="submit"
            class="flex-1 py-3.5 px-6 bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white rounded-xl font-semibold shadow-glow hover:shadow-lift transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            x-bind:disabled="loading"
          >
            <i class="fas" x-bind:class="loading ? 'fa-spinner fa-spin' : 'fa-sync-alt'"></i>
            <span x-text="loading ? processingText : convertText">{t('convert')}</span>
          </button>

          <button
            type="button"
            x-on:click="clearAll()"
            class="px-6 py-3.5 ui-card text-gray-700 dark:text-gray-300 font-semibold hover:border-rose-300 dark:hover:border-rose-800 hover:text-rose-600 dark:hover:text-rose-400 transition-all duration-200 flex items-center justify-center gap-2"
          >
            <i class="fas fa-trash-alt text-sm"></i>
            {t('clear')}
          </button>
        </div>
      </form>

      {/* Results Section */}
      <div
        x-cloak
        x-show="generatedLinks"
        x-data="{ copied: null }"
        {...{
          'x-transition:enter': 'transition ease-out duration-400',
          'x-transition:enter-start': 'opacity-0 transform translate-y-4',
          'x-transition:enter-end': 'opacity-100 transform translate-y-0'
        }}
        class="mt-10"
      >
        <section class="ui-card p-5 sm:p-6">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
            <h2 class="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2.5">
              <span class="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/25 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                <i class="fas fa-link text-sm"></i>
              </span>
              {t('subscriptionLinks')}
            </h2>
          </div>

          <div class="space-y-3.5">
            {LINK_FIELDS.map((field) => (
              <div class="relative" key={field.key}>
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                  {t(field.labelKey)}
                </label>
                <div class="flex gap-2">
                  <input
                    type="text"
                    readonly
                    x-bind:value={`shortenedLinks ? shortenedLinks?.${field.key} : generatedLinks?.${field.key}`}
                    class="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-white/10 bg-surface-50 dark:bg-black/25 font-mono text-sm transition-all duration-200"
                    x-bind:class="shortenedLinks ? 'text-brand-700 dark:text-brand-300 font-medium' : 'text-gray-600 dark:text-gray-400'"
                  />
                  <button
                    type="button"
                    x-on:click={`navigator.clipboard.writeText((shortenedLinks || generatedLinks)?.${field.key}); copied = '${field.key}'; setTimeout(() => copied = null, 2000)`}
                    class="px-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-600 dark:text-gray-300 transition-colors duration-200 flex items-center justify-center min-w-[2.75rem]"
                    x-bind:class={`{
                      'bg-emerald-50 dark:bg-emerald-900/25 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800': copied === '${field.key}'
                    }`}
                  >
                    <i class="fas" x-bind:class={`copied === '${field.key}' ? 'fa-check' : 'fa-copy'`}></i>
                  </button>
                </div>
              </div>
            ))}
          </div>

          <div class="mt-6 pt-5 border-t border-surface-200 dark:border-white/5">
            <div class="flex flex-col items-center gap-3">
              <div class="w-full max-w-md">
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5 text-center">
                  {t('customShortCode')} <span class="text-gray-400 font-normal">({t('optional')})</span>
                </label>
                <input
                  type="text"
                  x-model="customShortCode"
                  placeholder={t('customShortCodePlaceholder')}
                  class="ui-input text-center"
                />
              </div>
            </div>
            <div class="flex justify-center mt-4">
              <button
                type="button"
                x-on:click="shortenedLinks ? shortenedLinks = null : shortenLinks()"
                x-bind:disabled="!shortenedLinks && shortening"
                class="px-5 py-2.5 rounded-xl font-semibold transition-all duration-200 flex items-center gap-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                x-bind:class="shortenedLinks
                  ? 'ui-card text-gray-700 dark:text-gray-300 hover:border-brand-300 dark:hover:border-brand-700'
                  : 'bg-brand-600 hover:bg-brand-700 text-white shadow-glow'"
              >
                <i
                  class="fas"
                  x-bind:class="shortenedLinks ? 'fa-expand-alt' : (shortening ? 'fa-spinner fa-spin' : 'fa-compress-alt')"
                ></i>
                <span
                  x-text="shortenedLinks ? showFullLinksText : (shortening ? shorteningText : shortenLinksText)"
                ></span>
              </button>
            </div>
          </div>
        </section>
      </div>

      <script dangerouslySetInnerHTML={{ __html: scriptContent }} />
    </div>
  );
};
