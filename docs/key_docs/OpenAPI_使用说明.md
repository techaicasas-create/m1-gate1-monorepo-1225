# OpenAPI 使用说明（M0-ULTIMATE+ENUM）

契约文件（推荐）：
- `openapi_v1.0.6_enveloped.yaml`
- `openapi_v1.0.6_enveloped.json`

## 1) 前后端联调口径
- 所有路径以 `/v1` 为前缀（见 `servers[].url`）
- 所有成功响应均为 Envelope：`{requestId, timestamp, data}`
- **金额字段**：v1.0.6 起对外统一使用字符串（MoneyString），避免 JSON number 精度问题；DB 使用 NUMERIC(18,2)。
- 错误响应：`{requestId, timestamp, error}`

## 2) 安全口径
- 浏览器端：Cookie 会话 `session` + 写接口需要 `X-CSRF-Token`
- 会话刷新：Cookie `refresh`（OpenAPI 中以 `refreshCookie` 表示）
- PUBLIC 接口：不需要登录，但必须配合 Turnstile/限流（见权限矩阵）

## 3) 代码生成（可选，但强烈建议）
如果你有 Docker，可直接使用 openapi-generator 生成 TypeScript client：

```bash
docker run --rm -v "$PWD:/local" openapitools/openapi-generator-cli:v7.6.0 \
  generate -i /local/04_OPENAPI/openapi_v1.0.6_enveloped.yaml \
  -g typescript-fetch -o /local/04_OPENAPI/generated/ts-fetch-client
```

> 生成物建议不要手改；接口变更请改 OpenAPI 再重新生成。

## 4) Mock（可选）
你可以使用 Prism（Docker）快速启动 mock server（示例）：

```bash
docker run --rm -it -p 4010:4010 -v "$PWD:/local" stoplight/prism:4 \
  mock -h 0.0.0.0 /local/04_OPENAPI/openapi_v1.0.6_enveloped.yaml
```

## 5) 兼容与下线计划
见：`00_RELEASE/API_兼容与下线计划.md`


## ErrorCode 枚举（统一错误码）

`ErrorResponse.error.code` 已固定为枚举（见 `components.schemas.ErrorCode`）。

建议客户端按以下映射处理：

- 400 → `VALIDATION_ERROR`/`BAD_REQUEST`
- 401 → `UNAUTHORIZED`
- 403 → `FORBIDDEN`
- 404 → `NOT_FOUND`
- 409 → `CONFLICT`
- 412 → `PRECONDITION_FAILED`
- 428 → `PRECONDITION_REQUIRED`
- 429 → `RATE_LIMITED`
- 500 → `INTERNAL_ERROR`