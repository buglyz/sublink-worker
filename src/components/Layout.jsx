import { html } from 'hono/html'
import { APP_KEYWORDS } from '../constants.js';

export const Layout = (props) => {
  const { title, children } = props
  return html`
    <!DOCTYPE html>
    <html lang="zh-CN" x-data="appData()" x-init="init()">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#fffaf7" />
        <title>${title}</title>
        <meta name="description" content="Convert and optimize your subscription links easily" />
        <meta name="keywords" content="${APP_KEYWORDS}" />
        <link rel="icon" type="image/svg+xml" href="/logo.svg" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon.png" />
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" rel="stylesheet" />
        <script src="https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js"></script>
        <script>
          window.__SUBLINK_UI__ = {
            page: (function () {
              try {
                var saved = localStorage.getItem('sublink_page') || 'generate';
                if (saved === 'generate' || saved === 'nodes' || saved === 'subscribe' || saved === 'subs') return saved;
                var hash = (location.hash || '').replace('#', '');
                if (hash === 'nodes' || hash === 'subscribe' || hash === 'generate' || hash === 'subs') return hash;
              } catch (e) {}
              return 'generate';
            })(),
            setPage: function (p) {
              if (p !== 'generate' && p !== 'nodes' && p !== 'subscribe' && p !== 'subs') return;
              this.page = p;
              try { localStorage.setItem('sublink_page', p); } catch (e) {}
              try { history.replaceState(null, '', '#' + p); } catch (e) {}
              try {
                if (window.Alpine && Alpine.store('ui')) Alpine.store('ui').page = p;
              } catch (e) {}
              window.dispatchEvent(new CustomEvent('sublink-page', { detail: { page: p } }));
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }
          };
        </script>
        <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.13.10/dist/cdn.min.js"></script>
        <script>
          document.addEventListener('alpine:init', function () {
            Alpine.store('ui', {
              page: window.__SUBLINK_UI__.page,
              setPage: function (p) {
                window.__SUBLINK_UI__.setPage(p);
                this.page = window.__SUBLINK_UI__.page;
              }
            });
            Alpine.store('auth', {
              token: localStorage.getItem('sublink_auth_token') || '',
              authRequired: false,
              authenticated: false,
              ready: false,
              kvReady: false,
              loading: false,
              password: '',
              error: '',
              nodeCount: 0,
              // Long-lived export token (default for client subscriptions)
              exportToken: localStorage.getItem('sublink_export_token') || '',
              exportSubUrl: localStorage.getItem('sublink_export_sub_url') || '',
              async refresh() {
                try {
                  const st = await fetch('/api/auth/status').then((r) => r.json());
                  this.authRequired = !!st.authRequired;
                  this.kvReady = !!st.kvReady;
                  if (!this.authRequired) {
                    this.authenticated = true;
                  } else if (this.token) {
                    const me = await fetch('/api/auth/me', {
                      headers: { Authorization: 'Bearer ' + this.token }
                    });
                    this.authenticated = me.ok;
                    if (!me.ok) {
                      this.token = '';
                      localStorage.removeItem('sublink_auth_token');
                    }
                  } else {
                    this.authenticated = false;
                  }
                  if (this.authenticated) {
                    try {
                      const sum = await fetch('/api/nodes/summary', {
                        headers: this.token ? { Authorization: 'Bearer ' + this.token } : {}
                      }).then((r) => (r.ok ? r.json() : null));
                      if (sum) this.nodeCount = sum.enabled || sum.total || 0;
                    } catch (e) {}
                    // Always ensure long-lived export token after login (default for clients)
                    await this.ensureExportToken();
                  }
                } catch (e) {
                  this.authenticated = !this.authRequired;
                } finally {
                  this.ready = true;
                }
              },
              async ensureExportToken() {
                try {
                  const headers = {};
                  if (this.token) headers.Authorization = 'Bearer ' + this.token;
                  const res = await fetch('/api/export-token', { headers });
                  if (!res.ok) return;
                  const data = await res.json();
                  this.exportToken = data.token || '';
                  this.exportSubUrl = data.subscriptionUrl || (window.location.origin + '/sub/' + encodeURIComponent(data.shortId || this.exportToken));
                  try {
                    localStorage.setItem('sublink_export_token', this.exportToken);
                    localStorage.setItem('sublink_export_sub_url', this.exportSubUrl);
                  } catch (e) {}
                } catch (e) {}
              },
              async rotateExportToken() {
                try {
                  const headers = {};
                  if (this.token) headers.Authorization = 'Bearer ' + this.token;
                  const res = await fetch('/api/export-token/rotate', { method: 'POST', headers });
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) throw new Error(data.error || '轮换失败');
                  this.exportToken = data.token || '';
                  this.exportSubUrl = data.subscriptionUrl || '';
                  try {
                    localStorage.setItem('sublink_export_token', this.exportToken);
                    localStorage.setItem('sublink_export_sub_url', this.exportSubUrl);
                  } catch (e) {}
                  return true;
                } catch (e) {
                  this.error = e.message || '轮换失败';
                  return false;
                }
              },
              async login() {
                this.loading = true;
                this.error = '';
                try {
                  const res = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: this.password })
                  });
                  const data = await res.json().catch(() => ({}));
                  if (!res.ok) throw new Error(data.error || '登录失败');
                  this.token = data.token || '';
                  localStorage.setItem('sublink_auth_token', this.token);
                  this.password = '';
                  this.authenticated = true;
                  window.dispatchEvent(new CustomEvent('sublink-auth', { detail: { authenticated: true } }));
                  await this.refresh();
                } catch (e) {
                  this.error = e.message || '登录失败';
                  this.authenticated = false;
                } finally {
                  this.loading = false;
                }
              },
              async logout() {
                try {
                  await fetch('/api/auth/logout', {
                    method: 'POST',
                    headers: this.token ? { Authorization: 'Bearer ' + this.token } : {}
                  });
                } catch (e) {}
                this.token = '';
                localStorage.removeItem('sublink_auth_token');
                // Keep exportToken/exportSubUrl so UI can still show the long-lived client URL after logout is not typical (gate hides app). Clear only session.
                this.authenticated = !this.authRequired;
                this.nodeCount = 0;
                window.dispatchEvent(new CustomEvent('sublink-auth', { detail: { authenticated: this.authenticated } }));
              }
            });
            Alpine.store('auth').refresh();
          });
          function appData() {
            return {
              darkMode: localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches),
              page: window.__SUBLINK_UI__.page,
              mobileOpen: false,
              setPage: function (p) {
                window.__SUBLINK_UI__.setPage(p);
                this.page = window.__SUBLINK_UI__.page;
                this.mobileOpen = false;
              },
              toggleDarkMode: function () {
                this.darkMode = !this.darkMode;
                localStorage.setItem('theme', this.darkMode ? 'dark' : 'light');
                document.documentElement.classList.toggle('dark', this.darkMode);
                var meta = document.querySelector('meta[name="theme-color"]');
                if (meta) meta.setAttribute('content', this.darkMode ? '#10131c' : '#fffaf7');
              },
              init: function () {
                document.documentElement.classList.toggle('dark', this.darkMode);
                var meta = document.querySelector('meta[name="theme-color"]');
                if (meta) meta.setAttribute('content', this.darkMode ? '#10131c' : '#fffaf7');
                var self = this;
                window.addEventListener('sublink-page', function (e) {
                  self.page = (e.detail && e.detail.page) || window.__SUBLINK_UI__.page;
                });
                window.addEventListener('hashchange', function () {
                  var h = (location.hash || '').replace('#', '');
                  if (h === 'generate' || h === 'nodes' || h === 'subscribe' || h === 'subs') self.setPage(h);
                });
              }
            };
          }
          function updateChecker(currentVersion, apiUrl) {
            return {
              currentVersion: currentVersion, latestVersion: '', showUpdateToast: false,
              i18n: { newVersionAvailable: '发现新版本', viewRelease: '查看更新', updateGuide: '更新指南', later: '稍后' },
              init: function () { setTimeout(this.checkForUpdates.bind(this), 3000); },
              checkForUpdates: async function () {
                try {
                  var dismissed = localStorage.getItem('sublink_dismissed_version');
                  var last = localStorage.getItem('sublink_last_version_check');
                  var now = Date.now();
                  if (last && (now - parseInt(last, 10)) < 3600000) {
                    var cached = localStorage.getItem('sublink_latest_version');
                    if (cached && cached !== dismissed && this.compareVersions(cached, this.currentVersion) > 0) {
                      this.latestVersion = cached; this.showUpdateToast = true;
                    }
                    return;
                  }
                  var res = await fetch(apiUrl, { headers: { Accept: 'application/vnd.github.v3+json' } });
                  if (!res.ok) return;
                  var data = await res.json();
                  var latest = (data.tag_name || '').replace(/^v/, '');
                  localStorage.setItem('sublink_latest_version', latest);
                  localStorage.setItem('sublink_last_version_check', String(now));
                  if (latest && latest !== dismissed && this.compareVersions(latest, this.currentVersion) > 0) {
                    this.latestVersion = latest; this.showUpdateToast = true;
                  }
                } catch (e) {}
              },
              compareVersions: function (v1, v2) {
                var a = v1.split('.').map(Number), b = v2.split('.').map(Number);
                for (var i = 0; i < Math.max(a.length, b.length); i++) {
                  var x = a[i] || 0, y = b[i] || 0;
                  if (x > y) return 1; if (x < y) return -1;
                }
                return 0;
              },
              dismissUpdate: function () {
                this.showUpdateToast = false;
                localStorage.setItem('sublink_dismissed_version', this.latestVersion);
              }
            };
          }
        </script>
        <script>
          tailwind.config = {
            darkMode: 'class',
            theme: {
              extend: {
                colors: {
                  brand: {
                    50: '#fff7ed', 100: '#ffedd5', 200: '#fed7aa', 300: '#fdba74', 400: '#fb923c',
                    500: '#f97316', 600: '#ea580c', 700: '#c2410c', 800: '#9a3412', 900: '#7c2d12'
                  }
                },
                fontFamily: {
                  sans: ['Inter', 'PingFang SC', 'Microsoft YaHei', 'system-ui', 'sans-serif'],
                  mono: ['JetBrains Mono', 'ui-monospace', 'monospace']
                }
              }
            }
          }
        </script>
        <style>
          /* === Modern Design Tokens === */
          :root {
            --radius-sm: 6px;
            --radius-md: 10px;
            --radius-lg: 14px;
            --radius-xl: 20px;

            --background: #f8fafc;
            --foreground: #0f172a;
            --card: #ffffff;
            --card-foreground: #0f172a;

            --primary: #ea580c;
            --primary-hover: #c2410c;
            --primary-foreground: #ffffff;
            --primary-light: rgba(234, 88, 12, 0.08);

            --secondary: #f1f5f9;
            --secondary-hover: #e2e8f0;
            --secondary-foreground: #334155;

            --muted: #f1f5f9;
            --muted-foreground: #64748b;
            --accent: #fff7ed;
            --accent-foreground: #9a3412;

            --destructive: #ef4444;
            --destructive-foreground: #ffffff;

            --border: #e2e8f0;
            --border-hover: #cbd5e1;
            --input: #e2e8f0;
            --ring: rgba(234, 88, 12, 0.35);

            --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.04);
            --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.06), 0 1px 2px rgba(0, 0, 0, 0.04);
            --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.07), 0 2px 4px -2px rgba(0, 0, 0, 0.05);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.08), 0 4px 6px -4px rgba(0, 0, 0, 0.04);
            --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.04);

            --font-sans: 'Inter', 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
            --font-mono: 'JetBrains Mono', SFMono-Regular, Consolas, monospace;
          }

          html.dark {
            --background: #090d16;
            --foreground: #f8fafc;
            --card: #111827;
            --card-foreground: #f8fafc;

            --primary: #f97316;
            --primary-hover: #ea580c;
            --primary-foreground: #ffffff;
            --primary-light: rgba(249, 115, 22, 0.12);

            --secondary: #1f2937;
            --secondary-hover: #374151;
            --secondary-foreground: #e2e8f0;

            --muted: #1e293b;
            --muted-foreground: #94a3b8;
            --accent: rgba(249, 115, 22, 0.15);
            --accent-foreground: #fed7aa;

            --destructive: #f87171;
            --destructive-foreground: #ffffff;

            --border: #1e293b;
            --border-hover: #334155;
            --input: #1e293b;
            --ring: rgba(249, 115, 22, 0.45);

            --shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.2);
            --shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2);
            --shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.35), 0 2px 4px -2px rgba(0, 0, 0, 0.25);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -4px rgba(0, 0, 0, 0.3);
            --shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.4);
          }

          * { box-sizing: border-box; border-color: var(--border); }
          body {
            margin: 0; min-height: 100vh; width: 100%;
            font-family: var(--font-sans);
            background: var(--background);
            color: var(--foreground);
            -webkit-font-smoothing: antialiased;
            overflow-x: hidden;
            background-image:
              radial-gradient(800px circle at 10% -5%, rgba(234, 88, 12, 0.06), transparent 60%),
              radial-gradient(700px circle at 90% 5%, rgba(59, 130, 246, 0.04), transparent 65%);
            background-attachment: fixed;
          }
          html.dark body {
            background-image:
              radial-gradient(800px circle at 15% -5%, rgba(249, 115, 22, 0.1), transparent 60%),
              radial-gradient(700px circle at 85% 5%, rgba(56, 189, 248, 0.05), transparent 65%);
          }

          [x-cloak] { display: none !important; }
          button:not(:disabled), [role=button]:not(:disabled) { cursor: pointer; }
          @media (max-width: 767px) { input, select, textarea { font-size: 16px !important; } }
          .font-mono, .font-mono * { font-family: var(--font-mono); }

          /* Scrollbar */
          ::-webkit-scrollbar { width: 6px; height: 6px; }
          ::-webkit-scrollbar-track { background: transparent; }
          ::-webkit-scrollbar-thumb { background: color-mix(in srgb, var(--muted-foreground) 25%, transparent); border-radius: 9999px; }
          ::-webkit-scrollbar-thumb:hover { background: color-mix(in srgb, var(--muted-foreground) 45%, transparent); }

          /* Modern Card */
          .pixel-card, .mm-card {
            position: relative;
            border: 1px solid var(--border);
            background: var(--card);
            color: var(--card-foreground);
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-sm);
            overflow: hidden;
            transition: border-color 0.2s ease, box-shadow 0.2s ease;
          }
          .pixel-card:hover, .mm-card:hover {
            border-color: var(--border-hover);
            box-shadow: var(--shadow-md);
          }

          /* Modern Button */
          .pixel-button, .mm-btn {
            display: inline-flex; align-items: center; justify-content: center; gap: 0.45rem;
            border: 1px solid transparent;
            border-radius: var(--radius-sm);
            font-size: 0.9375rem; font-weight: 500;
            padding: 0.5rem 1rem; white-space: nowrap;
            transition: all 0.15s ease;
          }
          .pixel-button:active:not(:disabled), .mm-btn:active:not(:disabled) {
            transform: scale(0.98);
          }
          .mm-btn:disabled { opacity: 0.5; cursor: not-allowed; }

          .mm-btn-primary, .pixel-button-primary {
            background: var(--primary); color: var(--primary-foreground);
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.08);
          }
          .mm-btn-primary:hover:not(:disabled) {
            background: var(--primary-hover);
            box-shadow: 0 2px 4px rgba(234, 88, 12, 0.25);
          }

          .mm-btn-outline, .mm-btn-ghost {
            background: transparent;
            color: var(--foreground);
            border-color: var(--border);
          }
          .mm-btn-outline:hover:not(:disabled) {
            background: var(--secondary);
            border-color: var(--border-hover);
          }
          .mm-btn-ghost { border-color: transparent; }
          .mm-btn-ghost:hover:not(:disabled) { background: var(--secondary); }

          .mm-btn-secondary {
            background: var(--secondary); color: var(--secondary-foreground);
            border-color: var(--border);
          }
          .mm-btn-secondary:hover:not(:disabled) { background: var(--secondary-hover); }

          .mm-btn-danger {
            background: rgba(239, 68, 68, 0.1);
            color: var(--destructive);
            border-color: rgba(239, 68, 68, 0.25);
          }
          .mm-btn-danger:hover:not(:disabled) {
            background: var(--destructive);
            color: var(--destructive-foreground);
            border-color: var(--destructive);
          }

          .mm-btn-icon { width: 2.25rem; height: 2.25rem; padding: 0; }
          .mm-btn-sm { height: 2.125rem; padding: 0.3rem 0.8rem; font-size: 0.875rem; gap: 0.35rem; }
          .mm-btn-nav {
            height: 2.25rem; padding: 0.35rem 0.85rem;
            font-size: 0.875rem; font-weight: 500;
            border-radius: var(--radius-md);
          }
          .mm-btn-nav.is-active {
            background: var(--primary-light);
            color: var(--primary);
            font-weight: 600;
          }

          /* Modern Inputs */
          .mm-input, .mm-select, .mm-textarea {
            width: 100%;
            border: 1px solid var(--input);
            background: var(--card);
            color: var(--foreground);
            border-radius: var(--radius-sm);
            padding: 0.55rem 0.85rem;
            font-size: 0.9375rem;
            transition: border-color 0.15s ease, box-shadow 0.15s ease;
          }
          .mm-textarea { resize: vertical; min-height: 6rem; line-height: 1.5; }
          .mm-input:focus, .mm-select:focus, .mm-textarea:focus {
            outline: none;
            border-color: var(--primary);
            box-shadow: 0 0 0 3px var(--ring);
          }
          .mm-label { display: block; font-size: 0.875rem; font-weight: 500; margin-bottom: 0.35rem; color: var(--foreground); }
          .mm-desc, .text-muted { color: var(--muted-foreground); font-size: 0.875rem; line-height: 1.5; }

          /* Chips & Badges */
          .mm-chip {
            display: inline-flex; align-items: center; gap: 0.25rem;
            border: 1px solid var(--border);
            background: var(--secondary);
            color: var(--muted-foreground);
            border-radius: var(--radius-sm);
            padding: 0.15rem 0.5rem; font-size: 0.75rem; font-weight: 600;
          }

          /* Switch */
          .mm-switch {
            position: relative; width: 2.35rem; height: 1.3rem; border-radius: 9999px;
            background: var(--muted); flex-shrink: 0;
            border: 1px solid var(--border);
            transition: background-color 0.2s ease, border-color 0.2s ease;
          }
          .peer:checked ~ .mm-switch { background: var(--primary); border-color: var(--primary); }
          .mm-switch::after {
            content: ''; position: absolute; top: 2px; left: 2px; width: 0.95rem; height: 0.95rem;
            border-radius: 9999px;
            background: #ffffff; box-shadow: 0 1px 2px rgba(0,0,0,0.2); transition: transform 0.2s ease;
          }
          .peer:checked ~ .mm-switch::after { transform: translateX(1.05rem); }
          .mm-check { width: 1.05rem; height: 1.05rem; border-radius: var(--radius-sm); accent-color: var(--primary); }

          /* Card Layouts */
          .card-header { display: flex; flex-direction: column; gap: 0.25rem; padding: 1.25rem 1.5rem; }
          .card-title { font-size: 1.0625rem; font-weight: 600; line-height: 1.35; color: var(--foreground); }
          .card-desc { color: var(--muted-foreground); font-size: 0.875rem; }
          .card-content { padding: 1.25rem 1.5rem 1.5rem; }
          .pixel-text { font-weight: 700; }
        </style>
      </head>
      <body>
        ${children}
      </body>
    </html>
  `
}
