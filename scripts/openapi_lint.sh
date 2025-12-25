#!/usr/bin/env bash
set -euo pipefail

SPEC_PATH="${1:-./contracts/openapi/openapi_v1.0.6_enveloped.yaml}"

echo "Linting OpenAPI: $SPEC_PATH"
# Gate1：使用本仓库锁定的 spectral-cli 版本（避免 npx 临时拉取导致不稳定）
# 仅当存在 ERROR 级别问题时才让命令失败（WARN 不阻断 Gate1）
pnpm exec spectral lint "$SPEC_PATH" \
  -f stylish \
  --ruleset .spectral.yaml \
  --fail-severity error

echo "OK"
