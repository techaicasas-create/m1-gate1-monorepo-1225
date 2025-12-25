# 00 QuickStart：把本仓库推到 GitHub 并部署到 Cloudflare Pages（5 端）

本仓库已按 **M1（Gate1）** 的落地模板准备好：
- Monorepo 目录结构 + CI 门禁（GitHub Actions）
- 5 端静态占位页（homepage/crm/admin/owner/tenant）
- Cloudflare Pages `_headers` 已修正为可生效语法（安全头/CSP 基线）
- `docs/` 内包含 M1 Runbook / 任务拆解 / 冻结口径参考资料

> 你需要自行完成：创建 GitHub Repo、连接 Cloudflare、（可选）绑定自定义域名。

## 1. 本地初始化并推送到 GitHub

在本仓库根目录执行：

```bash
git init
git add .
git commit -m "init: M1 Gate1 monorepo template"
git branch -M main

# 替换为你的 GitHub 仓库地址
git remote add origin git@github.com:<org-or-user>/<repo>.git
git push -u origin main
```

（可选）创建 `staging` 分支用于预览环境：

```bash
git checkout -b staging
git push -u origin staging
git checkout main
```

## 2. 检查 CI（GitHub Actions）

打开 GitHub → Actions：
- 找到 CI workflow
- 确认 `main` 最近一次 run 全绿 ✅

建议在 GitHub 设置里打开分支保护（Branch protection），把 CI 设为 Required checks。

> 说明：为了让模板仓库“推上去即可跑通 CI”，默认 `pnpm test` **不会**运行 `@aicasa/contract-tests`（它需要 API/DB 环境）。当你把 API/DB 拉起来后再手动执行 `pnpm contract:test` 或 `pnpm test:all`。

## 3. 在 Cloudflare Pages 创建 5 个项目（同一个 Repo）

Cloudflare Dashboard → Workers & Pages → Create application → Pages → Connect to Git

为 5 个端分别创建 5 个 Pages Project（名称随意，建议按端命名）。
每个项目都连接同一个 GitHub Repo，但配置不同：

- **homepage**
  - Root directory：`apps/homepage`
  - Build command：留空
  - Output directory：`public`
  - Production branch：`main`

- **crm**
  - Root directory：`apps/crm`
  - Output directory：`public`

- **admin**
  - Root directory：`apps/admin`
  - Output directory：`public`

- **owner**
  - Root directory：`apps/owner`
  - Output directory：`public`

- **tenant**
  - Root directory：`apps/tenant`
  - Output directory：`public`

创建后每个项目都会得到一个 `*.pages.dev` 地址。

## 4. 验收安全头 / CSP 是否生效（M1 Gate1 证据）

本仓库已经在每个端的 `public/_headers` 写好安全头基线。

你可以用脚本验收（本地执行）：

```bash
URL=https://<你的-pages-dev-地址> bash scripts/check_headers.sh
```

你应该能看到至少这些响应头：
- `Strict-Transport-Security`
- `Content-Security-Policy`
- `X-Content-Type-Options`
- `Referrer-Policy`

建议把 `curl -I` 输出保存到 `evidence/M1/Pages/` 作为 Gate1 评审证据。

## 5. 完成度怎么查看（建议口径）

- **代码就绪度**：`main` 分支 CI 全绿
- **部署就绪度**：Cloudflare Pages 5 个项目 deployment 全 Success
- **外部可验证**：5 个域名 `curl -I` 安全头/CSP 全部命中
- **评审闭环**：`docs/Gate1_Checklist.md` 勾选并附证据链接（截图、日志、录屏）
