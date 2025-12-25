#!/usr/bin/env bash
set -euo pipefail

# 用途：演示 428/412 乐观锁冲突（需要你的后端已跑起来 + 有一个可 PATCH 的资源）
# 注意：不同资源的 PATCH body 不同，本脚本给出“流程模板”。

: "${API_BASE:?missing API_BASE (e.g. https://staging-api.example.com/v1)}"
: "${COOKIE:?missing COOKIE (session cookie header value)}"

# 请选择一个支持 If-Match 的资源（例：ticket、party、lease、invoice 等）
RESOURCE_PATH="${RESOURCE_PATH:-/tickets/REPLACE_ME}"

echo "1) GET resource to obtain ETag"
ETAG=$(curl -sS -D - \
  -H "Cookie: $COOKIE" \
  "$API_BASE$RESOURCE_PATH" \
  -o /dev/null | awk '/^ETag:/{print $2}' | tr -d '\r')

echo "ETag: $ETAG"

if [[ -z "$ETAG" ]]; then
  echo "ETag not found. Make sure the endpoint returns ETag header."
  exit 1
fi

echo
echo "2) PATCH without If-Match (expected 428 Precondition Required if enforced)"
curl -sS -D - \
  -X PATCH \
  -H "Cookie: $COOKIE" \
  -H "Content-Type: application/json" \
  -d '{"note":"patch-without-if-match"}' \
  "$API_BASE$RESOURCE_PATH" \
  -o /dev/null | head -n 20

echo
echo "3) PATCH with stale If-Match (expected 412 Precondition Failed)"
# 先用正确 ETag PATCH 一次制造版本变化（此处仅示例，具体 body 按你的资源调整）
curl -sS -D - \
  -X PATCH \
  -H "Cookie: $COOKIE" \
  -H "If-Match: $ETAG" \
  -H "Content-Type: application/json" \
  -d '{"note":"first-patch-to-bump-rowversion"}' \
  "$API_BASE$RESOURCE_PATH" \
  -o /dev/null | head -n 20

echo
echo "Now patch again using OLD ETag (stale) => should be 412"
curl -sS -D - \
  -X PATCH \
  -H "Cookie: $COOKIE" \
  -H "If-Match: $ETAG" \
  -H "Content-Type: application/json" \
  -d '{"note":"second-patch-using-stale-etag"}' \
  "$API_BASE$RESOURCE_PATH" \
  -o /dev/null | head -n 20

echo
echo "Done."
