# packages/api-client

> 由冻结 OpenAPI（v1.0.6）生成的 TS client。联调统一使用生成物，禁止手写 client。

## 生成

```bash
pnpm openapi:codegen
```

生成输出默认落到：
- `packages/api-client/generated/ts-fetch-client/`

你可以在 `src/index.ts` 里统一 re-export（或按你们工程习惯调整）。
