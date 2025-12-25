# 设计稿4：并发控制（If-Match / ETag / row_version）【M0-ULTIMATE】

版本：v1.0  
更新日期：2025-12-24  
适用范围：Core-only（Admin/Staff/Owner/Tenant 五端共享）  

---

## 1. 目标

在多端并行操作同一资源时（例如：运营与房东同时编辑房源、财务与运营同时处理账单/支付状态），避免“后写覆盖先写”的数据丢失问题。

本设计稿定义一套**可落地、可验收、可在代码层强制**的乐观锁（Optimistic Lock）方案：

- DB：为核心可变更表增加 `row_version bigint NOT NULL DEFAULT 0`
- API：使用 `ETag` + `If-Match` 表达并发门禁
- 服务端实现：`UPDATE ... WHERE id=? AND row_version=?`，成功后 `row_version=row_version+1`
- 客户端处理：冲突时刷新最新数据并提示用户

---

## 2. 核心约定（统一协议）

### 2.1 字段/头部对齐

- **rowVersion（响应体字段）**：资源的当前版本号（int64）
- **ETag（响应头）**：资源版本标签（由 rowVersion 派生）
- **If-Match（请求头）**：客户端更新/删除/状态变更时回传的 ETag，用于并发校验

推荐映射规则（最简可执行）：

- `ETag = W/"{rowVersion}"`
- 更新时：`If-Match: W/"{rowVersion}"`

> 说明：弱 ETag（W/）足够用于并发控制；不要求字节级一致性。

### 2.2 错误码约定

当接口启用强制并发门禁时：

- **428 Precondition Required**：缺少 `If-Match`
- **412 Precondition Failed**：`If-Match` 与服务端当前 `ETag` 不一致（资源已被他人修改）

错误响应体统一为 `ErrorResponse`，建议：

- `error.code = "PRECONDITION_REQUIRED"`（ErrorCode 枚举）
- `error.code = "PRECONDITION_FAILED"`（ErrorCode 枚举）

---

## 3. 接口层落地（哪些接口强制 If-Match）

原则：**只要是“修改既有资源状态/字段”的操作，就强制 If-Match**。

已在 OpenAPI v1.0.5 标记（components.parameters.IfMatch + 412/428）。

建议强制的接口清单（P0）：

- TenantLead：`PATCH /tenant-leads/{leadId}`
- Property：`PATCH /properties/{propertyId}`、`DELETE /properties/{propertyId}`
- Lease：`PATCH /leases/{leaseId}`
- Ticket：`PATCH /tickets/{ticketId}`
- Invoice：`PATCH /invoices/{invoiceId}`
- Payment 状态变更：`POST /payments/{paymentId}/verify|reject|reverse`
- Document：`PATCH /documents/{docId}`
- DocumentRequest：`PATCH /document-requests/{requestId}` + `submit/approve/reject/waive`
- Application：`PATCH /applications/{applicationId}`
- MatchProposal：`POST /match-proposals/{proposalId}/respond`
- Notification：`PATCH /notifications/{notificationId}`（可选强制，建议统一）

> 不强制的常见例子：创建类（POST list）、追加子资源（评论、上传完成等），除非这些操作会改动父资源同一行。

---

## 4. 服务端实现建议（Repository/DAO 层）

### 4.1 数据库字段

在核心表上增加：

- `row_version bigint NOT NULL DEFAULT 0`
- 并保留 `updated_at`（审计/排障）

### 4.2 更新语句范式（必须可验收）

以 Property 更新为例：

```sql
UPDATE properties
SET title = :title,
    ...,
    row_version = row_version + 1,
    updated_at = now()
WHERE id = :id
  AND org_id = :org_id
  AND row_version = :expected_row_version
RETURNING row_version;
```

- `:expected_row_version` 来自 `If-Match` 解析出的版本号
- `RETURNING row_version` 用于生成新的 `ETag`

### 4.3 Delete 范式

```sql
DELETE FROM properties
WHERE id = :id
  AND org_id = :org_id
  AND row_version = :expected_row_version;
```

---

## 5. 客户端/前端处理建议

### 5.1 获取 rowVersion

- 从资源 GET / 列表返回的对象字段 `rowVersion` 获取
- 或从响应头 `ETag` 获取（推荐由 API SDK 自动保留）

### 5.2 更新时发送 If-Match

- 从缓存的 `ETag` 或 `rowVersion` 生成并回传 `If-Match`
- 若返回 412：提示“数据已被更新”，并自动刷新最新值（或弹窗引导用户合并修改）

---

## 6. 验收标准（可落地证据）

- 任意一个资源（推荐 Property）可复现并发：
  1) A 端读取 Property，拿到 `ETag=W/"3"`
  2) B 端更新成功，返回 `ETag=W/"4"`
  3) A 端用旧 `If-Match=W/"3"` 再更新 → 返回 **412**
- 缺少 If-Match 时，接口返回 **428**（若开启强制门禁）

---

## 7. 与审计 / RLS 的关系

- 并发控制不替代 RLS；RLS 仍负责租户隔离（org_id）
- 建议在审计日志中记录：
  - `expectedRowVersion`（来自 If-Match）
  - `newRowVersion`（成功后返回）

