# Runbook 13：审计｜audit_log 框架

- 对应排期行：工程排期_任务拆解（Row 18）
- Gate：安全基线（Auth/RBAC/审计/并发）
- 排期任务：审计日志框架：requestId 贯穿；audit_log 表落库；关键动作写入 before/after 摘要（避免 PII）
- 负责人：后端/DBA
- 依赖：设计稿3(审计)+DB migrations
- 排期验收：审计样本导出（含 requestId/actor/action/entity）

## 参考资料

- 本包内关键冻结口径：`source/key_docs/`（OpenAPI v1.0.6、4 份设计稿、M1 Checklist、API 兼容/下线计划等）
- 原始排期表：`source/工程排期评估表_执行排期_集成版_M1补齐_20251224.xlsx`（Sheet：工程排期_任务拆解）
- M1 交付包（已解压）：`source/M1_交付包_20251224_排期补齐_已解压/`

## 目标
建立审计日志框架（Gate1 最小）：
- requestId 贯穿
- audit_log 表落库
- 关键动作写入 before/after 摘要（避免 PII）

## 参考口径
- 设计稿：`source/key_docs/设计稿3_org_id_RLS_审计.md`
- PG 清单：`source/key_docs/PG_SQL落地清单.csv`
- 防呆：`source/key_docs/防呆清单_M1.csv`（审计项）

## 落地步骤
1) **确认 DB schema**
   - Flyway V1 已包含 audit_log（以你们实际迁移为准）

2) **写入封装**
   - 在业务写接口的统一入口写入（service layer / middleware）
   - 写入字段建议：
     - org_id, actor_user_id, action, entity_type, entity_id
     - request_id, ip, user_agent
     - before/after（摘要/差异，不要存合同全文/身份证等）

3) **关键动作覆盖**
   - 登录/MFA（如有）
   - 修改收款/支付状态
   - 下载合同/导出
   - create/update/delete 核心实体

4) **导出样本**
   - 提供 10 条样本记录（脱敏）

## 交付物
- audit_log 写入代码 + 示例查询 SQL
- 样本导出文件

## 验收与证据
- `evidence/M1/Audit/`：schema 截图、样本导出、写入点说明
