# Runbook 07：可观测｜日志规范 + requestId + Sentry

- 对应排期行：工程排期_任务拆解（Row 12）
- Gate：工程化打底+三环境
- 排期任务：日志规范：requestId/用户/实体ID；前端错误收集（Sentry或同类）接入
- 负责人：后端/前端
- 排期验收：日志样例+Sentry截图

## 参考资料

- 本包内关键冻结口径：`source/key_docs/`（OpenAPI v1.0.6、4 份设计稿、M1 Checklist、API 兼容/下线计划等）
- 原始排期表：`source/工程排期评估表_执行排期_集成版_M1补齐_20251224.xlsx`（Sheet：工程排期_任务拆解）
- M1 交付包（已解压）：`source/M1_交付包_20251224_排期补齐_已解压/`

## 目标
Gate1 要求可追踪：requestId 贯穿，并接入前端错误收集（Sentry/同类）。

## 落地步骤
1) **requestId 规范**
   - 请求进入：
     - 若客户端传 `REQUEST_ID_HEADER`（见环境变量清单），沿用
     - 否则服务端生成 UUID
   - 写入日志字段：`requestId`
   - 所有响应 envelope 返回 `requestId`

2) **日志字段规范（建议最小）**
   - `requestId`
   - `orgId`（如果已确定）
   - `userId`
   - `role/scope`
   - `entityType/entityId`（写接口尽量记录）
   - `errorCode`（如失败）

3) **日志脱敏（防呆清单）**
   - 禁止打印：证件号、银行卡、合同全文、手机号等
   - 建议：写一份“日志脱敏规则”并评审

4) **前端 Sentry（或同类）**
   - 五端各自项目接入（或共享一个项目按 tag 区分）
   - 用测试错误验证“能上报”

## 交付物
- 3 条真实样例日志（脱敏后）
- Sentry 项目截图 + 测试事件截图

## 验收与证据
- `evidence/M1/Observability/`：日志样例、Sentry 截图、脱敏规则文档
