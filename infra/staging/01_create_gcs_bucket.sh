#!/usr/bin/env bash
set -euo pipefail

: "${PROJECT_ID:?need PROJECT_ID}"
: "${REGION:?need REGION}"
: "${GCS_BUCKET_PRIVATE:?need GCS_BUCKET_PRIVATE}"

# Create private bucket with uniform access (recommended)
# NOTE: requires gcloud 469+ (gcloud storage). If you use older gcloud, switch to gsutil.

echo "Creating bucket gs://${GCS_BUCKET_PRIVATE} in ${REGION} (project ${PROJECT_ID})"

gcloud storage buckets create "gs://${GCS_BUCKET_PRIVATE}" \
  --project="${PROJECT_ID}" \
  --location="${REGION}" \
  --uniform-bucket-level-access \
  --public-access-prevention="enforced"

# Enable object versioning (optional but recommended)
gcloud storage buckets update "gs://${GCS_BUCKET_PRIVATE}" --versioning

echo "Bucket created: gs://${GCS_BUCKET_PRIVATE}"
