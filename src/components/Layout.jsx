import { html } from 'hono/html'
import { APP_KEYWORDS } from '../constants.js';

export const Layout = (props) => {
  const { title, children } = props
  return html`
    <!DOCTYPE html>
    <html lang="en" x-data="appData()">
      <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>${title}</title>
        <meta name="description" content="Convert and optimize your subscription links easily" />
        <meta name="keywords" content="${APP_KEYWORDS}" />
        <link rel="icon" type="image/x-icon" href="/favicon.ico" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
        <link href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet" />
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
              console.error('Failed to initialize Alpine.js. Interactive features are disabled.');
              const warning = document.createElement('div');
              warning.className = 'fixed bottom-4 right-4 z-[100] bg-rose-50 text-rose-700 border border-rose-200 px-4 py-2.5 rounded-xl shadow-lg text-sm';
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
                    50: '#f0fdfa',
                    100: '#ccfbf1',
                    200: '#99f6e4',
                    300: '#5eead4',
                    400: '#2dd4bf',
                    500: '#14b8a6',
                    600: '#0d9488',
                    700: '#0f766e',
                    800: '#115e59',
                    900: '#134e4a',
                    950: '#042f2e',
                  },
                  surface: {
                    50: '#f8faf9',
                    100: '#f1f5f4',
                    200: '#e4ebe9',
                    800: '#1a2220',
                    850: '#141b19',
                    900: '#0e1412',
                    950: '#080c0b',
                  }
                },
                fontFamily: {
                  sans: ['DM Sans', 'system-ui', '-apple-system', 'sans-serif'],
                  mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
                },
                boxShadow: {
                  soft: '0 1px 2px rgba(15, 23, 20, 0.04), 0 4px 16px rgba(15, 23, 20, 0.04)',
                  lift: '0 8px 30px rgba(15, 23, 20, 0.08)',
                  glow: '0 0 0 1px rgba(20, 184, 166, 0.12), 0 8px 24px rgba(13, 148, 136, 0.15)',
                },
                borderRadius: {
                  '2xl': '1rem',
                  '3xl': '1.25rem',
                }
              }
            }
          }
        </script>
        <style>
          :root {
            --bg: #f6f8f7;
            --fg: #0f1a17;
            --muted: #5c6b66;
            --card: #ffffff;
            --border: #e2eae7;
            --ring: #14b8a6;
          }
          html.dark {
            --bg: #0a0f0e;
            --fg: #e8efec;
            --muted: #8a9a94;
            --card: #121a18;
            --border: #24302c;
            --ring: #2dd4bf;
          }
          body {
            font-family: 'DM Sans', system-ui, -apple-system, sans-serif;
            position: relative;
            min-height: 100vh;
            background: var(--bg);
            color: var(--fg);
            -webkit-font-smoothing: antialiased;
          }
          body::before {
            content: '';
            position: fixed;
            inset: 0;
            z-index: -2;
            background:
              radial-gradient(ellipse 90% 55% at 50% -15%, rgba(20, 184, 166, 0.10) 0%, transparent 55%),
              radial-gradient(ellipse 50% 35% at 100% 20%, rgba(45, 212, 191, 0.06) 0%, transparent 50%),
              radial-gradient(ellipse 40% 30% at 0% 70%, rgba(15, 118, 110, 0.05) 0%, transparent 50%);
            pointer-events: none;
          }
          html.dark body::before {
            background:
              radial-gradient(ellipse 90% 55% at 50% -15%, rgba(20, 184, 166, 0.14) 0%, transparent 55%),
              radial-gradient(ellipse 50% 35% at 100% 20%, rgba(45, 212, 191, 0.07) 0%, transparent 50%),
              radial-gradient(ellipse 40% 30% at 0% 70%, rgba(15, 118, 110, 0.08) 0%, transparent 50%);
          }
          body::after {
            content: '';
            position: fixed;
            inset: 0;
            z-index: -1;
            opacity: 0.35;
            pointer-events: none;
            background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
            background-size: 180px 180px;
          }
          html.dark body::after { opacity: 0.12; }
          [x-cloak] { display: none !important; }
          .ui-card {
            background: var(--card);
            border: 1px solid var(--border);
            border-radius: 1.1rem;
            box-shadow: 0 1px 2px rgba(15, 23, 20, 0.03);
          }
          html.dark .ui-card {
            box-shadow: 0 1px 0 rgba(255,255,255,0.03) inset;
          }
          .ui-input {
            width: 100%;
            border-radius: 0.75rem;
            border: 1px solid var(--border);
            background: color-mix(in srgb, var(--card) 88%, var(--bg));
            color: var(--fg);
            padding: 0.625rem 0.9rem;
            transition: border-color .15s, box-shadow .15s, background .15s;
          }
          .ui-input:focus {
            outline: none;
            border-color: color-mix(in srgb, var(--ring) 55%, var(--border));
            box-shadow: 0 0 0 3px color-mix(in srgb, var(--ring) 22%, transparent);
          }
          .ui-chip {
            display: inline-flex;
            align-items: center;
            gap: 0.35rem;
            border-radius: 999px;
            border: 1px solid var(--border);
            background: color-mix(in srgb, var(--card) 70%, var(--bg));
            padding: 0.2rem 0.65rem;
            font-size: 0.75rem;
            color: var(--muted);
          }
          .ui-toggle {
            width: 2.75rem;
            height: 1.5rem;
            border-radius: 999px;
            background: #c5d0cc;
            position: relative;
            transition: background .2s;
          }
          html.dark .ui-toggle { background: #2a3834; }
          .peer:checked ~ .ui-toggle { background: #0d9488; }
          .ui-toggle::after {
            content: '';
            position: absolute;
            top: 2px; left: 2px;
            width: 1.25rem; height: 1.25rem;
            border-radius: 999px;
            background: #fff;
            box-shadow: 0 1px 2px rgba(0,0,0,.12);
            transition: transform .2s;
          }
          .peer:checked ~ .ui-toggle::after { transform: translateX(1.25rem); }
          ::selection {
            background: color-mix(in srgb, var(--ring) 35%, transparent);
          }
          textarea, input, select, button { font-family: inherit; }
          .font-mono, .font-mono * { font-family: 'JetBrains Mono', ui-monospace, monospace; }
        </style>
        <script>
          function appData() {
            return {
              darkMode: localStorage.getItem('theme') === 'dark' || (!localStorage.getItem('theme') && window.matchMedia('(prefers-color-scheme: dark)').matches),
              toggleDarkMode() {
                this.darkMode = !this.darkMode;
                localStorage.setItem('theme', this.darkMode ? 'dark' : 'light');
                if (this.darkMode) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              },
              init() {
                if (this.darkMode) {
                  document.documentElement.classList.add('dark');
                }
              }
            }
          }

          function updateChecker(currentVersion, apiUrl) {
            return {
              currentVersion: currentVersion,
              latestVersion: '',
              showUpdateToast: false,
              i18n: {
                newVersionAvailable: getUpdateI18n('newVersionAvailable'),
                currentVersion: getUpdateI18n('currentVersion'),
                viewRelease: getUpdateI18n('viewRelease'),
                updateGuide: getUpdateI18n('updateGuide'),
                later: getUpdateI18n('later')
              },
              init() {
                setTimeout(() => this.checkForUpdates(), 3000);
              },
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

                  const response = await fetch(apiUrl, {
                    headers: { 'Accept': 'application/vnd.github.v3+json' }
                  });

                  if (!response.ok) return;

                  const data = await response.json();
                  const latestVersion = (data.tag_name || '').replace(/^v/, '');

                  localStorage.setItem('sublink_latest_version', latestVersion);
                  localStorage.setItem('sublink_last_version_check', now.toString());

                  if (latestVersion && latestVersion !== dismissedVersion && this.compareVersions(latestVersion, this.currentVersion) > 0) {
                    this.latestVersion = latestVersion;
                    this.showUpdateToast = true;
                  }
                } catch (error) {
                  console.debug('Version check failed:', error.message);
                }
              },
              compareVersions(v1, v2) {
                const parts1 = v1.split('.').map(Number);
                const parts2 = v2.split('.').map(Number);
                for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
                  const p1 = parts1[i] || 0;
                  const p2 = parts2[i] || 0;
                  if (p1 > p2) return 1;
                  if (p1 < p2) return -1;
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
              'zh-CN': {
                newVersionAvailable: '发现新版本',
                currentVersion: '当前版本',
                viewRelease: '查看更新',
                updateGuide: '更新指南',
                later: '稍后提醒'
              },
              'zh-TW': {
                newVersionAvailable: '發現新版本',
                currentVersion: '當前版本',
                viewRelease: '查看更新',
                updateGuide: '更新指南',
                later: '稍後提醒'
              },
              'en-US': {
                newVersionAvailable: 'New Version Available',
                currentVersion: 'Current',
                viewRelease: 'View Release',
                updateGuide: 'Update Guide',
                later: 'Later'
              },
              'fa': {
                newVersionAvailable: 'نسخه جدید موجود است',
                currentVersion: 'نسخه فعلی',
                viewRelease: 'مشاهده نسخه',
                updateGuide: 'راهنمای به‌روزرسانی',
                later: 'بعداً'
              },
              'ru': {
                newVersionAvailable: 'Доступна новая версия',
                currentVersion: 'Текущая',
                viewRelease: 'Посмотреть',
                updateGuide: 'Руководство по обновлению',
                later: 'Позже'
              }
            };
            const langKey = Object.keys(translations).find(k => lang.startsWith(k.split('-')[0])) || 'en-US';
            return translations[langKey][key] || translations['en-US'][key];
          }
        </script>
      </head>
      <body class="bg-surface-50 dark:bg-surface-950 text-gray-900 dark:text-gray-100 transition-colors duration-300">
        ${children}
      </body>
    </html>
  `
}
