/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */

/**
 * Subscription management (miaomiaowu-style): list/create/edit/delete, pick nodes, public Clash URL.
 * Alpine script is embedded carefully to avoid template-literal regex breakage.
 */
export const SubscriptionManager = () => {
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
        copyUrl(item) {
          const url = item.url || (window.location.origin + '/subscribe/' + item.slug);
          navigator.clipboard.writeText(url).then(() => this.persist('已复制 Clash 订阅链接')).catch(() => this.persist(url));
        }
      };
    }
  `;

  return (
    <div x-data="subscriptionManagerData()" x-init="init()" class="space-y-4">
      <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 class="text-3xl font-semibold tracking-tight">订阅管理</h1>
          <p class="text-muted mt-1">创建可编辑的 Clash 订阅：选择节点、模板/规则，生成固定链接并持久化保存</p>
        </div>
        <div class="flex flex-wrap gap-2">
          <button type="button" class="mm-btn mm-btn-outline mm-btn-sm" x-on:click="reload()" x-bind:disabled="loading">
            <i class="fas" x-bind:class={'loading ? "fa-spinner fa-spin" : "fa-rotate"'}></i> 刷新
          </button>
          <button type="button" class="mm-btn mm-btn-primary mm-btn-sm" x-on:click="startCreate()">
            <i class="fas fa-plus text-xs"></i> 创建订阅
          </button>
        </div>
      </div>

      <p class="text-sm text-[var(--primary)]" x-show="flash" x-text="flash"></p>
      <p class="text-sm text-red-500" x-show="error" x-text="error"></p>

      {/* Editor */}
      <div class="pixel-card mm-card" x-show="editing" x-cloak>
        <div class="card-header border-b border-[var(--border)] pb-4">
          <div class="card-title text-base" x-text={'editing && editing.id ? "编辑订阅" : "创建订阅"'}></div>
          <div class="card-desc">勾选节点库节点；保存后得到可长期使用的 Clash 订阅链接</div>
        </div>
        <div class="card-content pt-4 space-y-4" x-show="editing">
          <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label class="mm-label">名称 *</label>
              <input type="text" class="mm-input" x-model="editing.name" placeholder="例如：主力订阅" />
            </div>
            <div>
              <label class="mm-label">短链 slug（可选）</label>
              <input type="text" class="mm-input font-mono text-xs" x-model="editing.slug" placeholder="自动生成" />
            </div>
            <div class="md:col-span-2">
              <label class="mm-label">备注</label>
              <input type="text" class="mm-input" x-model="editing.description" placeholder="可选说明" />
            </div>
          </div>

          <div class="space-y-2">
            <label class="mm-label">规则模式</label>
            <div class="flex gap-2">
              <button type="button" class="mm-btn flex-1" x-on:click={'editing.mode = "custom"'} x-bind:class={'editing.mode === "custom" ? "mm-btn-primary" : "mm-btn-outline"'}>自定义规则</button>
              <button type="button" class="mm-btn flex-1" x-on:click={'editing.mode = "template"'} x-bind:class={'editing.mode === "template" ? "mm-btn-primary" : "mm-btn-outline"'}>使用模板</button>
            </div>
          </div>

          <div x-show={'editing.mode === "custom"'} class="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <label class="mm-label sm:col-span-3">规则预设</label>
            <select class="mm-select" x-model="editing.selectedRules">
              <option value="minimal">minimal</option>
              <option value="balanced">balanced</option>
              <option value="comprehensive">comprehensive</option>
            </select>
            <label class="inline-flex items-center gap-2 border-2 border-[var(--border)] px-3 py-2 cursor-pointer">
              <input type="checkbox" class="mm-check" x-model="editing.groupByCountry" />
              <span class="text-sm">按国家分组</span>
            </label>
            <label class="inline-flex items-center gap-2 border-2 border-[var(--border)] px-3 py-2 cursor-pointer">
              <input type="checkbox" class="mm-check" x-model="editing.includeAutoSelect" />
              <span class="text-sm">自动选择</span>
            </label>
          </div>

          <div x-show={'editing.mode === "template"'} class="space-y-2">
            <label class="mm-label">模板 ID</label>
            <input type="text" class="mm-input font-mono text-xs" x-model="editing.template" placeholder="fake_ip / redirhost / Custom_Clash …" />
            <p class="text-xs text-muted">与生成页模板 id 一致，例如 fake_ip、redirhost</p>
          </div>

          <div class="space-y-2">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <label class="mm-label mb-0">选择节点（已选 <span x-text="editing.nodeIds.length">0</span>）</label>
              <div class="flex gap-1.5">
                <input type="search" class="mm-input h-9 text-sm max-w-[10rem]" placeholder="筛选节点" x-model="nodeFilter" />
                <button type="button" class="mm-btn mm-btn-outline mm-btn-sm" x-on:click="selectAllFilteredNodes()">全选筛选</button>
                <button type="button" class="mm-btn mm-btn-outline mm-btn-sm" x-on:click="clearNodes()">清空</button>
              </div>
            </div>
            <div class="max-h-64 overflow-y-auto border-2 border-[var(--border)] divide-y divide-[var(--border)]">
              <template x-if="!filteredNodes.length">
                <div class="px-3 py-8 text-center text-muted text-sm">节点库为空，请先到节点管理导入</div>
              </template>
              <template x-for="n in filteredNodes" x-bind:key="n.id">
                <label class="flex items-center gap-2 px-3 py-2 cursor-pointer hover:bg-[color-mix(in_srgb,var(--muted)_35%,transparent)]">
                  <input type="checkbox" class="mm-check" x-bind:checked="isPicked(n.id)" x-on:change="toggleNode(n.id)" />
                  <span class="mm-chip text-[10px] uppercase" x-text="n.protocol || '?'"></span>
                  <span class="text-sm font-medium truncate flex-1" x-text="n.name"></span>
                </label>
              </template>
            </div>
          </div>

          <div class="flex flex-wrap gap-2 pt-1">
            <button type="button" class="mm-btn mm-btn-primary" x-on:click="saveEdit()" x-bind:disabled="saving">
              <i class="fas" x-bind:class={'saving ? "fa-spinner fa-spin" : "fa-floppy-disk"'}></i>
              保存订阅
            </button>
            <button type="button" class="mm-btn mm-btn-outline" x-on:click="cancelEdit()">取消</button>
          </div>
        </div>
      </div>

      {/* List */}
      <div class="pixel-card mm-card" x-show="!editing">
        <div class="card-header border-b border-[var(--border)] pb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <div>
            <div class="card-title text-base">已保存的订阅</div>
            <div class="card-desc">共 <span x-text="items.length">0</span> 个 · 点击复制链接到客户端</div>
          </div>
          <input type="search" class="mm-input max-w-xs h-9 text-sm" placeholder="搜索订阅…" x-model="filter" />
        </div>
        <div class="card-content pt-2">
          <template x-if="!loading && !filteredItems.length">
            <div class="py-12 text-center space-y-3">
              <p class="text-muted">还没有保存的订阅</p>
              <button type="button" class="mm-btn mm-btn-primary" x-on:click="startCreate()">创建第一个订阅</button>
            </div>
          </template>
          <div class="divide-y divide-[var(--border)]">
            <template x-for="item in filteredItems" x-bind:key="item.id">
              <div class="py-4 flex flex-col lg:flex-row lg:items-center gap-3">
                <div class="min-w-0 flex-1 space-y-1">
                  <div class="flex flex-wrap items-center gap-2">
                    <span class="font-semibold" x-text="item.name"></span>
                    <span class="mm-chip text-[10px]" x-text="item.mode === 'template' ? ('模板 ' + (item.template || '')) : ('规则 ' + (item.selectedRules || 'balanced'))"></span>
                    <span class="text-xs text-muted" x-text="(item.nodeIds?.length || 0) + ' 节点'"></span>
                  </div>
                  <p class="text-xs text-muted" x-show="item.description" x-text="item.description"></p>
                  <p class="font-mono text-[11px] text-[var(--primary)] break-all" x-text="item.url || ('/subscribe/' + item.slug)"></p>
                </div>
                <div class="flex flex-wrap gap-1.5 shrink-0">
                  <button type="button" class="mm-btn mm-btn-primary mm-btn-sm" x-on:click="copyUrl(item)">复制链接</button>
                  <button type="button" class="mm-btn mm-btn-outline mm-btn-sm" x-on:click="startEdit(item)">编辑</button>
                  <button type="button" class="mm-btn mm-btn-danger mm-btn-sm" x-on:click="removeItem(item)">删除</button>
                </div>
              </div>
            </template>
          </div>
        </div>
      </div>

      <script dangerouslySetInnerHTML={{ __html: scriptContent }} />
    </div>
  );
};
