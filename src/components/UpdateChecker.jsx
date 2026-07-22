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
      x-transition:enter="transition ease-out duration-250"
      x-transition:enter-start="opacity-0 translate-y-2"
      x-transition:enter-end="opacity-100 translate-y-0"
      class="fixed bottom-5 right-5 z-50 w-[calc(100vw-2.5rem)] max-w-sm"
    >
      <div class="mm-card p-4">
        <div class="flex items-start gap-3">
          <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-[calc(var(--radius)-2px)] bg-[color-mix(in_srgb,var(--primary)_14%,transparent)] text-[var(--primary)]">
            <i class="fas fa-arrow-up text-sm"></i>
          </div>
          <div class="min-w-0 flex-1">
            <div class="flex flex-wrap items-center gap-2 text-sm font-semibold">
              <span x-text="i18n.newVersionAvailable"></span>
              <span class="font-mono text-[11px] mm-chip" x-text="'v' + latestVersion"></span>
            </div>
            <div class="mt-2 flex flex-wrap items-center gap-2 text-xs">
              <a href={releaseUrl} target="_blank" rel="noopener noreferrer" class="font-medium text-[var(--primary)] hover:underline">
                <span x-text="i18n.viewRelease"></span>
              </a>
              <span class="opacity-30">·</span>
              <button type="button" x-on:click="dismissUpdate()" class="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                <span x-text="i18n.later"></span>
              </button>
              <span class="opacity-30">·</span>
              <a href={updateGuideUrl} target="_blank" rel="noopener noreferrer" class="text-[var(--muted-foreground)] hover:text-[var(--foreground)]">
                <span x-text="i18n.updateGuide"></span>
              </a>
            </div>
          </div>
          <button type="button" x-on:click="dismissUpdate()" class="text-[var(--muted-foreground)] hover:text-[var(--foreground)] p-1" aria-label="Close">
            <i class="fas fa-times text-xs"></i>
          </button>
        </div>
      </div>
    </div>
  );
};
