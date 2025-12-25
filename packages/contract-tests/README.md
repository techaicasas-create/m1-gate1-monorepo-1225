# packages/contract-tests

> 契约测试：基于 OpenAPI 冻结口径校验 Envelope / ErrorCode / 状态码（Gate1）。
>
> 默认对本地 `http://localhost:8080/v1` 测试；你也可以设置 `API_BASE` 指向 STAGING。

## 运行

```bash
# 1) 起 API（apps/api）
# 2) 起 DB + migrations + seed（docker-compose + flyway + seed）
pnpm contract:test
```

## 环境变量
- API_BASE：默认 `http://localhost:8080/v1`
- DATABASE_URL：用于测试前插入/检查种子数据（可选）
