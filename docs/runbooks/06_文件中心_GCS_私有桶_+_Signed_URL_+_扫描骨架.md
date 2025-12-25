# Runbook 06：文件中心｜GCS 私有桶 + Signed URL + 扫描骨架

- 对应排期行：工程排期_任务拆解（Row 11）
- Gate：工程化打底+三环境
- 排期任务：GCS私有桶+Signed URL上传/下载骨架；扫描流程(Job/Worker)骨架
- 负责人：后端
- 排期验收：bucket策略+接口样例

## 参考资料

- 本包内关键冻结口径：`source/key_docs/`（OpenAPI v1.0.6、4 份设计稿、M1 Checklist、API 兼容/下线计划等）
- 原始排期表：`source/工程排期评估表_执行排期_集成版_M1补齐_20251224.xlsx`（Sheet：工程排期_任务拆解）
- M1 交付包（已解压）：`source/M1_交付包_20251224_排期补齐_已解压/`

## 目标
建立文件中心的最小可运行骨架：
- GCS 私有桶（每环境独立）
- Signed URL 上传/下载（短期有效）
- 扫描流程骨架（Job/Worker），与 OpenAPI/DB 中 scan_status 对齐

## 落地步骤
1) **创建 GCS 私有桶**
   - 按环境：dev/staging/prod 各一个 bucket
   - 禁止 public read
   - 最小权限：仅 API/Worker service account 可访问

2) **Signed URL 接口骨架**
   - 生成上传 signed URL（限制 content-type、最大 size、过期时间）
   - 生成下载 signed URL（短 TTL）
   - 建议把 TTL 写入环境变量（见环境变量清单）

3) **扫描流程骨架**
   - 上传后创建 document 记录（scan_status=UPLOADED/PENDING）
   - Worker 拉取 pending 任务执行扫描（可先用“空扫描”占位）
   - 更新 scan_status（PASS/FAIL）并记录错误码

4) **安全要点（对齐防呆清单）**
   - URL 必须过期（避免永久外链）
   - bucket 不能 public
   - 日志不能打印文件内容或 PII

## 交付物
- bucket policy / IAM 截图
- 2 个 curl 样例：上传 URL + 下载 URL
- worker 骨架（能跑通状态流转）

## 验收与证据
- `evidence/M1/Files/`：bucket policy、signed url 样例、scan 状态流转日志
