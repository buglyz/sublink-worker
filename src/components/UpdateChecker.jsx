/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */
import { APP_VERSION, GITHUB_REPO, GITHUB_API_RELEASES, DOCS_URL } from '../constants.js';

export const UpdateChecker = () => {
  const xData = `updateChecker('${APP_VERSION}', '${GITHUB_API_RELEASES}')`;
  const releaseUrl = `${GITHUB_REPO}/releases/latest`;
  const updateGuideUrl = `${DOCS_URL}/guide/faq#使用-vercel-cloudflare-快速部署按钮后-如何同步上游更新`;

  return (
    <div
      x-data={xData}
      x-show="showUpdateToast"
      x-cloak
      x-transition:enter="transition ease-out duration-200"
      x-transition:enter-start="opacity-0 translate-y-2"
      x-transition:enter-end="opacity-100 translate-y-0"
      class="fixed bottom-5 right-5 z-50 w-[calc(100vw-2.5rem)] max-w-sm"
    >
      <div class="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-lg">
        <div class="flex items-start gap-3">
          <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--primary-light)] text-[var(--primary)] text-xs">
            <i class="fas fa-arrow-up"></i>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2 text-xs font-semibold text-[var(--foreground)]">
              <span x-text="i18n.newVersionAvailable"></span>
              <span class="font-mono text-[10px] mm-chip" x-text="'v' + latestVersion"></span>
            </div>
            <div class="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <a href={releaseUrl} target="_blank" rel="noopener noreferrer" class="font-medium text-[var(--primary)] hover:underline">
                <span x-text="i18n.viewRelease"></span>
              </a>
              <span class="opacity-30">·</span>
              <button type="button" x-on:click="dismissUpdate()" class="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
                <span x-text="i18n.later"></span>
              </button>
              <span class="opacity-30">·</span>
              <a href={updateGuideUrl} target="_blank" rel="noopener noreferrer" class="text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
                <span x-text="i18n.updateGuide"></span>
              </a>
            </div>
          </div>
          <button type="button" x-on:click="dismissUpdate()" class="text-[var(--muted-foreground)] hover:text-[var(--foreground)] p-1 transition-colors" aria-label="Close">
            <i class="fas fa-times text-xs"></i>
          </button>
        </div>
      </div>
    </div>
  );
};

