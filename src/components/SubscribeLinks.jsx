/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */

export const SubscribeLinks = (props) => {
  const { t, links } = props;

  if (!links) return null;

  const fields = [
    { key: 'xray', label: t('xrayLink'), value: links.xray },
    { key: 'singbox', label: t('singboxLink'), value: links.singbox },
    { key: 'clash', label: t('clashLink'), value: links.clash },
    { key: 'surge', label: t('surgeLink'), value: links.surge }
  ];

  return (
    <div x-data="{ copied: null }" class="ui-card p-5 sm:p-6 mb-8">
      <h2 class="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2.5 mb-5">
        <span class="w-8 h-8 rounded-lg bg-emerald-50 dark:bg-emerald-900/25 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
          <i class="fas fa-link text-sm"></i>
        </span>
        {t('subscriptionLinks')}
      </h2>

      <div class="space-y-3.5">
        {fields.map((field) => (
          <div class="relative" key={field.key}>
            <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              {field.label}
            </label>
            <div class="flex gap-2">
              <input
                type="text"
                readonly
                value={field.value}
                class="w-full px-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-white/10 bg-surface-50 dark:bg-black/25 text-gray-600 dark:text-gray-400 font-mono text-sm"
              />
              <button
                type="button"
                x-on:click={`navigator.clipboard.writeText('${field.value}'); copied = '${field.key}'; setTimeout(() => copied = null, 2000)`}
                class="px-3.5 py-2.5 rounded-xl border border-surface-200 dark:border-white/10 bg-white dark:bg-white/5 text-gray-600 dark:text-gray-300 transition-colors duration-200 min-w-[2.75rem]"
                x-bind:class={`{'bg-emerald-50 dark:bg-emerald-900/25 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800': copied === '${field.key}'}`}
              >
                <i class="fas" x-bind:class={`copied === '${field.key}' ? 'fa-check' : 'fa-copy'`}></i>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
