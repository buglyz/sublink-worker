/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */

/**
 * Full-site login gate. Shown as soon as AUTH_PASSWORD is configured and session is missing.
 * Uses double-quoted Alpine expressions to avoid Hono SSR &#39; breakage.
 */
export const AuthGate = () => {
  return (
    <div
      x-cloak
      x-show={'$store.auth.ready && $store.auth.authRequired && !$store.auth.authenticated'}
      class="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-black/60 backdrop-blur-md transition-opacity duration-200"
      role="dialog"
      aria-modal="true"
      aria-label="登录"
    >
      <div class="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)] shadow-2xl overflow-hidden p-6 space-y-5">
        <div class="text-center space-y-2">
          <div class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-[var(--border)] bg-[var(--secondary)] shadow-xs p-3">
            <img src="/logo.svg" alt="" class="h-full w-full object-contain" width="40" height="40" />
          </div>
          <div>
            <h2 class="text-xl font-bold tracking-tight text-[var(--foreground)]">Sublink Worker</h2>
            <p class="text-sm text-[var(--muted-foreground)] mt-0.5">请验证管理密码后进入系统</p>
          </div>
        </div>

        <div class="space-y-4">
          <div class="space-y-1.5">
            <label class="block text-sm font-medium text-[var(--foreground)]" for="gate-password">管理密码</label>
            <div class="relative">
              <input
                id="gate-password"
                type="password"
                class="w-full rounded-lg border border-[var(--input)] bg-[var(--card)] px-3.5 py-2.5 text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--ring)] focus:outline-none transition-all"
                placeholder="请输入 AUTH_PASSWORD"
                autocomplete="current-password"
                x-model="$store.auth.password"
                {...{
                  'x-on:keydown.enter.prevent': '$store.auth.login()',
                  'x-init': "$nextTick(() => { try { $el.focus(); } catch(e){} })"
                }}
              />
            </div>
          </div>

          <p class="text-sm text-red-500 font-medium" x-show="$store.auth.error" x-text="$store.auth.error"></p>
          <div class="rounded-lg bg-amber-500/10 border border-amber-500/20 p-2.5 text-xs text-amber-600 dark:text-amber-400" x-show={'!$store.auth.kvReady'}>
            <i class="fas fa-triangle-exclamation mr-1"></i> 未检测到 KV 存储，数据可能无法持久化保存。
          </div>

          <button
            type="button"
            class="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold py-2.5 text-sm shadow-xs transition-all active:scale-[0.98] disabled:opacity-50"
            x-on:click="$store.auth.login()"
            x-bind:disabled="$store.auth.loading"
          >
            <i class="fas" x-bind:class={'$store.auth.loading ? "fa-spinner fa-spin" : "fa-right-to-bracket text-sm"'}></i>
            <span x-text={'$store.auth.loading ? "验证中…" : "进入系统"'}></span>
          </button>

          <p class="text-xs text-[var(--muted-foreground)] text-center leading-relaxed">
            密码由环境变量 <code class="font-mono bg-[var(--secondary)] px-1.5 py-0.5 rounded text-[11px]">AUTH_PASSWORD</code> 配置
          </p>
        </div>
      </div>
    </div>
  );
};

