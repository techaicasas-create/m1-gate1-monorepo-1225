# Runbook 04：后端｜Cloud Run 部署 + 入口限制

- 对应排期行：工程排期_任务拆解（Row 9）
- Gate：工程化打底+三环境
- 排期任务：Cloud Run部署 + GCLB/Ingress限制（阻断直连Cloud Run）
- 负责人：DevOps/后端
- 排期验收：架构图+配置截图

## 参考资料

- 本包内关键冻结口径：`source/key_docs/`（OpenAPI v1.0.6、4 份设计稿、M1 Checklist、API 兼容/下线计划等）
- 原始排期表：`source/工程排期评估表_执行排期_集成版_M1补齐_20251224.xlsx`（Sheet：工程排期_任务拆解）
- M1 交付包（已解压）：`source/M1_交付包_20251224_排期补齐_已解压/`

## 目标
后端 API 在 **Cloud Run** 上完成 DEV/STAGING/PROD 部署，并通过入口（GCLB/WAF/网关）访问，避免绕过 WAF 直连 Cloud Run。

## 落地步骤
1) **容器化**
   - 提供 `Dockerfile`（可多阶段）
   - 暴露端口与健康检查：`GET /v1/health`

2) **部署 Cloud Run（每环境一套）**
   - 环境变量来自：`source/key_docs/环境变量清单.csv`
   - 密钥使用 Secret Manager（不要把敏感值写进 Pages env）

3) **限制入口（关键）**
   - Cloud Run Ingress 选择 “Internal and Cloud Load Balancing”（或你们等价方案）
   - 通过 GCLB/网关/WAF 转发到 Cloud Run
   - 验证：直接 Cloud Run URL 访问应失败（或被 403/404 拦截）

4) **CORS 与安全头**
   - `FRONTEND_ORIGINS` 白名单（按环境）
   - 预检 OPTIONS 通过/拒绝都要可复现

5) **Smoke**
   - 部署后跑：
     - `GET /v1/health`
     - `GET /v1/me`（未登录应 401）

## 交付物
- Cloud Run 服务配置（截图/链接）
- Ingress 限制验证记录
- 1 份架构图（入口 → Cloud Run → Cloud SQL → GCS）

## 验收与证据
- `evidence/M1/Backend/`：Cloud Run 配置截图、健康检查结果
- `evidence/M1/Gateway/`：入口限制验证、直连失败证据
