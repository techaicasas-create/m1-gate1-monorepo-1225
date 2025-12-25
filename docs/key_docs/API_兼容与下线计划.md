# API 兼容与下线计划（/api → /v1）

版本：M0-ULTIMATE / 2025-12-24

## 1. 背景

- 历史方案/参考 OpenAPI 使用路径前缀：`/api/...`
- M0 决策已冻结：**生产统一对外前缀为 `/v1`**，并且所有成功响应统一 Envelope：`{requestId,timestamp,data}`
- 为降低联调与切换成本，需要提供一段时间的 **兼容期**，但必须明确“**何时下线**”，避免永远背负历史包袱。

## 2. 兼容策略（推荐）

### 2.1 Staging/Prod 网关 rewrite（短期兼容）
在网关（GCLB / API Gateway / Nginx）做 rewrite：

- 兼容路径：`/api/*`
- 目标路径：`/v1/*`
- **约束**：
  - 兼容期内，所有文档/联调/contract tests 以 `/v1` 为准
  - `/api` 仅作为“别名”，禁止引入新的 `/api` 文档与实现

### 2.2 兼容期观测
兼容期内对 `/api/*` 请求做日志埋点（至少包含）：

- `path=/api/...`
- `client`（可用 UA/Referer/自定义 header 区分）
- `requestId`
- `org_id`（若可识别）

用于判断是否仍有客户端依赖 `/api`。

## 3. 下线节奏（按里程碑 Gate，避免拍脑袋日期）

| 阶段 | 目标 | `/api` 状态 | 验收条件 |
|---|---|---|---|
| Gate0（M0） | 契约冻结 | 允许存在（仅别名） | OpenAPI 以 `/v1` 发布；并在本文件写清楚下线计划 |
| Gate1（M1） | 工程化骨架 + 安全基线 | Staging 仍保留 rewrite | CI/contract tests 只跑 `/v1`；`/api` 请求开始被打点 |
| Gate2（M2） | 公域闭环（Homepage ↔ API ↔ CRM） | 仍保留（但开始对外公告 Deprecation） | Staging/Prod 响应可加 `Deprecation/Sunset` header（可选） |
| Gate3（M3 或 Go‑Live 前） | Core 单一真源 + CRM/Admin 稳定 | **Prod 禁止 `/api`** | 连续 7 天 `/api` 调用量为 0（或只来自白名单） |
| Go‑Live 后 30 天 | 收尾清理 | 删除所有 `/api` 代码分支 | 删除 rewrite 规则 + 删除文档 + 删除告警白名单 |

> 如果你有具体日程（例如 Go‑Live 日期），可以把“Go‑Live 前/后”替换为明确日期；但必须保留“观测条件 + 验收条件”。

## 4. 风险与兜底

- 风险：仍有未知客户端调用 `/api`
- 兜底：允许 **紧急开关** 临时恢复 rewrite（最长 24h），并要求在恢复期间输出“调用来源清单”。
