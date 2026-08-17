# 修复任务：订阅管理页"复制"格式选择弹窗不显示

## 项目与上下文
- 仓库：`D:/桌面/sub/sublink-worker`（Cloudflare Worker，Hono JSX SSR + Alpine.js）
- 目标：订阅管理页（组件 `src/components/SubscriptionManager.jsx`）里，每个订阅项右侧的"复制"按钮旁有一个下拉箭头，点击后应弹出格式选择（Auto/Clash/Stash/Shadowrocket/Surfboard/Surge/Surge Mac/Clash→Surge/Loon/Clash→Loon/Clash→Loon(kelee)/QuantumultX），选中即复制该格式的订阅链接。
- 后端无需改动：`/subscribe/:slug` 已支持 `?format=` 和 `?ua=` 参数，前端只需构造 URL 并复制。
- 部署：本地无法构建（无 node_modules），构建/部署走 GitHub Action `.github/workflows/deploy.yml`（wrangler 构建 .jsx，含 Hono static JSX 编译）。改完 `git push` 到 main 自动部署，用 `https://api.github.com/repos/buglyz/sublink-worker/actions/workflows/deploy.yml/runs?per_page=1` 查 status/conclusion（head_sha 要与你 push 的 commit 一致）。

## 已尝试且全部失败的方案（不要再重蹈）
1. Alpine `x-for="fmt in copyFormats"` 动态渲染菜单 → 空白不显示
2. SSR 静态 `copyFormats.map()` 展开 + `absolute` 定位 → 菜单被下方分隔线遮挡（根因：`Layout.jsx` 里 `.pixel-card:hover { transform: translateY(-2px) }` 创建层叠上下文，absolute 子菜单 z-index 被困住）
3. 正常文档流展开（不做 absolute）→ 能显示但把列表撑高，不优雅
4. `fixed` 定位 + 按钮坐标（getBoundingClientRect）弹 popover → 不显示
5. 居中固定模态框（当前 main 分支的状态）→ 仍不显示（用户反馈）

## 当前代码（main 分支，commit 04bc890）
- 组件函数 `SubscriptionManager` 用反引号模板字符串 `scriptContent` 内联一段 Alpine 3 脚本（`subscriptionManagerData()` 返回 { items, formatModal, formatItem, copyDefault, copyUrl, buildSubscriptionUrl, openFormatModal, ... }）。
- 组件顶部有 JSX 级常量 `copyFormats`（12 个格式对象，含 label/target/ua）。
- 副本按钮：`x-on:click="copyDefault(item)"`（复制 Clash）。
- 下拉箭头按钮：`x-on:click="openFormatModal(item)"`。
- 弹窗在 `x-for` 之外、`x-data` 之内：
  - `<div x-show="formatModal" x-cloak class="fixed inset-0 z-[9999] flex items-center justify-center">`
  - 内层 backdrop `<div class="absolute inset-0 bg-black/40" x-on:click="formatModal = false">`
  - 格式按钮：`data-fmt={JSON.stringify(fmt)} x-on:click="copyUrl(formatItem, JSON.parse($el.dataset.fmt)); formatModal = false"`
- Alpine 版本：`Layout.jsx` 通过 CDN 引入 alpinejs@3.13.10（支持可选链）。

## 最可疑根因（重点排查，但别只盯着这个）
1. **`data-fmt={JSON.stringify(fmt)}` 把 JSON 塞进 HTML 属性**：Hono JSX 渲染 `{"key":"auto",...}` 时双引号会实体转义（`&quot;` 或 `&#34;`），DOM dataset 读回再 `JSON.parse` 在 `x-on:click` 里执行，极易解析失败抛错，导致弹窗点击后 JS 中断。**强烈建议放弃把 JSON 内联进属性**，改用不依赖复杂对 JS 表达式的方式传格式。
2. `x-on:click` 里的多语句（`;` 分隔 + `JSON.parse`）在 Hono SSR 内联的 Alpine 表达式里可能被截断/报错。
3. Alpine 内联脚本内嵌在 Hono JSX 反引号模板里，`${...}` 插值会与 JSX 冲突（前面已踩过一次 "Expected ; but found left"）。

## 必须先抓真实数据（禁止直接改代码猜）
连续多轮凭代码推理全是 no-op，**动手写代码之前**必须拿到：
1. 登录线上站（密码从 .claude 环境或用户索取），用浏览器 DevTools → Console 看有没有 JS 报错（尤其 `JSON.parse`、Alpine 表达式错误）并截图。
2. Elements 面板：点击箭头后，`formatModal` 相关元素是否出现在 DOM？`style` 是否正确？`$store`/`x-data` 的 formatModal 是否为 true？
3. 看按钮点击后是否有 network 请求或 console 输出。
**拿到以上真实数据再定位，避免再猜。**

## 推荐方向（可参考，最终以真实数据为准）
- **最稳做法**：格式列表不用 JSON 内联属性传递。让每个格式按钮直接调用一个方法并传"格式标识字符串"（如 `copyUrl(formatItem, 'surge')`），在 Alpine 方法 `copyUrlFormat(item, key)` 里用 JS 的 `copyFormats.find(f=>f.key===key)` 查对象拼 URL——完全避开把复杂对象内联进 HTML 属性/表达式。
- `copyFormats` 常量若需在 Alpine 方法里用，可放进 `subscriptionManagerData()` 返回对象里（但要注意别再用 `x-for` 渲染它；如果仍用 SSR 的 `copyFormats.map()` 展开，则方法里的 find 可改用字符串 key 匹配，不要引用 JSX 级常量，因为 Alpine 方法运行在浏览器端访问不到 JSX 模块作用域）。
- 弹窗交互用居中 `fixed` 模态框本身是合理的，保留；重点修"点击后如何把选中的格式传给复制逻辑"这一环。

## 验收标准
- 强刷（Ctrl+F5）后，点每行的下拉箭头能弹出格式列表，不被遮挡、不撑高列表。
- 点击某个格式后，复制到剪贴板的 URL 带对应 `?format=` 和 `?ua=` 参数（Clash 默认复制不带参数或 format=clash）。
- 点击弹窗外区域能关闭。
- 浏览器 Console 无 JS 报错。
- push 后 GitHub Deploy Worker Action 结果 success，且 head_sha 对应当前 commit。
