/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */
import { APP_NAME, GITHUB_REPO, DOCS_URL, APP_VERSION } from '../constants.js';

const NAV = [
  { id: 'generate', label: '生成订阅', icon: 'fa-bolt' },
  { id: 'nodes', label: '节点管理', icon: 'fa-network-wired' },
  { id: 'subscribe', label: '订阅链接', icon: 'fa-link' },
];

export const Navbar = () => {
  return (
    <header class="fixed top-0 left-0 right-0 z-50 border-b border-[color:rgba(241,140,110,0.22)] bg-[color-mix(in_srgb,var(--background)_80%,transparent)] backdrop-blur supports-[backdrop-filter]:bg-[color-mix(in_srgb,var(--background)_60%,transparent)]">
      <div class="flex h-16 items-center justify-between px-4 sm:px-6 overflow-visible">
        <div class="flex items-center gap-4 sm:gap-6 min-w-0">
          <a href="/" class="flex items-center gap-3 font-semibold text-lg tracking-tight transition hover:text-primary outline-none shrink-0">
            <img
              src="/logo.svg"
              alt=""
              class="h-10 w-10 border-2 border-[color:rgba(241,140,110,0.4)] shadow-[4px_4px_0_rgba(0,0,0,0.2)] shrink-0 bg-[var(--background)] object-cover"
              width="40"
              height="40"
            />
            <span class="hidden md:inline pixel-text text-primary text-base whitespace-nowrap">{APP_NAME}</span>
          </a>

          <nav class="hidden md:flex items-center gap-2 md:gap-3">
            {NAV.map((item) => (
              <button
                type="button"
                class="pixel-button inline-flex items-center gap-2 py-2 h-9 px-3 text-sm font-semibold uppercase tracking-widest bg-[color-mix(in_srgb,var(--background)_75%,transparent)] text-foreground border-2 border-[color:rgba(137,110,96,0.45)] hover:bg-[color-mix(in_srgb,var(--accent)_35%,transparent)] transition-all whitespace-nowrap"
                data-page={item.id}
                x-on:click="setPage($el.dataset.page)"
                x-bind:class={`page === '${item.id}' ? 'bg-[color-mix(in_srgb,var(--primary)_20%,transparent)] text-[var(--primary)] border-[color:rgba(217,119,87,0.55)]' : ''`}
              >
                <i class={`fas ${item.icon} text-[15px] shrink-0`}></i>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <nav class="md:hidden flex items-center gap-2">
            {NAV.map((item) => (
              <button
                type="button"
                class="pixel-button inline-flex items-center justify-center h-9 w-9 border-2 border-[color:rgba(137,110,96,0.45)] bg-[color-mix(in_srgb,var(--background)_75%,transparent)]"
                data-page={item.id}
                x-on:click="setPage($el.dataset.page)"
                x-bind:class={`page === '${item.id}' ? 'bg-[color-mix(in_srgb,var(--primary)_20%,transparent)] text-[var(--primary)] border-[color:rgba(217,119,87,0.55)]' : ''`}
                title={item.label}
                aria-label={item.label}
              >
                <i class={`fas ${item.icon}`}></i>
              </button>
            ))}
          </nav>
        </div>

        <div class="flex items-center gap-2 sm:gap-3 pl-2 sm:pl-0">
          <span
            class="hidden sm:inline-flex text-[10px] font-mono uppercase tracking-wider px-2 py-1 border-2 border-[var(--border)]"
            x-show="$store.auth.authenticated && $store.auth.nodeCount"
            x-text="($store.auth.nodeCount || 0) + ' nodes'"
          ></span>
          <span class="hidden lg:inline text-[10px] font-mono opacity-60">v{APP_VERSION}</span>

          <template x-if="$store.auth.authRequired && !$store.auth.authenticated">
            <div class="relative" x-data="{ open: false }">
              <button type="button" class="pixel-button h-9 px-3 text-sm font-semibold border-2 border-[color:rgba(217,119,87,0.55)] bg-[color-mix(in_srgb,var(--primary)_20%,transparent)] text-[var(--primary)]" x-on:click="open = !open">
                登录
              </button>
              <div
                x-show="open"
                x-cloak
                class="absolute right-0 top-11 w-72 pixel-card mm-card p-4 z-[120]"
                {...{ 'x-on:click.outside': 'open = false' }}
              >
                <p class="text-sm font-semibold mb-1">管理登录</p>
                <p class="text-muted text-xs mb-3">AUTH_PASSWORD · KV 同步</p>
                <input type="password" class="mm-input mb-2" placeholder="密码" x-model="$store.auth.password" {...{ 'x-on:keydown.enter.prevent': '$store.auth.login()' }} />
                <p class="text-xs text-red-500 mb-2" x-show="$store.auth.error" x-text="$store.auth.error"></p>
                <button type="button" class="mm-btn mm-btn-primary w-full" x-on:click="$store.auth.login().then(() => open = false)" x-bind:disabled="$store.auth.loading">确认</button>
              </div>
            </div>
          </template>

          <template x-if="$store.auth.authenticated && $store.auth.authRequired">
            <button type="button" class="pixel-button h-9 w-9 border-2 border-[color:rgba(137,110,96,0.45)]" x-on:click="$store.auth.logout()" title="退出">
              <i class="fas fa-right-from-bracket text-xs"></i>
            </button>
          </template>

          <a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer" class="pixel-button hidden sm:inline-flex h-9 w-9 items-center justify-center border-2 border-[color:rgba(137,110,96,0.45)]" title="GitHub">
            <i class="fab fa-github"></i>
          </a>
          <button type="button" class="pixel-button h-9 w-9 border-2 border-[color:rgba(137,110,96,0.45)]" x-on:click="toggleDarkMode()" title="主题">
            <i class="fas" x-bind:class="darkMode ? 'fa-sun' : 'fa-moon'"></i>
          </button>
        </div>
      </div>
    </header>
  );
};
