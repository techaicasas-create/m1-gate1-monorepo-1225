# Runbook 15：并发控制｜If-Match/ETag(row_version)

- 对应排期行：工程排期_任务拆解（Row 20）
- Gate：安全基线（Auth/RBAC/审计/并发）
- 排期任务：If-Match/ETag(row_version) 落地：至少 Property/Document 1 个资源支持 412/428；提供冲突复现脚本
- 负责人：后端
- 依赖：设计稿4(并发控制)+OpenAPI v1.0.6
- 排期验收：并发冲突复现证据（412/428 + ErrorCode）

## 参考资料

- 本包内关键冻结口径：`source/key_docs/`（OpenAPI v1.0.6、4 份设计稿、M1 Checklist、API 兼容/下线计划等）
- 原始排期表：`source/工程排期评估表_执行排期_集成版_M1补齐_20251224.xlsx`（Sheet：工程排期_任务拆解）
- M1 交付包（已解压）：`source/M1_交付包_20251224_排期补齐_已解压/`

## 目标
落地乐观锁 If-Match/ETag(row_version)，至少选 1 个资源支持：
- 428：缺 If-Match（若开启强制）
- 412：If-Match 过期（冲突）

## 参考口径
- 设计稿：`source/key_docs/设计稿4_并发控制_If-Match_row_version.md`
- OpenAPI：`source/key_docs/OpenAPI_v1.0.6_enveloped.yaml`
- 复现脚本模板：`source/key_docs/evidence_scripts_from_M0/concurrency_conflict_demo.sh`

## 落地步骤
1) **选资源**
   - 建议：Property 或 Document（排期要求至少 1 个）

2) **GET 返回 ETag**
   - 格式：`W/"<row_version>"`

3) **PATCH 校验 If-Match**
   - 缺失 → 428（Precondition Required）
   - 不匹配 → 412（Precondition Failed）
   - 匹配 → 更新成功并 row_version +1

4) **统一错误码**
   - 412/428 时返回 ErrorCode（必须在枚举内）

5) **提供复现脚本**
   - 用 curl 或脚本演示“旧 ETag 更新失败”

## 交付物
- 1 个资源完整实现
- 复现脚本
- contract tests 覆盖 412/428

## 验收与证据
- `evidence/M1/Concurrency/`：412/428 复现记录 + ErrorCode
