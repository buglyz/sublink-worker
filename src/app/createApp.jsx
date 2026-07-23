/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */
import { Hono } from 'hono';
import { Layout } from '../components/Layout.jsx';
import { Navbar } from '../components/Navbar.jsx';
import { Form } from '../components/Form.jsx';
import { Footer } from '../components/Footer.jsx';
import { UpdateChecker } from '../components/UpdateChecker.jsx';
import { AuthGate } from '../components/AuthGate.jsx';
import { SingboxConfigBuilder } from '../builders/SingboxConfigBuilder.js';
import { ClashConfigBuilder } from '../builders/ClashConfigBuilder.js';
import { TemplateClashBuilder, listTemplates, listTemplateDetails } from '../builders/TemplateClashBuilder.js';
import { SurgeConfigBuilder } from '../builders/SurgeConfigBuilder.js';
import { createTranslator, resolveLanguage } from '../i18n/index.js';
import { encodeBase64 } from '../utils.js';
import { APP_NAME, APP_SUBTITLE } from '../constants.js';
import { ShortLinkService } from '../services/shortLinkService.js';
import { ConfigStorageService } from '../services/configStorageService.js';
import { AuthService } from '../services/authService.js';
import { NodeStorageService } from '../services/nodeStorageService.js';
import { ExportTokenService } from '../services/exportTokenService.js';
import { NodeImportService } from '../services/nodeImportService.js';
import { SubscriptionStorageService } from '../services/subscriptionStorageService.js';
import { resolveXraySubscriptionLines } from '../services/xraySubscriptionService.js';
import { ServiceError, MissingDependencyError, UnauthorizedError, InvalidPayloadError } from '../services/errors.js';
import { normalizeRuntime } from '../runtime/runtimeConfig.js';
import { PREDEFINED_RULE_SETS, SING_BOX_CONFIG, SING_BOX_CONFIG_V1_11, generateSubconverterConfig } from '../config/index.js';

const DEFAULT_USER_AGENT = 'curl/7.74.0';

