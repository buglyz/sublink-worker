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
    <div x-data="{ copied: null }" class="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-5 sm:p-6 mb-6 shadow-sm">
      <h2 class="text-base font-semibold text-[var(--foreground)] flex items-center gap-2 mb-4">
        <span class="w-7 h-7 rounded-lg bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center text-xs">
          <i class="fas fa-link"></i>
        </span>
        {t('subscriptionLinks')}
      </h2>

      <div class="space-y-3">
        {fields.map((field) => (
          <div class="space-y-1" key={field.key}>
            <label class="block text-xs font-medium text-[var(--muted-foreground)]">
              {field.label}
            </label>
            <div class="flex gap-2">
              <input
                type="text"
                readonly
                value={field.value}
                class="w-full px-3 py-2 rounded-lg border border-[var(--input)] bg-[var(--secondary)] text-[var(--foreground)] font-mono text-xs focus:outline-none"
              />
              <button
                type="button"
                x-on:click={`navigator.clipboard.writeText('${field.value}'); copied = '${field.key}'; setTimeout(() => copied = null, 2000)`}
                class="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--secondary)] text-[var(--foreground)] transition-all min-w-[2.5rem] flex items-center justify-center text-xs"
                x-bind:class={`{'!border-emerald-500 !bg-emerald-500/10 text-emerald-600 dark:text-emerald-400': copied === '${field.key}'}`}
              >
                <i class="fas" x-bind:class={`copied === '${field.key}' ? 'fa-check text-emerald-500' : 'fa-copy'`}></i>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

