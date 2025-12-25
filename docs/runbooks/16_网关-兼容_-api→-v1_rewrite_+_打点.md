# Runbook 16：网关/兼容｜/api→/v1 rewrite + 打点

- 对应排期行：工程排期_任务拆解（Row 21）
- Gate：工程化打底+三环境
- 排期任务：/api→/v1 rewrite + 打点：STAGING 保留 rewrite；/api 请求日志/指标；联调/contract tests 只跑 /v1
- 负责人：DevOps/后端
- 依赖：M0 API 兼容与下线计划
- 排期验收：网关配置截图 + /api 调用日志样例

## 参考资料

- 本包内关键冻结口径：`source/key_docs/`（OpenAPI v1.0.6、4 份设计稿、M1 Checklist、API 兼容/下线计划等）
- 原始排期表：`source/工程排期评估表_执行排期_集成版_M1补齐_20251224.xlsx`（Sheet：工程排期_任务拆解）
- M1 交付包（已解压）：`source/M1_交付包_20251224_排期补齐_已解压/`

## 目标
按《API 兼容与下线计划》完成：
- STAGING 保留 `/api → /v1` rewrite
- `/api` 请求日志/指标打点
- 联调与 contract tests **只跑 /v1**

## 参考口径
- 计划：`source/key_docs/API_兼容与下线计划.md`

## 落地步骤
1) **rewrite 规则**
   - 仅 STAGING（或你们约定环境）保留 rewrite
   - PROD 按计划逐步下线

2) **打点与日志**
   - 记录：
     - 请求路径（/api 还是 /v1）
     - User-Agent / Origin（可脱敏）
     - response status
   - 输出指标，方便判断何时可下线 /api

3) **防呆：CI/测试禁止 /api**
   - 在 contract tests/SDK 示例里禁止出现 `/api`
   - 可用 grep 规则或 lint 规则阻断

## 交付物
- 网关配置截图
- /api 调用日志样例

## 验收与证据
- `evidence/M1/Gateway/`：rewrite 截图、日志样例、禁止 /api 的 CI 规则证明