export function createApp(bindings = {}) {
    const runtime = normalizeRuntime(bindings);
    const env = bindings.env || bindings.processEnv || {};
    const authPassword = bindings.authPassword || env.AUTH_PASSWORD || env.SUBLINK_PASSWORD || '';
    const services = {
        shortLinks: runtime.kv ? new ShortLinkService(runtime.kv, { shortLinkTtlSeconds: runtime.config.shortLinkTtlSeconds }) : null,
        configStorage: runtime.kv ? new ConfigStorageService(runtime.kv, { configTtlSeconds: runtime.config.configTtlSeconds }) : null,
        auth: new AuthService(runtime.kv, { password: authPassword }),
        nodes: runtime.kv ? new NodeStorageService(runtime.kv, bindings.storageCoordinator || runtime.storageCoordinator) : null,
        exportToken: runtime.kv ? new ExportTokenService(runtime.kv) : null,
        nodeImport: runtime.kv ? new NodeImportService(new NodeStorageService(runtime.kv, bindings.storageCoordinator || runtime.storageCoordinator)) : null,
        subscriptions: runtime.kv ? new SubscriptionStorageService(runtime.kv, bindings.storageCoordinator || runtime.storageCoordinator) : null
    };

    const app = new Hono();

    app.use('*', async (c, next) => {
        const acceptLanguage = getRequestHeader(c.req, 'Accept-Language');
        const lang = c.req.query('lang') || acceptLanguage?.split(',')[0] || 'zh-CN';
        c.set('lang', lang);
        c.set('t', createTranslator(lang));
        await next();
    });

    app.get('/api/auth/status', (c) => {
        return c.json({
            authRequired: services.auth.isEnabled(),
            kvReady: Boolean(runtime.kv)
        });
    });

    app.post('/api/auth/login', async (c) => {
        try {
            const body = await c.req.json().catch(() => ({}));
            const result = await services.auth.login(body.password || '');
            return c.json(result);
        } catch (error) {
            return handleError(c, error, runtime.logger);
        }
    });

    app.post('/api/auth/logout', async (c) => {
        try {
            const token = extractBearerToken(c);
            await services.auth.logout(token);
            return c.json({ ok: true });
        } catch (error) {
            return handleError(c, error, runtime.logger);
        }
    });

    app.get('/api/auth/me', async (c) => {
        try {
            if (!services.auth.isEnabled()) {
                return c.json({ authenticated: true, authRequired: false });
            }
            const token = extractBearerToken(c);
            const ok = await services.auth.validateToken(token);
            if (!ok) throw new UnauthorizedError();
            return c.json({ authenticated: true, authRequired: true });
        } catch (error) {
            return handleError(c, error, runtime.logger);
        }
    });

    const requireAuth = async (c, next) => {
        if (!services.auth.isEnabled()) {
            await next();
            return;
        }
        const token = extractBearerToken(c);
        const ok = await services.auth.validateToken(token);
        if (!ok) {
            return c.json({ error: 'Unauthorized' }, 401);
        }
        await next();
    };

    app.get('/api/nodes', requireAuth, async (c) => {
        try {
            const snapshot = await requireNodeStorage(services.nodes).getSnapshot();
            return c.json(snapshot);
        } catch (error) {
            return handleError(c, error, runtime.logger);
        }
    });

    app.put('/api/nodes', requireAuth, async (c) => {
        try {
            const body = await c.req.json().catch(() => ({}));
            const snapshot = await requireNodeStorage(services.nodes).replace(body.nodes || [], body.revision);
            return c.json(snapshot);
        } catch (error) {
            return handleError(c, error, runtime.logger);
        }
    });

    app.delete('/api/nodes', requireAuth, async (c) => {
        try {
            const body = await c.req.json().catch(() => ({}));
            const snapshot = await requireNodeStorage(services.nodes).clear(body.revision);
            return c.json(snapshot);
        } catch (error) {
            return handleError(c, error, runtime.logger);
        }
    });

    // Subscription export token (used by clients). Prefer short URL /sub/<id>
    app.get('/api/export-token', requireAuth, async (c) => {
        try {
            if (!services.exportToken) {
                throw new MissingDependencyError('Export token requires KV');
            }
            const record = await services.exportToken.getOrCreate();
            const origin = new URL(c.req.url).origin;
            const path = services.exportToken.subscriptionPath(record);
            return c.json({
                token: record.token,
                shortId: record.shortId,
                prefs: record.prefs || {},
                createdAt: record.createdAt,
                rotatedAt: record.rotatedAt,
                subscriptionUrl: `${origin}${path}`,
                legacyUrl: `${origin}/api/nodes/subscription?token=${encodeURIComponent(record.shortId || record.token)}`
            });
        } catch (error) {
            return handleError(c, error, runtime.logger);
        }
    });

    app.post('/api/export-token/rotate', requireAuth, async (c) => {
        try {
            if (!services.exportToken) {
                throw new MissingDependencyError('Export token requires KV');
            }
            const body = await c.req.json().catch(() => ({}));
            const record = await services.exportToken.rotate(body.prefs || undefined);
            const origin = new URL(c.req.url).origin;
            const path = services.exportToken.subscriptionPath(record);
            return c.json({
                token: record.token,
                shortId: record.shortId,
                prefs: record.prefs || {},
                createdAt: record.createdAt,
                rotatedAt: record.rotatedAt,
                subscriptionUrl: `${origin}${path}`,
                legacyUrl: `${origin}/api/nodes/subscription?token=${encodeURIComponent(record.shortId || record.token)}`
            });
        } catch (error) {
            return handleError(c, error, runtime.logger);
        }
    });

    // Save generation prefs (template / rules) for default /sub Clash export
    app.put('/api/export-prefs', requireAuth, async (c) => {
        try {
            if (!services.exportToken) {
                throw new MissingDependencyError('Export prefs require KV');
            }
            const body = await c.req.json().catch(() => ({}));
            const record = await services.exportToken.setPrefs(body.prefs || body || {});
            const origin = new URL(c.req.url).origin;
            const path = services.exportToken.subscriptionPath(record);
            return c.json({
                prefs: record.prefs || {},
                subscriptionUrl: `${origin}${path}`,
                shortId: record.shortId
            });
        } catch (error) {
            return handleError(c, error, runtime.logger);
        }
    });

    app.get('/api/export-prefs', requireAuth, async (c) => {
        try {
            if (!services.exportToken) {
                throw new MissingDependencyError('Export prefs require KV');
            }
            const prefs = await services.exportToken.getPrefs();
            return c.json({ prefs });
        } catch (error) {
            return handleError(c, error, runtime.logger);
        }
    });

    // Import remote subscription URL into node library
    app.post('/api/nodes/import-url', requireAuth, async (c) => {
        try {
            if (!services.nodeImport) {
                throw new MissingDependencyError('Node import requires KV');
            }
            const body = await c.req.json().catch(() => ({}));
            const result = await services.nodeImport.importFromUrl(body.url || body.subscription || '', {
                tag: body.tag,
                name: body.name,
                mode: body.mode === 'replace' ? 'replace' : 'merge',
                userAgent: body.ua || getRequestHeader(c.req, 'User-Agent') || DEFAULT_USER_AGENT
            });
            return c.json(result);
        } catch (error) {
            return handleError(c, error, runtime.logger);
        }
    });

    // Managed subscriptions (miaomiaowu-style)
    app.get('/api/subscriptions', requireAuth, async (c) => {
        try {
            const items = await requireSubscriptions(services.subscriptions).list();
            const origin = new URL(c.req.url).origin;
            return c.json({
                items: items.map((s) => ({
                    ...s,
                    url: `${origin}/subscribe/${encodeURIComponent(s.slug)}`
                }))
            });
        } catch (error) {
            return handleError(c, error, runtime.logger);
        }
    });

    app.post('/api/subscriptions', requireAuth, async (c) => {
        try {
            const body = await c.req.json().catch(() => ({}));
            const item = await requireSubscriptions(services.subscriptions).create(body);
            const origin = new URL(c.req.url).origin;
            return c.json({ item: { ...item, url: `${origin}/subscribe/${encodeURIComponent(item.slug)}` } }, 201);
        } catch (error) {
            return handleError(c, error, runtime.logger);
        }
    });

    app.get('/api/subscriptions/:id', requireAuth, async (c) => {
        try {
            const item = await requireSubscriptions(services.subscriptions).getById(c.req.param('id'));
            if (!item) throw new ServiceError('订阅不存在', 404);
            const origin = new URL(c.req.url).origin;
            return c.json({ item: { ...item, url: `${origin}/subscribe/${encodeURIComponent(item.slug)}` } });
        } catch (error) {
            return handleError(c, error, runtime.logger);
        }
    });

    app.put('/api/subscriptions/:id', requireAuth, async (c) => {
        try {
            const body = await c.req.json().catch(() => ({}));
            const item = await requireSubscriptions(services.subscriptions).update(c.req.param('id'), body);
            const origin = new URL(c.req.url).origin;
            return c.json({ item: { ...item, url: `${origin}/subscribe/${encodeURIComponent(item.slug)}` } });
        } catch (error) {
            return handleError(c, error, runtime.logger);
        }
    });

    app.delete('/api/subscriptions/:id', requireAuth, async (c) => {
        try {
            await requireSubscriptions(services.subscriptions).remove(c.req.param('id'));
            return c.json({ ok: true });
        } catch (error) {
            return handleError(c, error, runtime.logger);
        }
    });

    // Public Clash subscription for a managed subscribe file
    app.get('/subscribe/:slug', async (c) => {
        try {
            return await exportManagedSubscription(c.req.param('slug') || '', c);
        } catch (error) {
            return handleError(c, error, runtime.logger);
        }
    });

    // Short subscription path for library-wide export (legacy default)
    app.get('/sub/:id', async (c) => {
        try {
            // Prefer managed subscription slug if exists
            if (services.subscriptions) {
                const managed = await services.subscriptions.getBySlug(c.req.param('id') || '');
                if (managed) return await exportManagedSubscription(managed.slug, c);
            }
            return await exportNodesSubscription(c.req.param('id') || '', c);
        } catch (error) {
            return handleError(c, error, runtime.logger);
        }
    });

    // Legacy query-token path (still supported)
    app.get('/api/nodes/subscription', async (c) => {
        try {
            return await exportNodesSubscription(extractBearerToken(c) || c.req.query('token') || '', c);
        } catch (error) {
            return handleError(c, error, runtime.logger);
        }
    });

    async function exportNodesSubscription(tokenOrShortId, c) {
        if (services.auth.isEnabled()) {
            let ok = false;
            if (tokenOrShortId) {
                if (services.exportToken) {
                    ok = await services.exportToken.validate(tokenOrShortId);
                }
                if (!ok) {
                    ok = await services.auth.validateToken(tokenOrShortId);
                }
            }
            if (!ok) throw new UnauthorizedError();
        }

        const nodes = await requireNodeStorage(services.nodes).list();
        const lines = nodes
            .filter((n) => n && n.enabled !== false && n.raw)
            .map((n) => String(n.raw).trim())
            .filter(Boolean)
            // skip remote-source placeholders if any remain
            .filter((raw) => !/^https?:\/\//i.test(raw));

        if (!lines.length) {
            throw new ServiceError('节点库为空：请先导入并启用至少一个节点', 404);
        }

        // format: clash (default) | base64 | raw/uri
        // Clash clients expect YAML config, not plain vless:// lines.
        // Query params override stored prefs when present.
        const format = String(c.req.query('format') || c.req.query('target') || 'clash').toLowerCase();
        const joined = lines.join('\n');

        if (format === 'raw' || format === 'uri' || format === 'text') {
            return c.text(joined, 200, {
                'Content-Type': 'text/plain; charset=utf-8',
                'Profile-Update-Interval': '12',
                'Cache-Control': 'no-store'
            });
        }

        if (format === 'base64' || format === 'b64' || format === 'v2ray') {
            return c.text(encodeBase64(joined), 200, {
                'Content-Type': 'text/plain; charset=utf-8',
                'Profile-Update-Interval': '12',
                'Cache-Control': 'no-store'
            });
        }

        // Default: full Clash YAML. Prefer template/rules from export prefs (set on generate).
        let prefs = {};
        try {
            if (services.exportToken) prefs = await services.exportToken.getPrefs();
        } catch {}

        const lang = resolveLanguage(c.get('lang') || c.req.query('lang'));
        const ua = c.req.query('ua') || prefs.ua || getRequestHeader(c.req, 'User-Agent') || DEFAULT_USER_AGENT;
        // Empty string must clear stored template (custom mode)
        const templateQuery = c.req.query('template') ?? c.req.query('rule_template');
        const templateId = (templateQuery != null ? templateQuery : (prefs.template || '')).trim();

        if (templateId) {
            const builder = new TemplateClashBuilder(joined, templateId, {
                lang,
                userAgent: ua
            });
            await builder.build();
            const yamlText = builder.formatConfig();
            return c.text(yamlText, 200, {
                'Content-Type': 'text/yaml; charset=utf-8',
                'Profile-Update-Interval': '12',
                'Cache-Control': 'no-store',
                'Content-Disposition': 'inline; filename="sublink.yaml"',
                'X-Sublink-Template': String(templateId)
            });
        }

        // NOTE: parseSelectedRules(undefined) returns [] which is truthy — do NOT use || chaining.
        const selectedRules = resolveRulesPreference(
            c.req.query('selectedRules'),
            prefs.selectedRules
        );
        const customRules = resolveCustomRulesPreference(
            c.req.query('customRules'),
            prefs.customRules
        );
        const groupByCountry =
            c.req.query('group_by_country') != null
                ? parseBooleanFlag(c.req.query('group_by_country'))
                : !!prefs.groupByCountry;
        const includeAutoSelect =
            c.req.query('include_auto_select') != null
                ? c.req.query('include_auto_select') !== 'false'
                : prefs.includeAutoSelect !== false;

        const builder = new ClashConfigBuilder(
            joined,
            selectedRules,
            customRules,
            undefined,
            lang,
            ua,
            groupByCountry,
            false,
            undefined,
            undefined,
            includeAutoSelect
        );
        await builder.build();
        const yamlText = builder.formatConfig();
        const rulesLabel = typeof prefs.selectedRules === 'string'
            ? prefs.selectedRules
            : (c.req.query('selectedRules') || 'custom');
        return c.text(yamlText, 200, {
            'Content-Type': 'text/yaml; charset=utf-8',
            'Profile-Update-Interval': '12',
            'Cache-Control': 'no-store',
            'Content-Disposition': 'inline; filename="sublink.yaml"',
            'X-Sublink-Rules': rulesLabel
        });
    }

    async function exportManagedSubscription(slug, c) {
        const subSvc = requireSubscriptions(services.subscriptions);
        const item = await subSvc.getBySlug(slug);
        if (!item || item.enabled === false) {
            throw new ServiceError('订阅不存在或已禁用', 404);
        }

        const allNodes = await requireNodeStorage(services.nodes).list();
        const idSet = new Set((item.nodeIds || []).map(String));
        let selected = allNodes.filter((n) => idSet.has(String(n.id)) && n.enabled !== false && n.raw);
        // If no nodeIds configured, fall back to all enabled nodes (first-time empty edit)
        if (!idSet.size) {
            selected = allNodes.filter((n) => n.enabled !== false && n.raw);
        }

        const lines = selected
            .map((n) => String(n.raw).trim())
            .filter(Boolean)
            .filter((raw) => !/^https?:\/\//i.test(raw));

        if (!lines.length) {
            throw new ServiceError('该订阅未包含可用节点，请先在订阅管理中添加节点', 404);
        }

        const format = String(c.req.query('format') || c.req.query('target') || 'clash').toLowerCase();
        const joined = lines.join('\n');

        if (format === 'raw' || format === 'uri' || format === 'text') {
            return c.text(joined, 200, {
                'Content-Type': 'text/plain; charset=utf-8',
                'Profile-Update-Interval': '12',
                'Cache-Control': 'no-store'
            });
        }
        if (format === 'base64' || format === 'b64' || format === 'v2ray') {
            return c.text(encodeBase64(joined), 200, {
                'Content-Type': 'text/plain; charset=utf-8',
                'Profile-Update-Interval': '12',
                'Cache-Control': 'no-store'
            });
        }

        const lang = resolveLanguage(c.get('lang') || c.req.query('lang'));
        const ua = c.req.query('ua') || getRequestHeader(c.req, 'User-Agent') || DEFAULT_USER_AGENT;
        const templateId = (c.req.query('template') || item.template || '').trim();

        if (templateId || item.mode === 'template') {
            if (!templateId) {
                throw new ServiceError('订阅配置了模板模式但未指定模板', 400);
            }
            const builder = new TemplateClashBuilder(joined, templateId, { lang, userAgent: ua });
            await builder.build();
            return c.text(builder.formatConfig(), 200, {
                'Content-Type': 'text/yaml; charset=utf-8',
                'Profile-Update-Interval': '12',
                'Cache-Control': 'no-store',
                'Content-Disposition': `inline; filename="${item.slug || 'sub'}.yaml"`,
                'X-Sublink-Template': String(templateId),
                'X-Sublink-Subscription': item.id
            });
        }

        const selectedRules = resolveRulesPreference(
            c.req.query('selectedRules'),
            item.selectedRules
        );
        const customRules = resolveCustomRulesPreference(
            c.req.query('customRules'),
            item.customRules
        );
        const builder = new ClashConfigBuilder(
            joined,
            selectedRules,
            customRules,
            undefined,
            lang,
            ua,
            !!item.groupByCountry,
            false,
            undefined,
            undefined,
            item.includeAutoSelect !== false
        );
        await builder.build();
        return c.text(builder.formatConfig(), 200, {
            'Content-Type': 'text/yaml; charset=utf-8',
            'Profile-Update-Interval': '12',
            'Cache-Control': 'no-store',
            'Content-Disposition': `inline; filename="${item.slug || 'sub'}.yaml"`,
            'X-Sublink-Subscription': item.id
        });
    }

    app.get('/api/nodes/summary', requireAuth, async (c) => {
        try {
            const nodes = await requireNodeStorage(services.nodes).list();
            const enabled = nodes.filter((n) => n.enabled !== false);
            const byProto = {};
            for (const n of enabled) {
                const p = (n.protocol || 'unknown').toLowerCase();
                byProto[p] = (byProto[p] || 0) + 1;
            }
            return c.json({
                total: nodes.length,
                enabled: enabled.length,
                protocols: byProto
            });
        } catch (error) {
            return handleError(c, error, runtime.logger);
        }
    });

    app.get('/', (c) => {
        const t = c.get('t');
        const lang = resolveLanguage(c.get('lang'));
        const subtitle = APP_SUBTITLE[lang] || APP_SUBTITLE['zh-CN'];

        return c.html(
            <Layout title={t('pageTitle')} description={t('pageDescription')} keywords={t('pageKeywords')}>
                <div class="flex min-h-svh flex-col bg-background">
                    <AuthGate />
                    <div
                        class="flex min-h-svh flex-col"
                        x-show={'$store.auth.ready && (!$store.auth.authRequired || $store.auth.authenticated)'}
                        x-cloak
                    >
                        <Navbar />
                        <main class="flex-1 mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 pt-24">
                            <Form t={t} lang={lang} subtitle={subtitle} />
                        </main>
                        <Footer />
                        <UpdateChecker />
                    </div>
                    <div
                        class="flex min-h-svh items-center justify-center"
                        x-show={'!$store.auth.ready'}
                        x-cloak
                    >
                        <div class="text-center text-muted">
                            <i class="fas fa-spinner fa-spin text-[var(--primary)] text-xl"></i>
                            <p class="mt-3 text-sm">加载中…</p>
                        </div>
                    </div>
                </div>
            </Layout>
        );
    });

    app.get('/singbox', async (c) => {
        try {
            const config = c.req.query('config');
            if (!config) {
                return c.text('Missing config parameter', 400);
            }

            const selectedRules = parseSelectedRules(c.req.query('selectedRules'));
            const customRules = parseJsonArray(c.req.query('customRules'));
            const ua = c.req.query('ua') || getRequestHeader(c.req, 'User-Agent') || DEFAULT_USER_AGENT;
            const groupByCountry = parseBooleanFlag(c.req.query('group_by_country'));
            const includeAutoSelect = c.req.query('include_auto_select') !== 'false';
            const enableClashUI = parseBooleanFlag(c.req.query('enable_clash_ui'));
            const externalController = c.req.query('external_controller');
            const externalUiDownloadUrl = c.req.query('external_ui_download_url');
            const configId = c.req.query('configId');
            const lang = c.get('lang');

            const requestedSingboxVersion = c.req.query('singbox_version') || c.req.query('sb_version') || c.req.query('sb_ver');
            const requestUserAgent = getRequestHeader(c.req, 'User-Agent');
            const singboxConfigVersion = resolveSingboxConfigVersion(requestedSingboxVersion, requestUserAgent);

            let baseConfig = singboxConfigVersion === '1.11' ? SING_BOX_CONFIG_V1_11 : SING_BOX_CONFIG;
            if (configId) {
                const storage = requireConfigStorage(services.configStorage);
                const storedConfig = await storage.getConfigById(configId);
                if (storedConfig) {
                    baseConfig = storedConfig;
                }
            }

            const builder = new SingboxConfigBuilder(
                config,
                selectedRules,
                customRules,
                baseConfig,
                lang,
                ua,
                groupByCountry,
                enableClashUI,
                externalController,
                externalUiDownloadUrl,
                singboxConfigVersion,
                includeAutoSelect
            );
            await builder.build();
            const userinfo = builder.getSubscriptionUserinfo();
            if (userinfo) {
                c.header('subscription-userinfo', userinfo);
            }
            return c.json(builder.config);
        } catch (error) {
            return handleError(c, error, runtime.logger);
        }
    });

    app.get('/clash', async (c) => {
        try {
            const config = c.req.query('config');
            if (!config) {
                return c.text('Missing config parameter', 400);
            }

            const templateId = c.req.query('template') || c.req.query('rule_template');
            const ua = c.req.query('ua') || getRequestHeader(c.req, 'User-Agent') || DEFAULT_USER_AGENT;
            const lang = c.get('lang');

            // V3 full-YAML template path (miaomiaowu-style rule mode)
            if (templateId) {
                const builder = new TemplateClashBuilder(config, templateId, {
                    lang,
                    userAgent: ua,
                });
                await builder.build();
                const userinfo = builder.getSubscriptionUserinfo();
                const headers = { 'Content-Type': 'text/yaml; charset=utf-8' };
                if (userinfo) {
                    headers['subscription-userinfo'] = userinfo;
                }
                return c.text(builder.formatConfig(), 200, headers);
            }

            const selectedRules = parseSelectedRules(c.req.query('selectedRules'));
            const customRules = parseJsonArray(c.req.query('customRules'));
            const groupByCountry = parseBooleanFlag(c.req.query('group_by_country'));
            const includeAutoSelect = c.req.query('include_auto_select') !== 'false';
            const enableClashUI = parseBooleanFlag(c.req.query('enable_clash_ui'));
            const externalController = c.req.query('external_controller');
            const externalUiDownloadUrl = c.req.query('external_ui_download_url');
            const configId = c.req.query('configId');

            let baseConfig;
            if (configId) {
                const storage = requireConfigStorage(services.configStorage);
                baseConfig = await storage.getConfigById(configId);
            }

            const builder = new ClashConfigBuilder(
                config,
                selectedRules,
                customRules,
                baseConfig,
                lang,
                ua,
                groupByCountry,
                enableClashUI,
                externalController,
                externalUiDownloadUrl,
                includeAutoSelect
            );
            await builder.build();
            const userinfo = builder.getSubscriptionUserinfo();
            const headers = { 'Content-Type': 'text/yaml; charset=utf-8' };
            if (userinfo) {
                headers['subscription-userinfo'] = userinfo;
            }
            return c.text(builder.formatConfig(), 200, headers);
        } catch (error) {
            return handleError(c, error, runtime.logger);
        }
    });

    app.get('/templates', (c) => {
        return c.json({
            templates: listTemplateDetails().map((t) => ({
                id: t.id,
                label: t.label,
                source: t.source,
                description: t.label,
            })),
        });
    });

    app.get('/surge', async (c) => {
        try {
            const config = c.req.query('config');
            if (!config) {
                return c.text('Missing config parameter', 400);
            }

            const selectedRules = parseSelectedRules(c.req.query('selectedRules'));
            const customRules = parseJsonArray(c.req.query('customRules'));
            const ua = c.req.query('ua') || getRequestHeader(c.req, 'User-Agent') || DEFAULT_USER_AGENT;
            const groupByCountry = parseBooleanFlag(c.req.query('group_by_country'));
            const includeAutoSelect = c.req.query('include_auto_select') !== 'false';
            const configId = c.req.query('configId');
            const lang = c.get('lang');

            let baseConfig;
            if (configId) {
                const storage = requireConfigStorage(services.configStorage);
                baseConfig = await storage.getConfigById(configId);
            }

            const builder = new SurgeConfigBuilder(
                config,
                selectedRules,
                customRules,
                baseConfig,
                lang,
                ua,
                groupByCountry,
                includeAutoSelect
            );
            builder.setSubscriptionUrl(c.req.url);
            await builder.build();

            const userinfo = builder.getSubscriptionUserinfo();
            if (userinfo) {
                c.header('subscription-userinfo', userinfo);
            }
            return c.text(builder.formatConfig());
        } catch (error) {
            return handleError(c, error, runtime.logger);
        }
    });

    app.get('/subconverter', (c) => {
        try {
            const rawSelectedRules = c.req.query('selectedRules');
            let selectedRules;

            if (!rawSelectedRules) {
                selectedRules = PREDEFINED_RULE_SETS.balanced;
            } else if (PREDEFINED_RULE_SETS[rawSelectedRules]) {
                selectedRules = PREDEFINED_RULE_SETS[rawSelectedRules];
            } else {
                try {
                    const parsed = JSON.parse(rawSelectedRules);
                    if (Array.isArray(parsed)) {
                        selectedRules = parsed;
                    } else {
                        return c.text('Invalid selectedRules: must be a preset name (minimal, balanced, comprehensive) or a JSON array', 400);
                    }
                } catch {
                    return c.text(`Invalid selectedRules: "${rawSelectedRules}" is not a valid preset name or JSON array. Valid presets: minimal, balanced, comprehensive`, 400);
                }
            }

            const includeAutoSelect = c.req.query('include_auto_select') !== 'false';
            const groupByCountry = parseBooleanFlag(c.req.query('group_by_country'));
            const customRules = parseJsonArray(c.req.query('customRules'));
            const lang = c.get('lang');

            const config = generateSubconverterConfig({
                selectedRules,
                customRules,
                lang,
                includeAutoSelect,
                groupByCountry
            });

            return c.text(config, 200, {
                'Content-Type': 'text/plain; charset=utf-8'
            });
        } catch (error) {
            return handleError(c, error, runtime.logger);
        }
    });

    app.get('/xray', async (c) => {
        try {
            const inputString = c.req.query('config');
            if (!inputString) {
                return c.text('Missing config parameter', 400);
            }

            const userAgent = c.req.query('ua') || getRequestHeader(c.req, 'User-Agent') || DEFAULT_USER_AGENT;
            const { lines, subscriptionUserinfo } = await resolveXraySubscriptionLines(inputString, userAgent, runtime.logger);
            const finalString = lines.join('\n');
            if (!finalString) {
                return c.text('Missing config parameter', 400);
            }

            const responseHeaders = {};
            if (subscriptionUserinfo) {
                responseHeaders['subscription-userinfo'] = subscriptionUserinfo;
            }

            return c.text(encodeBase64(finalString), 200, responseHeaders);
        } catch (error) {
            return handleError(c, error, runtime.logger);
        }
    });

    app.get('/shorten-v2', async (c) => {
        try {
            const url = c.req.query('url');
            if (!url) {
                return c.text('Missing URL parameter', 400);
            }
            let parsedUrl;
            try {
                parsedUrl = new URL(url);
            } catch {
                return c.text('Invalid URL parameter', 400);
            }
            const queryString = parsedUrl.search;

            const shortLinks = requireShortLinkService(services.shortLinks);
            const code = await shortLinks.createShortLink(queryString, c.req.query('shortCode'));
            return c.text(code);
        } catch (error) {
            return handleError(c, error, runtime.logger);
        }
    });

    const redirectHandler = (prefix) => async (c) => {
        try {
            const code = c.req.param('code');
            const shortLinks = requireShortLinkService(services.shortLinks);
            const originalParam = await shortLinks.resolveShortCode(code);
            if (!originalParam) return c.text('Short URL not found', 404);

            const url = new URL(c.req.url);
            return c.redirect(`${url.origin}/${prefix}${originalParam}`);
        } catch (error) {
            return handleError(c, error, runtime.logger);
        }
    };

    app.get('/s/:code', redirectHandler('surge'));
    app.get('/b/:code', redirectHandler('singbox'));
    app.get('/c/:code', redirectHandler('clash'));
    app.get('/x/:code', redirectHandler('xray'));

    app.post('/config', async (c) => {
        try {
            const { type, content } = await c.req.json();
            const storage = requireConfigStorage(services.configStorage);
            const configId = await storage.saveConfig(type, content);
            return c.text(configId);
        } catch (error) {
            if (error instanceof SyntaxError) {
                return c.text(`Invalid format: ${error.message}`, 400);
            }
            return handleError(c, error, runtime.logger);
        }
    });

    app.get('/resolve', async (c) => {
        try {
            const shortUrl = c.req.query('url');
            const t = c.get('t');
            if (!shortUrl) return c.text(t('missingUrl'), 400);

            let urlObj;
            try {
                urlObj = new URL(shortUrl);
            } catch {
                return c.text(t('invalidShortUrl'), 400);
            }
            const pathParts = urlObj.pathname.split('/');
            if (pathParts.length < 3) return c.text(t('invalidShortUrl'), 400);

            const prefix = pathParts[1];
            const shortCode = pathParts[2];
            if (!['b', 'c', 'x', 's'].includes(prefix)) return c.text(t('invalidShortUrl'), 400);

            const shortLinks = requireShortLinkService(services.shortLinks);
            const originalParam = await shortLinks.resolveShortCode(shortCode);
            if (!originalParam) return c.text(t('shortUrlNotFound'), 404);

            const mapping = { b: 'singbox', c: 'clash', x: 'xray', s: 'surge' };
            const originalUrl = `${urlObj.origin}/${mapping[prefix]}${originalParam}`;
            return c.json({ originalUrl });
        } catch (error) {
            return handleError(c, error, runtime.logger);
        }
    });

    app.get('/favicon.ico', async (c) => servePublicAsset(c, runtime));
    app.get('/favicon.png', async (c) => servePublicAsset(c, runtime));
    app.get('/logo.svg', async (c) => servePublicAsset(c, runtime));
    app.get('/logo.png', async (c) => servePublicAsset(c, runtime));
    app.get('/logo-128.png', async (c) => servePublicAsset(c, runtime));
    app.get('/logo-64.png', async (c) => servePublicAsset(c, runtime));
    app.get('/logo-32.png', async (c) => servePublicAsset(c, runtime));
    app.get('/apple-touch-icon.png', async (c) => servePublicAsset(c, runtime));

    return app;
}

async function servePublicAsset(c, runtime) {
    if (!runtime.assetFetcher) {
        return c.notFound();
    }
    try {
        return await runtime.assetFetcher(c.req.raw);
    } catch (error) {
        runtime.logger.warn('Asset fetch failed', error);
        return c.notFound();
    }
}

export function parseSelectedRules(raw) {
    if (!raw) return [];

    // 首先检查是否是预设名称 (minimal, balanced, comprehensive)
    // 这确保向后兼容主分支的 API 行为
    if (typeof raw === 'string' && PREDEFINED_RULE_SETS[raw]) {
        return PREDEFINED_RULE_SETS[raw];
    }

    // 尝试解析为 JSON 数组
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        // 解析失败，回退到 minimal 预设
        console.warn(`Failed to parse selectedRules: ${raw}, falling back to minimal`);
        return PREDEFINED_RULE_SETS.minimal;
    }
}

/** Prefer query, then saved prefs; never treat [] as "missing". */
function resolveRulesPreference(queryVal, prefsVal) {
    if (queryVal != null && queryVal !== '') {
        return parseSelectedRules(queryVal);
    }
    if (prefsVal != null && prefsVal !== '') {
        if (Array.isArray(prefsVal)) return prefsVal;
        return parseSelectedRules(String(prefsVal));
    }
    return parseSelectedRules('balanced');
}

function resolveCustomRulesPreference(queryVal, prefsVal) {
    if (queryVal != null && queryVal !== '') {
        return parseJsonArray(queryVal) || [];
    }
    if (Array.isArray(prefsVal)) return prefsVal;
    return [];
}

function parseJsonArray(raw) {
    if (!raw) return [];
    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed : [];
    } catch {
        return [];
    }
}

