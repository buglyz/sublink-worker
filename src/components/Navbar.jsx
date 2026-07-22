/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */
import { APP_NAME, GITHUB_REPO, DOCS_URL, APP_VERSION } from '../constants.js';

export const Navbar = () => {
  return (
    <header class="fixed top-0 inset-x-0 z-50 border-b border-[var(--border)] bg-[color-mix(in_srgb,var(--background)_86%,transparent)] backdrop-blur-md">
      <div class="mx-auto flex h-14 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
        <a href="/" class="flex min-w-0 items-center gap-2.5 group">
          <span class="flex h-8 w-8 items-center justify-center rounded-[calc(var(--radius)-2px)] bg-[var(--primary)] text-[var(--primary-foreground)] shadow-sm">
            <img src="/favicon.ico" alt="" class="h-4 w-4 brightness-0 invert dark:invert-0" />
          </span>
          <span class="truncate text-[15px] font-semibold tracking-tight text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
            {APP_NAME}
          </span>
          <span class="hidden sm:inline-flex mm-chip font-mono text-[10px]">v{APP_VERSION}</span>
        </a>

        <nav class="hidden md:flex items-center gap-1 text-sm">
          <a href="#workspace" class="mm-btn mm-btn-ghost px-3 py-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
            <i class="fas fa-bolt text-xs opacity-70"></i>
            生成
          </a>
          <a href="#nodes" class="mm-btn mm-btn-ghost px-3 py-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
            <i class="fas fa-network-wired text-xs opacity-70"></i>
            节点
          </a>
          <a href="#results" class="mm-btn mm-btn-ghost px-3 py-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
            <i class="fas fa-link text-xs opacity-70"></i>
            订阅
          </a>
          <a href={DOCS_URL} target="_blank" rel="noopener noreferrer" class="mm-btn mm-btn-ghost px-3 py-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
            <i class="fas fa-book-open text-xs opacity-70"></i>
            文档
          </a>
        </nav>

        <div class="flex items-center gap-1.5">
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
        </div>
      </div>
    </header>
  );
};
