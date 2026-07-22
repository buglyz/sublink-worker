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
            x-transition:enter="transition ease-out duration-300"
            x-transition:enter-start="opacity-0 translate-y-2"
            x-transition:enter-end="opacity-100 translate-y-0"
            x-transition:leave="transition ease-in duration-200"
            x-transition:leave-start="opacity-100 translate-y-0"
            x-transition:leave-end="opacity-0 translate-y-2"
            class="fixed bottom-5 right-5 z-50 max-w-sm w-[calc(100vw-2.5rem)]"
        >
            <div class="ui-card bg-white/95 dark:bg-surface-850/95 backdrop-blur-md p-4 shadow-lift">
                <div class="flex items-start gap-3">
                    <div class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-50 dark:bg-brand-900/30 text-brand-600 dark:text-brand-400">
                        <i class="fas fa-arrow-up text-sm"></i>
                    </div>
                    <div class="flex-1 min-w-0">
                        <h4 class="text-sm font-semibold text-gray-900 dark:text-gray-100 flex flex-wrap items-center gap-2">
                            <span x-text="i18n.newVersionAvailable || 'New Version Available'"></span>
                            <span class="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-mono font-medium bg-brand-50 dark:bg-brand-900/30 text-brand-700 dark:text-brand-300 border border-brand-100 dark:border-brand-800" x-text="'v' + latestVersion"></span>
                        </h4>
                        <div class="mt-2.5 flex items-center gap-2.5 flex-wrap text-xs">
                            <a
                                href={releaseUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                class="font-medium text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 transition-colors"
                            >
                                <span x-text="i18n.viewRelease || 'View Release'"></span>
                            </a>
                            <span class="text-gray-300 dark:text-gray-600">·</span>
                            <button
                                type="button"
                                x-on:click="dismissUpdate()"
                                class="font-medium text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition-colors"
                            >
                                <span x-text="i18n.later || 'Later'"></span>
                            </button>
                            <span class="text-gray-300 dark:text-gray-600">·</span>
                            <a
                                href={updateGuideUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                class="font-medium text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors inline-flex items-center gap-1"
                            >
                                <i class="fas fa-book text-[10px]"></i>
                                <span x-text="i18n.updateGuide || 'Update Guide'"></span>
                            </a>
                        </div>
                    </div>
                    <button
                        type="button"
                        x-on:click="dismissUpdate()"
                        class="flex-shrink-0 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors p-0.5"
                        aria-label="Close"
                    >
                        <i class="fas fa-times text-xs"></i>
                    </button>
                </div>
            </div>
        </div>
    );
};
