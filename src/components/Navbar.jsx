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
    <header
      class="fixed top-0 left-0 right-0 z-[100] border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_92%,transparent)] backdrop-blur supports-[backdrop-filter]:bg-[color-mix(in_srgb,var(--background)_78%,transparent)]"
      x-data="{ mobileOpen: false }"
    >
      <div class="flex h-16 items-center justify-between gap-3 px-4 sm:px-6">
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
                data-page={item.id}
                x-on:click="setPage($el.dataset.page)"
                x-bind:class={`page === '${item.id}' ? 'mm-btn-secondary text-[var(--primary)]' : 'mm-btn-ghost text-[var(--muted-foreground)]'`}
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
          <button
            type="button"
            class="mm-btn mm-btn-ghost mm-btn-icon md:hidden"
            x-on:click="mobileOpen = !mobileOpen"
            aria-label="菜单"
            x-bind:aria-expanded="mobileOpen"
          >
            <i class="fas text-sm" x-bind:class="mobileOpen ? 'fa-times' : 'fa-bars'"></i>
          </button>
        </div>
      </div>

      {/* Mobile drawer — full width under header, above page content */}
      <div
        class="md:hidden border-t border-[var(--border)] bg-[var(--background)] shadow-md"
        x-show="mobileOpen"
        x-cloak
        x-transition:enter="transition ease-out duration-150"
        x-transition:enter-start="opacity-0 -translate-y-1"
        x-transition:enter-end="opacity-100 translate-y-0"
        x-transition:leave="transition ease-in duration-100"
        x-transition:leave-start="opacity-100"
        x-transition:leave-end="opacity-0"
      >
        <nav class="px-3 py-2 space-y-1">
          {NAV.map((item) => (
            <button
              type="button"
              class="mm-btn mm-btn-ghost w-full justify-start px-3 py-2.5 text-sm"
              data-page={item.id}
              x-on:click="setPage($el.dataset.page); mobileOpen = false"
              x-bind:class={`page === '${item.id}' ? 'mm-btn-secondary text-[var(--primary)]' : ''`}
            >
              <i class={`fas ${item.icon} text-xs w-5 opacity-80`}></i>
              {item.label}
            </button>
          ))}
          <a
            href={DOCS_URL}
            target="_blank"
            rel="noopener noreferrer"
            class="mm-btn mm-btn-ghost w-full justify-start px-3 py-2.5 text-sm"
            x-on:click="mobileOpen = false"
          >
            <i class="fas fa-book-open text-xs w-5 opacity-80"></i>
            文档
          </a>
        </nav>
      </div>

      {/* Tap outside to close (dim layer below header) */}
      <div
        class="md:hidden fixed inset-0 top-16 z-[-1] bg-black/20"
        x-show="mobileOpen"
        x-cloak
        x-on:click="mobileOpen = false"
      ></div>
    </header>
  );
};
