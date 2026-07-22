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
      class="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-[color-mix(in_srgb,var(--background)_72%,#000)] backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label="登录"
    >
      <div class="w-full max-w-md pixel-card mm-card shadow-[8px_8px_0_rgba(0,0,0,0.18)]">
        <div class="card-header border-b border-[var(--border)] pb-4 text-center">
          <div class="mx-auto mb-3 flex h-14 w-14 items-center justify-center border-2 border-[color:rgba(241,140,110,0.45)] shadow-[4px_4px_0_rgba(0,0,0,0.15)] bg-[var(--background)]">
            <img src="/logo.svg" alt="" class="h-10 w-10 object-cover" width="40" height="40" />
          </div>
          <div class="card-title text-xl">Sublink Worker</div>
          <div class="card-desc mt-1">需要登录后才能使用节点库与订阅生成</div>
        </div>
        <div class="card-content pt-5 space-y-4">
          <div>
            <label class="mm-label" for="gate-password">管理密码</label>
            <input
              id="gate-password"
              type="password"
              class="mm-input"
              placeholder="AUTH_PASSWORD"
              autocomplete="current-password"
              x-model="$store.auth.password"
              {...{
                'x-on:keydown.enter.prevent': '$store.auth.login()',
                'x-init': "$nextTick(() => { try { $el.focus(); } catch(e){} })"
              }}
            />
          </div>
          <p class="text-sm text-red-500" x-show="$store.auth.error" x-text="$store.auth.error"></p>
          <p class="text-xs text-amber-700 dark:text-amber-400" x-show={'!$store.auth.kvReady'}>
            警告：未检测到 KV，登录后可能无法持久化节点。
          </p>
          <button
            type="button"
            class="mm-btn mm-btn-primary w-full"
            x-on:click="$store.auth.login()"
            x-bind:disabled="$store.auth.loading"
          >
            <i class="fas" x-bind:class={'$store.auth.loading ? "fa-spinner fa-spin" : "fa-right-to-bracket"'}></i>
            <span x-text={'$store.auth.loading ? "登录中…" : "进入系统"'}></span>
          </button>
          <p class="text-[11px] text-muted text-center leading-relaxed">
            密码由服务端环境变量 AUTH_PASSWORD 配置（Cloudflare Secret / .env）
          </p>
        </div>
      </div>
    </div>
  );
};
