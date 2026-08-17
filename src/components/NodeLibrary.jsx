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
        const m = String(line || '').trim().match(new RegExp('^([a-z0-9+.-]+)://', 'i'));
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

      const uid = () => 'n_' + crypto.randomUUID();

      return {
        nodes: [],
        pasteBox: '',
        remoteUrl: '',
        importMode: 'replace',
        importing: false,
        importReport: null,
        filter: '',
        selectAll: false,
        flash: '',
        editingId: null,
        editName: '',
        authRequired: false,
        authenticated: false,
        kvReady: false,
        token: localStorage.getItem(TOKEN_KEY) || '',
        exportToken: '',
        exportSubUrl: '',
        password: '',
        loading: false,
        saving: false,
        bootstrapped: false,
        loginError: '',
        syncTimer: null,
        suppressSync: false,
        lastSyncedJson: '',
        revision: null,

        async init() {
          const self = this;
          // Prefer global auth store (site-wide login gate)
          try {
            if (window.Alpine && Alpine.store('auth')) {
              const a = Alpine.store('auth');
              if (a.token) this.token = a.token;
              if (a.authenticated) this.authenticated = true;
              this.authRequired = !!a.authRequired;
            }
          } catch (e) {}
          window.addEventListener('sublink-auth', async (e) => {
            try {
              const a = Alpine.store('auth');
              this.token = a.token || localStorage.getItem(TOKEN_KEY) || '';
              this.authenticated = !!a.authenticated;
              this.authRequired = !!a.authRequired;
            } catch (err) {
              this.token = localStorage.getItem(TOKEN_KEY) || '';
              this.authenticated = !!(e.detail && e.detail.authenticated);
            }
            if (this.authenticated) await this.loadFromServer();
            else this.nodes = [];
            this.bootstrapped = true;
          });
          window.addEventListener('nodes-import-from-input', () => {
            self.importFromInput();
          });
          await this.refreshStatus();
          // Re-sync token after status check
          try {
            if (window.Alpine && Alpine.store('auth') && Alpine.store('auth').token) {
              this.token = Alpine.store('auth').token;
              this.authenticated = !!Alpine.store('auth').authenticated;
            }
          } catch (e) {}
          if (this.authenticated) {
            await this.loadFromServer();
          } else {
            this.nodes = [];
          }
          this.bootstrapped = true;
          this.lastSyncedJson = JSON.stringify(this.nodes || []);
          this.$watch('nodes', () => {
            this.selectAll = this.nodes.length > 0 && this.nodes.every((n) => n.selected);
            if (this.suppressSync || !this.authenticated) return;
            // Avoid PUT loops when server echo rewrites the same payload
            const snap = JSON.stringify(this.nodes || []);
            if (snap === this.lastSyncedJson) return;
            this.scheduleSync();
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
            try {
              if (window.Alpine && Alpine.store('auth')) {
                Alpine.store('auth').token = this.token;
                Alpine.store('auth').authenticated = true;
              }
            } catch {}
            window.dispatchEvent(new CustomEvent('sublink-auth', { detail: { authenticated: true } }));
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
          try {
            if (window.Alpine && Alpine.store('auth')) {
              Alpine.store('auth').token = '';
              Alpine.store('auth').authenticated = false;
              Alpine.store('auth').nodeCount = 0;
            }
          } catch {}
          window.dispatchEvent(new CustomEvent('sublink-auth', { detail: { authenticated: false } }));
        },

        async loadFromServer() {
          if (!this.authenticated) return;
          this.loading = true;
          this.suppressSync = true;
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
            this.revision = Number.isFinite(Number(data.revision)) ? Number(data.revision) : null;
            this.lastSyncedJson = JSON.stringify(this.nodes);
            localStorage.setItem(LOCAL_MIRROR, JSON.stringify(this.nodes));
            await this.loadExportToken();
          } catch (e) {
            this.flash = '加载节点失败: ' + (e.message || '');
          } finally {
            this.loading = false;
            // next tick so Alpine watch for load assignment is ignored
            setTimeout(() => { this.suppressSync = false; }, 0);
          }
        },

        async loadExportToken() {
          if (!this.authenticated) return;
          try {
            // Prefer global store (already loaded on login as default long-lived token)
            try {
              const a = Alpine.store('auth');
              if (a && a.exportToken) {
                this.exportToken = a.exportToken;
                this.exportSubUrl = a.exportSubUrl || (window.location.origin + '/sub/' + encodeURIComponent(a.exportToken));
                return;
              }
            } catch (e) {}
            const res = await fetch('/api/export-token', { headers: this.headers() });
            if (!res.ok) return;
            const data = await res.json();
            this.exportToken = data.token || '';
            this.exportSubUrl = data.subscriptionUrl || (window.location.origin + '/sub/' + encodeURIComponent(data.shortId || this.exportToken));
            try {
              if (window.Alpine && Alpine.store('auth')) {
                Alpine.store('auth').exportToken = this.exportToken;
                Alpine.store('auth').exportSubUrl = this.exportSubUrl;
              }
              localStorage.setItem('sublink_export_token', this.exportToken);
              localStorage.setItem('sublink_export_sub_url', this.exportSubUrl);
            } catch (e) {}
          } catch (e) {}
        },

        async rotateExportToken() {
          if (!confirm('轮换导出 Token 后，旧订阅链接将立即失效，确定？')) return;
          try {
            let ok = false;
            try {
              if (window.Alpine && Alpine.store('auth') && typeof Alpine.store('auth').rotateExportToken === 'function') {
                ok = await Alpine.store('auth').rotateExportToken();
                this.exportToken = Alpine.store('auth').exportToken || '';
                this.exportSubUrl = Alpine.store('auth').exportSubUrl || '';
              }
            } catch (e) {}
            if (!ok || !this.exportToken) {
              const res = await fetch('/api/export-token/rotate', { method: 'POST', headers: this.headers() });
              const data = await res.json().catch(() => ({}));
              if (!res.ok) throw new Error(data.error || '轮换失败');
              this.exportToken = data.token || '';
              this.exportSubUrl = data.subscriptionUrl || '';
            }
            this.persistMessage('已更新订阅 Token');
          } catch (e) {
            this.persistMessage(e.message || '轮换失败');
          }
        },

        scheduleSync() {
          if (this.syncTimer) clearTimeout(this.syncTimer);
          this.syncTimer = setTimeout(() => this.syncNow(), 600);
        },

        async syncNow(attempt = 0) {
          if (!this.authenticated || this.suppressSync) return;
          if (this._syncInFlight) {
            this._syncQueued = true;
            return;
          }
          const intended = Array.isArray(this.nodes) ? this.nodes : [];
          const payload = JSON.stringify(intended);
          if (payload === this.lastSyncedJson) return;
          this._syncInFlight = true;
          this.saving = true;
          let handoffRetry = false;
          try {
            const res = await fetch('/api/nodes', {
              method: 'PUT',
              headers: this.headers(true),
              body: JSON.stringify({ nodes: intended, revision: this.revision })
            });
            if (res.status === 401) {
              this.authenticated = false;
              this.token = '';
              localStorage.removeItem(TOKEN_KEY);
              this.flash = '登录已失效，请重新登录';
              return;
            }
            if (res.status === 409) {
              await this.loadFromServer();
              if (attempt < 2) {
                this.suppressSync = true;
                this.nodes = JSON.parse(payload);
                handoffRetry = true;
                setTimeout(() => {
                  this.suppressSync = false;
                  this._syncInFlight = false;
                  this.saving = false;
                  this.syncNow(attempt + 1);
                }, 0);
                return;
              }
              const data = await res.json().catch(() => ({}));
              throw new Error(data.error || '节点库已在其他设备更新，请刷新后重试');
            }
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              throw new Error(data.error || ('同步失败 ' + res.status));
            }
            const data = await res.json().catch(() => ({}));
            this.revision = Number.isFinite(Number(data.revision)) ? Number(data.revision) : this.revision;
            this.lastSyncedJson = payload;
            localStorage.setItem(LOCAL_MIRROR, payload);
            if (attempt > 0) {
              this.persistMessage('已与其他端对齐后重新同步');
            }
          } catch (e) {
            this.flash = '同步失败: ' + (e.message || '');
          } finally {
            if (handoffRetry) return;
            this._syncInFlight = false;
            this.saving = false;
            if (this._syncQueued) {
              this._syncQueued = false;
              setTimeout(() => this.syncNow(0), 0);
            }
          }
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
            .replace(new RegExp(String.fromCharCode(13), 'g'), String.fromCharCode(10))
            .split(String.fromCharCode(10))
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
          const text = String(this.pasteBox || '').trim();
          if (!text) {
            this.persistMessage('请粘贴节点或订阅 URL');
            return;
          }
          // Single http(s) URL line -> remote fetch import
          const only = text.replace(new RegExp(String.fromCharCode(13), 'g'), String.fromCharCode(10)).split(String.fromCharCode(10)).map((l) => l.trim()).filter(Boolean);
          if (only.length === 1 && new RegExp('^https?://', 'i').test(only[0])) {
            this.remoteUrl = only[0];
            this.importRemoteUrl();
            return;
          }
          this.addFromText(text, { select: true });
          this.pasteBox = '';
        },

        async importRemoteUrl() {
          if (!this.authenticated) {
            this.persistMessage('请先登录');
            return;
          }
          const url = String(this.remoteUrl || this.pasteBox || '').trim();
          if (!new RegExp('^https?://', 'i').test(url)) {
            this.persistMessage('请填写有效的 http(s) 订阅地址');
            return;
          }
          const mode = this.importMode === 'merge' ? 'merge' : 'replace';
          this.importing = true;
          this.importReport = null;
          try {
            const res = await fetch('/api/nodes/import-url', {
              method: 'POST',
              headers: this.headers(true),
              body: JSON.stringify({ url, mode })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
              if (res.status === 409) {
                await this.loadFromServer();
              }
              throw new Error(data.error || ('导入失败 ' + res.status));
            }
            if (Array.isArray(data.nodes)) {
              this.suppressSync = true;
              this.nodes = data.nodes;
              this.revision = Number.isFinite(Number(data.revision)) ? Number(data.revision) : this.revision;
              this.lastSyncedJson = JSON.stringify(this.nodes);
              localStorage.setItem(LOCAL_MIRROR, this.lastSyncedJson);
              setTimeout(() => { this.suppressSync = false; }, 0);
            }
            this.importReport = {
              mode: data.mode || mode,
              added: data.added || 0,
              updated: data.updated || 0,
              removed: data.removed || 0,
              skipped: data.skipped || 0,
              parsed: data.parsed || 0,
              format: data.format || 'unknown',
              source: data.source || url,
              samples: data.samples || [],
              message: data.message || ''
            };
            this.persistMessage(data.message || ('已导入 ' + (data.added || 0) + ' 个'));
            // keep remoteUrl for easy re-import / update
            this.pasteBox = '';
          } catch (e) {
            this.importReport = { error: e.message || '远程导入失败' };
            this.persistMessage(e.message || '远程导入失败');
          } finally {
            this.importing = false;
          }
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
          try {
            const res = await fetch('/api/nodes', {
              method: 'DELETE',
              headers: this.headers(true),
              body: JSON.stringify({ revision: this.revision })
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || '清空失败');
            this.suppressSync = true;
            this.nodes = data.nodes || [];
            this.revision = Number.isFinite(Number(data.revision)) ? Number(data.revision) : this.revision;
            this.lastSyncedJson = JSON.stringify(this.nodes);
            localStorage.setItem(LOCAL_MIRROR, this.lastSyncedJson);
            setTimeout(() => { this.suppressSync = false; }, 0);
            this.persistMessage('节点库已清空');
          } catch (e) {
            this.persistMessage(e.message || '清空失败');
          }
        },

        subUrl() {
          // Default: long-lived export token only (never fall back to login session)
          try {
            const a = Alpine.store('auth');
            if (a && a.exportSubUrl) return a.exportSubUrl;
            if (a && a.exportToken) {
              return window.location.origin + '/sub/' + encodeURIComponent(a.shortId || a.exportToken);
            }
          } catch (e) {}
          if (this.exportSubUrl) return this.exportSubUrl;
          if (this.exportToken) {
            return window.location.origin + '/sub/' + encodeURIComponent(this.exportToken);
          }
          return '';
        },

        copySubUrl() {
          const url = this.subUrl();
          if (!url) {
            this.persistMessage('订阅链接尚未就绪');
            return;
          }
          navigator.clipboard.writeText(url).then(() => this.persistMessage('已复制 Clash 订阅链接')).catch(() => {
            this.persistMessage(url);
          });
        },

        get filtered() {
          const q = String(this.filter || '').trim().toLowerCase();
          if (!q) return this.nodes;
          return this.nodes.filter((n) => {
            return (
              String(n.name || '').toLowerCase().includes(q) ||
              String(n.protocol || '').toLowerCase().includes(q) ||
              String(n.tag || '').toLowerCase().includes(q) ||
              String(n.source || '').toLowerCase().includes(q) ||
              String(n.sourceUrl || '').toLowerCase().includes(q) ||
              String(n.raw || '').toLowerCase().includes(q)
            );
          });
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
                try { window.__SUBLINK_UI__.setPage('subscribe'); } catch (e) {}
              } else {
                try { window.__SUBLINK_UI__.setPage('generate'); } catch (e) {}
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
      <div x-show="!bootstrapped" class="pixel-card mm-card p-8 text-center">
        <i class="fas fa-spinner fa-spin text-[var(--primary)]"></i>
        <p class="mm-desc mt-2">加载节点库…</p>
      </div>

      {/* Login Prompt if not authenticated */}
      <div x-show="bootstrapped && authRequired && !authenticated" class="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 max-w-md mx-auto shadow-sm space-y-4">
        <div>
          <h2 class="text-base font-semibold text-[var(--foreground)]">登录节点库</h2>
          <p class="text-xs text-[var(--muted-foreground)] mt-0.5">密码鉴权后节点将同步到服务端 KV，可跨设备持久化访问</p>
        </div>
        <div class="space-y-3">
          <div class="space-y-1">
            <label class="block text-xs font-medium text-[var(--foreground)]">管理密码</label>
            <input
              type="password"
              class="mm-input text-xs"
              x-model="password"
              placeholder="请输入 AUTH_PASSWORD"
              {...{ 'x-on:keydown.enter.prevent': 'login()' }}
            />
          </div>
          <p class="text-xs text-red-500 font-medium" x-show="loginError" x-text="loginError"></p>
          <div class="text-xs text-amber-500" x-show="!kvReady">警告：当前未检测到 KV，登录后可能无法持久化。</div>
          <button type="button" class="mm-btn mm-btn-primary w-full text-xs py-2" x-on:click="login()" x-bind:disabled="loading">
            <i class="fas" x-bind:class={'loading ? "fa-spinner fa-spin" : "fa-right-to-bracket text-xs"'}></i>
            登录
          </button>
        </div>
      </div>

      {/* Main Node Library View */}
      <div x-show="bootstrapped && authenticated" class="rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm overflow-hidden">
        {/* Card Header */}
        <div class="border-b border-[var(--border)] px-5 py-4 bg-[var(--secondary)]/30">
          <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div class="font-semibold text-sm text-[var(--foreground)] flex items-center gap-2">
                <i class="fas fa-network-wired text-[var(--primary)] text-xs"></i>
                <span>节点库管理</span>
                <span class="font-mono text-xs text-[var(--primary)] font-normal" x-text="'(' + nodes.length + ' 节点 · 选中 ' + selectedCount + ')'"></span>
              </div>
              <p class="text-xs text-[var(--muted-foreground)] mt-0.5">
                节点自动同步至云端 KV
                <span class="ml-1 text-emerald-500 font-medium text-[11px]" x-show="saving" x-cloak>• 同步中…</span>
              </p>
            </div>
            <div class="flex flex-wrap gap-1.5">
              <button type="button" class="mm-btn mm-btn-outline mm-btn-sm text-xs" x-on:click="loadFromServer()">
                <i class="fas fa-rotate text-[10px]"></i> 刷新
              </button>
              <button type="button" class="mm-btn mm-btn-outline mm-btn-sm text-xs" x-on:click="importFromInput()">
                <i class="fas fa-file-import text-[10px]"></i> 从输入源导入
              </button>
              <button type="button" class="mm-btn mm-btn-primary mm-btn-sm text-xs" x-on:click="applyToConverter({ convert: true })" x-bind:disabled="selectedCount === 0">
                <i class="fas fa-bolt text-[10px]"></i> 用选中生成
              </button>
            </div>
          </div>
        </div>

        <div class="p-5 space-y-4">
          {/* Import Forms Grid */}
          <div class="grid grid-cols-1 lg:grid-cols-5 gap-3.5">
            {/* Left: Paste & Remote URL */}
            <div class="lg:col-span-3 space-y-3">
              <div>
                <label class="block text-xs font-semibold text-[var(--foreground)] mb-1">粘贴节点分享链接</label>
                <textarea
                  x-model="pasteBox"
                  rows={3}
                  class="mm-textarea font-mono text-xs min-h-[5.5rem]"
                  placeholder="每行一条：ss / vmess / vless / trojan / hysteria2 …&#10;也可只粘贴一条 http(s) 订阅地址，将自动远程拉取"
                ></textarea>
              </div>
              <div class="space-y-2">
                <label class="block text-xs font-semibold text-[var(--foreground)]">远程订阅 URL</label>
                <div class="flex gap-2">
                  <input type="url" class="mm-input font-mono text-xs flex-1" x-model="remoteUrl" placeholder="https://example.com/sub" />
                  <button type="button" class="mm-btn mm-btn-secondary mm-btn-sm text-xs shrink-0" x-on:click="importRemoteUrl()" x-bind:disabled="importing">
                    <i class="fas" x-bind:class={'importing ? "fa-spinner fa-spin" : "fa-cloud-arrow-down"'}></i>
                    <span x-text={'importing ? "拉取中…" : "拉取导入"'}></span>
                  </button>
                </div>
                <div class="flex flex-wrap gap-3 text-xs text-[var(--muted-foreground)]">
                  <label class="inline-flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" class="mm-check" name="importMode" value="replace" x-model="importMode" />
                    <span>更新替换（推荐）</span>
                  </label>
                  <label class="inline-flex items-center gap-1.5 cursor-pointer">
                    <input type="radio" class="mm-check" name="importMode" value="merge" x-model="importMode" />
                    <span>合并追加</span>
                  </label>
                </div>

                {/* Import Report Bubble */}
                <div class="rounded-xl border border-[var(--border)] bg-[var(--secondary)]/40 p-3 text-xs space-y-1" x-show="importReport" x-cloak>
                  <template x-if="importReport && importReport.error">
                    <p class="text-red-500 font-medium" x-text="importReport.error"></p>
                  </template>
                  <template x-if="importReport && !importReport.error">
                    <div class="space-y-1">
                      <p class="font-medium text-[var(--foreground)]" x-text="importReport.message"></p>
                      <p class="text-[var(--muted-foreground)] text-[11px]">
                        解析 <span x-text="importReport.parsed"></span>
                        · 新增 <span class="text-emerald-500 font-semibold" x-text="importReport.added"></span>
                        · 更新 <span class="text-amber-500 font-semibold" x-text="importReport.updated"></span>
                        · 移除 <span class="text-red-500 font-semibold" x-text="importReport.removed"></span>
                        · 跳过 <span x-text="importReport.skipped"></span>
                        · 格式 <span class="font-mono uppercase" x-text="importReport.format"></span>
                      </p>
                      <p class="text-[var(--muted-foreground)] font-mono text-[10px] truncate" x-show="importReport.source" x-text="importReport.source"></p>
                    </div>
                  </template>
                </div>
              </div>
            </div>

            {/* Right: Search & Actions */}
            <div class="lg:col-span-2 flex flex-col justify-between gap-3 p-3.5 rounded-xl border border-[var(--border)] bg-[var(--secondary)]/20">
              <div class="space-y-2">
                <label class="block text-xs font-semibold text-[var(--foreground)]">筛选节点</label>
                <input type="search" x-model="filter" class="mm-input text-xs" placeholder="按名称 / 协议 / 标签搜索…" />
              </div>
              <div class="flex flex-col gap-2 pt-2 border-t border-[var(--border)]">
                <button type="button" class="mm-btn mm-btn-primary w-full text-xs py-2" x-on:click="importFromPaste()" x-bind:disabled="importing">
                  <i class="fas fa-plus text-[10px]"></i> 保存到节点库
                </button>
                <div class="grid grid-cols-2 gap-1.5">
                  <button type="button" class="mm-btn mm-btn-outline text-xs py-1.5" x-on:click="applyToConverter({ convert: false })" x-bind:disabled="selectedCount === 0">
                    填入生成页
                  </button>
                  <button type="button" class="mm-btn mm-btn-outline text-xs py-1.5" x-on:click="exportSelected()" x-bind:disabled="selectedCount === 0">
                    复制选中
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* List Controls */}
          <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted-foreground)] pt-2 border-t border-[var(--border)]">
            <div class="flex items-center gap-3">
              <label class="inline-flex items-center gap-1.5 cursor-pointer font-medium text-[var(--foreground)]">
                <input type="checkbox" class="mm-check" x-bind:checked="selectAll" x-on:change="toggleSelectAll()" />
                全选当前列表
              </label>
              <button type="button" class="hover:text-red-500 transition-colors" x-on:click="removeSelected()" x-show="nodes.some(n => n.selected)">
                删除选中
              </button>
              <button type="button" class="hover:text-red-500 transition-colors" x-on:click="clearAll()" x-show="nodes.length">
                清空全库
              </button>
            </div>
            <span class="text-xs text-[var(--primary)] font-medium" x-show="flash" x-text="flash"></span>
          </div>

          {/* Table Container */}
          <div class="rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--card)]">
            <div class="max-h-[26rem] overflow-auto">
              <template x-if="filtered.length === 0">
                <div class="px-4 py-12 text-center text-xs text-[var(--muted-foreground)] space-y-1.5">
                  <div class="text-sm font-semibold text-[var(--foreground)]">暂无节点</div>
                  <p>粘贴分享链接点击「保存到节点库」，或输入远程订阅 URL 点击「拉取导入」</p>
                </div>
              </template>
              <table class="w-full text-xs" x-show="filtered.length > 0">
                <thead class="sticky top-0 bg-[var(--secondary)]/80 backdrop-blur-sm text-[var(--muted-foreground)] text-[11px] uppercase tracking-wider font-semibold border-b border-[var(--border)] z-10">
                  <tr>
                    <th class="w-10 px-3 py-2.5 text-left"></th>
                    <th class="px-3 py-2.5 text-left">名称</th>
                    <th class="px-3 py-2.5 text-left hidden sm:table-cell">协议</th>
                    <th class="px-3 py-2.5 text-left hidden md:table-cell">状态</th>
                    <th class="w-16 px-3 py-2.5 text-right">操作</th>
                  </tr>
                </thead>
                <tbody class="divide-y divide-[var(--border)]">
                  <template x-for="node in filtered" x-bind:key="node.id">
                    <tr class="hover:bg-[var(--secondary)]/40 transition-colors" x-bind:class={'node.enabled === false ? "opacity-40" : ""'}>
                      <td class="px-3 py-2.5">
                        <input type="checkbox" class="mm-check" x-model="node.selected" />
                      </td>
                      <td class="px-3 py-2.5 min-w-0">
                        <template x-if="editingId !== node.id">
                          <button
                            type="button"
                            class="text-left font-medium text-[var(--foreground)] hover:text-[var(--primary)] truncate max-w-[14rem] sm:max-w-xs block transition-colors"
                            x-text="node.name"
                            x-on:click="startEdit(node)"
                            title="点击修改名称"
                          ></button>
                        </template>
                        <template x-if="editingId === node.id">
                          <input
                            type="text"
                            class="mm-input py-1 text-xs max-w-xs"
                            x-model="editName"
                            {...{
                              'x-on:keydown.enter.prevent': 'commitEdit(node)',
                              'x-on:keydown.escape.prevent': 'editingId = null',
                              'x-on:blur': 'commitEdit(node)',
                              'x-init': '$nextTick(function(){ $el.focus() })'
                            }}
                          />
                        </template>
                        <div class="font-mono text-[10px] text-[var(--muted-foreground)] truncate max-w-[14rem] sm:max-w-md mt-0.5" x-text="node.raw"></div>
                      </td>
                      <td class="px-3 py-2.5 hidden sm:table-cell">
                        <span class="inline-flex rounded px-1.5 py-0.5 text-[10px] font-mono uppercase font-medium bg-[var(--secondary)] border border-[var(--border)]" x-text="node.protocol || '?'"></span>
                      </td>
                      <td class="px-3 py-2.5 hidden md:table-cell">
                        <label class="relative inline-flex cursor-pointer">
                          <input type="checkbox" class="sr-only peer" x-model="node.enabled" />
                          <span class="mm-switch scale-90 origin-left"></span>
                        </label>
                      </td>
                      <td class="px-3 py-2.5 text-right">
                        <button type="button" class="h-7 w-7 inline-flex items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:text-red-500 hover:bg-red-500/10 transition-colors" title="删除" x-on:click="removeOne(node.id)">
                          <i class="fas fa-trash-alt text-xs"></i>
                        </button>
                      </td>
                    </tr>
                  </template>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: scriptContent }} />
    </div>
  );
};
