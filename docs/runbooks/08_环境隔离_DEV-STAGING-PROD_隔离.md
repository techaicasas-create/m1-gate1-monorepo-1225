# Runbook 08：环境隔离｜DEV/STAGING/PROD 隔离

- 对应排期行：工程排期_任务拆解（Row 13）
- Gate：工程化打底+三环境
- 排期任务：DEV/STAGING/PROD 三套独立资源/密钥；验证STAGING不从PROD全量拷贝
- 负责人：DevOps
- 排期验收：隔离截图+说明

## 参考资料

- 本包内关键冻结口径：`source/key_docs/`（OpenAPI v1.0.6、4 份设计稿、M1 Checklist、API 兼容/下线计划等）
- 原始排期表：`source/工程排期评估表_执行排期_集成版_M1补齐_20251224.xlsx`（Sheet：工程排期_任务拆解）
- M1 交付包（已解压）：`source/M1_交付包_20251224_排期补齐_已解压/`

## 目标
DEV/STAGING/PROD 三环境资源与密钥完全隔离，避免数据污染与“误把生产密钥配到测试环境”。

## 落地步骤
1) **资源隔离**
   - Cloud Run：每环境独立服务/配置
   - Cloud SQL：每环境独立实例/数据库
   - GCS：每环境独立 bucket
   - Secret Manager：每环境独立 secret（或至少独立 version + IAM）
   - Cloudflare Pages：每环境对应分支/项目（或 project + env）

2) **密钥隔离与权限**
   - STAGING/DEV 账号不能读取 PROD secret
   - API 运行账号最小权限

3) **禁止 STAGING 全量拷贝 PROD**
   - 如果必须拷贝：必须脱敏 + 走审批（建议 Gate3 之后再做）
   - Gate1 只允许“最小联调数据”

4) **落地环境变量清单**
   - 按 `source/key_docs/环境变量清单.csv` 对齐到：
     - Pages env
     - Cloud Run env
     - Secret Manager

## 交付物
- 资源清单表（每环境资源名/ID）
- 隔离截图（控制台/命令行）
- STAGING 数据来源说明

## 验收与证据
- `evidence/M1/Env/`：隔离截图、资源清单、STAGING 数据来源说明
