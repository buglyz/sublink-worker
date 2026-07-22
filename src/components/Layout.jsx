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
                if (saved === 'generate' || saved === 'nodes' || saved === 'subscribe') return saved;
                var hash = (location.hash || '').replace('#', '');
                if (hash === 'nodes' || hash === 'subscribe' || hash === 'generate') return hash;
              } catch (e) {}
              return 'generate';
            })(),
            setPage: function (p) {
              if (p !== 'generate' && p !== 'nodes' && p !== 'subscribe') return;
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
                  if (h === 'generate' || h === 'nodes' || h === 'subscribe') self.setPage(h);
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
                    50:'#fef5f2',100:'#fde8e2',200:'#fbd4c9',300:'#f7b5a3',400:'#f18c6e',
                    500:'#d97757',600:'#c55438',700:'#a4432d',800:'#873829',900:'#713128'
                  }
                },
                fontFamily: {
                  sans: ['Inter', 'PingFang SC', 'Microsoft YaHei', 'system-ui', 'sans-serif'],
                  mono: ['JetBrains Mono', 'ui-monospace', 'monospace']
                },
                borderRadius: { DEFAULT: '0', none: '0' }
              }
            }
          }
        </script>
        <style>
          /* === miaomiaowu theme tokens (from theme.css) === */
          :root {
            --radius: 0;
            --brand-50:#fef5f2; --brand-100:#fde8e2; --brand-200:#fbd4c9; --brand-300:#f7b5a3;
            --brand-400:#f18c6e; --brand-500:#d97757; --brand-600:#c55438; --brand-700:#a4432d;
            --brand-800:#873829; --brand-900:#713128;
            --background: hsl(60 20% 99%);
            --foreground: #271610;
            --card: hsl(60 20% 99%);
            --card-foreground: #33170f;
            --primary: var(--brand-500);
            --primary-foreground: #fffaf7;
            --secondary: #fbe7da;
            --secondary-foreground: var(--brand-800);
            --muted: #f7ebdf;
            --muted-foreground: #816055;
            --accent: var(--brand-300);
            --accent-foreground: #36170f;
            --destructive: #ef4444;
            --border: rgba(137, 110, 96, 0.38);
            --input: rgba(137, 110, 96, 0.45);
            --ring: rgba(217, 119, 87, 0.6);
            --font-sans: Inter, 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
            --font-mono: 'JetBrains Mono', SFMono-Regular, Consolas, monospace;
          }
          html.dark {
            --background: #10131c;
            --foreground: #f9f4f1;
            --card: #10131c;
            --card-foreground: #f6eee8;
            --primary: var(--brand-400);
            --primary-foreground: #30160f;
            --secondary: #1d2232;
            --secondary-foreground: var(--brand-100);
            --muted: #1c2131;
            --muted-foreground: #cfb8af;
            --accent: rgba(241, 140, 110, 0.22);
            --accent-foreground: #ffe5da;
            --destructive: #f87171;
            --border: rgba(255, 255, 255, 0.08);
            --input: rgba(255, 255, 255, 0.12);
            --ring: rgba(241, 140, 110, 0.45);
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
              radial-gradient(1100px circle at 5% -10%, rgba(217, 119, 87, 0.2), transparent 60%),
              radial-gradient(900px circle at 90% 0%, rgba(96, 165, 250, 0.12), transparent 65%),
              linear-gradient(180deg, rgba(255, 247, 242, 0.98), rgba(255, 247, 242, 1));
            background-attachment: fixed;
          }
          html.dark body {
            background-image:
              radial-gradient(900px circle at 15% -5%, rgba(241, 140, 110, 0.32), transparent 65%),
              radial-gradient(800px circle at 82% 0%, rgba(56, 189, 248, 0.18), transparent 70%),
              linear-gradient(180deg, #10131c, #0a0c14);
          }
          [x-cloak] { display: none !important; }
          button:not(:disabled), [role=button]:not(:disabled) { cursor: pointer; }
          @media (max-width: 767px) { input, select, textarea { font-size: 16px !important; } }
          .font-mono, .font-mono * { font-family: var(--font-mono); }

          /* pixel-card (miaomiaowu) */
          .pixel-card, .mm-card {
            position: relative;
            border-width: 2px;
            border-style: solid;
            border-color: color-mix(in srgb, var(--primary) 22%, var(--border));
            background: var(--card);
            color: var(--card-foreground);
            border-radius: 0;
            box-shadow: 4px 4px 0 rgba(0,0,0,.22), 0 0 0 1px rgba(255,255,255,.04);
            overflow: hidden;
            transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
          }
          .pixel-card:hover, .mm-card:hover {
            transform: translateY(-2px);
            border-color: color-mix(in srgb, var(--primary) 40%, var(--border));
            box-shadow: 6px 6px 0 rgba(0,0,0,.26), 0 0 0 1px rgba(255,255,255,.06);
          }
          .pixel-card > *, .mm-card > * { position: relative; z-index: 1; }

          /* pixel-button */
          .pixel-button, .mm-btn {
            display: inline-flex; align-items: center; justify-content: center; gap: .5rem;
            border-width: 2px; border-style: solid; border-radius: 0;
            font-size: .875rem; font-weight: 600;
            padding: .5rem 1.1rem; white-space: nowrap;
            transition: background .15s, border-color .15s, transform .15s, box-shadow .15s;
            box-shadow: 3px 3px 0 rgba(0,0,0,.16);
          }
          .pixel-button:active:not(:disabled), .mm-btn:active:not(:disabled) {
            transform: translate(1px, 1px);
            box-shadow: 1px 1px 0 rgba(0,0,0,.16);
          }
          .mm-btn:disabled { opacity: .5; cursor: not-allowed; box-shadow: none; }
          .mm-btn-primary, .pixel-button-primary {
            background: var(--primary); color: var(--primary-foreground);
            border-color: rgba(217, 119, 87, .5);
          }
          .mm-btn-primary:hover:not(:disabled) { background: color-mix(in srgb, var(--primary) 85%, #000); border-color: rgba(217,119,87,.7); }
          .mm-btn-outline, .mm-btn-ghost {
            background: color-mix(in srgb, var(--background) 75%, transparent);
            color: var(--foreground);
            border-color: rgba(137, 110, 96, .45);
          }
          html.dark .mm-btn-outline, html.dark .mm-btn-ghost {
            border-color: rgba(255,255,255,.18);
            background: rgba(255,255,255,.04);
          }
          .mm-btn-outline:hover:not(:disabled), .mm-btn-ghost:hover:not(:disabled) {
            background: color-mix(in srgb, var(--accent) 35%, transparent);
          }
          .mm-btn-secondary {
            background: var(--secondary); color: var(--secondary-foreground);
            border-color: rgba(241, 140, 110, .38);
          }
          .mm-btn-danger {
            background: color-mix(in srgb, var(--destructive) 85%, #000);
            color: #fff; border-color: rgba(239, 68, 68, .65);
          }
          .mm-btn-icon { width: 2.25rem; height: 2.25rem; padding: 0; }
          .mm-btn-sm { height: 2.25rem; padding: .35rem .9rem; font-size: .8125rem; gap: .35rem; }
          .mm-btn-nav {
            height: 2.25rem; padding: .35rem .75rem;
            font-size: .75rem; font-weight: 700; letter-spacing: .08em; text-transform: uppercase;
          }
          .mm-btn-nav.is-active {
            background: color-mix(in srgb, var(--primary) 20%, transparent);
            color: var(--primary);
            border-color: rgba(217, 119, 87, .55);
          }

          .mm-input, .mm-select, .mm-textarea {
            width: 100%;
            border: 2px solid var(--input);
            background: color-mix(in srgb, var(--card) 88%, var(--muted));
            color: var(--foreground);
            border-radius: 0;
            padding: .55rem .8rem;
            font-size: .875rem;
          }
          .mm-textarea { resize: vertical; min-height: 7rem; line-height: 1.5; }
          .mm-input:focus, .mm-select:focus, .mm-textarea:focus {
            outline: none;
            border-color: color-mix(in srgb, var(--primary) 55%, var(--border));
            box-shadow: 0 0 0 3px color-mix(in srgb, var(--ring) 40%, transparent);
          }
          .mm-label { display: block; font-size: .875rem; font-weight: 500; margin-bottom: .4rem; }
          .mm-desc, .text-muted { color: var(--muted-foreground); font-size: .875rem; line-height: 1.45; }
          .mm-chip {
            display: inline-flex; align-items: center; gap: .3rem;
            border: 2px solid color-mix(in srgb, var(--primary) 35%, var(--border));
            background: color-mix(in srgb, var(--muted) 70%, transparent);
            color: var(--muted-foreground);
            border-radius: 0; padding: .15rem .55rem; font-size: .72rem; font-weight: 600;
          }
          .mm-tab-bar {
            display: inline-flex; flex-wrap: wrap; gap: .35rem; padding: .25rem;
            border: 2px solid var(--border); background: var(--muted);
          }
          .mm-tab {
            display: inline-flex; align-items: center; gap: .35rem;
            padding: .4rem .85rem; font-size: .8125rem; font-weight: 600;
            border: 2px solid transparent; background: transparent; color: var(--muted-foreground);
          }
          .mm-tab.is-active {
            background: var(--card); color: var(--primary);
            border-color: rgba(217, 119, 87, .45);
            box-shadow: 2px 2px 0 rgba(0,0,0,.12);
          }
          .mm-switch {
            position: relative; width: 2.5rem; height: 1.35rem; border-radius: 0;
            background: color-mix(in srgb, var(--muted-foreground) 28%, transparent); flex-shrink: 0;
            border: 2px solid var(--border);
          }
          .peer:checked ~ .mm-switch { background: var(--primary); border-color: rgba(217,119,87,.5); }
          .mm-switch::after {
            content: ''; position: absolute; top: 1px; left: 1px; width: .95rem; height: .95rem;
            background: #fff; box-shadow: 1px 1px 0 rgba(0,0,0,.15); transition: transform .15s;
          }
          .peer:checked ~ .mm-switch::after { transform: translateX(1.05rem); }
          .mm-check { width: 1rem; height: 1rem; border-radius: 0; accent-color: var(--primary); }
          .card-header { display: flex; flex-direction: column; gap: .35rem; padding: 1.25rem 1.5rem 0; }
          .card-title { font-weight: 600; line-height: 1.25; }
          .card-desc { color: var(--muted-foreground); font-size: .875rem; }
          .card-content { padding: 1rem 1.5rem 1.5rem; }
          .pixel-text { letter-spacing: .12em; text-transform: uppercase; font-weight: 700; }
        </style>
      </head>
      <body>
        ${children}
      </body>
    </html>
  `
}
