# Runbook 03：部署/域名｜Cloudflare Pages + 安全头

- 对应排期行：工程排期_任务拆解（Row 8）
- Gate：工程化打底+三环境
- 排期任务：Cloudflare Pages：5端部署+域名路由；统一安全头(_headers)与CSP
- 负责人：DevOps/前端
- 排期验收：Pages配置截图+Header检查

## 参考资料

- 本包内关键冻结口径：`source/key_docs/`（OpenAPI v1.0.6、4 份设计稿、M1 Checklist、API 兼容/下线计划等）
- 原始排期表：`source/工程排期评估表_执行排期_集成版_M1补齐_20251224.xlsx`（Sheet：工程排期_任务拆解）
- M1 交付包（已解压）：`source/M1_交付包_20251224_排期补齐_已解压/`

## 目标
五端前端统一在 **Cloudflare Pages** 部署，并固化安全头（_headers）与 CSP，确保：
- 五端都有可访问的 DEV/STAGING/PROD 地址（或至少 STAGING）
- 安全头合规：HSTS、X-Content-Type-Options、Referrer-Policy、frame-ancestors 等
- CSP 默认不放开 `unsafe-inline`（如必须例外，写清楚原因并评审）

## 落地步骤
1) **为五端各建一个 Pages 项目**
   - 对应仓库路径：`apps/homepage`、`apps/crm`、`apps/admin`、`apps/owner`、`apps/tenant`
   - 绑定分支策略：`main`→PROD，`staging`→STAGING（示例）

2) **统一构建输出目录**
   - 约定每个端 build 输出为 `dist/`（或你们标准）
   - 确保 `_headers` 会被拷贝到输出根目录（Cloudflare Pages 规则）

3) **落地安全头模板（_headers）**
   - 建议模板来源：`source/key_docs/防呆清单_M1.csv`（安全头项）
   - 必含（示例）：
     - `Strict-Transport-Security`
     - `X-Content-Type-Options`
     - `Referrer-Policy`
     - `Permissions-Policy`
     - `Content-Security-Policy`
     - `frame-ancestors`（或 `X-Frame-Options`，建议用 CSP 的 frame-ancestors）

4) **配置 CSP**
   - 先用 report-only（可选）→ 再切 enforce
   - 明确允许域名列表（API、Sentry、静态资源 CDN 等）

5) **域名与路由**
   - 建议：`<app>.<env>.<domain>`（例：`crm.staging.example.com`）
   - 每个 Pages 项目绑定自定义域名
   - 记录 DNS/Pages 配置截图

6) **验收安全头**
   - `curl -I https://...` 保存输出
   - 浏览器 DevTools → Security / Network → Headers 截图

## 交付物
- 5 个 Pages 项目配置完成
- 每端 `_headers` 固化（随代码版本管理）
- CSP 说明文档（允许域名清单 + 例外理由）

## 验收与证据
- `evidence/M1/Pages/`：Pages 配置截图、Header 检查截图、CSP 说明
