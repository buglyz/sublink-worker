/** @jsxRuntime automatic */
/** @jsxImportSource hono/jsx */

/**
 * Local node library (miaomiaowu-inspired, browser-only).
 * Stores nodes in localStorage; selected nodes can fill convert input.
 */
export const NodeLibrary = (props) => {
  const { t } = props;

  const scriptContent = `
    function nodeLibraryData() {
      const STORAGE_KEY = 'sublink_nodes_v1';
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

      const loadNodes = () => {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          const arr = raw ? JSON.parse(raw) : [];
          return Array.isArray(arr) ? arr : [];
        } catch {
          return [];
        }
      };

      return {
        nodes: [],
        pasteBox: '',
        filter: '',
        selectAll: false,
        flash: '',
        editingId: null,
        editName: '',

        init() {
          this.nodes = loadNodes();
          this.$watch('nodes', (val) => {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(val));
            this.selectAll = val.length > 0 && val.every((n) => n.selected);
          }, { deep: true });
          window.addEventListener('nodes-import-from-input', () => this.importFromInput());
          window.addEventListener('nodes-apply-selected', (e) => {
            const convert = e && e.detail && e.detail.convert;
            this.applyToConverter({ convert: !!convert });
          });
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

        get enabledCount() {
          return this.nodes.filter((n) => n.enabled !== false).length;
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
            // skip pure http(s) subscription URLs as "nodes" unless they look like proxy URIs
            const proto = protocolOf(line);
            if (proto === 'http' || proto === 'https') {
              // keep as raw subscription source line
              out.push({ raw: line, protocol: 'http-sub', name: nameOf(line) });
              continue;
            }
            if (PROTOCOLS.includes(proto) || line.includes('://')) {
              out.push({ raw: line, protocol: proto, name: nameOf(line) });
            } else if (/^[A-Za-z0-9+/=_-]{20,}$/.test(line)) {
              // possible base64 blob — keep as raw
              out.push({ raw: line, protocol: 'base64', name: 'Base64 片段' });
            }
          }
          return out;
        },

        addFromText(text, { select = true } = {}) {
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
          this.persistMessage(added ? '已添加 ' + added + ' 个节点' : '节点已存在，未重复添加');
          return added;
        },

        importFromPaste() {
          this.addFromText(this.pasteBox, { select: true });
          this.pasteBox = '';
        },

        importFromInput() {
          // pull from main form Alpine scope via DOM
          const root = document.querySelector('[x-data^=\\"formData\\"]') || document.querySelector('#workspace');
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

        clearAll() {
          if (!this.nodes.length) return;
          if (!confirm('清空全部 ' + this.nodes.length + ' 个节点？')) return;
          this.nodes = [];
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
              }
              this.persistMessage(convert ? '已用选中节点生成订阅' : '已填入转换输入框');
              if (convert) {
                setTimeout(() => {
                  const el = document.getElementById('results');
                  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }, 120);
              }
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
    <div id="nodes" x-data="nodeLibraryData()" x-init="init()" class="mm-card p-4 sm:p-5">
      <div class="mm-section-head">
        <div class="flex items-start gap-3">
          <span class="icon"><i class="fas fa-network-wired text-sm"></i></span>
          <div>
            <div class="mm-title">节点库</div>
            <p class="mm-desc mt-0.5">
              本地保存节点 · 勾选批量转换订阅 · 数据仅存浏览器
              <span class="ml-2 font-mono text-[11px] text-[var(--primary)]" x-text="nodes.length + ' 节点 · 选中 ' + selectedCount"></span>
            </p>
          </div>
        </div>
        <div class="flex flex-wrap gap-1.5">
          <button type="button" class="mm-btn mm-btn-secondary text-xs py-1.5" x-on:click="importFromInput()">
            <i class="fas fa-file-import text-[10px]"></i>
            从输入源导入
          </button>
          <button type="button" class="mm-btn mm-btn-primary text-xs py-1.5" x-on:click="applyToConverter({ convert: true })" x-bind:disabled="selectedCount === 0">
            <i class="fas fa-bolt text-[10px]"></i>
            用选中生成
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
              暂无节点。粘贴分享链接后点「添加」，或从上方输入源导入。
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

      <script dangerouslySetInnerHTML={{ __html: scriptContent }} />
    </div>
  );
};
