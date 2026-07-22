<div align="center">
  <img src="public/logo.svg" alt="Sublink Worker" width="96" height="96"/>

  <h1><b>Sublink Worker</b></h1>
  <h5><i>Cloudflare Worker 上的节点库 · 订阅管理 · 多客户端转换</i></h5>

  <p>
    基于 <a href="https://github.com/7Sageer/sublink-worker">7Sageer/sublink-worker</a> 二次开发，
    UI 与产品形态对齐 <a href="https://github.com/iluobei/miaomiaowu">妙妙屋 (miaomiaowu)</a>，
    在 <b>无常驻后端</b> 的前提下，用 Workers + KV 实现「登录、节点库、订阅管理、Clash 导出」。
  </p>

  <p>
    <a href="https://sublink-worker.1960784419.workers.dev"><b>当前部署示例</b></a>
    ·
    <a href="https://github.com/buglyz/sublink-worker"><b>本仓库</b></a>
  </p>
</div>

---

## 项目是怎么来的？

| 来源 | 贡献 |
|------|------|
| **[sublink-worker](https://github.com/7Sageer/sublink-worker)** | 协议解析、Clash / Sing-box / Surge / Xray 构建、短链、多运行时（Workers / Node / Vercel / Docker）、Hono SSR 骨架 |
| **[妙妙屋 miaomiaowu](https://github.com/iluobei/miaomiaowu)** | 信息架构与交互参考：顶栏多页、节点库、生成页选节点+规则/模板、订阅文件管理、像素卡片视觉 |
| **本仓库 (buglyz/sublink-worker)** | 在 Worker 可落地范围内的产品化：密码登录、KV 节点库跨设备、远程订阅展开入库、可编辑订阅管理、默认 Clash YAML 导出、GitHub Actions 连续部署等 |

**一句话：** 用 sublink 的转换引擎 + 妙妙屋的使用路径，做了一个 **Cloudflare Worker 版轻量订阅中心**。

> 不会 1:1 复刻妙妙屋全站（探针、多用户、测速 WebSocket、本地盘 YAML 守护等依赖常驻进程，不适合纯 Worker）。

---

## 怎么写的？（架构）

```
浏览器 (Alpine.js + Tailwind CDN)
        │  SSR HTML (Hono JSX)
        ▼
   createApp(runtime)          ← 统一业务与路由
        │
   ┌────┴────┬────────────┬─────────────┐
   │         │            │             │
 Cloudflare  Node.js     Vercel      (同一套 services)
 Workers     + Redis     + KV REST
 SUBLINK_KV
```

- **入口**
  - Cloudflare：`src/worker.jsx` → `createCloudflareRuntime(env)`
  - Node：`src/platforms/node-server.js` → `createNodeRuntime(process.env)`
  - Vercel：`api/index.js`
- **应用核心**：`src/app/createApp.jsx`（路由、鉴权、订阅导出、页面 HTML）
- **运行时适配**：`src/runtime/{cloudflare,node,vercel}.js` + `src/adapters/kv/*`
- **协议与配置**：`src/parsers/*`、`src/builders/*`、`src/templates/*`
- **业务服务**：`src/services/*`（auth、nodes、import、export token、subscriptions…）
- **前端**：Hono JSX 输出页面 + 内嵌 Alpine 逻辑（`src/components/*`）

### KV 里存什么？

| Key / 前缀 | 用途 |
|------------|------|
| 会话 token | 登录 session（`AUTH_PASSWORD`） |
| `nodes:main` | 节点库 |
| `export:token:main` | 全库订阅导出 token + 生成偏好（模板/规则） |
| `subscriptions:main` | 可管理的订阅列表 |
| `subfile:slug:*` | 订阅短链 slug 索引 |
| 短链 / base config | 原 sublink 能力 |

---

## 实现了什么功能？

### 1. 全站密码登录
- 配置 `AUTH_PASSWORD` 后，进入站点即登录门（非仅某一页）
- Session 存 KV，Bearer Token 调用管理 API

### 2. 节点管理（跨设备）
- 粘贴 `ss/vmess/vless/...` 分享链接入库  
- **远程订阅 URL 拉取**：服务端展开为**多个节点**（Clash / Sing-box / URI 列表）  
- **同一订阅可「更新替换」或「合并追加」**，带来源标记与导入结果面板  
- 启用/禁用、搜索、批量勾选、同步到 KV  

### 3. 生成订阅
- 从节点库勾选节点  
- **自定义规则** 或 **Clash 模板**（fake_ip / redirhost / ACL 等）  
- 生成多客户端参数链接（Clash / Sing-box / Surge / Xray）  
- **自动创建一条「订阅管理」记录**（节点集合 + 模板/规则被持久化）  

### 4. 订阅管理（妙妙屋风格核心）
- 创建 / 编辑 / 删除订阅  
- 在订阅内勾选节点库节点  
- 绑定模板或规则预设  
- 固定公开地址：  
  **`/subscribe/<slug>`** → 默认 **Clash YAML**  
- 改节点后客户端刷新订阅即可更新  

### 5. 订阅导出格式
| 路径 | 含义 |
|------|------|
| `/subscribe/<slug>` | **某个已保存订阅**（推荐客户端使用） |
| `/sub/<id>` | 节点库**全部启用节点** + 最近生成偏好 |
| `?format=clash` | 默认，完整 Clash YAML |
| `?format=base64` | Base64 节点列表 |
| `?format=raw` | 明文 URI 行 |

> 默认必须是 Clash YAML：纯 `vless://` 文本会被 Clash 当 YAML 解析而报错。

### 6. 部署与运维
- Cloudflare Workers + `SUBLINK_KV`  
- GitHub Actions：`push main` 自动 `wrangler deploy`  
- Secret：`AUTH_PASSWORD`、`CLOUDFLARE_API_TOKEN`、`CF_ACCOUNT_ID`  

---

## 快速开始

### Cloudflare（推荐）

```bash
# 1. 绑定 KV：SUBLINK_KV（见 wrangler.toml）
# 2. 设置密码
npx wrangler secret put AUTH_PASSWORD

# 3. 部署
npm install
npm run deploy
```

或使用 GitHub Actions：配置 Secrets 后 push `main` 即可。

### 本地 Node

```bash
export AUTH_PASSWORD='your-password'
# 推荐 Redis，否则会用内存 KV（重启丢失）
export REDIS_HOST=127.0.0.1 REDIS_PORT=6379

npm install
npm run build:node
node dist/node-server.cjs
# 默认 http://127.0.0.1:8788
```

### 推荐使用路径

1. 登录  
2. **节点管理**：粘贴节点或远程订阅 URL → 拉取导入  
3. **生成订阅**：勾选节点 + 模板/规则 → 生成（自动入库订阅管理）  
4. **订阅管理**：继续编辑节点集合 / 复制 `/subscribe/...` 给客户端  
5. 客户端导入该链接（Clash / Mihomo）  

---

## 主要 API（管理需登录）

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | `{ password }` → token |
| GET/PUT/DELETE | `/api/nodes` | 节点库 |
| POST | `/api/nodes/import-url` | `{ url, mode: "replace"\|"merge" }` 远程展开导入 |
| GET/POST/PUT/DELETE | `/api/subscriptions` | 订阅管理 CRUD |
| PUT | `/api/export-prefs` | 全库 `/sub` 的模板/规则偏好 |
| GET | `/subscribe/:slug` | **公开** Clash 订阅（已保存） |
| GET | `/sub/:id` | **公开** 全库启用节点 Clash 订阅 |
| GET | `/clash?config=...&template=...` | 参数型转换（原 sublink） |

---

## 技术栈

- **Hono** + JSX SSR  
- **Alpine.js** + Tailwind CDN（像素风 UI）  
- **Cloudflare Workers / KV**（或 Node + Redis）  
- **js-yaml**、协议解析与多客户端 Builder（继承原 sublink）  
- **Vitest** + wrangler pool  

---

## 与上游 / 妙妙屋的差异（诚实说明）

| 能力 | 本项目 | 妙妙屋 |
|------|--------|--------|
| 节点库 + 订阅管理 | ✅ KV | ✅ 后端 DB |
| 多用户 / 2FA | ❌ 单密码 | ✅ |
| 探针 / 流量统计 | ❌ | ✅ |
| 测速 / 长连接 | ❌ | ✅ |
| 纯 Workers 部署 | ✅ | 通常需 VPS |

---

## 开发命令

```bash
npm run dev          # Wrangler 本地 Workers
npm run dev:node     # Node 服务
npm test             # Vitest
npm run deploy       # setup-kv + wrangler deploy
```

---

## 许可证与声明

- 上游与本仓库均以学习、自用为主；请遵守当地法律与服务条款。  
- 协议转换逻辑来自 sublink-worker；产品形态参考妙妙屋，**非官方 fork 关系**。  
- 使用本项目产生的一切后果由使用者自行承担。  

---

## Star / 致谢

- [7Sageer/sublink-worker](https://github.com/7Sageer/sublink-worker)  
- [iluobei/miaomiaowu](https://github.com/iluobei/miaomiaowu)  
- 所有协议社区与模板贡献者（ACL4SSR 等）  
