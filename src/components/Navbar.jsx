/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */
import { APP_NAME, GITHUB_REPO, DOCS_URL } from '../constants.js';

export const Navbar = () => {
    return (
        <nav class="fixed top-0 w-full z-50 border-b border-surface-200/80 dark:border-white/5 bg-white/70 dark:bg-surface-950/70 backdrop-blur-xl transition-colors duration-300">
            <div class="mx-auto max-w-5xl px-4 sm:px-6">
                <div class="flex h-14 items-center justify-between">
                    <a href="#" class="group flex items-center gap-2.5">
                        <span class="relative flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white shadow-glow">
                            <img src="/favicon.ico" alt="" class="h-4 w-4 brightness-0 invert" />
                        </span>
                        <span class="text-[15px] font-semibold tracking-tight text-gray-900 dark:text-white group-hover:text-brand-700 dark:group-hover:text-brand-300 transition-colors">
                            {APP_NAME}
                        </span>
                    </a>
                    <div class="flex items-center gap-1 sm:gap-1.5">
                        <a
                            href={DOCS_URL}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="hidden sm:inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-surface-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/5 transition-colors"
                        >
                            <i class="fas fa-book-open text-xs opacity-70"></i>
                            Docs
                        </a>
                        <a
                            href={GITHUB_REPO}
                            target="_blank"
                            rel="noopener noreferrer"
                            class="inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-surface-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/5 transition-colors"
                        >
                            <i class="fab fa-github text-sm"></i>
                            <span class="hidden sm:inline">GitHub</span>
                        </a>
                        <button
                            type="button"
                            class="ml-0.5 inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-500 hover:text-gray-900 hover:bg-surface-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-white/5 transition-colors"
                            x-on:click="toggleDarkMode()"
                            aria-label="Toggle dark mode"
                        >
                            <i class="fas text-sm" x-bind:class="darkMode ? 'fa-sun' : 'fa-moon'"></i>
                        </button>
                    </div>
                </div>
            </div>
        </nav>
    );
};
