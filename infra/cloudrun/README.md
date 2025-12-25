# Cloud Run 部署模板（示例）

> 注意：不同团队的网络/入口方案不同。这里给的是“可执行的参考流程”，你们需要按公司标准调整。

## 1) Build & Push（示例）

```bash
export PROJECT_ID=your-project
export REGION=asia-east1
export IMAGE=asia-east1-docker.pkg.dev/$PROJECT_ID/aicasa/api:staging

gcloud auth configure-docker $REGION-docker.pkg.dev
docker build -f apps/api/Dockerfile -t "$IMAGE" .
docker push "$IMAGE"
```

## 2) Deploy（示例）

```bash
export SERVICE=aicasa-api-staging

gcloud run deploy "$SERVICE"   --image "$IMAGE"   --region "$REGION"   --ingress internal-and-cloud-load-balancing   --allow-unauthenticated=false   --set-env-vars APP_ENV=staging,REQUEST_ID_HEADER=X-Request-Id   --set-secrets CSRF_SECRET=CSRF_SECRET_STG:latest   --set-env-vars DATABASE_URL="*** use secret manager or connector ***"
```

## 3) 验证“禁止直连 Cloud Run”
- 直接访问 Cloud Run 默认 URL 应失败
- 通过入口（GCLB/WAF/网关）访问应成功

把截图放到：`evidence/M1/Gateway/`
