# Runbook 11：Auth｜Cookie 会话 + CSRF

- 对应排期行：工程排期_任务拆解（Row 16）
- Gate：安全基线（Auth/RBAC/审计/并发）
- 排期任务：Cookie 会话+CSRF 基线：/v1/me、/v1/auth/refresh、/v1/auth/logout 在 STAGING 跑通；禁止 token 落 localStorage
- 负责人：后端/前端/安全
- 依赖：设计稿1(Auth)+环境变量清单
- 排期验收：STAGING 登录/刷新/退出录屏 + Set-Cookie/CSRF 校验记录

## 参考资料

- 本包内关键冻结口径：`source/key_docs/`（OpenAPI v1.0.6、4 份设计稿、M1 Checklist、API 兼容/下线计划等）
- 原始排期表：`source/工程排期评估表_执行排期_集成版_M1补齐_20251224.xlsx`（Sheet：工程排期_任务拆解）
- M1 交付包（已解压）：`source/M1_交付包_20251224_排期补齐_已解压/`

## 目标
在 STAGING 跑通 Cookie 会话 + CSRF 基线：
- `GET /v1/me`
- `POST /v1/auth/refresh`
- `POST /v1/auth/logout`

且明确禁止：token 落 localStorage。

## 参考口径
- 设计稿：`source/key_docs/设计稿1_Auth_账号生命周期.md`
- OpenAPI：`source/key_docs/OpenAPI_v1.0.6_enveloped.yaml`
- 防呆：`source/key_docs/防呆清单_M1.csv`（会话安全项）

## 落地步骤
1) **Cookie 方案**
   - `session`：HttpOnly + Secure + SameSite（建议 Lax/Strict，按业务选择）
   - `refresh`：HttpOnly + Secure + SameSite
   - 强制：浏览器端 fetch 必须 `credentials: 'include'`

2) **CSRF 保护**
   - 写接口必须校验 `X-CSRF-Token`
   - CSRF token 可以用：
     - double-submit cookie（简单可落地）
     - 或服务端存储（更强，但更复杂）

3) **refresh rotation**
   - refresh 成功后签发新的 refresh（旧的作废）
   - 防止 refresh 泄露后被长期复用

4) **logout**
   - 幂等：重复调用也成功
   - 清理 cookie（Set-Cookie 过期）

5) **前端存储规则**
   - 禁止把 access token 存 localStorage
   - 统一封装 api client（建议在 packages/api-client 上层封装）

## 交付物
- STAGING 录屏（登录→刷新→退出）
- Set-Cookie/CSRF 校验记录截图
- 代码扫描证明（无 localStorage token）

## 验收与证据
- `evidence/M1/Auth/`：录屏、cookie 截图、CSRF 校验记录
