# M1 Gate1 Monorepo 工程骨架（模板）

> 目的：把排期表里 M1（Gate1）“工程化打底 + 安全基线”这 16 项工作，尽量固化成可直接复用的仓库结构与脚手架。
>
> 你可以把本目录当作一个“可拷贝的起步仓库”，把你们现有业务代码按 apps/* 与 packages/* 迁移进来。

## 目录结构

- apps/
  - api/            后端（Cloud Run）
  - homepage/       站点（Cloudflare Pages）
  - crm/
  - admin/
  - owner/
  - tenant/
- packages/
  - api-client/     由 OpenAPI 生成的 TS client（联调统一使用生成物）
  - shared-types/   多端共享类型（建议只放跨端共用）
  - i18n/           多端共享 i18n
  - contract-tests/ 契约测试（基于 OpenAPI）
- contracts/openapi/  冻结 OpenAPI（v1.0.6）
- infra/
  - db/             Flyway migrations / seed
  - cloudrun/       Cloud Run 部署说明/脚本模板
- env/              环境变量样例（按环境变量清单生成）
- security/         gitleaks/semgrep 等配置
- scripts/          openapi lint/codegen、并发复现脚本等

## 快速开始（示例）

> 你们可按实际语言栈替换。这里给的是“可落地的默认做法”。

1) 安装依赖（示例：Node + pnpm）
```bash
pnpm install
```

2) OpenAPI lint + codegen
```bash
pnpm openapi:lint
pnpm openapi:codegen
```

3) 跑契约测试（示例）
```bash
pnpm contract:test
```

## 重要约束（Gate1 强制）

- 所有联调路径统一 `/v1`，`/api` 只作为短期兼容（见 docs 与 Runbook 16）
- 所有响应必须 Envelope：`{ requestId, timestamp, data|error }`
- 错误码必须在 ErrorCode 枚举内（见 contracts/openapi + ERROR_CODE_ENUM）
- 写接口需要 CSRF（Cookie 会话），禁止 token 落 localStorage
- 关键资源至少 1 个支持 If-Match/ETag(row_version) 的 412/428

## 证据归档

建议把 Gate1 证据统一放到仓库根目录的 `evidence/M1/`（见本包 04_evidence 或自行复制过来）。
