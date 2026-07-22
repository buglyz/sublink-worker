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
    <header class="fixed top-0 left-0 right-0 z-50 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_80%,transparent)] backdrop-blur supports-[backdrop-filter]:bg-[color-mix(in_srgb,var(--background)_60%,transparent)]">
      <div class="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 overflow-hidden">
        <div class="flex min-w-0 items-center gap-3 sm:gap-6">
          <a href="/" class="flex shrink-0 items-center gap-2.5 font-semibold tracking-tight outline-none group">
            <span class="flex h-9 w-9 items-center justify-center rounded-[calc(var(--radius)-2px)] border border-[color-mix(in_srgb,var(--primary)_35%,var(--border))] bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm">
              <img src="/favicon.ico" alt="" class="h-4 w-4 brightness-0 invert dark:invert-0" />
            </span>
            <span class="hidden sm:inline text-base text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
              {APP_NAME}
            </span>
          </a>

          <nav class="hidden md:flex items-center gap-1.5">
            {NAV.map((item) => (
              <button
                type="button"
                class="mm-btn px-3 py-2 text-sm"
                x-on:click={`$store.ui.setPage('${item.id}')`}
                x-bind:class={`$store.ui.page === '${item.id}' ? 'mm-btn-secondary text-[var(--primary)]' : 'mm-btn-ghost text-[var(--muted-foreground)]'`}
              >
                <i class={`fas ${item.icon} text-xs opacity-80`}></i>
                <span>{item.label}</span>
              </button>
            ))}
          </nav>
        </div>

        <div class="flex items-center gap-1.5 shrink-0">
          <span class="hidden lg:inline-flex mm-chip font-mono text-[10px]">v{APP_VERSION}</span>
          <a
            href={DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            class="mm-btn mm-btn-ghost mm-btn-icon hidden sm:inline-flex"
            aria-label="Docs"
            title="文档"
          >
            <i class="fas fa-book-open text-[14px]"></i>
          </a>
          <a
            href={GITHUB_REPO}
            target="_blank"
            rel="noopener noreferrer"
            class="mm-btn mm-btn-ghost mm-btn-icon"
            aria-label="GitHub"
            title="GitHub"
          >
            <i class="fab fa-github text-[15px]"></i>
          </a>
          <button
            type="button"
            class="mm-btn mm-btn-ghost mm-btn-icon"
            x-on:click="toggleDarkMode()"
            aria-label="Toggle theme"
            title="主题"
          >
            <i class="fas text-[14px]" x-bind:class="darkMode ? 'fa-sun' : 'fa-moon'"></i>
          </button>
          {/* Mobile menu */}
          <div class="relative md:hidden" x-data="{ open: false }">
            <button type="button" class="mm-btn mm-btn-ghost mm-btn-icon" x-on:click="open = !open" aria-label="菜单">
              <i class="fas fa-bars text-sm"></i>
            </button>
            <div
              x-show="open"
              x-cloak
              {...{ 'x-on:click.outside': 'open = false' }}
              class="absolute right-0 top-11 w-44 mm-card p-1.5 shadow-md"
            >
              {NAV.map((item) => (
                <button
                  type="button"
                  class="mm-btn mm-btn-ghost w-full justify-start px-3 py-2 text-sm"
                  x-on:click={`$store.ui.setPage('${item.id}'); open = false`}
                  x-bind:class={`$store.ui.page === '${item.id}' ? 'text-[var(--primary)]' : ''`}
                >
                  <i class={`fas ${item.icon} text-xs w-4`}></i>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
