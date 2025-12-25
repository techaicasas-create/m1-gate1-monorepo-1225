# 设计稿3：数据隔离策略（org_id 贯穿 + RLS + 审计表）

版本：M0-FREEZE / 2025-12-24  
依据：Sheet「决策一页：多租户隔离（org_id/RLS）」「PG_SQL落地清单」

## 1. 目标

- 任何跨租户访问必须在**数据库层/应用层**被强制拦截（防数据泄露）。
- 建立可审计链路：每次写入可追踪到 requestId、操作者与变更内容摘要。

## 2. org_id 贯穿（强制）

### 2.1 强制要求
- 关键业务表必须包含 `org_id`：
  - parties / properties / applications / leases
  - tickets / invoices / payments
  - documents / doc_requests / notifications
- 所有外键链路必须能推导 org_id（不允许出现“资源表没有 org_id 只能 join 推导但又无法保证一致”的情况）

### 2.2 参考清单
- 定版表：`03_TABLES/PG_SQL落地清单.xlsx`

## 3. RLS（Row Level Security）策略（推荐 P0）

### 3.1 会话变量
每请求在 DB session 设置：
```sql
SELECT set_config('app.org_id', :org_id, true);
SELECT set_config('app.user_id', :user_id, true);
SELECT set_config('app.role', :role, true);
```

### 3.2 示例策略（伪代码）
以 `properties` 为例：
```sql
ALTER TABLE properties ENABLE ROW LEVEL SECURITY;

CREATE POLICY p_org_isolation ON properties
  USING (org_id = current_setting('app.org_id')::uuid);
```

对 tenant/owner 这类“只可访问自己资源”的表，可叠加更细策略（或在应用层校验）：
```sql
-- 示例：租客只能看自己 lease
CREATE POLICY p_tenant_lease ON leases
  USING (
    org_id = current_setting('app.org_id')::uuid
    AND tenant_id = current_setting('app.tenant_id')::uuid
  );
```

> 说明：tenant_id/owner_id 是否写入 session 变量取决于鉴权实现；也可采用应用层先查归属再访问。

### 3.3 若暂不启用 RLS（允许但必须写明替代）
- 必须做到：所有 query 都强制 org_id 过滤（代码层做强制注入，禁止手写漏掉）
- 必须补充：越权访问不可见的集成测试（至少覆盖 parties/properties/leases/invoices）

## 4. 审计（audit_log）

### 4.1 必须记录
- request_id（对应 Envelope.requestId）
- org_id
- actor_user_id
- action（create/patch/upsert/delete）
- entity_type + entity_id
- before/after 摘要（可只存 diff 摘要，避免 PII）

### 4.2 参考实现
原型 LocalCore 已模拟 audit_log 写入（见 `05_PROTOTYPE/五端口基础原型/README.md`）。

## 5. 验收证据（Gate0）
- 本文档（Doc/PDF）
- PG_SQL 落地清单定版
- 决策一页定版（含“若不启用 RLS 的替代策略”）

