# V3 规则模板改造说明

在 sublink-worker 上增加了妙妙屋风格的 **完整 YAML 规则模板** 能力：解析节点 → 套用模板 → 输出 Clash Meta 配置。

已内置妙妙屋全部预设模板（2 个原生 V3 + 38 个 ACL/Aethersailor `.ini` 转 V3）。

## 新增文件

| 路径 | 作用 |
|------|------|
| `src/templates/fake_ip__v3.js` | 原生 fake-ip DNS 模板（miaomiaowu） |
| `src/templates/redirhost__v3.js` | 原生 redir-host DNS 模板 |
| `src/templates/presets.js` | ACL4SSR / Aethersailor 预设清单（与妙妙屋对齐） |
| `src/templates/generated/*` | 预转换后的 V3 YAML 模块（构建脚本生成） |
| `src/templates/index.js` | 模板注册 / 别名解析 |
| `src/builders/helpers/aclToV3.js` | ACL `.ini` → V3（port of mmwX ConvertACLToV3） |
| `src/builders/helpers/templateV3Processor.js` | V3 模板展开（markers / filter / dialer-proxy-group） |
| `src/builders/TemplateClashBuilder.js` | 解析订阅 + 套模板 |
| `scripts/build-miaomiaowu-templates.mjs` | 拉取 .ini 并生成 `generated/` |
| `scripts/smoke-template-v3.mjs` | 无 workerd 的冒烟测试 |
| `test/template-v3.test.js` | Vitest 用例（需完整 workerd 依赖） |

## 改动文件

- `src/app/createApp.jsx`
  - `GET /clash?template=<id>&config=...` 走模板路径
  - `GET /templates` 列出全部模板（含 label / source）
  - 不传 `template` 时行为与原版完全一致

## 可用模板

- **原生 V3**：`fake_ip`、`redirhost`
- **Aethersailor**（4）：`Custom_Clash`、`Custom_Clash_Full`、`Custom_Clash_GFW`、`Custom_Clash_Lite`
- **ACL4SSR**（34）：`ACL4SSR`、`ACL4SSR_Online_Full`、`ACL4SSR_Online_Mini`、…（与妙妙屋 `template-presets.ts` 一致）

重新生成：

```bash
node scripts/build-miaomiaowu-templates.mjs
```

## API 用法

```bash
# 列出模板
curl 'https://sublink-worker.example.workers.dev/templates'

# 原生 V3
curl -G 'https://sublink-worker.example.workers.dev/clash' \
  --data-urlencode 'config=ss://YWVzLTEyOC1nY206cGFzcw@1.2.3.4:8388#HK-01' \
  --data-urlencode 'template=fake_ip'

# ACL4SSR / Aethersailor
curl -G 'https://sublink-worker.example.workers.dev/clash' \
  --data-urlencode 'config=https://example.com/sub' \
  --data-urlencode 'template=ACL4SSR_Online_Mini'

curl -G 'https://sublink-worker.example.workers.dev/clash' \
  --data-urlencode 'config=ss://...' \
  --data-urlencode 'template=Custom_Clash'
```

参数：

| 参数 | 说明 |
|------|------|
| `config` | 必填。分享链接、多行 URI、base64 或订阅 URL |
| `template` / `rule_template` | 模板 id（见 `/templates`），大小写不敏感 |
| `ua` | 可选，拉远程订阅时的 User-Agent |

## 模板语义（与妙妙屋 V3 对齐）

- 占位符：`__PROXY_NODES__`、`__PROXY_PROVIDERS__`、`__REGION_PROXY_GROUPS__`
- 分组字段：`include-all` / `include-all-proxies` / `include-all-providers` / `filter` / `exclude-filter` / `dialer-proxy-group`
- 输出前剥离 mihomo 扩展字段；`dialer-proxy-group` 会落到叶子节点的 `dialer-proxy`
- 过滤后空分组会被删除，并清理其它组里的引用
- ACL `.ini` 在构建时转为上述 V3 结构后内嵌，运行时不再拉远程 ini

## 本地验证

```bash
node scripts/smoke-template-v3.mjs
npm test -- test/template-v3.test.js   # 需 workerd
```

## 后续可做

1. 前端 Form 增加「模板」下拉
2. 支持 `POST /clash` 上传自定义模板 YAML
3. 短链 `/c/:code` 持久化 `template` 参数
