# 设计稿1：Auth & 账号生命周期（邀请制/MFA/Cookie/CSRF/刷新策略）

版本：M0-FREEZE / 2025-12-24  
依据：Sheet「决策一页」- 身份认证 IdP 策略 / 会话与 CSRF 策略 / 租客注册方式

## 1. 目标与范围

### 1.1 目标
- 生产环境采用**邀请制**，禁止开放注册，避免垃圾账号与越权绑定。
- 登录与身份由 **Google Cloud Identity Platform（GIP）** 承担（Multi-tenancy）。
- API 侧统一口径：**HttpOnly Cookie 会话 + CSRF 防护 + refresh 轮换**。
- 支持 5 端统一会话体验（Homepage/Public、CRM、Admin、Owner、Tenant），并满足 EU/Spain 上线的最小安全门槛。

### 1.2 不在本阶段解决（明确非目标）
- 不实现“自助找回密码/开放注册”等会带来风控与客服成本的功能。
- 不实现复杂 SSO/企业目录集成（如需，在 P1 再规划）。

## 2. 角色与身份模型

### 2.1 角色（业务角色）
- PUBLIC：未登录访问公开房源、提交线索
- TENANT：租客（绑定 leaseId / tenantId）
- OWNER：业主（绑定 ownerId）
- ADMIN：运营后台（全局管理）
- CRM/STAFF：CRM 内部员工（与 ADMIN 类似权限，但可按 scope 细分）

> 角色/权限的逐接口矩阵见：`03_TABLES/权限矩阵(已对齐).xlsx`

### 2.2 多租户（org_id）与 IdP Tenant
- **每个 org_id 对应一个 Identity Tenant（用户池隔离）**
- token/cookie 中必须携带可校验的 `org_id`（或等价 tenant 标识）
- 任何 API 访问必须可推导出 org_id（来源：token claim / session / domain mapping）

## 3. 账号生命周期（邀请制）

### 3.1 邀请对象
- Tenant：必须由 Admin/Staff 邀请，并绑定到某个 `leaseId`（或 applicationId -> leaseId 的确定链路）
- Owner：由 Admin/Staff 邀请，绑定 `ownerId`
- Admin/Staff：由系统管理员在 IdP 中创建或通过后台创建（仍建议邀请制）

### 3.2 Invitation 数据结构（后端必须落库）
> 对齐决策：invitation(one_time_token, leaseId, org_id, expiresAt)

建议表结构（逻辑）：
- invitation_id (uuid)
- org_id
- email
- role (TENANT/OWNER/STAFF)
- bind_owner_id / bind_tenant_id / bind_lease_id（按角色必填其一）
- one_time_token_hash（只存 hash）
- expires_at, consumed_at, created_at, created_by

### 3.3 激活流程（Tenant/Owner）
1) Admin 在后台创建邀请 → 发送激活链接（含一次性 token）
2) 用户打开链接 → IdP 完成身份验证（邮箱/短信/密码/魔法链接均可）+ MFA（按策略）
3) 后端校验邀请 token → 绑定业务身份（ownerId/tenantId/leaseId）→ 建立会话

## 4. 会话策略（Cookie + refresh rotation）

### 4.1 基本原则
- **严禁**把 access token / refresh token 存在 localStorage
- 统一使用 HttpOnly Secure Cookie
- refresh token 需要轮换（rotation），每次刷新都作废旧 token

### 4.2 Cookie 建议
- Cookie: `session`（或 access token cookie）+ `refresh`（刷新 cookie）
- 属性：
  - Secure = true
  - HttpOnly = true
  - SameSite = Lax（如涉及跨站嵌入再评估 None + Secure）
  - Domain = 见环境变量 `COOKIE_DOMAIN`
  - Path：`/`（或 `/v1`）

### 4.3 CSRF 防护（必须）
- 采用 double-submit（CSRF token cookie + header）或同步 token（server-side session）
- 对所有写接口（POST/PUT/PATCH/DELETE）强制校验 CSRF
- CSRF secret 存在 Secret Manager（见 `环境变量清单`：`CSRF_SECRET`）

## 5. 关键接口口径（M0 冻结）

### 5.1 当前用户
- `GET /v1/me`：返回当前登录用户（role + ownerId/tenantId + preferredLanguage）
- `PATCH /v1/me/preferences`：更新语言偏好/通知偏好

> OpenAPI 冻结版见：`04_OPENAPI/openapi_v1.0.5_enveloped.yaml`

### 5.2 邀请（M0-FULL 已补入 OpenAPI）

邀请/激活属于 P0 安全链路，**已在 OpenAPI v1.0.2 补齐并冻结**：

- `POST /v1/invitations`：创建邀请（Admin/Staff），不回传 one_time_token 明文（建议邮件/一次性展示）
- `POST /v1/invitations/{token}/accept`：一次性 token 兑换会话（PUBLIC），成功后发放 Cookie 会话（Set-Cookie）

> 兼容建议：如历史实现使用 `POST /v1/admin/invitations` 或 `POST /v1/auth/activate`，可在网关做 rewrite/别名，但联调与文档以以上两条为准。

### 5.3 会话刷新与退出（M0-SUPER）

> 这两条用于补齐 Cookie 会话的工程闭环（刷新轮换/退出撤销），已在 OpenAPI v1.0.5 冻结。

- `POST /v1/auth/refresh`：使用 refresh cookie 轮换并重新签发 session cookie（写接口，要求 CSRF）
- `POST /v1/auth/logout`：撤销会话并清除 cookie（幂等，要求 CSRF）

## 6. 风险与防呆（M0 强制写死）

- 任何“临时调试账号/后门参数/万能 token”上线前必须删除（Go-Live 门禁项检查）
- PUBLIC 端必须配合 Turnstile + 限流（见接口缺口&对齐 / 环境变量 TURNSTILE_*）
- Token 泄露场景：必须支持 session 失效（服务端可撤销/刷新轮换）

## 7. 验收证据（Gate0 必交）
- 本文档（Doc/PDF）
- 决策一页 + 权限矩阵 + 环境变量清单（已对齐表）
- OpenAPI v1.0.5（/v1 + envelope，含 Auth refresh/logout + GDPR job 查询）

