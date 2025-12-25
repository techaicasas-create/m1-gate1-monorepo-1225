#!/usr/bin/env bash
set -euo pipefail

: "${URL:?missing URL (e.g. https://crm.staging.example.com)}"

echo "Checking headers for: $URL"
curl -sS -D - -o /dev/null "$URL" | sed -n '1,40p'

echo
echo "Tips:"
echo "- Ensure Strict-Transport-Security (HSTS) exists"
echo "- Ensure Content-Security-Policy exists"
echo "- Ensure X-Content-Type-Options: nosniff"
echo "- Ensure Referrer-Policy set"
