# Runbook 14：数据隔离｜org_id 注入/隔离

- 对应排期行：工程排期_任务拆解（Row 19）
- Gate：安全基线（Auth/RBAC/审计/并发）
- 排期任务：org_id 注入/隔离：从会话推导 org_id；DB session set_config(app.org_id)；关键表 org_id 约束/索引；越权不可见测试
- 负责人：后端/DBA
- 依赖：设计稿3(org_id/RLS)+PG_SQL落地清单
- 排期验收：schema 截图 + 越权用例（跨 org 403/404/空集）

## 参考资料

- 本包内关键冻结口径：`source/key_docs/`（OpenAPI v1.0.6、4 份设计稿、M1 Checklist、API 兼容/下线计划等）
- 原始排期表：`source/工程排期评估表_执行排期_集成版_M1补齐_20251224.xlsx`（Sheet：工程排期_任务拆解）
- M1 交付包（已解压）：`source/M1_交付包_20251224_排期补齐_已解压/`

## 目标
实现 org_id 注入/隔离，防跨租户数据泄露：
- 从会话推导 org_id
- DB session `set_config('app.org_id', ...)`
- 关键表 org_id 约束/索引
- 越权不可见测试（跨 org 403/404/空集）

## 参考口径
- 设计稿：`source/key_docs/设计稿3_org_id_RLS_审计.md`
- PG 清单：`source/key_docs/PG_SQL落地清单.csv`

## 落地步骤
1) **会话中确定 org_id**
   - 登录后 user 必须关联 org（避免“无 org 也能查到数据”）

2) **DB session 注入**
   - 每次请求创建连接后设置：
     - `select set_config('app.org_id', '<org>', true);`
   - 如果你们启用 RLS：policy 应依赖 current_setting('app.org_id')

3) **关键表 org_id 约束/索引**
   - NOT NULL / FK / INDEX（按 PG_SQL 清单）

4) **越权测试**
   - 用户 A(org1) 访问 org2 数据：
     - 列表应为空
     - 详情应 404（默认）

## 交付物
- org_id 注入代码/中间件
- 越权测试用例

## 验收与证据
- `evidence/M1/Security/`：跨 org 用例记录
- `evidence/M1/DB/`：schema 截图、索引证明
