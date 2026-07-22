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
    <header class="fixed top-0 left-0 right-0 z-[100] border-b border-[color:rgba(241,140,110,0.22)] bg-[color-mix(in_srgb,var(--background)_80%,transparent)] backdrop-blur supports-[backdrop-filter]:bg-[color-mix(in_srgb,var(--background)_60%,transparent)]">
      <div class="flex h-16 items-center justify-between gap-2 sm:gap-3 px-3 sm:px-6 overflow-visible">
        <div class="flex min-w-0 items-center gap-2 sm:gap-4">
          <a href="/" class="flex shrink-0 items-center gap-2 sm:gap-3 font-semibold tracking-tight outline-none group">
            <img
              src="/logo.svg"
              alt="Sublink Worker"
              class="h-9 w-9 sm:h-10 sm:w-10 border-2 border-[color:rgba(241,140,110,0.4)] shadow-[4px_4px_0_rgba(0,0,0,0.2)] bg-[var(--background)] object-cover"
              width="40"
              height="40"
            />
            <span class="hidden md:inline pixel-text text-primary text-sm whitespace-nowrap group-hover:opacity-90">
              {APP_NAME}
            </span>
          </a>

          <nav class="hidden md:flex items-center gap-2">
            {NAV.map((item) => (
              <button
                type="button"
                class="pixel-button mm-btn mm-btn-nav mm-btn-outline"
                data-page={item.id}
                x-on:click="setPage($el.dataset.page)"
                x-bind:class={`page === '${item.id}' ? 'is-active' : ''`}
              >
                <i class={`fas ${item.icon} text-[15px]`}></i>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <nav class="md:hidden flex items-center gap-1.5">
            {NAV.map((item) => (
              <button
                type="button"
                class="pixel-button mm-btn mm-btn-outline mm-btn-icon"
                data-page={item.id}
                x-on:click="setPage($el.dataset.page)"
                x-bind:class={`page === '${item.id}' ? 'is-active' : ''`}
                title={item.label}
                aria-label={item.label}
              >
                <i class={`fas ${item.icon}`}></i>
              </button>
            ))}
          </nav>
        </div>

        <div class="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {/* 转换订阅：顶栏主操作 */}
          <button
            type="button"
            class="mm-btn mm-btn-primary mm-btn-sm sm:px-4"
            title="根据当前输入与规则生成订阅链接"
            x-on:click="
              try {
                const root = document.querySelector('#workspace');
                const data = root && root._x_dataStack && root._x_dataStack[0];
                if (!data) return;
                if (typeof data.submitForm === 'function') {
                  data.submitForm();
                  if (window.__SUBLINK_UI__) window.__SUBLINK_UI__.setPage('generate');
                  setTimeout(() => {
                    const el = document.getElementById('results');
                    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }, 200);
                }
              } catch (e) { console.error(e); }
            "
          >
            <i class="fas fa-file-export text-xs"></i>
            <span class="hidden xs:inline sm:inline">转换订阅</span>
            <span class="sm:hidden">转换</span>
          </button>

          <span
            class="hidden lg:inline-flex mm-chip font-mono text-[10px]"
            x-show="$store.auth.authenticated && $store.auth.nodeCount"
            x-text="($store.auth.nodeCount || 0) + ' nodes'"
          ></span>

          <template x-if="$store.auth.authRequired && !$store.auth.authenticated">
            <div class="relative" x-data="{ open: false }">
              <button type="button" class="mm-btn mm-btn-outline mm-btn-sm" x-on:click="open = !open">
                <i class="fas fa-right-to-bracket text-xs"></i>
                <span class="hidden sm:inline">登录</span>
              </button>
              <div
                x-show="open"
                x-cloak
                class="absolute right-0 top-11 w-72 pixel-card mm-card p-4 shadow-lg z-[120]"
                {...{ 'x-on:click.outside': 'open = false' }}
              >
                <p class="text-sm font-semibold mb-2">节点库登录</p>
                <p class="text-muted text-xs mb-3">AUTH_PASSWORD · KV 跨设备同步</p>
                <input
                  type="password"
                  class="mm-input mb-2"
                  placeholder="管理密码"
                  x-model="$store.auth.password"
                  {...{ 'x-on:keydown.enter.prevent': '$store.auth.login()' }}
                />
                <p class="text-xs text-red-500 mb-2" x-show="$store.auth.error" x-text="$store.auth.error"></p>
                <button
                  type="button"
                  class="mm-btn mm-btn-primary w-full"
                  x-on:click="$store.auth.login().then(() => open = false)"
                  x-bind:disabled="$store.auth.loading"
                >
                  确认登录
                </button>
              </div>
            </div>
          </template>

          <template x-if="$store.auth.authenticated && $store.auth.authRequired">
            <button type="button" class="mm-btn mm-btn-outline mm-btn-icon" x-on:click="$store.auth.logout()" title="退出登录">
              <i class="fas fa-right-from-bracket text-xs"></i>
            </button>
          </template>

          <a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer" class="mm-btn mm-btn-outline mm-btn-icon hidden sm:inline-flex" title="GitHub" aria-label="GitHub">
            <i class="fab fa-github"></i>
          </a>
          <button type="button" class="mm-btn mm-btn-outline mm-btn-icon" x-on:click="toggleDarkMode()" title="主题" aria-label="Toggle theme">
            <i class="fas" x-bind:class="darkMode ? 'fa-sun' : 'fa-moon'"></i>
          </button>
        </div>
      </div>
    </header>
  );
};