function parseBooleanFlag(value) {
    return value === 'true' || value === true;
}

function parseSemverLike(value) {
    if (typeof value !== 'string') {
        return null;
    }
    const trimmed = value.trim();
    if (!trimmed) {
        return null;
    }
    const match = trimmed.match(/(\d+)\.(\d+)(?:\.(\d+))?/);
    if (!match) {
        return null;
    }
    return {
        major: Number(match[1]),
        minor: Number(match[2]),
        patch: match[3] ? Number(match[3]) : 0
    };
}

function isSingboxLegacyConfig(version) {
    if (!version || Number.isNaN(version.major) || Number.isNaN(version.minor)) {
        return false;
    }
    if (version.major !== 1) {
        return version.major < 1;
    }
    return version.minor < 12;
}

// 1.14 swaps rule-set download_detour for http_client, which older clients
// reject as an unknown field, so it needs its own config tier.
function isSingboxModernConfig(version) {
    if (!version || Number.isNaN(version.major) || Number.isNaN(version.minor)) {
        return false;
    }
    if (version.major !== 1) {
        return version.major > 1;
    }
    return version.minor >= 14;
}

function resolveSingboxConfigTier(version) {
    if (isSingboxLegacyConfig(version)) return '1.11';
    return isSingboxModernConfig(version) ? '1.14' : '1.12';
}

