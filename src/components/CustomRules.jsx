/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */

export const CustomRules = (props) => {
  const { t } = props;

  return (
    <div x-data="customRulesData()" class="space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <p class="text-sm text-[var(--muted-foreground)]">{t('customRulesSectionTooltip')}</p>
        <div class="inline-flex bg-[var(--secondary)] p-1 rounded-lg border border-[var(--border)] self-start sm:self-auto">
          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-sm font-medium transition-all"
            x-on:click={'mode = "form"'}
            x-bind:class={'mode === "form" ? "bg-[var(--card)] text-[var(--primary)] shadow-xs font-semibold" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"'}
          >
            <i class="fas fa-list text-xs"></i>
            {t('customRulesForm')}
          </button>
          <button
            type="button"
            class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-md text-sm font-medium transition-all"
            x-on:click={'mode = "json"'}
            x-bind:class={'mode === "json" ? "bg-[var(--card)] text-[var(--primary)] shadow-xs font-semibold" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"'}
          >
            <i class="fas fa-code text-xs"></i>
            {t('customRulesJSON')}
          </button>
        </div>
      </div>

      <div x-show={'mode === "form"'}>
        <template x-if="rules.length === 0">
          <div class="rounded-xl border border-dashed border-[var(--border)] bg-[var(--secondary)]/40 px-4 py-8 text-center">
            <p class="text-sm text-[var(--muted-foreground)] mb-3">{t('noCustomRulesForm')}</p>
            <button type="button" class="mm-btn mm-btn-primary mm-btn-sm text-sm" x-on:click="addRule()">
              <i class="fas fa-plus text-xs"></i>
              {t('addCustomRule')}
            </button>
          </div>
        </template>

        <div class="space-y-3">
          <template x-for="(rule, index) in rules" x-bind:key="index">
            <div class="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-xs space-y-3">
              <div class="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
                <div class="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
                  <span class="inline-flex h-5.5 w-5.5 items-center justify-center rounded bg-[var(--primary-light)] font-mono text-xs text-[var(--primary)] font-bold" x-text="index + 1"></span>
                  {t('customRule')}
                </div>
                <button type="button" class="h-7.5 w-7.5 inline-flex items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:text-red-500 hover:bg-red-500/10 transition-colors text-sm" x-on:click="removeRule(index)">
                  <i class="fas fa-trash-alt"></i>
                </button>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div class="md:col-span-2">
                  <label class="mm-label">{t('customRuleOutboundName')}</label>
                  <input type="text" x-model="rule.name" class="mm-input text-sm" placeholder="e.g., MyRule" />
                </div>
                <div>
                  <label class="mm-label">{t('customRuleDomainSuffix')}</label>
                  <input type="text" x-model="rule.domain_suffix" class="mm-input text-sm" placeholder={t('customRuleDomainSuffixPlaceholder')} />
                </div>
                <div>
                  <label class="mm-label">{t('customRuleDomainKeyword')}</label>
                  <input type="text" x-model="rule.domain_keyword" class="mm-input text-sm" placeholder={t('customRuleDomainKeywordPlaceholder')} />
                </div>
                <div>
                  <label class="mm-label">{t('customRuleSrcIPCIDR')}</label>
                  <input type="text" x-model="rule.src_ip_cidr" class="mm-input text-sm font-mono" placeholder={t('customRuleSrcIPCIDRPlaceholder')} />
                </div>
                <div>
                  <label class="mm-label">{t('customRuleIPCIDR')}</label>
                  <input type="text" x-model="rule.ip_cidr" class="mm-input text-sm font-mono" placeholder={t('customRuleIPCIDRPlaceholder')} />
                </div>
                <div>
                  <label class="mm-label">{t('customRuleProtocol')}</label>
                  <input type="text" x-model="rule.protocol" class="mm-input text-sm" placeholder={t('customRuleProtocolPlaceholder')} />
                </div>
                <div>
                  <label class="mm-label">{t('customRuleGeoSite')}</label>
                  <input type="text" x-model="rule.site" class="mm-input text-sm" placeholder={t('customRuleGeoSitePlaceholder')} />
                </div>
                <div>
                  <label class="mm-label">{t('customRuleGeoIP')}</label>
                  <input type="text" x-model="rule.ip" class="mm-input text-sm" placeholder={t('customRuleGeoIPPlaceholder')} />
                </div>
              </div>
            </div>
          </template>
        </div>

        <div class="mt-3 flex flex-wrap gap-2" x-show="rules.length > 0">
          <button type="button" class="mm-btn mm-btn-outline mm-btn-sm text-sm" x-on:click="addRule()">
            <i class="fas fa-plus text-xs"></i>
            {t('addCustomRule')}
          </button>
          <button type="button" class="mm-btn mm-btn-danger mm-btn-sm text-sm" x-on:click="clearAll()">
            <i class="fas fa-trash text-xs"></i>
            {t('clearAll')}
          </button>
        </div>
      </div>

      <div x-show={'mode === "json"'} class="space-y-3">
        <div class="flex justify-end gap-1.5">
          <button
            type="button"
            class="mm-btn mm-btn-outline mm-btn-sm text-xs"
            x-on:click="navigator.clipboard.readText().then(text => jsonContent = text).catch(() => {})"
          >
            <i class="fas fa-paste text-xs"></i>
            {t('paste')}
          </button>
          <button type="button" class="mm-btn mm-btn-outline mm-btn-sm text-xs" x-on:click={'jsonContent = "[]"'}>
            <i class="fas fa-times text-xs"></i>
            {t('clear')}
          </button>
        </div>
        <textarea
          id="customRulesJson"
          x-model="jsonContent"
          class="mm-textarea font-mono text-sm min-h-[14rem]"
          placeholder='[{"name":"MyRule","domain_suffix":"example.com"}]'
        ></textarea>
        <div class="flex flex-wrap items-center justify-between gap-2">
          <div class="text-xs">
            <span class="text-red-500 font-medium" x-show="jsonError" x-text="jsonError"></span>
            <span class="text-emerald-500 font-medium" x-show="jsonValid">{t('allJSONValid')}</span>
          </div>
          <button type="button" class="mm-btn mm-btn-secondary mm-btn-sm text-xs" x-on:click="validateJson()">
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

