# Runbook 12：权限/归属｜authorize() 权限中间件

- 对应排期行：工程排期_任务拆解（Row 17）
- Gate：安全基线（Auth/RBAC/审计/并发）
- 排期任务：authorize() 权限中间件：按「权限矩阵」执行 role/scope + 资源归属；越权按 403/404 策略；关键接口补齐
- 负责人：后端/安全
- 依赖：设计稿2(权限矩阵)
- 排期验收：越权用例（403/404）+ 单测/集成测

## 参考资料

- 本包内关键冻结口径：`source/key_docs/`（OpenAPI v1.0.6、4 份设计稿、M1 Checklist、API 兼容/下线计划等）
- 原始排期表：`source/工程排期评估表_执行排期_集成版_M1补齐_20251224.xlsx`（Sheet：工程排期_任务拆解）
- M1 交付包（已解压）：`source/M1_交付包_20251224_排期补齐_已解压/`

## 目标
统一鉴权入口 `authorize()`，严格按权限矩阵执行：
- role/scope 校验
- 资源归属校验（org_id + ownership）
- 越权按 403/404 策略（避免资源探测）

## 参考口径
- 设计稿：`source/key_docs/设计稿2_权限矩阵_资源归属.md`
- 权限矩阵：`source/key_docs/权限矩阵.csv`

## 落地步骤
1) **实现统一 authorize()**
   - 输入：user（含 role/scope/org_id）
   - 输入：资源信息（entity type + id + org_id）
   - 输出：允许/拒绝（403/404）

2) **把权限“写死在一处”**
   - 禁止：controller 里散落 if/else
   - 允许：route 上声明需要的 role/scope（注释或元数据）

3) **资源归属校验**
   - 典型：
     - Tenant 只能访问自己的 application/lease
     - Owner 只能访问自己房源/租约
     - Admin/Staff 可按 org 访问
   - 越权返回：
     - 默认 404（隐藏存在性），必要时 403

4) **补齐关键接口**
   - 优先：HIGH_RISK 写接口（见权限矩阵列：限流等级/是否审计）

5) **测试**
   - 单测/集成测：
     - 未登录 401
     - 无权限 403/404
     - 跨 org 不可见

## 交付物
- authorize() 代码
- 越权用例（403/404）记录 + 测试

## 验收与证据
- `evidence/M1/Security/`：越权用例、测试报告、权限矩阵对齐说明
