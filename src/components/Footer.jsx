/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */
import { APP_NAME, GITHUB_REPO, DOCS_URL, APP_VERSION } from '../constants.js';

export const Footer = () => {
  const currentYear = new Date().getFullYear();
  return (
    <footer class="mt-12 border-t border-[color:rgba(241,140,110,0.22)] bg-[color-mix(in_srgb,var(--background)_70%,transparent)]">
      <div class="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-[var(--muted-foreground)]">
          <span>© {currentYear} {APP_NAME}</span>
          <span class="opacity-40">·</span>
          <a href={`${GITHUB_REPO}/releases/tag/v${APP_VERSION}`} target="_blank" rel="noopener noreferrer" class="font-mono text-xs hover:text-[var(--primary)]">
            v{APP_VERSION}
          </a>
        </div>
        <div class="flex items-center gap-3 text-[var(--muted-foreground)]">
          <a href={DOCS_URL} target="_blank" rel="noopener noreferrer" class="hover:text-[var(--primary)]" aria-label="Docs"><i class="fas fa-book-open"></i></a>
          <a href={GITHUB_REPO} target="_blank" rel="noopener noreferrer" class="hover:text-[var(--primary)]" aria-label="GitHub"><i class="fab fa-github text-lg"></i></a>
        </div>
      </div>
    </footer>
  );
};
