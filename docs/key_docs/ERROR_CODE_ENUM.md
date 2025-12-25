# ErrorCode 枚举（统一错误码）

本项目所有错误响应都使用统一 Envelope：

```json
{
  "requestId": "req_xxx",
  "timestamp": "2025-12-24T12:00:00Z",
  "error": {
    "code": "FORBIDDEN",
    "message": "permission denied",
    "details": {}
  }
}
```

其中 `error.code` **必须**落在 OpenAPI 里的枚举：`components.schemas.ErrorCode`（从 v1.0.5 开始强类型约束）。

---

## 1) ErrorCode 枚举值

当前固定枚举：

- `VALIDATION_ERROR`：参数校验失败（字段缺失/格式不合法/长度超限等）
- `BAD_REQUEST`：通用 400（非字段级校验，但请求语义不合法）
- `UNAUTHORIZED`：未登录/会话失效
- `FORBIDDEN`：已登录但无权限（或命中安全策略）
- `NOT_FOUND`：资源不存在（或越权按 404 策略隐藏）
- `CONFLICT`：资源冲突（例如重复提交、状态机冲突、幂等冲突等）
- `PRECONDITION_REQUIRED`：缺少 `If-Match`（该接口启用强制并发门禁）
- `PRECONDITION_FAILED`：`If-Match` 与当前 `ETag` 不一致（并发冲突）
- `RATE_LIMITED`：触发限流（429）
- `INTERNAL_ERROR`：服务端未知错误（500）

> 如果未来要扩展枚举（例如 `IDEMPOTENCY_CONFLICT`、`FILE_TOO_LARGE` 等），必须同步更新：
> 1) OpenAPI 的 ErrorCode enum
> 2) 多端错误提示映射（文案与交互）
> 3) 合约测试（contract tests）

---

## 2) HTTP 状态码 ↔ ErrorCode 推荐映射

| HTTP Status | error.code | 典型场景 |
|---|---|---|
| 400 | VALIDATION_ERROR / BAD_REQUEST | 字段校验失败 / 请求语义不合法 |
| 401 | UNAUTHORIZED | 未登录、cookie 过期、refresh 失败 |
| 403 | FORBIDDEN | 角色无权、资源不归属、风控拒绝 |
| 404 | NOT_FOUND | 资源不存在，或越权按 404 隐藏 |
| 409 | CONFLICT | 幂等冲突、状态机非法跃迁、重复创建 |
| 412 | PRECONDITION_FAILED | If-Match 不匹配（并发冲突） |
| 428 | PRECONDITION_REQUIRED | 缺 If-Match（强制并发门禁） |
| 429 | RATE_LIMITED | Turnstile/限流触发 |
| 500 | INTERNAL_ERROR | 未捕获异常/下游不可用 |

---

## 3) 并发控制（If-Match/ETag）约定

- 写接口（更新/删除/状态变更）在启用强制门禁时：
  - 缺 `If-Match` → `428 PRECONDITION_REQUIRED`
  - `If-Match` 不一致 → `412 PRECONDITION_FAILED`
- 成功响应必须返回 `ETag: W/"{rowVersion}"`

