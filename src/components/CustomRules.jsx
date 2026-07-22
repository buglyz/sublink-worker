/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */

export const CustomRules = (props) => {
  const { t } = props;

  return (
    <div x-data="customRulesData()" class="mm-card p-4 sm:p-5">
      <div class="mm-section-head">
        <div class="flex items-start gap-3">
          <span class="icon"><i class="fas fa-stream text-sm"></i></span>
          <div>
            <div class="mm-title">{t('customRulesSection')}</div>
            <p class="mm-desc mt-0.5">{t('customRulesSectionTooltip')}</p>
          </div>
        </div>
        <div class="mm-tab-bar">
          <button
            type="button"
            class="mm-tab"
            x-on:click="mode = 'form'"
            x-bind:class="mode === 'form' ? 'is-active' : ''"
          >
            <i class="fas fa-list text-[10px]"></i>
            {t('customRulesForm')}
          </button>
          <button
            type="button"
            class="mm-tab"
            x-on:click="mode = 'json'"
            x-bind:class="mode === 'json' ? 'is-active' : ''"
          >
            <i class="fas fa-code text-[10px]"></i>
            {t('customRulesJSON')}
          </button>
        </div>
      </div>

      <div x-show="mode === 'form'">
        <template x-if="rules.length === 0">
          <div class="rounded-[var(--radius)] border border-dashed border-[var(--border)] bg-[color-mix(in_srgb,var(--muted)_40%,transparent)] px-4 py-10 text-center">
            <p class="mm-desc mb-4">{t('noCustomRulesForm')}</p>
            <button type="button" class="mm-btn mm-btn-primary" x-on:click="addRule()">
              <i class="fas fa-plus text-xs"></i>
              {t('addCustomRule')}
            </button>
          </div>
        </template>

        <div class="space-y-3">
          <template x-for="(rule, index) in rules" x-bind:key="index">
            <div class="rounded-[var(--radius)] border border-[var(--border)] bg-[color-mix(in_srgb,var(--muted)_25%,transparent)] p-3.5">
              <div class="mb-3 flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                <div class="flex items-center gap-2 text-sm font-medium">
                  <span class="inline-flex h-6 w-6 items-center justify-center rounded-md bg-[color-mix(in_srgb,var(--primary)_14%,transparent)] font-mono text-xs text-[var(--primary)]" x-text="index + 1"></span>
                  {t('customRule')}
                </div>
                <button type="button" class="mm-btn mm-btn-danger mm-btn-icon" x-on:click="removeRule(index)">
                  <i class="fas fa-trash-alt text-xs"></i>
                </button>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div class="md:col-span-2">
                  <label class="mm-label">{t('customRuleOutboundName')}</label>
                  <input type="text" x-model="rule.name" class="mm-input" placeholder="e.g., MyRule" />
                </div>
                <div>
                  <label class="mm-label">{t('customRuleDomainSuffix')}</label>
                  <input type="text" x-model="rule.domain_suffix" class="mm-input" placeholder={t('customRuleDomainSuffixPlaceholder')} />
                </div>
                <div>
                  <label class="mm-label">{t('customRuleDomainKeyword')}</label>
                  <input type="text" x-model="rule.domain_keyword" class="mm-input" placeholder={t('customRuleDomainKeywordPlaceholder')} />
                </div>
                <div>
                  <label class="mm-label">{t('customRuleSrcIPCIDR')}</label>
                  <input type="text" x-model="rule.src_ip_cidr" class="mm-input" placeholder={t('customRuleSrcIPCIDRPlaceholder')} />
                </div>
                <div>
                  <label class="mm-label">{t('customRuleIPCIDR')}</label>
                  <input type="text" x-model="rule.ip_cidr" class="mm-input" placeholder={t('customRuleIPCIDRPlaceholder')} />
                </div>
                <div>
                  <label class="mm-label">{t('customRuleProtocol')}</label>
                  <input type="text" x-model="rule.protocol" class="mm-input" placeholder={t('customRuleProtocolPlaceholder')} />
                </div>
                <div>
                  <label class="mm-label">{t('customRuleGeoSite')}</label>
                  <input type="text" x-model="rule.site" class="mm-input" placeholder={t('customRuleGeoSitePlaceholder')} />
                </div>
                <div>
                  <label class="mm-label">{t('customRuleGeoIP')}</label>
                  <input type="text" x-model="rule.ip" class="mm-input" placeholder={t('customRuleGeoIPPlaceholder')} />
                </div>
              </div>
            </div>
          </template>
        </div>

        <div class="mt-3 flex flex-wrap gap-2">
          <button type="button" class="mm-btn mm-btn-secondary" x-on:click="addRule()">
            <i class="fas fa-plus text-xs"></i>
            {t('addCustomRule')}
          </button>
          <button type="button" class="mm-btn mm-btn-danger" x-show="rules.length > 0" x-on:click="clearAll()">
            <i class="fas fa-trash text-xs"></i>
            {t('clearAll')}
          </button>
        </div>
      </div>

      <div x-show="mode === 'json'" class="space-y-3">
        <div class="flex justify-end gap-1.5">
          <button
            type="button"
            class="mm-btn mm-btn-ghost text-xs"
            x-on:click="navigator.clipboard.readText().then(text => jsonContent = text).catch(() => {})"
          >
            <i class="fas fa-paste"></i>
            {t('paste')}
          </button>
          <button type="button" class="mm-btn mm-btn-ghost text-xs" x-on:click="jsonContent = '[]'">
            <i class="fas fa-times"></i>
            {t('clear')}
          </button>
        </div>
        <textarea
          id="customRulesJson"
          x-model="jsonContent"
          class="mm-textarea font-mono text-[13px] min-h-[16rem]"
          placeholder='[{"name":"MyRule","domain_suffix":"example.com"}]'
        ></textarea>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="text-xs">
            <span class="text-red-500" x-show="jsonError" x-text="jsonError"></span>
            <span class="text-emerald-600" x-show="jsonValid">{t('allJSONValid')}</span>
          </div>
          <button type="button" class="mm-btn mm-btn-secondary text-sm" x-on:click="validateJson()">
            {t('validateJSON')}
          </button>
        </div>
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
                if (this.mode === 'form') this.jsonContent = JSON.stringify(value, null, 2);
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
                name: '', domain_suffix: '', domain_keyword: '',
                src_ip_cidr: '', ip_cidr: '', protocol: '', site: '', ip: '', outbound: ''
              });
            },
            removeRule(index) { this.rules.splice(index, 1); },
            clearAll() {
              if (!confirm('${t('confirmClearAllRules')}')) return;
              this.rules = [];
              this.jsonContent = '[]';
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
