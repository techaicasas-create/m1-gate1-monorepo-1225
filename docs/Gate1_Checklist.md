# Gate1（M1）执行清单（仓库内版）

> 本文件用于开发仓库内“随代码一起走”的执行清单。
> 详细 Runbook 请见本交付包 `02_runbooks/`，或复制到你们仓库 docs/。

## 必做（P0）

- [ ] OpenAPI v1.0.6 冻结引入（contracts/openapi）
- [ ] OpenAPI lint（CI 阻断）
- [ ] OpenAPI codegen（packages/api-client）
- [ ] Contract tests（CI 阻断）
- [ ] CI 门禁：lint/typecheck/test + gitleaks + SCA + SAST
- [ ] Cloudflare Pages：五端部署 + 安全头 + CSP
- [ ] Cloud Run：三环境部署 + 禁止直连（必须走入口）
- [ ] Cloud SQL：三环境 + Flyway + 备份/PITR
- [ ] GCS 文件中心：私有桶 + signed url + 扫描骨架
- [ ] Auth：Cookie 会话 + CSRF（STAGING 跑通）+ 禁止 localStorage token
- [ ] org_id 注入/隔离（跨 org 不可见）
- [ ] 审计日志（audit_log）骨架
- [ ] 并发控制：至少 1 个资源支持 If-Match/ETag(row_version)
- [ ] 网关：STAGING /api→/v1 rewrite + /api 打点；联调只跑 /v1

## 证据归档建议
- `evidence/M1/`（按模块分目录）
