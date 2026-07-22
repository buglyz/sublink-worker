export const formLogicFn = (t) => {
    window.formData = function () {
        // Inline parseSurgeConfigInput to make it available in toString()
        const parseSurgeValue = (rawValue = '') => {
            const trimmed = rawValue.trim();
            if (trimmed === '') return '';
            const unquoted = trimmed.replace(/^"(.*)"$/, '$1');
            const lower = unquoted.toLowerCase();
            if (lower === 'true') return true;
            if (lower === 'false') return false;
            if (/^-?\d+(\.\d+)?$/.test(unquoted)) return Number(unquoted);
            return unquoted;
        };

        const convertSurgeIniToJson = (content) => {
            const lines = content.split(/\r?\n/);
            const config = {};
            let currentSection = null;
            const ensureObject = (key) => {
                if (!config[key]) config[key] = {};
                return config[key];
            };
            const ensureArray = (key) => {
                if (!config[key]) config[key] = [];
                return config[key];
            };
            for (const rawLine of lines) {
                const line = rawLine.trim();
                if (!line || line.startsWith(';') || line.startsWith('#')) continue;
                const sectionMatch = line.match(/^\[(.+)]$/);
                if (sectionMatch) {
                    currentSection = sectionMatch[1].trim();
                    continue;
                }
                if (!currentSection) continue;
                const sectionName = currentSection.toLowerCase();
                if (sectionName === 'general' || sectionName === 'replica') {
                    const equalsIndex = line.indexOf('=');
                    if (equalsIndex === -1) continue;
                    const key = line.slice(0, equalsIndex).trim();
                    const value = line.slice(equalsIndex + 1).trim();
                    if (!key) continue;
                    const target = ensureObject(sectionName);
                    target[key] = parseSurgeValue(value);
                } else if (sectionName === 'proxy') {
                    ensureArray('proxies').push(line);
                } else if (sectionName === 'proxy group') {
                    ensureArray('proxy-groups').push(line);
                } else if (sectionName === 'rule') {
                    ensureArray('rules').push(line);
                } else {
                    ensureArray(sectionName).push(line);
                }
            }
            if (!config.general && !config.replica && !config.proxies && !config['proxy-groups']) {
                throw new Error('Unable to parse Surge INI content');
            }
            return config;
        };

        const parseSurgeConfigInput = (content) => {
            const trimmed = content.trim();
            if (!trimmed) throw new Error('Config content is empty');
            try {
                return { configObject: JSON.parse(trimmed), convertedFromIni: false };
            } catch {
                const converted = convertSurgeIniToJson(content);
                return { configObject: converted, convertedFromIni: true };
            }
        };

        return {
            input: '',
            showAdvanced: false,
            // Accordion: main convert path always open; advanced groups collapsed by default
            accordionSections: {
                template: true,     // Clash 模板
                rules: false,       // 规则选择
                customRules: false, // 自定义规则
                general: false,     // 通用设置
                advanced: false,    // 进阶：Subconverter / Base / UA
                baseConfig: false,
                ua: false
            },
            selectedRules: [],
            selectedPredefinedRule: 'balanced',
            selectedTemplate: '',
            // 'custom' | 'template' — UI mode for rule section (miaomiaowu-style)
            ruleMode: 'custom',
            subconverterCopied: false,
            groupByCountry: false,
            includeAutoSelect: true,
            enableClashUI: false,
            externalController: '',
            externalUiDownloadUrl: '',
            configType: 'singbox',
            configEditor: '',
            savingConfig: false,
            currentConfigId: '',
            saveConfigText: '',
            savingConfigText: '',
            configContentRequiredText: '',
            configSaveFailedText: '',
            configValidationState: '',
            configValidationMessage: '',
            customUA: '',
            loading: false,
            generatedLinks: null,
            shortenedLinks: null,
            shortening: false,
            customShortCode: '',
            parsingUrl: false,
            parseDebounceTimer: null,
            parsePreview: null,
            parseMessage: '',
            // These will be populated from window.APP_TRANSLATIONS
            processingText: '',
            convertText: '',
            shortenLinksText: '',
            shorteningText: '',
            showFullLinksText: '',

            init() {
                // Load translations
                if (window.APP_TRANSLATIONS) {
                    this.processingText = window.APP_TRANSLATIONS.processing;
                    this.convertText = window.APP_TRANSLATIONS.convert;
                    this.shortenLinksText = window.APP_TRANSLATIONS.shortenLinks;
                    this.shorteningText = window.APP_TRANSLATIONS.shortening;
                    this.showFullLinksText = window.APP_TRANSLATIONS.showFullLinks;
                    this.saveConfigText = window.APP_TRANSLATIONS.saveConfig;
                    this.savingConfigText = window.APP_TRANSLATIONS.savingConfig;
                    this.configContentRequiredText = window.APP_TRANSLATIONS.configContentRequired;
                    this.configSaveFailedText = window.APP_TRANSLATIONS.configSaveFailed;
                }

                // Load saved data
                this.input = localStorage.getItem('inputTextarea') || '';
                this.showAdvanced = localStorage.getItem('advancedToggle') === 'true';
                this.groupByCountry = localStorage.getItem('groupByCountry') === 'true';
                this.includeAutoSelect = localStorage.getItem('includeAutoSelect') !== 'false';
                this.enableClashUI = localStorage.getItem('enableClashUI') === 'true';
                this.externalController = localStorage.getItem('externalController') || '';
                this.externalUiDownloadUrl = localStorage.getItem('externalUiDownloadUrl') || '';
                this.customUA = localStorage.getItem('userAgent') || '';
                this.configEditor = localStorage.getItem('configEditor') || '';
                this.configType = localStorage.getItem('configType') || 'singbox';
                this.customShortCode = localStorage.getItem('customShortCode') || '';
                this.selectedTemplate = localStorage.getItem('selectedTemplate') || '';
                this.ruleMode = localStorage.getItem('ruleMode') === 'template' || this.selectedTemplate
                    ? 'template'
                    : 'custom';
                const initialUrlParams = new URLSearchParams(window.location.search);
                this.currentConfigId = initialUrlParams.get('configId') || '';

                // Load accordion states (merge so new keys get defaults)
                const savedAccordion = localStorage.getItem('accordionSections');
                if (savedAccordion) {
                    try {
                        this.accordionSections = { ...this.accordionSections, ...JSON.parse(savedAccordion) };
                    } catch (e) {
                        // keep defaults
                    }
                }

                // Initialize rules
                this.applyPredefinedRule();

                // Watchers to save state
                this.$watch('input', val => {
                    localStorage.setItem('inputTextarea', val);
                    this.handleInputChange(val);
                });
                this.$watch('showAdvanced', val => localStorage.setItem('advancedToggle', val));
                this.$watch('groupByCountry', val => localStorage.setItem('groupByCountry', val));
                this.$watch('includeAutoSelect', val => localStorage.setItem('includeAutoSelect', val));
                this.$watch('enableClashUI', val => localStorage.setItem('enableClashUI', val));
                this.$watch('externalController', val => localStorage.setItem('externalController', val));
                this.$watch('externalUiDownloadUrl', val => localStorage.setItem('externalUiDownloadUrl', val));
                this.$watch('customUA', val => localStorage.setItem('userAgent', val));
                this.$watch('selectedTemplate', val => {
                    localStorage.setItem('selectedTemplate', val || '');
                    if (val) this.ruleMode = 'template';
                });
                this.$watch('ruleMode', val => localStorage.setItem('ruleMode', val || 'custom'));
                this.$watch('configEditor', val => {
                    localStorage.setItem('configEditor', val);
                    this.resetConfigValidation();
                });
                this.$watch('configType', val => {
                    localStorage.setItem('configType', val);
                    this.resetConfigValidation();
                });
                this.$watch('customShortCode', val => localStorage.setItem('customShortCode', val));
                this.$watch('accordionSections', val => localStorage.setItem('accordionSections', JSON.stringify(val)), { deep: true });
            },

            toggleAccordion(section) {
                this.accordionSections[section] = !this.accordionSections[section];
            },

            setRuleMode(mode) {
                this.ruleMode = mode === 'template' ? 'template' : 'custom';
                if (this.ruleMode === 'custom') {
                    // Leave template selection empty so convert uses selectedRules
                    this.selectedTemplate = '';
                    this.accordionSections.template = false;
                    this.accordionSections.rules = true;
                } else {
                    this.accordionSections.template = true;
                    this.accordionSections.rules = false;
                }
            },

            applyPredefinedRule() {
                if (this.selectedPredefinedRule === 'custom') return;

                // PREDEFINED_RULE_SETS will be injected globally
                const rules = window.PREDEFINED_RULE_SETS;
                if (rules && rules[this.selectedPredefinedRule]) {
                    this.selectedRules = rules[this.selectedPredefinedRule];
                }
            },

            templateLabel() {
                if (!this.selectedTemplate) return '';
                const list = window.RULE_TEMPLATES || [];
                const found = list.find((t) => t.id === this.selectedTemplate);
                return found ? found.label : this.selectedTemplate;
            },

            getSubconverterUrl() {
                const origin = window.location.origin;
                const params = new URLSearchParams();

                // Use preset name directly if a predefined rule set is selected
                if (this.selectedPredefinedRule && this.selectedPredefinedRule !== 'custom') {
                    params.append('selectedRules', this.selectedPredefinedRule);
                } else if (this.selectedPredefinedRule === 'custom') {
                    params.append('selectedRules', JSON.stringify(this.selectedRules));
                }

                // Include customRules when available (best-effort; may make URL long)
                try {
                    const customRulesInput = document.querySelector('input[name="customRules"]');
                    const customRules = customRulesInput && customRulesInput.value ? JSON.parse(customRulesInput.value) : [];
                    if (Array.isArray(customRules) && customRules.length > 0) {
                        params.append('customRules', JSON.stringify(customRules));
                    }
                } catch { }

                if (!this.includeAutoSelect) {
                    params.append('include_auto_select', 'false');
                }

                if (this.groupByCountry) {
                    params.append('group_by_country', 'true');
                }

                // Include lang parameter so subconverter gets correct group names
                const appLang = window.APP_LANG || 'zh-CN';
                if (appLang !== 'zh-CN') {
                    params.append('lang', appLang);
                }

                const queryString = params.toString();
                return origin + '/subconverter' + (queryString ? '?' + queryString : '');
            },

            copySubconverterUrl() {
                const url = this.getSubconverterUrl();
                navigator.clipboard.writeText(url).then(() => {
                    this.subconverterCopied = true;
                    setTimeout(() => this.subconverterCopied = false, 2000);
                }).catch(() => {});
            },

            resetConfigValidation() {
                this.configValidationState = '';
                this.configValidationMessage = '';
            },

            async saveBaseConfig() {
                const content = (this.configEditor || '').trim();
                if (!content) {
                    alert(this.configContentRequiredText || window.APP_TRANSLATIONS.configContentRequired);
                    return;
                }

                let payloadContent = this.configEditor;
                if (this.configType === 'surge') {
                    try {
                        const { configObject } = parseSurgeConfigInput(this.configEditor);
                        payloadContent = JSON.stringify(configObject);
                    } catch (parseError) {
                        const prefix = window.APP_TRANSLATIONS.configValidationError || 'Config validation error:';
                        alert(`${prefix} ${parseError?.message || ''}`.trim());
                        return;
                    }
                }

                this.savingConfig = true;
                try {
                    const response = await fetch('/config', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify({
                            type: this.configType,
                            content: payloadContent
                        })
                    });
                    const responseText = await response.text();
                    if (!response.ok) {
                        throw new Error(responseText || response.statusText || 'Request failed');
                    }
                    const configId = responseText.trim();
                    if (!configId) {
                        throw new Error('Missing config ID');
                    }
                    this.currentConfigId = configId;
                    this.updateConfigIdInUrl(configId);

                    const successMessage = window.APP_TRANSLATIONS.saveConfigSuccess || 'Configuration saved successfully!';
                    alert(`${successMessage}\nID: ${configId}`);
                } catch (error) {
                    console.error('Failed to save base config:', error);
                    const errorPrefix = this.configSaveFailedText || window.APP_TRANSLATIONS.configSaveFailed || 'Failed to save configuration';
                    alert(`${errorPrefix}: ${error?.message || 'Unknown error'}`);
                } finally {
                    this.savingConfig = false;
                }
            },

            validateBaseConfig() {
                const content = (this.configEditor || '').trim();
                if (!content) {
                    this.configValidationState = 'error';
                    this.configValidationMessage = this.configContentRequiredText || window.APP_TRANSLATIONS.configContentRequired;
                    return;
                }

                try {
                    if (this.configType === 'clash') {
                        if (!window.jsyaml || !window.jsyaml.load) {
                            throw new Error(window.APP_TRANSLATIONS.parserUnavailable || 'Parser unavailable. Please refresh and try again.');
                        }
                        window.jsyaml.load(content);
                        this.configValidationState = 'success';
                        this.configValidationMessage =
                            window.APP_TRANSLATIONS.validYamlConfig || 'YAML config is valid';
                    } else if (this.configType === 'surge') {
                        parseSurgeConfigInput(this.configEditor);
                        this.configValidationState = 'success';
                        this.configValidationMessage =
                            window.APP_TRANSLATIONS.validJsonConfig || 'JSON config is valid';
                    } else {
                        JSON.parse(content);
                        this.configValidationState = 'success';
                        this.configValidationMessage =
                            window.APP_TRANSLATIONS.validJsonConfig || 'JSON config is valid';
                    }
                } catch (error) {
                    this.configValidationState = 'error';
                    const prefix = window.APP_TRANSLATIONS.configValidationError || 'Config validation error: ';
                    this.configValidationMessage = `${prefix}${error?.message || ''}`;
                }
            },

            clearBaseConfig() {
                if (confirm(window.APP_TRANSLATIONS.confirmClearConfig)) {
                    this.configEditor = '';
                    localStorage.removeItem('configEditor');
                    this.currentConfigId = '';
                    this.updateConfigIdInUrl(null);
                }
            },

            generateWithPicker() {
                try {
                    const picker = document.querySelector('[x-data*="nodePickerData"]');
                    const pd = picker && picker._x_dataStack && picker._x_dataStack[0];
                    if (pd) {
                        const count = (pd.nodes || []).filter((n) => n.picked && n.enabled !== false).length;
                        if (count > 0) {
                            pd.generateFromSelection();
                            return;
                        }
                    }
                } catch (e) {
                    console.error(e);
                }
                if (!String(this.input || '').trim()) {
                    alert('请先在节点列表勾选节点，或到节点管理添加节点');
                    return;
                }
                this.submitForm();
            },

            clearAll() {
                if (confirm(window.APP_TRANSLATIONS.confirmClearAll)) {
                    this.input = '';
                    this.generatedLinks = null;
                    this.shortenedLinks = null;
                    this.customShortCode = '';
                    this.parsePreview = null;
                    this.parseMessage = '';
                    // Also clear from localStorage
                    localStorage.removeItem('customShortCode');
                }
            },

            // Count share lines / subscription URLs (miaomiaowu-style "解析节点")
            parseNodes() {
                const text = String(this.input || '').trim();
                if (!text) {
                    this.parsePreview = null;
                    this.parseMessage = '请先粘贴节点链接或订阅地址';
                    return;
                }
                const lines = text.split(/[\r\n]+/).map((l) => l.trim()).filter(Boolean);
                const protocols = {};
                let linkCount = 0;
                let subCount = 0;
                for (const line of lines) {
                    if (/^https?:\/\//i.test(line)) {
                        subCount += 1;
                        continue;
                    }
                    const m = line.match(/^([a-z0-9+.-]+):\/\//i);
                    if (m) {
                        linkCount += 1;
                        const p = m[1].toLowerCase();
                        protocols[p] = (protocols[p] || 0) + 1;
                    } else if (line.length > 20) {
                        // possible base64 blob
                        linkCount += 1;
                        protocols['base64/raw'] = (protocols['base64/raw'] || 0) + 1;
                    }
                }
                this.parsePreview = { lines: lines.length, linkCount, subCount, protocols };
                const parts = [];
                if (linkCount) parts.push(`${linkCount} 条节点链接`);
                if (subCount) parts.push(`${subCount} 个订阅 URL`);
                if (!parts.length) parts.push('未识别到有效节点/订阅');
                const protoText = Object.keys(protocols).length
                    ? '（' + Object.entries(protocols).map(([k, v]) => `${k}:${v}`).join(' · ') + '）'
                    : '';
                this.parseMessage = `解析完成：共 ${lines.length} 行 · ${parts.join(' · ')}${protoText}`;
            },

            // Save current input into node library (miaomiaowu-style "保存节点")
            saveNodes() {
                const text = String(this.input || '').trim();
                if (!text) {
                    this.parseMessage = '没有可保存的内容';
                    return;
                }
                this.parseNodes();
                window.dispatchEvent(new CustomEvent('nodes-import-from-input'));
                try { window.__SUBLINK_UI__.setPage('nodes'); } catch (e) {}
                this.parseMessage = (this.parseMessage ? this.parseMessage + ' · ' : '') + '已发送到节点库（需登录后持久化）';
            },

            updateConfigIdInUrl(configId) {
                const url = new URL(window.location.href);
                if (configId) {
                    url.searchParams.set('configId', configId);
                } else {
                    url.searchParams.delete('configId');
                }
                window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
            },

            async submitForm() {
                this.loading = true;
                this.shortenedLinks = null; // Reset shortened links when generating new links
                try {
                    // Get custom rules from the child component via the hidden input
                    const customRulesInput = document.querySelector('input[name="customRules"]');
                    const customRules = customRulesInput && customRulesInput.value ? JSON.parse(customRulesInput.value) : [];

                    // Construct URLs
                    const origin = window.location.origin;
                    const params = new URLSearchParams();
                    params.append('config', this.input);
                    params.append('ua', this.customUA);

                    // Clash V3 template path only affects /clash; other formats keep selectedRules.
                    if (!this.selectedTemplate) {
                        params.append('selectedRules', JSON.stringify(this.selectedRules));
                        params.append('customRules', JSON.stringify(customRules));
                    }

                    if (this.groupByCountry) params.append('group_by_country', 'true');
                    if (!this.includeAutoSelect) params.append('include_auto_select', 'false');
                    if (this.enableClashUI) params.append('enable_clash_ui', 'true');
                    if (this.externalController) params.append('external_controller', this.externalController);
                    if (this.externalUiDownloadUrl) params.append('external_ui_download_url', this.externalUiDownloadUrl);

                    // Add configId if present in URL
                    const urlParams = new URLSearchParams(window.location.search);
                    const configId = this.currentConfigId || urlParams.get('configId');
                    if (configId) {
                        params.append('configId', configId);
                    }

                    const queryString = params.toString();
                    const clashParams = new URLSearchParams(params);
                    if (this.selectedTemplate) {
                        clashParams.set('template', this.selectedTemplate);
                        clashParams.delete('selectedRules');
                        clashParams.delete('customRules');
                        clashParams.delete('group_by_country');
                        clashParams.delete('include_auto_select');
                        clashParams.delete('enable_clash_ui');
                        clashParams.delete('external_controller');
                        clashParams.delete('external_ui_download_url');
                        clashParams.delete('configId');
                    }

                    this.generatedLinks = {
                        xray: origin + '/xray?' + queryString,
                        singbox: origin + '/singbox?' + queryString,
                        clash: origin + '/clash?' + clashParams.toString(),
                        surge: origin + '/surge?' + queryString
                    };

                    // Persist template/rules so default /sub Clash export matches UI selection
                    try {
                        const token = localStorage.getItem('sublink_auth_token') || '';
                        if (token) {
                            const prefs = {
                                mode: this.ruleMode === 'template' && this.selectedTemplate ? 'template' : 'custom',
                                template: this.ruleMode === 'template' ? (this.selectedTemplate || '') : '',
                                selectedRules: this.selectedPredefinedRule && this.selectedPredefinedRule !== 'custom'
                                    ? this.selectedPredefinedRule
                                    : this.selectedRules,
                                customRules,
                                groupByCountry: !!this.groupByCountry,
                                includeAutoSelect: this.includeAutoSelect !== false,
                                ua: this.customUA || ''
                            };
                            await fetch('/api/export-prefs', {
                                method: 'PUT',
                                headers: {
                                    'Content-Type': 'application/json',
                                    Authorization: 'Bearer ' + token
                                },
                                body: JSON.stringify({ prefs })
                            });
                        }
                    } catch (e) {
                        console.warn('save export prefs failed', e);
                    }

                    // Ensure export token ready, then go to subscribe page
                    try {
                        if (window.Alpine && Alpine.store('auth') && typeof Alpine.store('auth').ensureExportToken === 'function') {
                            await Alpine.store('auth').ensureExportToken();
                        }
                    } catch (e) {}
                    try {
                        if (window.__SUBLINK_UI__) window.__SUBLINK_UI__.setPage('subscribe');
                    } catch (e) {}
                    setTimeout(() => {
                        const resultsDiv = document.getElementById('results') || document.querySelector('[data-sub-results]');
                        if (resultsDiv) resultsDiv.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    }, 120);

                } catch (error) {
                    console.error('Error generating links:', error);
                    alert(window.APP_TRANSLATIONS.errorGeneratingLinks);
                } finally {
                    this.loading = false;
                }
            },

            async shortenLinks() {
                // Check if links are already shortened
                if (this.shortenedLinks) {
                    alert(window.APP_TRANSLATIONS.alreadyShortened);
                    return;
                }

                if (!this.generatedLinks) {
                    return;
                }

                this.shortening = true;
                try {
                    const origin = window.location.origin;
                    const shortened = {};

                    // Use custom short code if provided, otherwise let backend generate it once
                    let shortCode = this.customShortCode.trim();
                    let isFirstRequest = true;

                    // Shorten each link type
                    for (const [type, url] of Object.entries(this.generatedLinks)) {
                        try {
                            let apiUrl = `${origin}/shorten-v2?url=${encodeURIComponent(url)}`;

                            // For the first request, either use custom code or let backend generate
                            // For subsequent requests, use the code from first request
                            if (shortCode) {
                                apiUrl += `&shortCode=${encodeURIComponent(shortCode)}`;
                            }

                            const response = await fetch(apiUrl);
                            if (!response.ok) {
                                throw new Error(`Failed to shorten ${type} link`);
                            }
                            const returnedCode = await response.text();

                            // If this is the first request and no custom code was provided,
                            // use the backend-generated code for all subsequent requests
                            if (isFirstRequest && !shortCode) {
                                shortCode = returnedCode;
                            }
                            isFirstRequest = false;

                            // Map types to their corresponding path prefixes
                            const prefixMap = {
                                xray: 'x',
                                singbox: 'b',
                                clash: 'c',
                                surge: 's'
                            };

                            shortened[type] = `${origin}/${prefixMap[type]}/${returnedCode}`;
                        } catch (error) {
                            console.error(`Error shortening ${type} link:`, error);
                            throw error;
                        }
                    }

                    this.shortenedLinks = shortened;
                } catch (error) {
                    console.error('Error shortening links:', error);
                    alert(window.APP_TRANSLATIONS.shortenFailed);
                } finally {
                    this.shortening = false;
                }
            },

            // Handle input change with debounce
            handleInputChange(val) {
                // Clear previous timer
                if (this.parseDebounceTimer) {
                    clearTimeout(this.parseDebounceTimer);
                }

                // If input is empty, don't try to parse
                if (!val || !val.trim()) {
                    return;
                }

                // Debounce for 500ms
                this.parseDebounceTimer = setTimeout(() => {
                    this.tryParseSubscriptionUrl(val.trim());
                }, 500);
            },

            // Check if input looks like a subscription URL
            isSubscriptionUrl(text) {
                // Check if it's a single line URL (not multiple lines)
                if (text.includes('\n')) {
                    return false;
                }

                try {
                    const url = new URL(text);
                    // Check if it matches our short link pattern: /[bcxs]/[code]
                    const pathMatch = url.pathname.match(/^\/([bcxs])\/([a-zA-Z0-9_-]+)$/);
                    if (pathMatch) {
                        return true;
                    }

                    // Check if it's a full subscription URL with query params
                    const fullMatch = url.pathname.match(/^\/(singbox|clash|xray|surge)$/);
                    if (fullMatch && url.search) {
                        return true;
                    }

                    return false;
                } catch {
                    return false;
                }
            },

            // Try to parse subscription URL
            async tryParseSubscriptionUrl(text) {
                if (!this.isSubscriptionUrl(text)) {
                    return;
                }

                this.parsingUrl = true;
                try {
                    let urlToParse;

                    try {
                        urlToParse = new URL(text);
                    } catch {
                        return;
                    }

                    // Check if it's a short link
                    const shortMatch = urlToParse.pathname.match(/^\/([bcxs])\/([a-zA-Z0-9_-]+)$/);

                    if (shortMatch) {
                        // It's a short link, resolve it first
                        const response = await fetch(`/resolve?url=${encodeURIComponent(text)}`);
                        if (!response.ok) {
                            console.warn('Failed to resolve short URL');
                            return;
                        }

                        const data = await response.json();
                        if (!data.originalUrl) {
                            console.warn('No original URL returned');
                            return;
                        }

                        urlToParse = new URL(data.originalUrl);
                    }

                    // Now parse the full URL and populate form
                    this.populateFormFromUrl(urlToParse);

                    // Show a success message
                    const message = window.APP_TRANSLATIONS?.urlParsedSuccess || '已成功解析订阅链接配置';
                    console.log(message);

                } catch (error) {
                    console.error('Error parsing subscription URL:', error);
                } finally {
                    this.parsingUrl = false;
                }
            },

            // Populate form fields from parsed URL
            populateFormFromUrl(url) {
                const params = new URLSearchParams(url.search);

                // Extract config (the original subscription URLs)
                const config = params.get('config');
                if (config) {
                    this.input = config;
                }

                // Extract Clash V3 template
                const template = params.get('template') || params.get('rule_template');
                if (template) {
                    this.selectedTemplate = template;
                }

                // Extract selectedRules
                const selectedRules = params.get('selectedRules');
                if (selectedRules) {
                    try {
                        const parsed = JSON.parse(selectedRules);
                        if (Array.isArray(parsed)) {
                            this.selectedRules = parsed;
                            this.selectedPredefinedRule = 'custom';
                        }
                    } catch (e) {
                        console.warn('Failed to parse selectedRules:', e);
                    }
                }

                // Extract customRules
                const customRules = params.get('customRules');
                if (customRules) {
                    try {
                        const parsed = JSON.parse(customRules);
                        if (Array.isArray(parsed) && parsed.length > 0) {
                            // Dispatch custom event for CustomRules component to listen
                            window.dispatchEvent(new CustomEvent('restore-custom-rules', {
                                detail: { rules: parsed }
                            }));
                        }
                    } catch (e) {
                        console.warn('Failed to parse customRules:', e);
                    }
                }

                // Extract other parameters
                this.groupByCountry = params.get('group_by_country') === 'true';
                this.includeAutoSelect = params.get('include_auto_select') !== 'false';
                this.enableClashUI = params.get('enable_clash_ui') === 'true';

                const externalController = params.get('external_controller');
                if (externalController) {
                    this.externalController = externalController;
                }

                const externalUiDownloadUrl = params.get('external_ui_download_url');
                if (externalUiDownloadUrl) {
                    this.externalUiDownloadUrl = externalUiDownloadUrl;
                }

                const ua = params.get('ua');
                if (ua) {
                    this.customUA = ua;
                }

                const configId = params.get('configId');
                if (configId) {
                    this.currentConfigId = configId;
                    this.updateConfigIdInUrl(configId);
                }

                // Expand advanced options if any advanced settings are present
                if (selectedRules || customRules || template || this.groupByCountry || this.enableClashUI ||
                    externalController || externalUiDownloadUrl || ua || configId) {
                    this.showAdvanced = true;
                }
            }
        }
    }
};
