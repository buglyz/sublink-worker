import { html } from 'hono/html'
import { APP_KEYWORDS } from '../constants.js';

export const Layout = (props) => {
  const { title, children } = props
  return html`
    <!DOCTYPE html>
    <html lang="zh-CN" x-data="appData()">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <meta name="theme-color" content="#fffaf7" />
        <title>${title}</title>
        <meta name="description" content="Convert and optimize your subscription links easily" />
        <meta name="keywords" content="${APP_KEYWORDS}" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.1/css/all.min.css" rel="stylesheet" />
        <script src="https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.min.js"></script>
        <script src="https://cdn.jsdelivr.net/npm/js-yaml@4.1.0/dist/js-yaml.min.js"></script>
        <script defer src="https://cdn.jsdelivr.net/npm/alpinejs@3.13.10/dist/cdn.min.js" onerror="window.__alpineFailed=true"></script>
        <script>
          window.__alpineLoaded = false;
          document.addEventListener('alpine:init', () => { window.__alpineLoaded = true; });
          window.addEventListener('DOMContentLoaded', () => {
            if (window.__alpineFailed || !window.__alpineLoaded) {
              const warning = document.createElement('div');
              warning.className = 'fixed bottom-4 right-4 z-[100] bg-red-50 text-red-700 border border-red-200 px-4 py-2.5 text-sm shadow';
              warning.textContent = '加载 Alpine.js 失败，页面交互功能不可用，请刷新或检查网络。';
              document.body.appendChild(warning);
            }
          });
        </script>
        <script>
          tailwind.config = {
            darkMode: 'class',
            theme: {
              extend: {
                colors: {
                  brand: {
                    50: '#fef5f2',
                    100: '#fde8e2',
                    200: '#fbd4c9',
                    300: '#f7b5a3',
                    400: '#f18c6e',
                    500: '#d97757',
                    600: '#c55438',
                    700: '#a4432d',
                    800: '#873829',
                    900: '#713128',
                  },
                  ink: {
                    50: '#fafafa',
                    100: '#f4f4f5',
                    200: '#e4e4e7',
                    300: '#d4d4d8',
                    400: '#a1a1aa',
                    500: '#71717a',
                    600: '#52525b',
                    700: '#3f3f46',
                    800: '#27272a',
                    900: '#18181b',
                  }
                },
                fontFamily: {
                  sans: ['Inter', 'PingFang SC', 'Microsoft YaHei', 'system-ui', 'sans-serif'],
                  mono: ['JetBrains Mono', 'SFMono-Regular', 'Consolas', 'monospace'],
                },
                borderRadius: {
                  DEFAULT: '0.625rem',
                }
              }
            }
          }
        </script>
        <style>
          :root {
            --radius: 0.625rem;
            --brand: #d97757;
            --brand-400: #f18c6e;
            --brand-600: #c55438;
            --background: hsl(60 20% 99%);
            --foreground: #271610;
            --card: hsl(60 20% 99%);
            --card-foreground: #33170f;
            --muted: #f7ebdf;
            --muted-foreground: #816055;
            --secondary: #fbe7da;
            --secondary-foreground: #873829;
            --border: rgba(137, 110, 96, 0.38);
            --input: rgba(137, 110, 96, 0.45);
            --ring: rgba(217, 119, 87, 0.55);
            --primary: #d97757;
            --primary-foreground: #fffaf7;
            --destructive: #ef4444;
            --shadow: 0 1px 3px rgba(39, 22, 16, 0.08), 0 1px 2px rgba(39, 22, 16, 0.04);
            --shadow-md: 0 4px 12px rgba(39, 22, 16, 0.08);
          }
          html.dark {
            --background: #10131c;
            --foreground: #f9f4f1;
            --card: #10131c;
            --card-foreground: #f6eee8;
            --muted: #1c2131;
            --muted-foreground: #cfb8af;
            --secondary: #1d2232;
            --secondary-foreground: #fde8e2;
            --border: rgba(255, 255, 255, 0.08);
            --input: rgba(255, 255, 255, 0.12);
            --ring: rgba(241, 140, 110, 0.45);
            --primary: #f18c6e;
            --primary-foreground: #30160f;
            --destructive: #f87171;
            --shadow: 0 1px 0 rgba(255,255,255,0.04) inset;
            --shadow-md: 0 8px 24px rgba(0,0,0,0.35);
          }
          * { box-sizing: border-box; border-color: var(--border); }
          body {
            margin: 0;
            min-height: 100vh;
            font-family: Inter, 'PingFang SC', 'Microsoft YaHei', system-ui, sans-serif;
            background: var(--background);
            color: var(--foreground);
            -webkit-font-smoothing: antialiased;
            background-image:
              radial-gradient(1100px circle at 5% -10%, rgba(217, 119, 87, 0.18), transparent 60%),
              radial-gradient(900px circle at 90% 0%, rgba(96, 165, 250, 0.10), transparent 65%),
              linear-gradient(180deg, rgba(255, 247, 242, 0.98), rgba(255, 247, 242, 1));
            background-attachment: fixed;
          }
          html.dark body {
            background-image:
              radial-gradient(900px circle at 15% -5%, rgba(241, 140, 110, 0.28), transparent 65%),
              radial-gradient(800px circle at 82% 0%, rgba(56, 189, 248, 0.14), transparent 70%),
              linear-gradient(180deg, #10131c, #0a0c14);
          }
          [x-cloak] { display: none !important; }
          ::selection { background: color-mix(in srgb, var(--primary) 35%, transparent); }

          .mm-card {
            background: var(--card);
            color: var(--card-foreground);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            box-shadow: var(--shadow);
          }
          .mm-card:hover { box-shadow: var(--shadow-md); }
          .mm-input, .mm-select, .mm-textarea {
            width: 100%;
            border: 1px solid var(--input);
            background: color-mix(in srgb, var(--card) 88%, var(--muted));
            color: var(--foreground);
            border-radius: calc(var(--radius) - 2px);
            padding: 0.55rem 0.8rem;
            font-size: 0.875rem;
            transition: border-color .15s, box-shadow .15s;
          }
          .mm-textarea { resize: vertical; min-height: 7rem; line-height: 1.5; }
          .mm-input:focus, .mm-select:focus, .mm-textarea:focus {
            outline: none;
            border-color: color-mix(in srgb, var(--primary) 55%, var(--border));
            box-shadow: 0 0 0 3px color-mix(in srgb, var(--ring) 45%, transparent);
          }
          .mm-label {
            display: block;
            font-size: 0.8125rem;
            font-weight: 500;
            color: var(--muted-foreground);
            margin-bottom: 0.4rem;
          }
          .mm-title {
            font-size: 0.95rem;
            font-weight: 600;
            color: var(--foreground);
            letter-spacing: -0.01em;
          }
          .mm-desc {
            font-size: 0.8125rem;
            color: var(--muted-foreground);
            line-height: 1.45;
          }
          .mm-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.45rem;
            border-radius: calc(var(--radius) - 2px);
            font-size: 0.875rem;
            font-weight: 500;
            border: 1px solid transparent;
            padding: 0.55rem 0.95rem;
            transition: background .15s, color .15s, border-color .15s, opacity .15s;
            cursor: pointer;
            white-space: nowrap;
          }
          .mm-btn:disabled { opacity: 0.55; cursor: not-allowed; }
          .mm-btn-primary {
            background: var(--primary);
            color: var(--primary-foreground);
          }
          .mm-btn-primary:hover:not(:disabled) {
            background: color-mix(in srgb, var(--primary) 88%, #000);
          }
          .mm-btn-secondary {
            background: var(--secondary);
            color: var(--secondary-foreground);
            border-color: var(--border);
          }
          .mm-btn-secondary:hover:not(:disabled) {
            background: color-mix(in srgb, var(--secondary) 80%, var(--primary));
          }
          .mm-btn-ghost {
            background: transparent;
            color: var(--muted-foreground);
            border-color: var(--border);
          }
          .mm-btn-ghost:hover:not(:disabled) {
            background: var(--muted);
            color: var(--foreground);
          }
          .mm-btn-danger {
            background: color-mix(in srgb, var(--destructive) 12%, transparent);
            color: var(--destructive);
            border-color: color-mix(in srgb, var(--destructive) 28%, transparent);
          }
          .mm-btn-danger:hover:not(:disabled) {
            background: color-mix(in srgb, var(--destructive) 18%, transparent);
          }
          .mm-btn-icon {
            width: 2.25rem;
            height: 2.25rem;
            padding: 0;
          }
          .mm-chip {
            display: inline-flex;
            align-items: center;
            gap: 0.3rem;
            border: 1px solid var(--border);
            background: color-mix(in srgb, var(--muted) 70%, transparent);
            color: var(--muted-foreground);
            border-radius: 999px;
            padding: 0.15rem 0.6rem;
            font-size: 0.72rem;
            font-weight: 500;
          }
          .mm-tab {
            display: inline-flex;
            align-items: center;
            gap: 0.4rem;
            padding: 0.45rem 0.85rem;
            font-size: 0.8125rem;
            font-weight: 500;
            color: var(--muted-foreground);
            border: 1px solid transparent;
            border-radius: calc(var(--radius) - 2px);
            background: transparent;
            cursor: pointer;
            transition: all .15s;
          }
          .mm-tab[data-active="true"], .mm-tab.is-active {
            background: var(--card);
            color: var(--primary);
            border-color: var(--border);
            box-shadow: var(--shadow);
          }
          .mm-tab-bar {
            display: inline-flex;
            flex-wrap: wrap;
            gap: 0.25rem;
            padding: 0.25rem;
            background: var(--muted);
            border: 1px solid var(--border);
            border-radius: var(--radius);
          }
          .mm-switch {
            position: relative;
            width: 2.5rem;
            height: 1.4rem;
            border-radius: 999px;
            background: color-mix(in srgb, var(--muted-foreground) 28%, transparent);
            transition: background .15s;
            flex-shrink: 0;
          }
          .peer:checked ~ .mm-switch { background: var(--primary); }
          .mm-switch::after {
            content: '';
            position: absolute;
            top: 2px; left: 2px;
            width: 1.05rem; height: 1.05rem;
            border-radius: 999px;
            background: #fff;
            box-shadow: 0 1px 2px rgba(0,0,0,.15);
            transition: transform .15s;
          }
          .peer:checked ~ .mm-switch::after { transform: translateX(1.05rem); }
          .mm-check {
            width: 1rem; height: 1rem;
            border-radius: 0.25rem;
            border: 1px solid var(--input);
            accent-color: var(--primary);
          }
          .mm-section-head {
            display: flex;
            align-items: flex-start;
            justify-content: space-between;
            gap: 0.75rem;
            margin-bottom: 1rem;
          }
          .mm-section-head .icon {
            width: 2rem; height: 2rem;
            border-radius: calc(var(--radius) - 2px);
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background: color-mix(in srgb, var(--primary) 12%, transparent);
            color: var(--primary);
            flex-shrink: 0;
          }
          .font-mono, .font-mono * { font-family: 'JetBrains Mono', ui-monospace, monospace; }
          textarea, input, select, button { font-family: inherit; }
          @media (max-width: 767px) {
            input, select, textarea { font-size: 16px !important; }
          }
        </style>
        <script>
          document.addEventListener('alpine:init', () => {
            const saved = localStorage.getItem('sublink_page') || 'generate';
            Alpine.store('ui', {
              page: ['generate', 'nodes', 'subscribe'].includes(saved) ? saved : 'generate',
              setPage(p) {
                if (!['generate', 'nodes', 'subscribe'].includes(p)) return;
                this.page = p;
                localStorage.setItem('sublink_page', p);
                if (p === 'subscribe') {
                  setTimeout(() => {
                    const el = document.getElementById('results');
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 40);
                } else {
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }
                try {
                  history.replaceState(null, '', '#' + p);
                } catch {}
              }
            });
          });

          function appData() {
            return {
              darkMode: localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches),
              get page() {
                return Alpine.store('ui')?.page || 'generate';
              },
              setPage(p) {
                Alpine.store('ui')?.setPage(p);
              },
              toggleDarkMode() {
                this.darkMode = !this.darkMode;
                localStorage.setItem('theme', this.darkMode ? 'dark' : 'light');
                document.documentElement.classList.toggle('dark', this.darkMode);
                const meta = document.querySelector('meta[name="theme-color"]');
                if (meta) meta.setAttribute('content', this.darkMode ? '#10131c' : '#fffaf7');
              },
              init() {
                document.documentElement.classList.toggle('dark', this.darkMode);
                const meta = document.querySelector('meta[name="theme-color"]');
                if (meta) meta.setAttribute('content', this.darkMode ? '#10131c' : '#fffaf7');
                const hash = (location.hash || '').replace('#', '');
                const map = { workspace: 'generate', results: 'subscribe' };
                const page = map[hash] || hash;
                if (['generate', 'nodes', 'subscribe'].includes(page)) {
                  Alpine.store('ui')?.setPage(page);
                }
                window.addEventListener('hashchange', () => {
                  const h = (location.hash || '').replace('#', '');
                  if (['generate', 'nodes', 'subscribe'].includes(h)) Alpine.store('ui')?.setPage(h);
                });
              }
            }
          }

          function updateChecker(currentVersion, apiUrl) {
            return {
              currentVersion,
              latestVersion: '',
              showUpdateToast: false,
              i18n: {
                newVersionAvailable: getUpdateI18n('newVersionAvailable'),
                viewRelease: getUpdateI18n('viewRelease'),
                updateGuide: getUpdateI18n('updateGuide'),
                later: getUpdateI18n('later')
              },
              init() { setTimeout(() => this.checkForUpdates(), 3000); },
              async checkForUpdates() {
                try {
                  const dismissedVersion = localStorage.getItem('sublink_dismissed_version');
                  const lastCheck = localStorage.getItem('sublink_last_version_check');
                  const now = Date.now();
                  if (lastCheck && (now - parseInt(lastCheck)) < 3600000) {
                    const cachedVersion = localStorage.getItem('sublink_latest_version');
                    if (cachedVersion && cachedVersion !== dismissedVersion && this.compareVersions(cachedVersion, this.currentVersion) > 0) {
                      this.latestVersion = cachedVersion;
                      this.showUpdateToast = true;
                    }
                    return;
                  }
                  const response = await fetch(apiUrl, { headers: { 'Accept': 'application/vnd.github.v3+json' } });
                  if (!response.ok) return;
                  const data = await response.json();
                  const latestVersion = (data.tag_name || '').replace(/^v/, '');
                  localStorage.setItem('sublink_latest_version', latestVersion);
                  localStorage.setItem('sublink_last_version_check', now.toString());
                  if (latestVersion && latestVersion !== dismissedVersion && this.compareVersions(latestVersion, this.currentVersion) > 0) {
                    this.latestVersion = latestVersion;
                    this.showUpdateToast = true;
                  }
                } catch (e) { console.debug('Version check failed:', e.message); }
              },
              compareVersions(v1, v2) {
                const a = v1.split('.').map(Number), b = v2.split('.').map(Number);
                for (let i = 0; i < Math.max(a.length, b.length); i++) {
                  const x = a[i] || 0, y = b[i] || 0;
                  if (x > y) return 1; if (x < y) return -1;
                }
                return 0;
              },
              dismissUpdate() {
                this.showUpdateToast = false;
                localStorage.setItem('sublink_dismissed_version', this.latestVersion);
              }
            }
          }

          function getUpdateI18n(key) {
            const lang = navigator.language || 'en-US';
            const translations = {
              'zh-CN': { newVersionAvailable: '发现新版本', viewRelease: '查看更新', updateGuide: '更新指南', later: '稍后' },
              'zh-TW': { newVersionAvailable: '發現新版本', viewRelease: '查看更新', updateGuide: '更新指南', later: '稍後' },
              'en-US': { newVersionAvailable: 'New Version Available', viewRelease: 'View Release', updateGuide: 'Update Guide', later: 'Later' },
              'fa': { newVersionAvailable: 'نسخه جدید موجود است', viewRelease: 'مشاهده نسخه', updateGuide: 'راهنما', later: 'بعداً' },
              'ru': { newVersionAvailable: 'Доступна новая версия', viewRelease: 'Посмотреть', updateGuide: 'Гайд', later: 'Позже' }
            };
            const langKey = Object.keys(translations).find(k => lang.startsWith(k.split('-')[0])) || 'en-US';
            return translations[langKey][key] || translations['en-US'][key];
          }
        </script>
      </head>
      <body>
        ${children}
      </body>
    </html>
  `
}
