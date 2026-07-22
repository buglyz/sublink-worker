/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */

import { ValidatedTextarea } from './ValidatedTextarea.jsx';

const fieldClass =
  'w-full px-3.5 py-2 rounded-xl border border-surface-200 dark:border-white/10 bg-white dark:bg-black/20 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500/50 transition-all duration-200 text-sm';

export const CustomRules = (props) => {
  const { t } = props;

  return (
    <div x-data="customRulesData()" class="ui-card p-5 sm:p-6">
      <div class="flex items-center justify-between mb-3">
        <h3 class="text-base font-semibold text-gray-900 dark:text-white flex items-center gap-2">
          <i class="fas fa-stream text-gray-400 text-sm"></i>
          {t('customRulesSection')}
        </h3>
      </div>

      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-5 gap-3">
        <p class="text-sm text-gray-500 dark:text-gray-400">{t('customRulesSectionTooltip')}</p>

        <div class="flex bg-surface-100 dark:bg-white/5 rounded-xl p-1 border border-surface-200 dark:border-white/10">
          <button
            type="button"
            x-on:click="mode = 'form'"
            x-bind:class="{'bg-white dark:bg-surface-850 text-brand-700 dark:text-brand-300 shadow-sm border border-surface-200 dark:border-white/10': mode === 'form', 'text-gray-500 dark:text-gray-400 border border-transparent': mode !== 'form'}"
            class="px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5"
          >
            <i class="fas fa-list text-xs"></i>
            {t('customRulesForm')}
          </button>
          <button
            type="button"
            x-on:click="mode = 'json'"
            x-bind:class="{'bg-white dark:bg-surface-850 text-brand-700 dark:text-brand-300 shadow-sm border border-surface-200 dark:border-white/10': mode === 'json', 'text-gray-500 dark:text-gray-400 border border-transparent': mode !== 'json'}"
            class="px-3.5 py-1.5 rounded-lg text-sm font-medium transition-all duration-200 flex items-center gap-1.5"
          >
            <i class="fas fa-code text-xs"></i>
            {t('customRulesJSON')}
          </button>
        </div>
      </div>

      {/* Form Mode */}
      <div
        x-show="mode === 'form'"
        {...{
          'x-transition:enter': 'transition ease-out duration-250',
          'x-transition:enter-start': 'opacity-0',
          'x-transition:enter-end': 'opacity-100'
        }}
      >
        <template x-if="rules.length === 0">
          <div class="text-center py-10 bg-surface-50 dark:bg-white/[0.02] rounded-xl border border-dashed border-surface-200 dark:border-white/10">
            <div class="w-12 h-12 bg-surface-100 dark:bg-white/5 rounded-xl flex items-center justify-center mx-auto mb-3 text-gray-400">
              <i class="fas fa-plus"></i>
            </div>
            <p class="text-gray-500 dark:text-gray-400 mb-4 text-sm">{t('noCustomRulesForm')}</p>
            <button
              type="button"
              x-on:click="addRule()"
              class="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-xl transition-colors duration-200 font-medium text-sm"
            >
              {t('addCustomRule')}
            </button>
          </div>
        </template>

        <div class="space-y-3">
          <template x-for="(rule, index) in rules" x-bind:key="index">
            <div
              x-data="{ show: false }"
              x-init="$nextTick(() => show = true)"
              x-show="show"
              class="bg-surface-50 dark:bg-white/[0.02] rounded-xl p-4 border border-surface-200 dark:border-white/10 transition-all duration-200 hover:border-brand-300/50 dark:hover:border-brand-700/40"
              {...{
                'x-transition:enter': 'transition ease-out duration-250',
                'x-transition:enter-start': 'opacity-0 -translate-y-1',
                'x-transition:enter-end': 'opacity-100 translate-y-0',
                'x-transition:leave': 'transition ease-in duration-150',
                'x-transition:leave-start': 'opacity-100',
                'x-transition:leave-end': 'opacity-0',
                'x-on:custom-rules-clear.window': 'show = false'
              }}
            >
              <div class="flex justify-between items-center mb-3 pb-3 border-b border-surface-200 dark:border-white/5">
                <h3 class="font-medium text-gray-900 dark:text-white flex items-center gap-2 text-sm">
                  <span
                    class="w-6 h-6 rounded-md bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400 flex items-center justify-center text-xs font-mono"
                    x-text="index + 1"
                  ></span>
                  {t('customRule')}
                </h3>
                <button
                  type="button"
                  x-on:click="show = false; setTimeout(() => removeRule(index), 150)"
                  class="text-rose-500 hover:text-rose-600 dark:text-rose-400 dark:hover:text-rose-300 transition-colors p-1.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-900/20"
                >
                  <i class="fas fa-trash-alt text-xs"></i>
                </button>
              </div>

              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div class="col-span-1 md:col-span-2">
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('customRuleOutboundName')}
                  </label>
                  <input type="text" x-model="rule.name" class={fieldClass} placeholder="e.g., MyRule" />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('customRuleDomainSuffix')}
                  </label>
                  <input
                    type="text"
                    x-model="rule.domain_suffix"
                    class={fieldClass}
                    placeholder={t('customRuleDomainSuffixPlaceholder')}
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('customRuleDomainKeyword')}
                  </label>
                  <input
                    type="text"
                    x-model="rule.domain_keyword"
                    class={fieldClass}
                    placeholder={t('customRuleDomainKeywordPlaceholder')}
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                    {t('customRuleSrcIPCIDR')}
                    <i
                      class="fas fa-info-circle text-gray-400 hover:text-brand-500 cursor-help text-xs"
                      title={t('customRuleSrcIPCIDRTooltip')}
                    ></i>
                  </label>
                  <input
                    type="text"
                    x-model="rule.src_ip_cidr"
                    class={fieldClass}
                    placeholder={t('customRuleSrcIPCIDRPlaceholder')}
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('customRuleIPCIDR')}
                  </label>
                  <input
                    type="text"
                    x-model="rule.ip_cidr"
                    class={fieldClass}
                    placeholder={t('customRuleIPCIDRPlaceholder')}
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                    {t('customRuleProtocol')}
                    <i
                      class="fas fa-info-circle text-gray-400 hover:text-brand-500 cursor-help text-xs"
                      title={t('customRuleProtocolTooltip')}
                    ></i>
                  </label>
                  <input
                    type="text"
                    x-model="rule.protocol"
                    class={fieldClass}
                    placeholder={t('customRuleProtocolPlaceholder')}
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                    {t('customRuleGeoSite')}
                    <i
                      class="fas fa-info-circle text-gray-400 hover:text-brand-500 cursor-help text-xs"
                      title={t('customRuleGeoSiteTooltip')}
                    ></i>
                  </label>
                  <input
                    type="text"
                    x-model="rule.site"
                    class={fieldClass}
                    placeholder={t('customRuleGeoSitePlaceholder')}
                  />
                </div>

                <div>
                  <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 flex items-center gap-1">
                    {t('customRuleGeoIP')}
                    <i
                      class="fas fa-info-circle text-gray-400 hover:text-brand-500 cursor-help text-xs"
                      title={t('customRuleGeoIPTooltip')}
                    ></i>
                  </label>
                  <input
                    type="text"
                    x-model="rule.ip"
                    class={fieldClass}
                    placeholder={t('customRuleGeoIPPlaceholder')}
                  />
                </div>
              </div>
            </div>
          </template>
        </div>

        <div class="mt-4 flex flex-wrap gap-2.5">
          <button
            type="button"
            x-on:click="addRule()"
            class="px-3.5 py-2 bg-brand-50 dark:bg-brand-900/20 text-brand-700 dark:text-brand-300 rounded-xl hover:bg-brand-100 dark:hover:bg-brand-900/35 transition-colors duration-200 font-medium text-sm flex items-center gap-2 border border-brand-100 dark:border-brand-800/50"
          >
            <i class="fas fa-plus text-xs"></i>
            {t('addCustomRule')}
          </button>
          <button
            type="button"
            x-on:click="clearAll()"
            x-show="rules.length > 0"
            class="px-3.5 py-2 bg-rose-50 dark:bg-rose-900/15 text-rose-600 dark:text-rose-400 rounded-xl hover:bg-rose-100 dark:hover:bg-rose-900/30 transition-colors duration-200 font-medium text-sm flex items-center gap-2 border border-rose-100 dark:border-rose-900/40"
          >
            <i class="fas fa-trash text-xs"></i>
            {t('clearAll')}
          </button>
        </div>
      </div>

      {/* JSON Mode */}
      <div
        x-show="mode === 'json'"
        {...{
          'x-transition:enter': 'transition ease-out duration-250',
          'x-transition:enter-start': 'opacity-0',
          'x-transition:enter-end': 'opacity-100'
        }}
      >
        <ValidatedTextarea
          id="customRulesJson"
          name="customRulesJson"
          model="jsonContent"
          placeholder='[{"name": "MyRule", "src_ip_cidr": "192.168.1.13/32", "domain_suffix": "example.com", "outbound": "Proxy"}]'
          variant="mono"
          textareaClass="min-h-[16rem]"
          containerClass="group"
          labelWrapperClass="flex items-center justify-end mb-2"
          labelActionsWrapperClass="flex gap-1.5 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity duration-200"
          inlineActionsWrapperClass="absolute bottom-3 right-3 flex gap-2"
          preserveLabelSpace={false}
          pasteLabel={t('paste')}
          clearLabel={t('clear')}
          validation={{
            button: {
              key: 'validate-json',
              label: t('validateJSON'),
              attrs: { 'x-on:click': 'validateJson()' }
            },
            error: {
              show: 'jsonError',
              textExpr: 'jsonError'
            },
            success: {
              show: 'jsonValid',
              text: t('allJSONValid')
            }
          }}
        />
      </div>

      <input type="hidden" name="customRules" x-bind:value="JSON.stringify(rules)" />

      <script
        dangerouslySetInnerHTML={{
          __html: `
        function customRulesData() {
          return {
            mode: 'form',
            rules: [],
            jsonContent: '[]',
            jsonError: null,
            jsonValid: false,
            
            init() {
              this.$watch('rules', (value) => {
                if (this.mode === 'form') {
                  this.jsonContent = JSON.stringify(value, null, 2);
                }
              });

              this.$watch('jsonContent', (value) => {
                if (this.mode === 'json') {
                  try {
                    const parsed = JSON.parse(value);
                    if (Array.isArray(parsed)) {
                      this.rules = parsed;
                      this.jsonError = null;
                      this.jsonValid = true;
                      setTimeout(() => this.jsonValid = false, 3000);
                    } else {
                      this.jsonError = '${t('mustBeArray')}';
                    }
                  } catch (e) {
                    this.jsonError = e.message;
                  }
                }
              });

              window.addEventListener('restore-custom-rules', (event) => {
                if (event.detail && Array.isArray(event.detail.rules)) {
                  this.rules = event.detail.rules;
                  this.jsonContent = JSON.stringify(event.detail.rules, null, 2);
                  this.mode = 'json';
                }
              });
            },
            
            addRule() {
              this.rules.push({
                name: '',
                domain_suffix: '',
                domain_keyword: '',
                src_ip_cidr: '',
                ip_cidr: '',
                protocol: '',
                site: '',
                ip: '',
                outbound: ''
              });
            },
            
            removeRule(index) {
              this.rules.splice(index, 1);
            },
            
            clearAll() {
              if (!confirm('${t('confirmClearAllRules')}')) {
                return;
              }
              
              this.$dispatch('custom-rules-clear');
              setTimeout(() => {
                this.rules = [];
                this.jsonContent = '[]';
              }, 200);
            },
            
            validateJson() {
              try {
                const parsed = JSON.parse(this.jsonContent);
                if (Array.isArray(parsed)) {
                  this.rules = parsed;
                  this.jsonError = null;
                  this.jsonValid = true;
                  setTimeout(() => this.jsonValid = false, 3000);
                } else {
                  this.jsonError = '${t('mustBeArray')}';
                }
              } catch (e) {
                this.jsonError = e.message;
              }
            }
          }
        }
      `
        }}
      />
    </div>
  );
};
