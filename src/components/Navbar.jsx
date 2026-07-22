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
      <div class="flex h-16 items-center justify-between gap-3 px-4 sm:px-6 overflow-visible">
        <div class="flex min-w-0 items-center gap-3 sm:gap-6">
          <a href="/" class="flex shrink-0 items-center gap-3 font-semibold tracking-tight outline-none group">
            <img
              src="/logo.svg"
              alt="Sublink Worker"
              class="h-10 w-10 border-2 border-[color:rgba(241,140,110,0.4)] shadow-[4px_4px_0_rgba(0,0,0,0.2)] bg-[var(--background)] object-cover"
              width="40"
              height="40"
            />
            <span class="hidden md:inline pixel-text text-primary text-sm whitespace-nowrap group-hover:opacity-90">
              {APP_NAME}
            </span>
          </a>

          <nav class="hidden md:flex items-center gap-2 md:gap-3">
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

          <nav class="md:hidden flex items-center gap-2">
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

        <div class="flex items-center gap-2 sm:gap-3 shrink-0">
          <span class="hidden lg:inline-flex mm-chip font-mono text-[10px]">v{APP_VERSION}</span>
          <a href={DOCS_URL} target="_blank" rel="noopener noreferrer" class="mm-btn mm-btn-outline mm-btn-icon hidden sm:inline-flex" title="文档" aria-label="Docs">
            <i class="fas fa-book-open"></i>
          </a>
          <a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer" class="mm-btn mm-btn-outline mm-btn-icon" title="GitHub" aria-label="GitHub">
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
