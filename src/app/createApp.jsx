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
import { encodeBase64, tryDecodeSubscriptionLines } from '../utils.js';
import { APP_NAME, APP_SUBTITLE } from '../constants.js';
import { ShortLinkService } from '../services/shortLinkService.js';
import { ConfigStorageService } from '../services/configStorageService.js';
import { AuthService } from '../services/authService.js';
import { NodeStorageService } from '../services/nodeStorageService.js';
import { ExportTokenService } from '../services/exportTokenService.js';
import { ServiceError, MissingDependencyError, UnauthorizedError } from '../services/errors.js';
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
        nodes: runtime.kv ? new NodeStorageService(runtime.kv) : null,
        exportToken: runtime.kv ? new ExportTokenService(runtime.kv) : null
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
            const nodes = await requireNodeStorage(services.nodes).list();
            return c.json({ nodes });
        } catch (error) {
            return handleError(c, error, runtime.logger);
        }
    });

    app.put('/api/nodes', requireAuth, async (c) => {
        try {
            const body = await c.req.json().catch(() => ({}));
            const nodes = await requireNodeStorage(services.nodes).save(body.nodes || []);
            return c.json({ nodes });
        } catch (error) {
            return handleError(c, error, runtime.logger);
        }
    });

    app.delete('/api/nodes', requireAuth, async (c) => {
        try {
            const nodes = await requireNodeStorage(services.nodes).clear();
            return c.json({ nodes });
        } catch (error) {
            return handleError(c, error, runtime.logger);
        }
    });

    // Long-lived export token (independent of login session). Used by Clash/clients.
    app.get('/api/export-token', requireAuth, async (c) => {
        try {
            if (!services.exportToken) {
                throw new MissingDependencyError('Export token requires KV');
            }
            const record = await services.exportToken.getOrCreate();
            return c.json({
                token: record.token,
                createdAt: record.createdAt,
                rotatedAt: record.rotatedAt,
                subscriptionUrl: `${new URL(c.req.url).origin}/api/nodes/subscription?token=${encodeURIComponent(record.token)}`
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
            const record = await services.exportToken.rotate();
            return c.json({
                token: record.token,
                createdAt: record.createdAt,
                rotatedAt: record.rotatedAt,
                subscriptionUrl: `${new URL(c.req.url).origin}/api/nodes/subscription?token=${encodeURIComponent(record.token)}`
            });
        } catch (error) {
            return handleError(c, error, runtime.logger);
        }
    });

    // Miaomiaowu-style: export saved enabled nodes as a plain subscription (one URI per line).
    // Auth: login session (Bearer / ?token=session) OR long-lived export token (?token=export).
    app.get('/api/nodes/subscription', async (c) => {
        try {
            if (services.auth.isEnabled()) {
                const token = extractBearerToken(c) || c.req.query('token') || '';
                let ok = false;
                if (token) {
                    ok = await services.auth.validateToken(token);
                    if (!ok && services.exportToken) {
                        ok = await services.exportToken.validate(token);
                    }
                }
                if (!ok) throw new UnauthorizedError();
            }
            const nodes = await requireNodeStorage(services.nodes).list();
            const lines = nodes
                .filter((n) => n && n.enabled !== false && n.raw)
                .map((n) => String(n.raw).trim())
                .filter(Boolean);
            const body = lines.join('\n');
            return c.text(body, 200, {
                'Content-Type': 'text/plain; charset=utf-8',
                'Profile-Update-Interval': '12',
                'Cache-Control': 'no-store'
            });
        } catch (error) {
            return handleError(c, error, runtime.logger);
        }
    });

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
        const inputString = c.req.query('config');
        if (!inputString) {
            return c.text('Missing config parameter', 400);
        }

        const proxylist = inputString.split('\n');
        const finalProxyList = [];
        let subscriptionUserinfo;
        const userAgent = c.req.query('ua') || getRequestHeader(c.req, 'User-Agent') || DEFAULT_USER_AGENT;
        const headers = { 'User-Agent': userAgent };

        for (const proxy of proxylist) {
            const trimmedProxy = proxy.trim();
            if (!trimmedProxy) continue;

            if (trimmedProxy.startsWith('http://') || trimmedProxy.startsWith('https://')) {
                try {
                    const response = await fetch(trimmedProxy, { method: 'GET', headers });
                    const fetchedUserinfo = response.headers.get('subscription-userinfo');
                    if (fetchedUserinfo && subscriptionUserinfo === undefined) {
                        subscriptionUserinfo = fetchedUserinfo;
                    }
                    const text = await response.text();
                    let processed = tryDecodeSubscriptionLines(text, { decodeUriComponent: true });
                    if (!Array.isArray(processed)) processed = [processed];
                    finalProxyList.push(...processed.filter(item => typeof item === 'string' && item.trim() !== ''));
                } catch (e) {
                    runtime.logger.warn('Failed to fetch the proxy', e);
                }
            } else {
                let processed = tryDecodeSubscriptionLines(trimmedProxy);
                if (!Array.isArray(processed)) processed = [processed];
                finalProxyList.push(...processed.filter(item => typeof item === 'string' && item.trim() !== ''));
            }
        }

        const finalString = finalProxyList.join('\n');
        if (!finalString) {
            return c.text('Missing config parameter', 400);
        }

        const responseHeaders = {};
        if (subscriptionUserinfo) {
            responseHeaders['subscription-userinfo'] = subscriptionUserinfo;
        }

        return c.text(encodeBase64(finalString), 200, responseHeaders);
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
