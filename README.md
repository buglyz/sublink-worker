<div align="center">
  <img src="public/logo.svg" alt="Sublink Worker" width="96" height="96"/>

  <h1>Sublink Worker</h1>
  <p><b>基于 Cloudflare Workers 的节点库、订阅管理与多客户端订阅转换服务</b></p>

  <p>
    本项目在 <a href="https://github.com/7Sageer/sublink-worker">7Sageer/sublink-worker</a> 之上扩展，
    产品信息架构与交互参考 <a href="https://github.com/iluobei/miaomiaowu">妙妙屋 (miaomiaowu)</a>，
    在无常驻后端的前提下，通过 Workers、KV 与 Durable Object 提供登录鉴权、节点库同步、可管理订阅及 Clash 配置导出。
  </p>

  <p>
    <a href="https://sublink-worker.1960784419.workers.dev"><b>部署示例</b></a>
    ·
    <a href="https://github.com/buglyz/sublink-worker"><b>本仓库</b></a>
  </p>
</div>

---

## 项目背景

| 来源 | 作用 |
|------|------|
| [sublink-worker](https://github.com/7Sageer/sublink-worker) | 协议解析，Clash / Sing-box / Surge / Xray 配置构建，短链，多运行时适配（Workers / Node / Vercel / Docker），Hono SSR 基础结构 |
| [妙妙屋](https://github.com/iluobei/miaomiaowu) | 产品与交互参考：多页面导航、节点库、生成页（节点选择与规则/模板）、订阅文件管理、界面布局风格 |
| 本仓库 | 面向 Worker 场景的产品化实现：密码登录、KV 节点库、远程订阅解析入库、可编辑订阅管理、默认 Clash YAML 导出、GitHub Actions 自动部署 |

本项目定位为：**以 sublink 的转换能力为基础，采用妙妙屋式的使用流程，实现可部署于 Cloudflare Workers 的轻量订阅管理服务**。

说明：本项目不完整复刻妙妙屋的全部能力。探针、多用户体系、测速与长连接等依赖常驻进程或本地存储的功能，不在纯 Worker 架构的目标范围内。

---

## 系统架构

```
浏览器（Alpine.js + Tailwind CDN）
        │  SSR HTML（Hono JSX）
        ▼
   createApp(runtime)           # 统一路由与业务逻辑
        │
   ┌────┴────┬────────────┐
   │         │            │
 Cloudflare  Node.js     Vercel
 Workers     + Redis     + KV REST
 KV + Durable Object
```

| 模块 | 路径 | 说明 |
|------|------|------|
| 运行时入口 | `src/worker.jsx`、`src/platforms/node-server.js`、`api/index.js` | 分别对应 Cloudflare、Node、Vercel |
| 应用核心 | `src/app/createApp.jsx` | 路由、鉴权、订阅导出、页面渲染 |
| 运行时适配 | `src/runtime/*`、`src/adapters/kv/*` | 环境绑定与 KV 抽象 |
| 协议与配置 | `src/parsers/*`、`src/builders/*`、`src/templates/*` | 解析与多客户端配置生成 |
| 业务服务 | `src/services/*` | 鉴权、节点、导入、导出、订阅管理等 |
| 前端页面 | `src/components/*` | Hono JSX 组件与 Alpine 交互逻辑 |

### KV 数据模型

| 键 / 前缀 | 用途 |
|-----------|------|
| 会话 token | 管理员登录 session（依赖 `AUTH_PASSWORD`） |
| `nodes:main` / `subscriptions:main` | 旧版 KV 快照；Cloudflare 首次访问时迁入 Durable Object，迁后运行时以 DO 为准（KV 键保留便于回滚） |
| `export:token:main` | 全库导出 token 及生成偏好（模板 / 规则） |
| Durable Object storage | 节点库与订阅管理的串行写入与 revision 冲突检测（`new_sqlite_classes` 后端；文档型 put/get，非业务 SQL 表） |
| `shortlink:*` / `config:*` | 公开短链与 base config，和内部数据隔离 |
| 短链 / base config | 上游 sublink 原有能力 |

---

## 功能说明

### 1. 鉴权

- 配置 `AUTH_PASSWORD` 后，站点入口要求登录
- Session 持久化于 KV，管理类 API 使用 Bearer Token

### 2. 节点管理

- 支持粘贴分享链接（`ss` / `vmess` / `vless` / `trojan` 等）入库
- 支持远程订阅 URL 拉取；服务端将 Clash、Sing-box 或 URI 列表解析为独立节点
- 同一远程订阅支持「更新替换」与「合并追加」，并记录来源与导入结果
- 支持启用状态、搜索、批量选择及 KV 同步

### 3. 生成订阅

- 从节点库选择节点
- 支持自定义规则集或 Clash 模板（如 fake_ip、redirhost、ACL 系列）
- 生成多客户端参数链接（Clash / Sing-box / Surge / Xray）
- 生成时自动写入「订阅管理」记录（节点集合、模板或规则配置）

### 4. 订阅管理

- 支持创建、编辑、删除订阅
- 可在订阅中选择节点库节点
- 可绑定模板或规则预设
- 对外提供固定地址：`/subscribe/<slug>`（默认输出 Clash YAML）
- 修改节点或规则后，客户端更新订阅即可获取最新配置

### 5. 导出格式

| 路径 | 说明 |
|------|------|
| `/subscribe/<slug>` | 指定已保存订阅（推荐客户端使用） |
| `/sub/<id>` | 节点库全部启用节点，并应用最近一次生成偏好 |
| `?format=clash` | 默认；完整 Clash YAML |
| `?format=base64` | Base64 节点列表 |
| `?format=raw` | 明文 URI 行 |

默认导出为 Clash YAML。若直接返回纯 `vless://` 等文本，Clash 客户端按 YAML 解析时会失败。

### 6. 部署

- 目标运行时：Cloudflare Workers，绑定 `SUBLINK_KV` 与 `SUBLINK_STORAGE_COORDINATOR`
- 可通过 GitHub Actions 在 `main` 分支推送时自动部署
- 所需密钥示例：`AUTH_PASSWORD`、`CLOUDFLARE_API_TOKEN`、`CF_ACCOUNT_ID`

---

## 快速开始

### Cloudflare Workers

```bash
# 1. 在 wrangler.toml 中配置 SUBLINK_KV
# 2. 配置登录密码
npx wrangler secret put AUTH_PASSWORD

# 3. 部署
npm install
npm run deploy
```

使用 GitHub Actions 时，在仓库 Secrets 中配置上述密钥后，向 `main` 推送即可触发部署。

### 本地 Node.js

```bash
export AUTH_PASSWORD='your-password'
# 建议使用 Redis；未配置时将使用内存 KV（进程重启后数据丢失）
export REDIS_HOST=127.0.0.1
export REDIS_PORT=6379

npm install
npm run build:node
node dist/node-server.cjs
# 默认监听 http://127.0.0.1:8788
```

### 推荐操作流程

1. 登录系统  
2. 在「节点管理」中粘贴节点或远程订阅 URL 并导入  
3. 在「生成订阅」中选择节点与模板/规则并生成（将自动写入订阅管理）  
4. 在「订阅管理」中调整节点集合，并复制 `/subscribe/...` 链接  
5. 在 Clash / Mihomo 等客户端中添加该订阅  

---

## API 概要

管理类接口需登录。公开导出接口无需登录，但依赖有效的 slug 或 token。

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 请求体 `{ password }`，返回 token |
| GET / PUT / DELETE | `/api/nodes` | 节点库读写 |
| POST | `/api/nodes/import-url` | 远程订阅导入，`mode` 为 `replace` 或 `merge` |
| GET / POST / PUT / DELETE | `/api/subscriptions` | 订阅管理 |
| PUT | `/api/export-prefs` | 全库 `/sub` 导出偏好 |
| GET | `/subscribe/:slug` | 已保存订阅的 Clash 配置（公开） |
| GET | `/sub/:id` | 全库启用节点的 Clash 配置（公开） |
| GET | `/clash?config=...&template=...` | 参数化转换（上游能力） |

---

## 技术栈

- Hono（含 JSX 服务端渲染）
- Alpine.js、Tailwind CSS（CDN）
- Cloudflare Workers / KV / Durable Object，或 Node.js + Redis / Upstash
- js-yaml；协议解析与配置构建逻辑继承自 sublink-worker
- Vitest 与 `@cloudflare/vitest-pool-workers`

---

## 与相关项目的对比

| 能力 | 本项目 | 妙妙屋 |
|------|--------|--------|
| 节点库与订阅管理 | 支持（KV） | 支持（后端数据库） |
| 多用户 / 双因素认证 | 不支持（单管理员密码） | 支持 |
| 探针与流量统计 | 不支持 | 支持 |
| 测速与长连接 | 不支持 | 支持 |
| 纯 Cloudflare Workers 部署 | 支持 | 通常需要独立服务器 |

---

## 开发命令

```bash
npm run dev          # Wrangler 本地 Workers 开发
npm run dev:node     # Node.js 本地服务
npm test             # 运行 Vitest
npm run deploy       # 配置 KV 并部署到 Cloudflare
```

---

## 许可与免责声明

- 本项目及上游项目仅供学习与合法自用，请遵守所在地法律法规及服务条款。
- 协议转换相关实现源自 sublink-worker；产品形态参考妙妙屋。本仓库与上述项目无官方 fork 或从属关系。
- 因使用本软件产生的任何后果，由使用者自行承担。

---

## 致谢

- [7Sageer/sublink-worker](https://github.com/7Sageer/sublink-worker)
- [iluobei/miaomiaowu](https://github.com/iluobei/miaomiaowu)
- 相关协议与规则模板社区（含 ACL4SSR 等）
