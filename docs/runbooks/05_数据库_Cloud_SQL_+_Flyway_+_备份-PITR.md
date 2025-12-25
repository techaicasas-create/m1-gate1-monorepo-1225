# Runbook 05：数据库｜Cloud SQL + Flyway + 备份/PITR

- 对应排期行：工程排期_任务拆解（Row 10）
- Gate：工程化打底+三环境
- 排期任务：Cloud SQL(PG)建库+迁移脚本可重复执行+种子数据；备份+PITR开启
- 负责人：后端/DBA
- 排期验收：migrations+备份截图

## 参考资料

- 本包内关键冻结口径：`source/key_docs/`（OpenAPI v1.0.6、4 份设计稿、M1 Checklist、API 兼容/下线计划等）
- 原始排期表：`source/工程排期评估表_执行排期_集成版_M1补齐_20251224.xlsx`（Sheet：工程排期_任务拆解）
- M1 交付包（已解压）：`source/M1_交付包_20251224_排期补齐_已解压/`

## 目标
建立 Cloud SQL(PostgreSQL) 三环境实例与 Flyway 迁移基线，并开启备份 + PITR，满足 Gate1：
- migrations 可重复执行
- schema 与 OpenAPI/设计稿一致（含 org_id、row_version、audit_log 等）

## 落地步骤
1) **创建 Cloud SQL 实例（每环境独立）**
   - DEV / STAGING / PROD 三套资源
   - 最小权限账号（禁止“所有人都拿管理员账号直连生产”）

2) **启用备份 + PITR**
   - 打开自动备份
   - 打开 PITR
   - 写明演练：如何回滚到指定时间点

3) **落地 Flyway**
   - migrations 参考：`source/M1_交付包_20251224_排期补齐_已解压/08_DB_MIGRATIONS/flyway/V1__init.sql`
   - 提供执行脚本（本包已带 `source/key_docs/evidence_scripts_from_M0/flyway_run.sh` 可复用）
   - 要求：重复执行不会破坏（幂等/版本控制）

4) **种子数据策略**
   - DEV：可完整种子
   - STAGING：最小可联调数据（禁止从 PROD 全量复制）
   - 写成脚本 + 文档

## 交付物
- Cloud SQL 配置截图（实例/备份/PITR）
- migrations 仓库目录 + 执行日志
- seed 脚本/说明

## 验收与证据
- `evidence/M1/DB/`：migrations 日志、备份/PITR 截图、schema 截图
- `evidence/M1/Env/`：STAGING 数据来源说明（不拷贝 PROD）
