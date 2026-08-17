/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */
import { APP_NAME, GITHUB_REPO, APP_VERSION } from '../constants.js';

const NAV = [
  { id: 'generate', label: '生成订阅', icon: 'fa-bolt' },
  { id: 'nodes', label: '节点管理', icon: 'fa-network-wired' },
  { id: 'subs', label: '订阅管理', icon: 'fa-folder-open' },
  { id: 'subscribe', label: '订阅链接', icon: 'fa-link' },
];

export const Navbar = () => {
  return (
    <header class="fixed top-0 left-0 right-0 z-50 border-b border-[var(--border)] bg-[var(--card)]/80 backdrop-blur-md transition-colors duration-200">
      <div class="flex h-16 items-center justify-between px-4 sm:px-6 max-w-7xl mx-auto">
        <div class="flex items-center gap-3 sm:gap-6 min-w-0">
          <a href="/" class="flex items-center gap-2.5 font-semibold text-base tracking-tight transition hover:opacity-85 outline-none shrink-0 group">
            <div class="h-9 w-9 rounded-lg overflow-hidden border border-[var(--border)] shadow-xs bg-[var(--card)] flex items-center justify-center p-1 group-hover:border-[var(--primary)] transition-colors">
              <img
                src="/logo.svg"
                alt=""
                class="h-full w-full object-contain"
                width="36"
                height="36"
              />
            </div>
            <span class="font-bold text-sm sm:text-base tracking-tight text-[var(--foreground)]">{APP_NAME}</span>
          </a>

          {/* Desktop Nav */}
          <nav class="hidden md:flex items-center gap-1 bg-[var(--secondary)] p-1 rounded-xl border border-[var(--border)]">
            {NAV.map((item) => (
              <button
                type="button"
                class="inline-flex items-center gap-2 py-1.5 px-3.5 rounded-lg text-sm font-medium transition-all"
                data-page={item.id}
                x-on:click="setPage($el.dataset.page)"
                x-bind:class={`page === "${item.id}" ? "bg-[var(--card)] text-[var(--primary)] shadow-xs font-semibold" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--card)]/50"`}
              >
                <i class={`fas ${item.icon} text-xs shrink-0`}></i>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Mobile Nav */}
          <nav class="md:hidden flex items-center gap-1 bg-[var(--secondary)] p-0.5 rounded-lg border border-[var(--border)]">
            {NAV.map((item) => (
              <button
                type="button"
                class="inline-flex items-center justify-center h-8.5 w-8.5 rounded-md text-sm transition-all"
                data-page={item.id}
                x-on:click="setPage($el.dataset.page)"
                x-bind:class={`page === "${item.id}" ? "bg-[var(--card)] text-[var(--primary)] shadow-xs font-semibold" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"`}
                title={item.label}
                aria-label={item.label}
              >
                <i class={`fas ${item.icon}`}></i>
              </button>
            ))}
          </nav>
        </div>

        <div class="flex items-center gap-2 sm:gap-2.5">
          {/* Node Count Indicator */}
          <div
            class="hidden sm:inline-flex items-center gap-1.5 text-xs font-mono px-2.5 py-1 rounded-full bg-[var(--secondary)] border border-[var(--border)] text-[var(--foreground)] font-medium"
            x-show="$store.auth.authenticated && $store.auth.nodeCount"
          >
            <span class="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            <span x-text="($store.auth.nodeCount || 0) + ' 节点'"></span>
          </div>

          <span class="hidden lg:inline text-xs font-mono text-[var(--muted-foreground)]">v{APP_VERSION}</span>

          {/* Logout */}
          <template x-if="$store.auth.authenticated && $store.auth.authRequired">
            <button
              type="button"
              class="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--secondary)] hover:text-red-500 transition-colors text-sm"
              x-on:click="$store.auth.logout()"
              title="退出登录"
            >
              <i class="fas fa-right-from-bracket"></i>
            </button>
          </template>

          {/* GitHub */}
          <a
            href={GITHUB_REPO}
            target="_blank"
            rel="noopener noreferrer"
            class="h-9 w-9 hidden sm:inline-flex items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--secondary)] transition-colors text-sm text-[var(--foreground)]"
            title="GitHub 仓库"
          >
            <i class="fab fa-github"></i>
          </a>

          {/* Dark Mode Toggle */}
          <button
            type="button"
            class="h-9 w-9 inline-flex items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--secondary)] transition-colors text-sm text-[var(--foreground)]"
            x-on:click="toggleDarkMode()"
            title="切换暗色/亮色主题"
          >
            <i class="fas" x-bind:class={'darkMode ? "fa-sun text-amber-400" : "fa-moon text-slate-600"'}></i>
          </button>
        </div>
      </div>
    </header>
  );
};

