#!/usr/bin/env bash
set -euo pipefail

: "${PROJECT_ID:?need PROJECT_ID}"
: "${SESSION_SECRET_VALUE:?need SESSION_SECRET_VALUE}"
: "${CSRF_SECRET_VALUE:?need CSRF_SECRET_VALUE}"

# Optional: store secrets in Secret Manager
# You can then mount them into Cloud Run via --set-secrets.

create_or_update() {
  local NAME="$1"
  local VALUE="$2"

  if gcloud secrets describe "$NAME" --project "$PROJECT_ID" >/dev/null 2>&1; then
    echo "Update secret: $NAME"
    printf "%s" "$VALUE" | gcloud secrets versions add "$NAME" --project "$PROJECT_ID" --data-file=-
  else
    echo "Create secret: $NAME"
    printf "%s" "$VALUE" | gcloud secrets create "$NAME" --project "$PROJECT_ID" --data-file=-
  fi
}

create_or_update "aicasa-session-secret" "$SESSION_SECRET_VALUE"
create_or_update "aicasa-csrf-secret" "$CSRF_SECRET_VALUE"

echo "Done. In Cloud Run deploy, use:"
echo "  --set-secrets SESSION_SECRET=aicasa-session-secret:latest,CSRF_SECRET=aicasa-csrf-secret:latest"