function resolveSingboxConfigVersion(requestedVersion, userAgent) {
    const normalizedRequested = typeof requestedVersion === 'string' ? requestedVersion.trim().toLowerCase() : '';
    if (normalizedRequested && normalizedRequested !== 'auto') {
        if (normalizedRequested === 'legacy') return '1.11';
        if (normalizedRequested === 'latest') return '1.14';
        const parsed = parseSemverLike(normalizedRequested);
        if (parsed) {
            return resolveSingboxConfigTier(parsed);
        }
    }

    if (typeof userAgent === 'string' && userAgent) {
        const uaMatch = userAgent.match(/sing-box\/(\d+\.\d+(?:\.\d+)?)/i) || userAgent.match(/sing-box\s+(\d+\.\d+(?:\.\d+)?)/i);
        const versionString = uaMatch?.[1];
        const parsed = versionString ? parseSemverLike(versionString) : null;
        if (parsed) {
            return resolveSingboxConfigTier(parsed);
        }
    }

    return '1.12';
}

function getRequestHeader(request, name) {
    if (!request || !name) {
        return undefined;
    }

    try {
        const value = request.header(name);
        if (value !== undefined) {
            return value;
        }
    } catch {
        // Fallback if HonoRequest.header cannot read from the raw request.
    }

    const headers = request.raw?.headers;
    if (!headers) {
        return undefined;
    }

    if (typeof headers.get === 'function') {
        return headers.get(name) ?? headers.get(name.toLowerCase()) ?? undefined;
    }

    if (typeof headers === 'object') {
        const lowerName = name.toLowerCase();
        const headerValue = headers[lowerName] ?? headers[name];
        if (Array.isArray(headerValue)) {
            return headerValue[0];
        }
        return headerValue;
    }

    return undefined;
}

