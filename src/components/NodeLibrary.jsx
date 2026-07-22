/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */

/**
 * Node library with KV sync + password auth (cross-device).
 */
export const NodeLibrary = (props) => {
  const { t } = props;

  const scriptContent = `
    function nodeLibraryData() {
      const TOKEN_KEY = 'sublink_auth_token';
      const LOCAL_MIRROR = 'sublink_nodes_mirror_v1';
      const PROTOCOLS = ['ss', 'ssr', 'vmess', 'vless', 'trojan', 'hysteria', 'hysteria2', 'hy2', 'tuic', 'socks', 'socks5', 'http', 'https', 'wireguard', 'snell', 'anytls'];

      const protocolOf = (line) => {
        const m = String(line || '').trim().match(/^([a-z0-9+.-]+):\\/\\//i);
        return m ? m[1].toLowerCase() : 'unknown';
      };

      const nameOf = (line) => {
        const s = String(line || '').trim();
        if (!s) return '未命名';
        try {
          if (s.includes('#')) {
            const hash = s.split('#').pop();
            const decoded = decodeURIComponent(hash || '');
            if (decoded) return decoded.slice(0, 80);
          }
          if (s.startsWith('vmess://')) {
            try {
              const b64 = s.slice(8).replace(/-/g, '+').replace(/_/g, '/');
              const json = JSON.parse(atob(b64));
              if (json.ps) return String(json.ps).slice(0, 80);
              if (json.add) return String(json.add).slice(0, 80);
            } catch {}
          }
          const u = new URL(s);
          if (u.hostname) return (u.hostname + (u.port ? ':' + u.port : '')).slice(0, 80);
        } catch {}
        return s.slice(0, 40) + (s.length > 40 ? '…' : '');
      };

      const uid = () => 'n_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

      return {
        nodes: [],
        pasteBox: '',
        filter: '',
        selectAll: false,
        flash: '',
        editingId: null,
        editName: '',
        authRequired: false,
        authenticated: false,
        kvReady: false,
        token: localStorage.getItem(TOKEN_KEY) || '',
        password: '',
        loading: false,
        saving: false,
        bootstrapped: false,
        loginError: '',
        syncTimer: null,

        async init() {
          await this.refreshStatus();
          if (this.authenticated) {
            await this.loadFromServer();
          } else {
            // show empty until login
            this.nodes = [];
          }
          this.bootstrapped = true;
          this.$watch('nodes', () => {
            this.selectAll = this.nodes.length > 0 && this.nodes.every((n) => n.selected);
            if (this.authenticated) this.scheduleSync();
          }, { deep: true });
        },

        headers(json = false) {
          const h = {};
          if (json) h['Content-Type'] = 'application/json';
          if (this.token) h['Authorization'] = 'Bearer ' + this.token;
          return h;
        },

        async refreshStatus() {
          try {
            const res = await fetch('/api/auth/status');
            const data = await res.json();
            this.authRequired = !!data.authRequired;
            this.kvReady = !!data.kvReady;
            if (!this.authRequired) {
              this.authenticated = true;
              return;
            }
            if (this.token) {
              const me = await fetch('/api/auth/me', { headers: this.headers() });
              this.authenticated = me.ok;
              if (!me.ok) {
                this.token = '';
                localStorage.removeItem(TOKEN_KEY);
              }
            } else {
              this.authenticated = false;
            }
          } catch (e) {
            console.error(e);
            this.flash = '无法连接鉴权接口';
          }
        },

        async login() {
          this.loginError = '';
          this.loading = true;
          try {
            const res = await fetch('/api/auth/login', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ password: this.password })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
              this.loginError = data.error || '登录失败';
              return;
            }
            this.token = data.token;
            localStorage.setItem(TOKEN_KEY, this.token);
            this.authenticated = true;
            this.password = '';
            await this.loadFromServer();
            // migrate local mirror if server empty
            try {
              const mirror = JSON.parse(localStorage.getItem(LOCAL_MIRROR) || '[]');
              if ((!this.nodes || !this.nodes.length) && Array.isArray(mirror) && mirror.length) {
                this.nodes = mirror;
                await this.syncNow();
                this.flash = '已从本地迁移 ' + mirror.length + ' 个节点到云端';
              }
            } catch {}
          } catch (e) {
            this.loginError = e.message || '网络错误';
          } finally {
            this.loading = false;
          }
        },

        async logout() {
          try {
            await fetch('/api/auth/logout', { method: 'POST', headers: this.headers() });
          } catch {}
          this.token = '';
          localStorage.removeItem(TOKEN_KEY);
          this.authenticated = false;
          this.nodes = [];
        },

        async loadFromServer() {
          if (!this.authenticated) return;
          this.loading = true;
          try {
            const res = await fetch('/api/nodes', { headers: this.headers() });
            if (res.status === 401) {
              this.authenticated = false;
              this.token = '';
              localStorage.removeItem(TOKEN_KEY);
              return;
            }
            const data = await res.json();
            this.nodes = Array.isArray(data.nodes) ? data.nodes : [];
            localStorage.setItem(LOCAL_MIRROR, JSON.stringify(this.nodes));
          } catch (e) {
            this.flash = '加载节点失败: ' + (e.message || '');
          } finally {
            this.loading = false;
          }
        },

        scheduleSync() {
          if (this.syncTimer) clearTimeout(this.syncTimer);
          this.syncTimer = setTimeout(() => this.syncNow(), 600);
        },

        async syncNow() {
          if (!this.authenticated) return;
          this.saving = true;
          try {
            const res = await fetch('/api/nodes', {
              method: 'PUT',
              headers: this.headers(true),
              body: JSON.stringify({ nodes: this.nodes })
            });
            if (res.status === 401) {
              this.authenticated = false;
              this.token = '';
              localStorage.removeItem(TOKEN_KEY);
              this.flash = '登录已失效，请重新登录';
              return;
            }
            const data = await res.json();
            if (Array.isArray(data.nodes)) {
              // preserve selection UI state if server normalizes
              const selected = new Set(this.nodes.filter(n => n.selected).map(n => n.raw));
              this.nodes = data.nodes.map(n => ({ ...n, selected: selected.has(n.raw) || n.selected }));
            }
            localStorage.setItem(LOCAL_MIRROR, JSON.stringify(this.nodes));
          } catch (e) {
            this.flash = '同步失败: ' + (e.message || '');
          } finally {
            this.saving = false;
          }
        },

        get filtered() {
          const q = (this.filter || '').trim().toLowerCase();
          if (!q) return this.nodes;
          return this.nodes.filter((n) =>
            (n.name || '').toLowerCase().includes(q) ||
            (n.protocol || '').toLowerCase().includes(q) ||
            (n.raw || '').toLowerCase().includes(q) ||
            (n.tag || '').toLowerCase().includes(q)
          );
        },

        get selectedCount() {
          return this.nodes.filter((n) => n.selected && n.enabled !== false).length;
        },

        persistMessage(msg) {
          this.flash = msg;
          setTimeout(() => { if (this.flash === msg) this.flash = ''; }, 2500);
        },

        parseLines(text) {
          const lines = String(text || '')
            .split(/\\r?\\n/)
            .map((l) => l.trim())
            .filter(Boolean)
            .filter((l) => !l.startsWith('#') && !l.startsWith('//'));
          const out = [];
          for (const line of lines) {
            const proto = protocolOf(line);
            if (proto === 'http' || proto === 'https') {
              out.push({ raw: line, protocol: 'http-sub', name: nameOf(line) });
              continue;
            }
            if (PROTOCOLS.includes(proto) || line.includes('://')) {
              out.push({ raw: line, protocol: proto, name: nameOf(line) });
            } else if (/^[A-Za-z0-9+/=_-]{20,}$/.test(line)) {
              out.push({ raw: line, protocol: 'base64', name: 'Base64 片段' });
            }
          }
          return out;
        },

        addFromText(text, { select = true } = {}) {
          if (!this.authenticated) {
            this.persistMessage('请先登录');
            return 0;
          }
          const parsed = this.parseLines(text);
          if (!parsed.length) {
            this.persistMessage('没有识别到可用节点行');
            return 0;
          }
          const existing = new Set(this.nodes.map((n) => n.raw));
          let added = 0;
          for (const p of parsed) {
            if (existing.has(p.raw)) continue;
            this.nodes.push({
              id: uid(),
              raw: p.raw,
              name: p.name,
              protocol: p.protocol,
              tag: '',
              enabled: true,
              selected: select,
              createdAt: Date.now()
            });
            existing.add(p.raw);
            added++;
          }
          this.persistMessage(added ? '已添加 ' + added + ' 个节点（将同步）' : '节点已存在，未重复添加');
          return added;
        },

        importFromPaste() {
          this.addFromText(this.pasteBox, { select: true });
          this.pasteBox = '';
        },

        importFromInput() {
          const root = document.querySelector('#workspace');
          let input = '';
          try {
            if (root && root._x_dataStack && root._x_dataStack[0]) {
              input = root._x_dataStack[0].input || '';
            }
          } catch {}
          if (!input) {
            const ta = document.getElementById('input');
            input = ta ? ta.value : '';
          }
          this.addFromText(input, { select: true });
        },

        toggleSelectAll() {
          const val = !this.selectAll;
          this.selectAll = val;
          const ids = new Set(this.filtered.map((n) => n.id));
          this.nodes.forEach((n) => {
            if (ids.has(n.id)) n.selected = val;
          });
        },

        removeSelected() {
          const count = this.nodes.filter((n) => n.selected).length;
          if (!count) return;
          if (!confirm('删除选中的 ' + count + ' 个节点？')) return;
          this.nodes = this.nodes.filter((n) => !n.selected);
          this.persistMessage('已删除 ' + count + ' 个');
        },

        removeOne(id) {
          this.nodes = this.nodes.filter((n) => n.id !== id);
        },

        async clearAll() {
          if (!this.nodes.length) return;
          if (!confirm('清空全部 ' + this.nodes.length + ' 个节点？')) return;
          this.nodes = [];
          await this.syncNow();
          this.persistMessage('节点库已清空');
        },

        startEdit(node) {
          this.editingId = node.id;
          this.editName = node.name || '';
        },

        commitEdit(node) {
          if (this.editingId !== node.id) return;
          node.name = (this.editName || node.name || '未命名').slice(0, 80);
          this.editingId = null;
          this.editName = '';
        },

        selectedRaws() {
          return this.nodes
            .filter((n) => n.selected && n.enabled !== false)
            .map((n) => n.raw);
        },

        applyToConverter({ convert = false } = {}) {
          const lines = this.selectedRaws();
          if (!lines.length) {
            this.persistMessage('请先勾选节点');
            return;
          }
          const text = lines.join('\\n');
          const root = document.querySelector('#workspace');
          try {
            if (root && root._x_dataStack && root._x_dataStack[0]) {
              const data = root._x_dataStack[0];
              data.input = text;
              if (convert && typeof data.submitForm === 'function') {
                data.submitForm();
                try { Alpine.store('ui')?.setPage('subscribe'); } catch {}
                try { window.__SUBLINK_UI__?.setPage?.('subscribe'); } catch {}
              } else {
                try { Alpine.store('ui')?.setPage('generate'); } catch {}
                try { window.__SUBLINK_UI__?.setPage?.('generate'); } catch {}
              }
              this.persistMessage(convert ? '已用选中节点生成订阅' : '已填入转换输入框');
              return;
            }
          } catch (e) {
            console.error(e);
          }
          const ta = document.getElementById('input');
          if (ta) {
            ta.value = text;
            ta.dispatchEvent(new Event('input', { bubbles: true }));
          }
          this.persistMessage('已填入转换输入框');
        },

        exportSelected() {
          const lines = this.selectedRaws();
          if (!lines.length) {
            this.persistMessage('请先勾选节点');
            return;
          }
          navigator.clipboard.writeText(lines.join('\\n')).then(() => {
            this.persistMessage('已复制 ' + lines.length + ' 行');
          }).catch(() => {
            this.pasteBox = lines.join('\\n');
            this.persistMessage('复制失败，已写入下方文本框');
          });
        },

        protocolBadge(proto) {
          const map = {
            vmess: 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
            vless: 'bg-purple-500/10 text-purple-700 dark:text-purple-400',
            trojan: 'bg-red-500/10 text-red-700 dark:text-red-400',
            ss: 'bg-green-500/10 text-green-700 dark:text-green-400',
            ssr: 'bg-green-500/10 text-green-700 dark:text-green-400',
            hysteria2: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
            hy2: 'bg-indigo-500/10 text-indigo-700 dark:text-indigo-400',
            hysteria: 'bg-pink-500/10 text-pink-700 dark:text-pink-400',
            tuic: 'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400',
            'http-sub': 'bg-amber-500/10 text-amber-800 dark:text-amber-300',
            base64: 'bg-zinc-500/10 text-zinc-600 dark:text-zinc-300'
          };
          return map[proto] || 'bg-[color-mix(in_srgb,var(--muted)_80%,transparent)] text-[var(--muted-foreground)]';
        }
      };
    }
  `;

  return (
    <div id="nodes" x-data="nodeLibraryData()" x-init="init()" class="space-y-4">
      {/* Login gate */}
      <div x-show="!bootstrapped" class="mm-card p-8 text-center">
        <i class="fas fa-spinner fa-spin text-[var(--primary)]"></i>
        <p class="mm-desc mt-2">加载节点库…</p>
      </div>

      <div x-show="bootstrapped && authRequired && !authenticated" class="mm-card max-w-md">
        <div class="border-b border-[var(--border)] px-5 py-4">
          <h2 class="text-lg font-semibold tracking-tight">登录节点库</h2>
          <p class="mm-desc mt-1">密码鉴权后节点将同步到服务端 KV，可跨设备访问。</p>
        </div>
        <div class="p-5 space-y-3">
          <div>
            <label class="mm-label">管理密码</label>
            <input
              type="password"
              class="mm-input"
              x-model="password"
              placeholder="AUTH_PASSWORD"
              {...{ 'x-on:keydown.enter.prevent': 'login()' }}
            />
          </div>
          <p class="text-sm text-red-500" x-show="loginError" x-text="loginError"></p>
          <p class="mm-desc" x-show="!kvReady">警告：当前未检测到 KV，登录后可能无法持久化。</p>
          <button type="button" class="mm-btn mm-btn-primary w-full" x-on:click="login()" x-bind:disabled="loading">
            <i class="fas" x-bind:class="loading ? 'fa-spinner fa-spin' : 'fa-right-to-bracket'"></i>
            登录
          </button>
        </div>
      </div>

      <div x-show="bootstrapped && authenticated" class="mm-card p-4 sm:p-5">
        <div class="mm-section-head">
          <div class="flex items-start gap-3">
            <span class="icon"><i class="fas fa-network-wired text-sm"></i></span>
            <div>
              <div class="mm-title">节点库</div>
              <p class="mm-desc mt-0.5">
                KV 同步 · 跨设备
                <span class="ml-2 font-mono text-[11px] text-[var(--primary)]" x-text="nodes.length + ' 节点 · 选中 ' + selectedCount"></span>
                <span class="ml-2 text-[11px] opacity-70" x-show="saving">同步中…</span>
              </p>
            </div>
          </div>
          <div class="flex flex-wrap gap-1.5">
            <button type="button" class="mm-btn mm-btn-ghost text-xs py-1.5" x-on:click="loadFromServer()">
              <i class="fas fa-rotate text-[10px]"></i>
              刷新
            </button>
            <button type="button" class="mm-btn mm-btn-secondary text-xs py-1.5" x-on:click="importFromInput()">
              <i class="fas fa-file-import text-[10px]"></i>
              从输入源导入
            </button>
            <button type="button" class="mm-btn mm-btn-primary text-xs py-1.5" x-on:click="applyToConverter({ convert: true })" x-bind:disabled="selectedCount === 0">
              <i class="fas fa-bolt text-[10px]"></i>
              用选中生成
            </button>
            <button type="button" class="mm-btn mm-btn-ghost text-xs py-1.5" x-show="authRequired" x-on:click="logout()">
              退出
            </button>
          </div>
        </div>

        <div class="grid grid-cols-1 lg:grid-cols-5 gap-3 mb-3">
          <div class="lg:col-span-3">
            <label class="mm-label">粘贴节点 / 订阅行</label>
            <textarea
              x-model="pasteBox"
              rows={3}
              class="mm-textarea font-mono text-[12px] min-h-[5.5rem]"
              placeholder="每行一条：ss / vmess / vless / trojan / hysteria2 … 或 http 订阅 URL"
            ></textarea>
          </div>
          <div class="lg:col-span-2 flex flex-col gap-2">
            <label class="mm-label">筛选</label>
            <input type="search" x-model="filter" class="mm-input" placeholder="名称 / 协议 / 标签" />
            <div class="flex flex-wrap gap-2 mt-auto">
              <button type="button" class="mm-btn mm-btn-primary flex-1 text-sm" x-on:click="importFromPaste()">
                <i class="fas fa-plus text-xs"></i>
                添加
              </button>
              <button type="button" class="mm-btn mm-btn-ghost text-sm" x-on:click="applyToConverter({ convert: false })" x-bind:disabled="selectedCount === 0">
                填入输入框
              </button>
              <button type="button" class="mm-btn mm-btn-ghost text-sm" x-on:click="exportSelected()" x-bind:disabled="selectedCount === 0">
                复制选中
              </button>
            </div>
          </div>
        </div>

        <div class="mb-2 flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted-foreground)]">
          <div class="flex items-center gap-3">
            <label class="inline-flex items-center gap-2 cursor-pointer">
              <input type="checkbox" class="mm-check" x-bind:checked="selectAll" x-on:change="toggleSelectAll()" />
              全选当前列表
            </label>
            <button type="button" class="hover:text-[var(--destructive)]" x-on:click="removeSelected()" x-show="nodes.some(n => n.selected)">
              删除选中
            </button>
            <button type="button" class="hover:text-[var(--destructive)]" x-on:click="clearAll()" x-show="nodes.length">
              清空
            </button>
          </div>
          <span class="text-[var(--primary)]" x-show="flash" x-text="flash"></span>
        </div>

        <div class="rounded-[var(--radius)] border border-[var(--border)] overflow-hidden">
          <div class="max-h-[22rem] overflow-auto">
            <template x-if="filtered.length === 0">
              <div class="px-4 py-10 text-center mm-desc">
                暂无节点。粘贴分享链接后点「添加」，或从输入源导入。
              </div>
            </template>
            <table class="w-full text-sm" x-show="filtered.length > 0">
              <thead class="sticky top-0 bg-[color-mix(in_srgb,var(--muted)_70%,var(--card))] text-[var(--muted-foreground)] text-xs">
                <tr class="border-b border-[var(--border)]">
                  <th class="w-10 px-3 py-2 text-left font-medium"></th>
                  <th class="px-2 py-2 text-left font-medium">名称</th>
                  <th class="px-2 py-2 text-left font-medium hidden sm:table-cell">协议</th>
                  <th class="px-2 py-2 text-left font-medium hidden md:table-cell">启用</th>
                  <th class="w-20 px-2 py-2 text-right font-medium">操作</th>
                </tr>
              </thead>
              <tbody>
                <template x-for="node in filtered" x-bind:key="node.id">
                  <tr class="border-b border-[var(--border)] last:border-0 hover:bg-[color-mix(in_srgb,var(--muted)_35%,transparent)]" x-bind:class="node.enabled === false ? 'opacity-50' : ''">
                    <td class="px-3 py-2">
                      <input type="checkbox" class="mm-check" x-model="node.selected" />
                    </td>
                    <td class="px-2 py-2 min-w-0">
                      <template x-if="editingId !== node.id">
                        <button type="button" class="text-left font-medium text-[var(--foreground)] hover:text-[var(--primary)] truncate max-w-[14rem] sm:max-w-xs block" x-text="node.name" x-on:click="startEdit(node)" title="点击改名"></button>
                      </template>
                      <template x-if="editingId === node.id">
                        <input
                          type="text"
                          class="mm-input py-1 text-sm"
                          x-model="editName"
                          {...{
                            'x-on:keydown.enter.prevent': 'commitEdit(node)',
                            'x-on:keydown.escape.prevent': 'editingId = null',
                            'x-on:blur': 'commitEdit(node)',
                            'x-init': '$nextTick(function(){ $el.focus() })'
                          }}
                        />
                      </template>
                      <div class="font-mono text-[10px] text-[var(--muted-foreground)] truncate max-w-[14rem] sm:max-w-md" x-text="node.raw"></div>
                    </td>
                    <td class="px-2 py-2 hidden sm:table-cell">
                      <span class="inline-flex rounded-md px-1.5 py-0.5 text-[11px] font-medium" x-bind:class="protocolBadge(node.protocol)" x-text="node.protocol"></span>
                    </td>
                    <td class="px-2 py-2 hidden md:table-cell">
                      <label class="relative inline-flex cursor-pointer">
                        <input type="checkbox" class="sr-only peer" x-model="node.enabled" />
                        <span class="mm-switch scale-90 origin-left"></span>
                      </label>
                    </td>
                    <td class="px-2 py-2 text-right">
                      <button type="button" class="mm-btn mm-btn-ghost mm-btn-icon !h-8 !w-8" title="删除" x-on:click="removeOne(node.id)">
                        <i class="fas fa-trash-alt text-[11px] text-[var(--destructive)]"></i>
                      </button>
                    </td>
                  </tr>
                </template>
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: scriptContent }} />
    </div>
  );
};
