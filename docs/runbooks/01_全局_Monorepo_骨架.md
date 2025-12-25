# Runbook 01：全局｜Monorepo 骨架

- 对应排期行：工程排期_任务拆解（Row 6）
- Gate：工程化打底+三环境
- 排期任务：Monorepo骨架：apps/* + packages/*（api-client/i18n/shared-types）
- 负责人：前端/后端
- 依赖：M0 OpenAPI定版
- 排期验收：仓库结构+README

## 参考资料

- 本包内关键冻结口径：`source/key_docs/`（OpenAPI v1.0.6、4 份设计稿、M1 Checklist、API 兼容/下线计划等）
- 原始排期表：`source/工程排期评估表_执行排期_集成版_M1补齐_20251224.xlsx`（Sheet：工程排期_任务拆解）
- M1 交付包（已解压）：`source/M1_交付包_20251224_排期补齐_已解压/`

## 目标
在一个统一仓库内固化 **apps/**（五端 + API）与 **packages/**（api-client/i18n/shared-types/contract-tests 等）的工程骨架，做到：
- 新人拉代码后能立刻知道每个端在哪、如何跑
- CI 可对所有包统一 lint/typecheck/test
- OpenAPI codegen 产物有固定落点（packages/api-client），联调统一用生成物

## 落地步骤
1) **创建目录结构**
   - `apps/`：`homepage`、`crm`、`admin`、`owner`、`tenant`、`api`
   - `packages/`：`api-client`、`shared-types`、`i18n`、`contract-tests`
   - `scripts/`：openapi lint/codegen、并发复现脚本等
   - `docs/`：Runbook、ADR、对接说明

2) **选择并固化 workspace 工具**
   - 推荐：`pnpm workspaces`（或你们内部标准）
   - 根目录落地：`package.json` + `pnpm-workspace.yaml`
   - 统一脚本建议：
     - `pnpm lint`（全仓）
     - `pnpm typecheck`
     - `pnpm test`
     - `pnpm openapi:lint`
     - `pnpm openapi:codegen`

3) **统一工程配置（防返工）**
   - TypeScript：`tsconfig.base.json`
   - ESLint/Prettier：统一配置（避免每个端各搞一套）
   - EditorConfig：缩进、换行、编码

4) **把 OpenAPI 生成物放入 packages/api-client（对齐排期口径）**
   - 冻结 spec：`source/key_docs/OpenAPI_v1.0.6_enveloped.yaml`
   - codegen：用 `openapi-generator`（M1 交付包内已有脚本，可直接复用）
   - 产物：`packages/api-client/src/*`（或你们约定的结构）

5) **每个 app 至少留一个 README**
   - “如何本地跑”
   - “如何部署到 Cloudflare Pages（build 输出目录、_headers 位置）”
   - “如何配置 API_BASE_URL（按环境变量清单）”

## 交付物
- 仓库结构 + 根 README（满足排期验收）
- workspace 配置（pnpm-workspace / root scripts）
- packages/api-client 生成落点说明

## 验收与证据（放到仓库或归档目录）
- `evidence/M1/Monorepo/`：
  - repo tree 截图/文本（`tree -L 3`）
  - README（含开发命令）
