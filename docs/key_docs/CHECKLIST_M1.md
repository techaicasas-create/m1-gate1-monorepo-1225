# M1 Gate1 交付检查清单（工程化骨架 + 安全基线）

版本：2025-12-24（排期补齐版）

> 用途：给项目经理/Tech Lead 催工程师用。
> 
> 说明：本清单对应 `03_TABLES/工程排期评估表_执行排期_集成版_M1补齐_20251224.xlsx` 中的 M1（Gate1）任务行。

---

## 必须项（P0 / Gate1 不通过不得进入 M2）

### 工程化骨架
- [ ] Monorepo 骨架落地：apps/* + packages/*（api-client/i18n/shared-types 等）
- [ ] CI 门禁可用：单测 + lint + typecheck + SCA/Secret 扫描 + SAST（高危阻断合并）
- [ ] 三环境隔离：DEV/STAGING/PROD 项目/DB/Bucket/Secret 全部独立
- [ ] Cloudflare Pages：5 端部署 + 域名路由；安全头（_headers）+ CSP 基线
- [ ] Cloud Run：通过 GCLB/Ingress 限制阻断直连（避免绕过 WAF/网关）
- [ ] Cloud SQL(PG)：建库 + Flyway migrations 可重复执行；备份 + PITR 开启
- [ ] GCS 私有桶：Signed URL 上传/下载骨架；扫描流程(Job/Worker)骨架
- [ ] 可观测：requestId 贯穿；日志字段规范；前端错误收集（Sentry 或同类）接入

### 契约与联调基线（M0 口径工程化）
- [ ] OpenAPI lint + codegen：基于 openapi_v1.0.6 生成 TS client（packages/api-client），联调统一用生成物
- [ ] Contract tests：按 OpenAPI 校验 Envelope/ErrorCode/状态码（含 412/428）；接口变更自动爆红
- [ ] /api→/v1：STAGING 网关 rewrite + 调用打点；联调与 contract tests 只跑 /v1

### 安全基线（Auth / RBAC / 审计 / 并发）
- [ ] Cookie 会话 + CSRF：/v1/me、/v1/auth/refresh、/v1/auth/logout 在 STAGING 跑通
- [ ] 禁止 token 落 localStorage（前端代码/DevTools 检查）
- [ ] authorize() 中间件：按权限矩阵落地 role/scope + 资源归属；越权 403/404 用例通过
- [ ] audit_log：requestId 贯穿；关键动作写入 before/after 摘要（避免存 PII）
- [ ] org_id 注入/隔离：DB session set_config(app.org_id)；关键表 org_id 约束/索引；越权不可见测试
- [ ] If-Match/ETag(row_version)：至少 1 个资源可复现 412/428（缺 If-Match=428，不一致=412）

---

## 建议归档的证据（P0）

> 建议统一放到你们自己的工程仓库或网盘，并在评审纪要中贴链接。

- [ ] CI/CD pipeline 记录（截图/链接）：SCA/Secret/SAST/DAST + 单测 + lint + typecheck
- [ ] OpenAPI codegen 与生成物（commit/产物链接）
- [ ] Contract tests 报告（含失败示例截图 + 修复后通过）
- [ ] STAGING 登录/刷新/退出录屏（Cookie + CSRF 校验）
- [ ] 越权用例记录（403/404）
- [ ] 审计日志样本导出（含 requestId/actor/action/entity）
- [ ] 并发冲突复现证据（412/428 + ErrorCode）
- [ ] /api→/v1 rewrite 配置截图 + /api 调用打点日志样例

---

## 本包内参考资料位置
- 工程排期（集成版，M1 已补齐）：`03_TABLES/工程排期评估表_执行排期_集成版_M1补齐_20251224.xlsx`
- M1 任务拆解抽取版：`03_TABLES/M1_工程排期_任务拆解.xlsx`
- OpenAPI（冻结口径）：`04_OPENAPI/openapi_v1.0.6_enveloped.yaml`
- 设计稿（冻结口径）：`02_DESIGN/`
- DB migrations（冻结口径）：`08_DB_MIGRATIONS/flyway/V1__init.sql`
- /api→/v1 兼容与下线计划：`00_RELEASE/API_兼容与下线计划.md`
