/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */
import { APP_NAME, GITHUB_REPO, DOCS_URL, APP_VERSION } from '../constants.js';

export const Footer = () => {
  const currentYear = new Date().getFullYear();
  return (
    <footer class="mt-14 border-t border-[var(--border)] bg-[var(--card)]/50 backdrop-blur-xs py-6">
      <div class="mx-auto flex max-w-7xl flex-col gap-3 px-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div class="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-xs text-[var(--muted-foreground)]">
          <span>© {currentYear} {APP_NAME}</span>
          <span class="opacity-40">·</span>
          <a href={`${GITHUB_REPO}/releases/tag/v${APP_VERSION}`} target="_blank" rel="noopener noreferrer" class="font-mono hover:text-[var(--primary)] transition-colors">
            v{APP_VERSION}
          </a>
        </div>
        <div class="flex items-center gap-3 text-xs text-[var(--muted-foreground)]">
          <a href={DOCS_URL} target="_blank" rel="noopener noreferrer" class="hover:text-[var(--primary)] transition-colors flex items-center gap-1" aria-label="文档">
            <i class="fas fa-book-open"></i> 文档
          </a>
          <a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer" class="hover:text-[var(--primary)] transition-colors flex items-center gap-1" aria-label="GitHub">
            <i class="fab fa-github"></i> GitHub
          </a>
        </div>
      </div>
    </footer>
  );
};

