# apps/api（后端骨架）

> 这是 Gate1 用于“跑通基线”的最小实现示例：
> - Envelope 响应
> - requestId
> - Cookie 会话（JWT 放在 HttpOnly cookie，仅示例）
> - CSRF（double-submit 示例）
> - org_id 注入（set_config）+ RLS 前置
> - If-Match/ETag(row_version) 示例（以 tickets 表为例）
> - audit_log 示例写入

## 本地启动（示例）

1) 起本地 Postgres + 迁移（参见仓库根目录 docker-compose.yml）
2) 配置环境变量（示例）：
- DATABASE_URL=postgres://aicasa:aicasa@localhost:5432/aicasa_dev
- SESSION_SECRET=change_me
- COOKIE_SECURE=false
- APP_ENV=dev

3) 启动
```bash
pnpm --filter @aicasa/api dev
```

## 说明
- 真实项目中，请把“登录/鉴权”对接到你们选定的 IdP（M1 设计稿推荐 Google Cloud Identity Platform）
- 这里的 JWT cookie 仅用于把 Gate1 的“会话/CSRF/权限/审计/并发/隔离”框架串起来
