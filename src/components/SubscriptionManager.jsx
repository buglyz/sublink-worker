/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */

/**
 * Subscription management (miaomiaowu-style): list/create/edit/delete, pick nodes, public Clash URL.
 * Alpine script is embedded carefully to avoid template-literal regex breakage.
 */
export const SubscriptionManager = () => {
  // Static format list rendered server-side; avoids Alpine x-for runtime binding.
  // Kept to the most common targets; singbox/xray are real formats on /subscribe.
  // Auto detects target from the requesting client's User-Agent.
  const copyFormats = [
    { key: 'clash', label: 'Clash', target: 'clash' },
    { key: 'singbox', label: 'Sing-box', target: 'singbox' },
    { key: 'xray', label: 'Xray', target: 'xray' },
    { key: 'surge', label: 'Surge', target: 'surge', ua: 'surge' },
    { key: 'auto', label: 'Auto', target: 'auto' }
  ];
  const scriptContent = `
    function subscriptionManagerData() {
      return {
        items: [],
        nodes: [],
        loading: false,
        saving: false,
        flash: '',
        error: '',
        editing: null, // null | object being edited / created
        filter: '',
        nodeFilter: '',
        formatModal: false,
        formatItem: null, // item whose format selector is open
        formats: [
          { key: 'clash', label: 'Clash', target: 'clash' },
          { key: 'singbox', label: 'Sing-box', target: 'singbox' },
          { key: 'xray', label: 'Xray', target: 'xray' },
          { key: 'surge', label: 'Surge', target: 'surge', ua: 'surge' },
          { key: 'auto', label: 'Auto', target: 'auto' }
        ],

        token() {
          try { return Alpine.store('auth').token || localStorage.getItem('sublink_auth_token') || ''; }
          catch (e) { return localStorage.getItem('sublink_auth_token') || ''; }
        },
        headers(json) {
          const h = {};
          if (json) h['Content-Type'] = 'application/json';
          const t = this.token();
          if (t) h.Authorization = 'Bearer ' + t;
          return h;
        },
        async init() {
          const self = this;
          window.addEventListener('sublink-auth', () => self.reload());
          window.addEventListener('sublink-page', (e) => {
            if (e.detail && e.detail.page === 'subs') self.reload();
          });
          window.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && self.formatModal) self.closeFormatModal();
          });
          await this.reload();
        },
        async reload() {
          this.loading = true;
          this.error = '';
          try {
            const [subRes, nodeRes] = await Promise.all([
              fetch('/api/subscriptions', { headers: this.headers() }),
              fetch('/api/nodes', { headers: this.headers() })
            ]);
            if (subRes.status === 401 || nodeRes.status === 401) {
              this.items = []; this.nodes = [];
              this.error = '请先登录';
              return;
            }
            if (!subRes.ok) throw new Error('加载订阅失败');
            if (!nodeRes.ok) throw new Error('加载节点失败');
            const subData = await subRes.json();
            const nodeData = await nodeRes.json();
            this.items = subData.items || [];
            this.nodes = nodeData.nodes || [];
          } catch (e) {
            this.error = e.message || '加载失败';
          } finally {
            this.loading = false;
          }
        },
        persist(msg) {
          this.flash = msg;
          setTimeout(() => { if (this.flash === msg) this.flash = ''; }, 2800);
        },
        get filteredItems() {
          const q = String(this.filter || '').trim().toLowerCase();
          if (!q) return this.items;
          return this.items.filter((s) =>
            String(s.name || '').toLowerCase().includes(q) ||
            String(s.slug || '').toLowerCase().includes(q) ||
            String(s.description || '').toLowerCase().includes(q)
          );
        },
        get filteredNodes() {
          const q = String(this.nodeFilter || '').trim().toLowerCase();
          let list = this.nodes.filter((n) => n.enabled !== false);
          if (!q) return list;
          return list.filter((n) =>
            String(n.name || '').toLowerCase().includes(q) ||
            String(n.protocol || '').toLowerCase().includes(q) ||
            String(n.tag || '').toLowerCase().includes(q) ||
            String(n.raw || '').toLowerCase().includes(q)
          );
        },
        blank() {
          return {
            id: null,
            name: '',
            description: '',
            slug: '',
            nodeIds: [],
            mode: 'custom',
            template: '',
            selectedRules: 'balanced',
            groupByCountry: false,
            includeAutoSelect: true,
            enabled: true
          };
        },
        startCreate() {
          this.editing = this.blank();
        },
        startEdit(item) {
          this.editing = {
            id: item.id,
            name: item.name || '',
            description: item.description || '',
            slug: item.slug || '',
            nodeIds: Array.isArray(item.nodeIds) ? item.nodeIds.slice() : [],
            mode: item.mode === 'template' ? 'template' : 'custom',
            template: item.template || '',
            selectedRules: item.selectedRules || 'balanced',
            groupByCountry: !!item.groupByCountry,
            includeAutoSelect: item.includeAutoSelect !== false,
            enabled: item.enabled !== false
          };
        },
        cancelEdit() { this.editing = null; },
        isPicked(id) {
          if (!this.editing) return false;
          return (this.editing.nodeIds || []).includes(id);
        },
        toggleNode(id) {
          if (!this.editing) return;
          const set = new Set(this.editing.nodeIds || []);
          if (set.has(id)) set.delete(id); else set.add(id);
          this.editing.nodeIds = Array.from(set);
        },
        selectAllFilteredNodes() {
          if (!this.editing) return;
          const set = new Set(this.editing.nodeIds || []);
          this.filteredNodes.forEach((n) => set.add(n.id));
          this.editing.nodeIds = Array.from(set);
        },
        clearNodes() {
          if (!this.editing) return;
          this.editing.nodeIds = [];
        },
        async saveEdit() {
          if (!this.editing) return;
          if (!String(this.editing.name || '').trim()) {
            this.persist('请填写订阅名称');
            return;
          }
          this.saving = true;
          try {
            const payload = {
              name: this.editing.name.trim(),
              description: this.editing.description || '',
              slug: this.editing.slug || undefined,
              nodeIds: this.editing.nodeIds || [],
              mode: this.editing.mode,
              template: this.editing.mode === 'template' ? (this.editing.template || '') : '',
              selectedRules: this.editing.selectedRules || 'balanced',
              groupByCountry: !!this.editing.groupByCountry,
              includeAutoSelect: this.editing.includeAutoSelect !== false,
              enabled: this.editing.enabled !== false
            };
            let res;
            if (this.editing.id) {
              res = await fetch('/api/subscriptions/' + encodeURIComponent(this.editing.id), {
                method: 'PUT', headers: this.headers(true), body: JSON.stringify(payload)
              });
            } else {
              res = await fetch('/api/subscriptions', {
                method: 'POST', headers: this.headers(true), body: JSON.stringify(payload)
              });
            }
            const data = await res.json().catch(() => ({}));
            if (!res.ok) throw new Error(data.error || '保存失败');
            this.persist(this.editing.id ? '订阅已更新' : '订阅已创建');
            this.editing = null;
            await this.reload();
          } catch (e) {
            this.persist(e.message || '保存失败');
          } finally {
            this.saving = false;
          }
        },
        async removeItem(item) {
          if (!confirm('删除订阅「' + item.name + '」？客户端链接将失效。')) return;
          try {
            const res = await fetch('/api/subscriptions/' + encodeURIComponent(item.id), {
              method: 'DELETE', headers: this.headers()
            });
            if (!res.ok) {
              const data = await res.json().catch(() => ({}));
              throw new Error(data.error || '删除失败');
            }
            this.persist('已删除');
            await this.reload();
          } catch (e) {
            this.persist(e.message || '删除失败');
          }
        },
        copyUrl(item, format) {
          if (!item) return;
          const url = this.buildSubscriptionUrl(item, format);
          const label = format ? format.label : 'Clash';
          if (navigator.clipboard && navigator.clipboard.writeText) {
            navigator.clipboard.writeText(url).then(() => this.persist('已复制 ' + label + ' 订阅链接')).catch(() => this.persist(url));
          } else {
            this.persist(url);
          }
        },
        copyDefault(item) {
          const clashFmt = this.formats.find((f) => f.key === 'clash') || { key: 'clash', label: 'Clash', target: 'clash' };
          this.copyUrl(item, clashFmt);
        },
        copyByFormatKey(item, key) {
          const fmt = this.formats.find((f) => f.key === key) || { key: 'clash', label: 'Clash', target: 'clash' };
          this.copyUrl(item, fmt);
          this.closeFormatModal();
        },
        // Build subscription URL for a given client format. Most clients are
        // Clash/Surge variants and rely on the client UA; we just hint format + ua.
        buildSubscriptionUrl(item, format) {
          if (!item) return '';
          const base = item.url || (window.location.origin + '/subscribe/' + encodeURIComponent(item.slug || ''));
          const u = new URL(base, window.location.origin);
          const target = (format && format.target) || 'clash';
          u.searchParams.set('format', target);
          if (format && format.ua) {
            u.searchParams.set('ua', decodeURIComponent(format.ua));
          } else {
            u.searchParams.delete('ua');
          }
          return u.toString();
        },
        openFormatModal(item) {
          this.formatItem = item;
          this.formatModal = true;
        },
        closeFormatModal() {
          this.formatModal = false;
          this.formatItem = null;
        }
      };
    }
  `;

  return (
    <div x-data="subscriptionManagerData()" x-init="init()" class="space-y-4">
      {/* Page Header */}
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 class="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--foreground)]">订阅管理</h1>
          <p class="text-sm text-[var(--muted-foreground)] mt-1">创建可自定义节点的固定 Clash / Surge 订阅，生成永久短链并持久化保存</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="button" class="mm-btn mm-btn-outline mm-btn-sm text-xs" x-on:click="reload()" x-bind:disabled="loading">
            <i class="fas" x-bind:class={'loading ? "fa-spinner fa-spin" : "fa-rotate"'}></i> 刷新
          </button>
          <button type="button" class="mm-btn mm-btn-primary mm-btn-sm text-xs" x-on:click="startCreate()">
            <i class="fas fa-plus text-xs"></i> 创建订阅
          </button>
        </div>
      </div>

      <p class="text-sm text-[var(--primary)] font-medium" x-show="flash" x-text="flash"></p>
      <p class="text-sm text-red-500 font-medium" x-show="error" x-text="error"></p>

      {/* Editor Drawer/Card */}
      <div class="rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm overflow-hidden" x-show="editing" x-cloak>
        <div class="border-b border-[var(--border)] px-5 py-4 bg-[var(--secondary)]/30">
          <div class="font-semibold text-base text-[var(--foreground)] flex items-center gap-2">
            <i class="fas fa-pen-to-square text-[var(--primary)] text-sm"></i>
            <span x-text={'editing && editing.id ? "编辑订阅" : "创建新订阅"'}></span>
          </div>
          <div class="text-sm text-[var(--muted-foreground)] mt-0.5">勾选节点库中的节点；保存后可得到长期稳定的订阅链接</div>
        </div>
        <div class="p-5 space-y-4" x-show="editing">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="mm-label">名称 *</label>
              <input type="text" class="mm-input text-sm" x-model="editing.name" placeholder="例如：主力订阅" />
            </div>
            <div>
              <label class="mm-label">短链 slug（可选）</label>
              <input type="text" class="mm-input font-mono text-sm" x-model="editing.slug" placeholder="留空自动生成" />
            </div>
            <div class="md:col-span-2">
              <label class="mm-label">备注说明</label>
              <input type="text" class="mm-input text-sm" x-model="editing.description" placeholder="可选订阅说明" />
            </div>
          </div>

          <div class="space-y-2 pt-2 border-t border-[var(--border)]">
            <label class="mm-label">规则体系模式</label>
            <div class="inline-flex bg-[var(--secondary)] p-1 rounded-lg border border-[var(--border)]">
              <button
                type="button"
                class="px-3.5 py-1.5 rounded-md text-sm font-medium transition-all"
                x-on:click={'editing.mode = "custom"'}
                x-bind:class={'editing.mode === "custom" ? "bg-[var(--card)] text-[var(--primary)] shadow-xs font-semibold" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"'}
              >
                自定义规则
              </button>
              <button
                type="button"
                class="px-3.5 py-1.5 rounded-md text-sm font-medium transition-all"
                x-on:click={'editing.mode = "template"'}
                x-bind:class={'editing.mode === "template" ? "bg-[var(--card)] text-[var(--primary)] shadow-xs font-semibold" : "text-[var(--muted-foreground)] hover:text-[var(--foreground)]"'}
              >
                使用模板
              </button>
            </div>
          </div>

          <div x-show={'editing.mode === "custom"'} class="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
            <div class="sm:col-span-3">
              <label class="mm-label">规则预设</label>
              <select class="mm-select text-sm max-w-xs" x-model="editing.selectedRules">
                <option value="minimal">minimal</option>
                <option value="balanced">balanced</option>
                <option value="comprehensive">comprehensive</option>
              </select>
            </div>
            <label class="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--secondary)]/20 px-3.5 py-2.5 cursor-pointer hover:border-[var(--border-hover)] transition-colors">
              <span class="text-sm font-medium text-[var(--foreground)]">按国家分组</span>
              <span class="relative inline-flex"><input type="checkbox" class="sr-only peer" x-model="editing.groupByCountry" /><span class="mm-switch"></span></span>
            </label>
            <label class="flex items-center justify-between gap-2 rounded-lg border border-[var(--border)] bg-[var(--secondary)]/20 px-3.5 py-2.5 cursor-pointer hover:border-[var(--border-hover)] transition-colors">
              <span class="text-sm font-medium text-[var(--foreground)]">自动选择</span>
              <span class="relative inline-flex"><input type="checkbox" class="sr-only peer" x-model="editing.includeAutoSelect" /><span class="mm-switch"></span></span>
            </label>
          </div>

          <div x-show={'editing.mode === "template"'} class="space-y-1.5">
            <label class="mm-label">模板 ID</label>
            <input type="text" class="mm-input font-mono text-sm max-w-sm" x-model="editing.template" placeholder="fake_ip / redirhost / Custom_Clash …" />
            <p class="text-xs text-[var(--muted-foreground)]">与生成页模板 id 一致，例如 fake_ip、redirhost</p>
          </div>

          {/* Node Selection */}
          <div class="space-y-2 pt-2 border-t border-[var(--border)]">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <label class="block text-sm font-semibold text-[var(--foreground)] mb-0">选择节点（已选 <span class="text-[var(--primary)] font-bold" x-text="editing.nodeIds.length">0</span>）</label>
              <div class="flex items-center gap-1.5">
                <input type="search" class="mm-input h-8 text-xs max-w-[9.5rem]" placeholder="筛选节点" x-model="nodeFilter" />
                <button type="button" class="mm-btn mm-btn-outline mm-btn-sm text-xs !h-8" x-on:click="selectAllFilteredNodes()">全选筛选</button>
                <button type="button" class="mm-btn mm-btn-outline mm-btn-sm text-xs !h-8" x-on:click="clearNodes()">清空</button>
              </div>
            </div>
            <div class="max-h-60 overflow-y-auto rounded-xl border border-[var(--border)] divide-y divide-[var(--border)] bg-[var(--card)]">
              <template x-if="!filteredNodes.length">
                <div class="px-3 py-8 text-center text-[var(--muted-foreground)] text-sm">节点库为空，请先在「节点管理」导入</div>
              </template>
              <template x-for="n in filteredNodes" x-bind:key="n.id">
                <label class="flex items-center gap-2.5 px-3.5 py-2.5 cursor-pointer hover:bg-[var(--secondary)]/40 text-sm transition-colors">
                  <input type="checkbox" class="mm-check" x-bind:checked="isPicked(n.id)" x-on:change="toggleNode(n.id)" />
                  <span class="mm-chip text-xs uppercase font-mono" x-text="n.protocol || '?'"></span>
                  <span class="font-medium truncate flex-1 text-[var(--foreground)]" x-text="n.name"></span>
                </label>
              </template>
            </div>
          </div>

          <div class="flex flex-wrap gap-2 pt-2 border-t border-[var(--border)]">
            <button type="button" class="mm-btn mm-btn-primary text-sm font-medium" x-on:click="saveEdit()" x-bind:disabled="saving">
              <i class="fas" x-bind:class={'saving ? "fa-spinner fa-spin" : "fa-floppy-disk"'}></i>
              保存订阅
            </button>
            <button type="button" class="mm-btn mm-btn-outline text-sm" x-on:click="cancelEdit()">取消</button>
          </div>
        </div>
      </div>

      {/* Subscription List */}
      <div class="rounded-2xl border border-[var(--border)] bg-[var(--card)] shadow-sm overflow-hidden" x-show="!editing">
        <div class="border-b border-[var(--border)] px-5 py-4 bg-[var(--secondary)]/30 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div class="font-semibold text-base text-[var(--foreground)] flex items-center gap-2">
              <i class="fas fa-folder-open text-[var(--primary)] text-sm"></i>
              <span>已保存的订阅</span>
              <span class="font-mono text-sm text-[var(--primary)] font-normal" x-text="'(' + items.length + ')'"></span>
            </div>
            <div class="text-sm text-[var(--muted-foreground)] mt-0.5">点击复制对应格式链接到代理客户端</div>
          </div>
          <input type="search" class="mm-input max-w-xs h-9 text-sm" placeholder="搜索订阅…" x-model="filter" />
        </div>
        <div class="p-5">
          <template x-if="!loading && !filteredItems.length">
            <div class="py-12 text-center space-y-3">
              <div class="w-12 h-12 mx-auto rounded-xl bg-[var(--secondary)] flex items-center justify-center text-[var(--muted-foreground)]">
                <i class="fas fa-folder-plus text-base"></i>
              </div>
              <div>
                <p class="text-base font-semibold text-[var(--foreground)]">还没有保存的订阅</p>
                <p class="text-sm text-[var(--muted-foreground)] mt-0.5">创建订阅后可以随时更新节点，客户端配置自动同步</p>
              </div>
              <button type="button" class="mm-btn mm-btn-primary mm-btn-sm text-sm" x-on:click="startCreate()">创建第一个订阅</button>
            </div>
          </template>
          <div class="divide-y divide-[var(--border)]">
            <template x-for="item in filteredItems" x-bind:key="item.id">
              <div class="py-4 flex flex-col gap-2">
                <div class="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                  <div class="min-w-0 flex-1 space-y-1">
                    <div class="flex flex-wrap items-center gap-2">
                      <span class="font-semibold text-base text-[var(--foreground)]" x-text="item.name"></span>
                      <span class="mm-chip text-xs" x-text="item.mode === 'template' ? ('模板: ' + (item.template || '')) : ('规则: ' + (item.selectedRules || 'balanced'))"></span>
                      <span class="text-xs text-[var(--muted-foreground)]" x-text="(item.nodeIds?.length || 0) + ' 节点'"></span>
                    </div>
                    <p class="text-xs text-[var(--muted-foreground)]" x-show="item.description" x-text="item.description"></p>
                    <p class="font-mono text-xs text-[var(--primary)] break-all" x-text="item.url || ('/subscribe/' + item.slug)"></p>
                  </div>
                  <div class="flex flex-wrap gap-1.5 shrink-0 items-center">
                    <div class="inline-flex rounded-lg shadow-xs overflow-hidden border border-[var(--primary)]">
                      <button type="button" class="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white px-3.5 py-1.5 text-xs font-medium flex items-center gap-1.5 transition-colors" x-on:click="copyDefault(item)">
                        <i class="fas fa-copy text-xs"></i> 复制
                      </button>
                      <button type="button" class="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white px-2.5 py-1.5 text-xs border-l border-white/20 transition-colors" x-on:click="openFormatModal(item)" aria-label="选择格式">
                        <i class="fas fa-caret-down text-xs"></i>
                      </button>
                    </div>
                    <button type="button" class="mm-btn mm-btn-outline mm-btn-sm text-xs" x-on:click="startEdit(item)">编辑</button>
                    <button type="button" class="mm-btn mm-btn-danger mm-btn-sm text-xs" x-on:click="removeItem(item)">删除</button>
                  </div>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>

      {/* Format selector modal: centered modern fixed dialog */}
      <div
        x-show="formatModal"
        x-cloak
        class="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      >
        <div
          class="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
          x-on:click="closeFormatModal()"
        ></div>
        <div
          class="relative z-10 w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--card)] text-[var(--card-foreground)] shadow-2xl p-5 space-y-3.5"
          x-on:click="$event.stopPropagation()"
        >
          <div class="flex items-center justify-between border-b border-[var(--border)] pb-2.5">
            <div class="font-semibold text-base text-[var(--foreground)] flex items-center gap-2">
              <span class="w-6 h-6 rounded-md bg-[var(--primary-light)] text-[var(--primary)] flex items-center justify-center text-xs">
                <i class="fas fa-link"></i>
              </span>
              <span>选择订阅格式</span>
              <span class="text-xs text-[var(--muted-foreground)] font-normal truncate max-w-[8rem]" x-show="formatItem" x-text="'(' + (formatItem?.name || '') + ')'"></span>
            </div>
            <button
              type="button"
              class="h-7 w-7 inline-flex items-center justify-center rounded-lg text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--secondary)] transition-colors"
              x-on:click="closeFormatModal()"
              aria-label="关闭"
            >
              <i class="fas fa-times text-xs"></i>
            </button>
          </div>

          <div class="grid grid-cols-2 gap-2 max-h-[60vh] overflow-y-auto pr-0.5">
            {copyFormats.map((fmt) => (
              <button
                type="button"
                class="flex items-center justify-between px-3 py-2.5 rounded-lg text-sm font-medium border border-[var(--border)] hover:border-[var(--primary)] hover:bg-[var(--primary-light)] hover:text-[var(--primary)] transition-all text-left group"
                x-on:click={`copyByFormatKey(formatItem, '${fmt.key}')`}
              >
                <span class="truncate">{fmt.label}</span>
                <i class="fas fa-copy text-xs opacity-0 group-hover:opacity-100 text-[var(--primary)] transition-opacity"></i>
              </button>
            ))}
          </div>
          <p class="text-xs text-[var(--muted-foreground)] text-center pt-1">点击格式即可复制带对应参数的客户端订阅链接</p>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: scriptContent }} />
    </div>
  );
};

