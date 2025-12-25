# Staging 部署（Cloud Run + Cloud SQL + GCS）

目标：把 **apps/api**（Cloud Run Service）与 **apps/scan-worker**（Cloud Run Job 或 Service）在 staging 环境跑通：

- 登录 / Session cookie / CSRF
- RLS（按 org_id）
- 文件中心：presign-upload -> upload -> complete-upload -> download（GCS private bucket + Signed URL）
- 扫描 worker：把 SCANNING -> READY（骨架版）

> 本目录提供的是“可直接执行”的脚本模板。你只需要替换 `PROJECT_ID/REGION` 等变量即可。

## 0. 前置条件

- 已安装并登录 `gcloud`
- 已启用 API：Cloud Run / Cloud SQL Admin API / Secret Manager / Cloud Storage
- 具备权限（至少）：
  - Cloud Run Admin
  - Cloud SQL Admin
  - Storage Admin
  - Secret Manager Admin

## 1. 统一变量（建议先 export）

```bash
export PROJECT_ID="your-gcp-project"
export REGION="asia-east2"   # 示例
export ENV="staging"

export CLOUDSQL_INSTANCE="aicasa-staging-pg"
export CLOUDSQL_DB="aicasa_staging"
export CLOUDSQL_USER="aicasa"
export CLOUDSQL_PASS="CHANGE_ME"

export GCS_BUCKET_PRIVATE="aicasa-staging-private"
```

## 2. 一键脚本顺序

1. 创建私有桶（含安全推荐配置）

```bash
bash infra/staging/01_create_gcs_bucket.sh
```

2. 创建 Cloud SQL（Postgres）+ DB + 用户

```bash
bash infra/staging/02_create_cloudsql.sh
```

3. 创建 Secrets（SESSION_SECRET / CSRF_SECRET）

```bash
bash infra/staging/03_create_secrets.sh
```

4. 部署 API 到 Cloud Run（连接 Cloud SQL，开启 GCS provider）

```bash
bash infra/staging/04_deploy_api_cloudrun.sh
```

5. 部署 scan-worker（推荐 Cloud Run Job，RUN_ONCE=true）

```bash
bash infra/staging/05_deploy_scan_worker_job.sh
```

## 3. 验收（最小闭环）

- `GET /v1/health` 返回 200
- `POST /v1/auth/_debug_login` 取到 session cookie + csrf cookie
- `POST /v1/files/presign-upload` 得到 uploadUrl（GCS Signed URL）
- PUT 上传到 Signed URL
- `POST /v1/files/complete-upload` 返回 Document（scanStatus=SCANNING 或 READY）
- 触发 scan-worker 后，scanStatus 变为 READY
- `GET /v1/documents/{docId}/download` 获取 downloadUrl 或 302 跳转

## 4. 常用排查

- Cloud Run 环境变量：确认 `STORAGE_PROVIDER=gcs` / `GCS_BUCKET_PRIVATE` / `DATABASE_URL` 是否正确
- Cloud SQL 连接：Cloud Run 需要 `--add-cloudsql-instances` 或使用 VPC connector/Private IP
- GCS 签名：需要 Cloud Run Service Account 具备 `roles/storage.objectAdmin`（写）与 `roles/storage.objectViewer`（读）或更细粒度权限

