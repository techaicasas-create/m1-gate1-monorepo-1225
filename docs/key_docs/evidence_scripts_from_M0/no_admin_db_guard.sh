#!/usr/bin/env bash
set -euo pipefail

# 用途：对代码仓库做“禁止 /api/admin/db 旁路”存在性检查。
# 在你的后端仓库根目录执行：
#   ./no_admin_db_guard.sh

echo "Searching for forbidden patterns..."
PATTERNS=(
  "/api/admin/db"
  "api/admin/db"
  "admin/db"
  "dbProxy"
  "adminDb"
)

for p in "${PATTERNS[@]}"; do
  echo
  echo "==> grep -R "$p" ."
  if grep -R --line-number --ignore-case --exclude-dir=node_modules --exclude-dir=.git "$p" .; then
    echo "❌ Found forbidden pattern: $p"
    exit 1
  else
    echo "✅ No matches for: $p"
  fi
done

echo
echo "All good."
