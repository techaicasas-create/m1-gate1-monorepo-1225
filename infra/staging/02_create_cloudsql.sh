#!/usr/bin/env bash
set -euo pipefail

: "${PROJECT_ID:?need PROJECT_ID}"
: "${REGION:?need REGION}"
: "${CLOUDSQL_INSTANCE:?need CLOUDSQL_INSTANCE}"
: "${CLOUDSQL_DB:?need CLOUDSQL_DB}"
: "${CLOUDSQL_USER:?need CLOUDSQL_USER}"
: "${CLOUDSQL_PASS:?need CLOUDSQL_PASS}"

# PostgreSQL instance create (you can adjust tier/disk)
# For production: consider private IP + VPC connector.

echo "Creating Cloud SQL instance ${CLOUDSQL_INSTANCE} (PostgreSQL)"

gcloud sql instances create "${CLOUDSQL_INSTANCE}" \
  --project="${PROJECT_ID}" \
  --region="${REGION}" \
  --database-version="POSTGRES_15" \
  --tier="db-f1-micro" \
  --storage-type="SSD" \
  --storage-size="10" \
  --backup-start-time="03:00" \
  --availability-type="ZONAL" \
  --quiet

echo "Creating database ${CLOUDSQL_DB}"

gcloud sql databases create "${CLOUDSQL_DB}" \
  --instance="${CLOUDSQL_INSTANCE}" \
  --project="${PROJECT_ID}" \
  --quiet

echo "Creating user ${CLOUDSQL_USER}"

gcloud sql users create "${CLOUDSQL_USER}" \
  --instance="${CLOUDSQL_INSTANCE}" \
  --password="${CLOUDSQL_PASS}" \
  --project="${PROJECT_ID}" \
  --quiet

CONN_NAME=$(gcloud sql instances describe "${CLOUDSQL_INSTANCE}" --project="${PROJECT_ID}" --format="value(connectionName)")

echo "Cloud SQL ready. connectionName: ${CONN_NAME}"
