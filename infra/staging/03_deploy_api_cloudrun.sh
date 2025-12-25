#!/usr/bin/env bash
set -euo pipefail

: "${PROJECT_ID:?need PROJECT_ID}"
: "${REGION:?need REGION}"
: "${SERVICE_NAME:?need SERVICE_NAME}"
: "${AR_REPO:?need AR_REPO}"
: "${TAG:?need TAG}"
: "${CLOUDSQL_INSTANCE_CONNECTION_NAME:?need CLOUDSQL_INSTANCE_CONNECTION_NAME}"
: "${CLOUDSQL_USER:?need CLOUDSQL_USER}"
: "${CLOUDSQL_PASS:?need CLOUDSQL_PASS}"
: "${CLOUDSQL_DB:?need CLOUDSQL_DB}"
: "${GCS_BUCKET_PRIVATE:?need GCS_BUCKET_PRIVATE}"

# Optional
API_IMAGE_NAME="${API_IMAGE_NAME:-api}"
ENV_VARS_FILE="${ENV_VARS_FILE:-infra/staging/api.env.yaml.example}"

IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/${API_IMAGE_NAME}:${TAG}"

# 1) Artifact Registry repo (if absent)
gcloud artifacts repositories describe "${AR_REPO}" --location "${REGION}" --project "${PROJECT_ID}" >/dev/null 2>&1 || \
  gcloud artifacts repositories create "${AR_REPO}" \
    --repository-format=docker \
    --location "${REGION}" \
    --project "${PROJECT_ID}"

# 2) Build image

echo "Building image ${IMAGE}"
gcloud builds submit --project "${PROJECT_ID}" -f apps/api/Dockerfile -t "${IMAGE}" .

# 3) Deploy Cloud Run service
# Cloud SQL socket connection string
DATABASE_URL="postgres://${CLOUDSQL_USER}:${CLOUDSQL_PASS}@/${CLOUDSQL_DB}?host=/cloudsql/${CLOUDSQL_INSTANCE_CONNECTION_NAME}"

echo "Deploying Cloud Run service ${SERVICE_NAME}"
gcloud run deploy "${SERVICE_NAME}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --image "${IMAGE}" \
  --allow-unauthenticated \
  --port 8080 \
  --set-env-vars "DATABASE_URL=${DATABASE_URL},GCS_BUCKET_PRIVATE=${GCS_BUCKET_PRIVATE}" \
  --env-vars-file "${ENV_VARS_FILE}" \
  --add-cloudsql-instances "${CLOUDSQL_INSTANCE_CONNECTION_NAME}"

echo "Done. Use: gcloud run services describe ${SERVICE_NAME} --region ${REGION} --project ${PROJECT_ID}"
