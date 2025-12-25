# Runbook 02：CI/CD｜CI 门禁

- 对应排期行：工程排期_任务拆解（Row 7）
- Gate：工程化打底+三环境
- 排期任务：CI门禁：单测+lint+typecheck+SCA/Secret扫描+SAST（高危阻断）
- 负责人：DevOps/安全
- 排期验收：CI配置+报告

## 参考资料

- 本包内关键冻结口径：`source/key_docs/`（OpenAPI v1.0.6、4 份设计稿、M1 Checklist、API 兼容/下线计划等）
- 原始排期表：`source/工程排期评估表_执行排期_集成版_M1补齐_20251224.xlsx`（Sheet：工程排期_任务拆解）
- M1 交付包（已解压）：`source/M1_交付包_20251224_排期补齐_已解压/`

## 目标
建立 Gate1 必需的 CI 门禁：**单测 + lint + typecheck + SCA/Secret 扫描 + SAST**，并做到：
- 高危阻断合并（P0）
- 报告可追溯、可归档
- spec 变更/生成物未更新会自动爆红（防联调事故）

## 建议最小门禁清单（按防呆清单 + 排期口径）
- lint：ESLint（或你们语言栈对应）
- typecheck：tsc（或 go test / mvn test 等）
- unit tests：Jest/Vitest（或对应语言）
- Secret scan：gitleaks（或同类）
- SCA：Trivy fs / npm audit / Snyk（二选一即可，关键是能阻断高危）
- SAST：Semgrep / CodeQL（二选一即可）
- OpenAPI lint + codegen（见 Runbook 09）
- Contract tests（见 Runbook 10）

## 落地步骤（以 GitHub Actions 为例，你们可等价迁移到 GitLab CI）
1) 新增 workflow：`.github/workflows/ci.yml`
   - 触发：`pull_request` + `push`(main)
   - 缓存：pnpm store / node_modules（按你们标准）

2) 增加基础 jobs
   - `lint`
   - `typecheck`
   - `test`

3) 增加安全扫描 jobs
   - `gitleaks`：扫描仓库 secret
   - `trivy fs` / `npm audit`：依赖漏洞
   - `semgrep` / `codeql`：SAST

4) 阻断策略（关键）
   - **高危/严重**：直接 fail job（阻断合并）
   - 中低危：可先告警但不阻断（如你们资源紧张）

5) 报告归档
   - workflow artifact 保存：
     - `gitleaks-report.json`
     - `trivy-report.json`
     - `semgrep.sarif`
     - `openapi-lint.txt`
     - `contract-tests.xml`（如用 junit 输出）

## 交付物
- CI 配置文件（workflow / pipeline）
- 1 次“失败示例” + 1 次“修复后通过”记录（强烈建议）

## 验收与证据
- `evidence/M1/CI/`：pipeline 链接/截图（含阻断）
- `evidence/M1/Security/`：SCA/Secret/SAST 报告归档
