# Runbook 09：OpenAPI/契约｜OpenAPI lint + codegen

- 对应排期行：工程排期_任务拆解（Row 14）
- Gate：工程化打底+三环境
- 排期任务：OpenAPI lint+codegen：基于 openapi_v1.0.6 生成 TS client（packages/api-client），联调统一用生成物；接口变更先改 OpenAPI
- 负责人：前端/后端
- 依赖：M0 OpenAPI v1.0.6
- 排期验收：CI 生成物可复现 + OpenAPI lint 报告 + api-client 产物

## 参考资料

- 本包内关键冻结口径：`source/key_docs/`（OpenAPI v1.0.6、4 份设计稿、M1 Checklist、API 兼容/下线计划等）
- 原始排期表：`source/工程排期评估表_执行排期_集成版_M1补齐_20251224.xlsx`（Sheet：工程排期_任务拆解）
- M1 交付包（已解压）：`source/M1_交付包_20251224_排期补齐_已解压/`

## 目标
把 M0 冻结 OpenAPI v1.0.6 固化成工程默认：**先改契约再改代码**，并在 CI 中强制执行。

## 落地步骤
1) **引入冻结 spec**
   - `source/key_docs/OpenAPI_v1.0.6_enveloped.yaml`
   - 推荐在仓库固定路径（如 `contracts/openapi/`）

2) **OpenAPI lint（Spectral）**
   - 目标：阻断常见问题（缺少 summary、schema 不一致、enum 不对齐等）
   - 把 lint 纳入 CI（见 Runbook 02）

3) **OpenAPI codegen**
   - 使用 M1 交付包脚本（已含 docker openapi-generator）：
     - `source/M1_交付包_20251224_排期补齐_已解压/04_OPENAPI/tooling/generate_ts_client.sh`
   - 生成物落地到 `packages/api-client`
   - 约束：联调一律使用生成物，不手写 client

4) **ErrorCode 枚举（强制）**
   - 依据：`source/key_docs/ERROR_CODE_ENUM.md`
   - 要求：
     - 后端返回必须在 enum 之内
     - 前端按 code 做提示映射
     - contract tests 覆盖

## 交付物
- OpenAPI lint 报告
- codegen 产物（packages/api-client）

## 验收与证据
- `evidence/M1/OpenAPI/`：lint 报告、codegen 产物、CI 可复现证明
