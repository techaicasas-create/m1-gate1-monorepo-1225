#!/usr/bin/env bash
set -euo pipefail

# 用途：用 Docker 快速跑一次 Flyway（示例），并把日志保存为证据。
# 你需要准备：
# - DATABASE_URL（形如 jdbc:postgresql://host:5432/dbname）
# - DB_USER / DB_PASSWORD
#
# 示例：
#   export DATABASE_URL="jdbc:postgresql://127.0.0.1:5432/hourglass"
#   export DB_USER="postgres"
#   export DB_PASSWORD="postgres"
#   ./flyway_run.sh

: "${DATABASE_URL:?missing DATABASE_URL}"
: "${DB_USER:?missing DB_USER}"
: "${DB_PASSWORD:?missing DB_PASSWORD}"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SQL_DIR="$ROOT_DIR/08_DB_MIGRATIONS/flyway"

LOG_FILE="./flyway_migrate_$(date +%Y%m%d_%H%M%S).log"

docker run --rm \
  -e FLYWAY_URL="$DATABASE_URL" \
  -e FLYWAY_USER="$DB_USER" \
  -e FLYWAY_PASSWORD="$DB_PASSWORD" \
  -v "$SQL_DIR:/flyway/sql" \
  flyway/flyway:10 \
  -locations=filesystem:/flyway/sql \
  migrate | tee "$LOG_FILE"

echo "Saved log to: $LOG_FILE"
