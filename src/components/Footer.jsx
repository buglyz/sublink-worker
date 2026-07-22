/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */
import { APP_NAME, GITHUB_REPO, DOCS_URL, APP_VERSION } from '../constants.js';

export const Footer = () => {
    const currentYear = new Date().getFullYear();

    return (
        <footer class="mt-16 border-t border-surface-200 dark:border-white/5 bg-white/40 dark:bg-surface-950/40 backdrop-blur-sm">
            <div class="mx-auto max-w-5xl px-4 sm:px-6 py-8">
                <div class="flex flex-col sm:flex-row items-center justify-between gap-4">
                    <div class="flex flex-wrap items-center justify-center sm:justify-start gap-x-3 gap-y-2 text-sm text-gray-500 dark:text-gray-400">
                        <span>© {currentYear} {APP_NAME}</span>
                        <span class="hidden sm:inline text-gray-300 dark:text-gray-700">·</span>
                        <a
                            href={`${GITHUB_REPO}/releases/tag/v${APP_VERSION}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="font-mono text-xs px-2 py-0.5 rounded-md border border-surface-200 dark:border-white/10 bg-surface-50 dark:bg-white/5 text-gray-500 dark:text-gray-400 hover:border-brand-300 hover:text-brand-700 dark:hover:border-brand-700 dark:hover:text-brand-300 transition-colors"
                            title={`v${APP_VERSION}`}
                        >
                            v{APP_VERSION}
                        </a>
                    </div>

                    <div class="flex items-center gap-4">
                        <a
                            href={DOCS_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                            aria-label="Documentation"
                        >
                            <i class="fas fa-book-open"></i>
                        </a>
                        <a
                            href={GITHUB_REPO}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="text-gray-400 hover:text-brand-600 dark:hover:text-brand-400 transition-colors"
                            aria-label="GitHub"
                        >
                            <i class="fab fa-github text-lg"></i>
                        </a>
                    </div>
                </div>
            </div>
        </footer>
    );
};
