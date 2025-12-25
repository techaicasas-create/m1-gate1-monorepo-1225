#!/usr/bin/env bash
set -euo pipefail

# Contract tests runner
# - starts postgres via docker compose
# - runs flyway migrations
# - seeds minimal data
# - starts API locally
# - runs packages/contract-tests

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

export API_PORT="${API_PORT:-8080}"
export DATABASE_URL="${DATABASE_URL:-postgres://aicasa:aicasa@localhost:5432/aicasa_dev}"
export API_BASE="${API_BASE:-http://localhost:${API_PORT}/v1}"

# API runtime env (for local/CI)
export APP_ENV="${APP_ENV:-dev}"
export PORT="$API_PORT"
export COOKIE_SECURE="${COOKIE_SECURE:-false}"
export COOKIE_SAMESITE="${COOKIE_SAMESITE:-lax}"
export SESSION_SECRET="${SESSION_SECRET:-dev_session_secret}"
export CSRF_SECRET="${CSRF_SECRET:-dev_csrf_secret}"
export FRONTEND_ORIGINS="${FRONTEND_ORIGINS:-http://localhost:3000}"
export STORAGE_PROVIDER="${STORAGE_PROVIDER:-local}"
export FILE_SCAN_ENABLED="${FILE_SCAN_ENABLED:-false}"
export SIGNED_URL_TTL_SECONDS="${SIGNED_URL_TTL_SECONDS:-60}"
export FILE_MAX_SIZE_MB="${FILE_MAX_SIZE_MB:-25}"

cleanup() {
  set +e
  if [[ -n "${API_PID:-}" ]] && kill -0 "$API_PID" 2>/dev/null; then
    kill "$API_PID" 2>/dev/null || true
    # give it a moment to stop
    sleep 1
  fi
  docker compose down -v >/dev/null 2>&1 || true
}
trap cleanup EXIT


echo "[contract-test] Starting postgres via docker compose..."
docker compose up -d db

# Wait for postgres
for i in {1..30}; do
  if docker compose exec -T db pg_isready -U aicasa >/dev/null 2>&1; then
    break
  fi
  sleep 1
  if [[ $i -eq 30 ]]; then
    echo "Postgres did not become ready" >&2
    exit 1
  fi
done


echo "[contract-test] Running flyway migrations..."
docker compose --profile tools run --rm flyway


echo "[contract-test] Seeding minimal data..."
docker compose exec -T db psql -U aicasa -d aicasa_dev -f /seed/dev_seed.sql >/dev/null


echo "[contract-test] Starting API (dev:once)..."
# Start API in background
pnpm -C apps/api dev:once &
API_PID=$!

# Wait for API health
for i in {1..30}; do
  if curl -sS "$API_BASE/health" >/dev/null 2>&1; then
    break
  fi
  sleep 1
  if [[ $i -eq 30 ]]; then
    echo "API did not become ready" >&2
    exit 1
  fi
done


echo "[contract-test] Running contract tests (API_BASE=$API_BASE)..."
API_BASE="$API_BASE" DATABASE_URL="$DATABASE_URL" pnpm -C packages/contract-tests test

echo "[contract-test] OK"