function requireNodeStorage(service) {
    if (!service) {
        throw new MissingDependencyError('Node storage functionality is unavailable');
    }
    return service;
}

function requireSubscriptions(service) {
    if (!service) {
        throw new MissingDependencyError('Subscription management requires KV');
    }
    return service;
}

function requireShortLinkService(service) {
    if (!service) {
        throw new MissingDependencyError('Short link functionality is unavailable');
    }
    return service;
}

function requireConfigStorage(service) {
    if (!service) {
        throw new MissingDependencyError('Config storage functionality is unavailable');
    }
    return service;
}

function extractBearerToken(c) {
    const header = getRequestHeader(c.req, 'Authorization') || '';
    const m = String(header).match(/^Bearer\s+(.+)$/i);
    if (m) return m[1].trim();
    const q = c.req.query('token');
    if (q) return q;
    return '';
}

function handleError(c, error, logger) {
    if (error instanceof ServiceError) {
        const path = c.req.path || '';
        if (path.startsWith('/api/')) {
            return c.json({ error: error.message }, error.status);
        }
        return c.text(error.message, error.status);
    }
    logger.error?.('Unhandled error', error);
    const path = c.req.path || '';
    if (path.startsWith('/api/')) {
        return c.json({ error: error.message || 'Internal error' }, 500);
    }
    return c.text(`Error: ${error.message}`, 500);
}
