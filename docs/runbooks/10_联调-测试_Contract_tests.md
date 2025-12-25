# Runbook 10：联调/测试｜Contract tests

- 对应排期行：工程排期_任务拆解（Row 15）
- Gate：工程化打底+三环境
- 排期任务：Contract tests：按 OpenAPI 校验 Envelope/ErrorCode/状态码(含412/428)；接口变更自动爆红
- 负责人：后端/测试
- 依赖：OpenAPI codegen
- 排期验收：contract tests 报告（含失败示例）

## 参考资料

- 本包内关键冻结口径：`source/key_docs/`（OpenAPI v1.0.6、4 份设计稿、M1 Checklist、API 兼容/下线计划等）
- 原始排期表：`source/工程排期评估表_执行排期_集成版_M1补齐_20251224.xlsx`（Sheet：工程排期_任务拆解）
- M1 交付包（已解压）：`source/M1_交付包_20251224_排期补齐_已解压/`

## 目标
建立 Contract tests：任何接口变更必须先改 OpenAPI，并且 **Envelope/ErrorCode/状态码** 不一致会自动爆红。

## 最小覆盖范围（Gate1 建议）
- 成功响应 envelope：`{requestId,timestamp,data}`
- 错误响应 envelope：`{requestId,timestamp,error}`
- ErrorCode 枚举与 HTTP status 对齐
- 并发：`428`（缺 If-Match）、`412`（ETag 过期）
- 越权：403/404 策略（至少 1~2 个关键写接口）

## 落地步骤
1) **选定测试框架**
   - Node：Jest/Vitest
   - 或 Postman/Newman
   - 或 Schemathesis（如果你们偏 Python）

2) **把 spec 作为唯一事实来源**
   - 读取 `OpenAPI_v1.0.6_enveloped.yaml`
   - 对每个 operation 做：
     - schema 校验
     - 状态码校验
     - error.code 是否在枚举内

3) **把测试纳入 CI**
   - 失败阻断合并
   - 报告归档（artifact）

4) **保留一次失败示例**
   - 例如：后端返回了不在 enum 内的 code，测试应爆红
   - 修复后通过 → 作为“验收证据”

## 交付物
- contract tests 代码
- CI 报告（含失败示例）

## 验收与证据
- `evidence/M1/OpenAPI/`：contract tests 报告（含失败示例）
