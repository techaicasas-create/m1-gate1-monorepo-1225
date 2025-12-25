#!/usr/bin/env bash
set -euo pipefail

: "${PROJECT_ID:?need PROJECT_ID}"
: "${REGION:?need REGION}"
: "${JOB_NAME:?need JOB_NAME}"
: "${AR_REPO:?need AR_REPO}"
: "${TAG:?need TAG}"
: "${CLOUDSQL_INSTANCE_CONNECTION_NAME:?need CLOUDSQL_INSTANCE_CONNECTION_NAME}"
: "${CLOUDSQL_USER:?need CLOUDSQL_USER}"
: "${CLOUDSQL_PASS:?need CLOUDSQL_PASS}"
: "${CLOUDSQL_DB:?need CLOUDSQL_DB}"

IMAGE="${REGION}-docker.pkg.dev/${PROJECT_ID}/${AR_REPO}/${JOB_NAME}:${TAG}"

# Build

echo "Build scan-worker image: ${IMAGE}"
gcloud builds submit \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --tag "${IMAGE}" \
  -f apps/scan-worker/Dockerfile \
  .

# Deploy Cloud Run Job
# NOTE: env-vars-file requires gcloud 416+

DATABASE_URL="postgres://${CLOUDSQL_USER}:${CLOUDSQL_PASS}@/${CLOUDSQL_DB}?host=/cloudsql/${CLOUDSQL_INSTANCE_CONNECTION_NAME}"

echo "Deploy Cloud Run Job: ${JOB_NAME}"
gcloud run jobs deploy "${JOB_NAME}" \
  --project "${PROJECT_ID}" \
  --region "${REGION}" \
  --image "${IMAGE}" \
  --tasks 1 \
  --max-retries 0 \
  --set-cloudsql-instances "${CLOUDSQL_INSTANCE_CONNECTION_NAME}" \
  --set-env-vars "DATABASE_URL=${DATABASE_URL}" \
  --env-vars-file infra/staging/scan-worker.env.yaml.example


echo "Done. Trigger once: gcloud run jobs execute ${JOB_NAME} --project ${PROJECT_ID} --region ${REGION}"
