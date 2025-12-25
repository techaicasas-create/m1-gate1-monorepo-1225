#!/usr/bin/env bash
set -euo pipefail

SPEC_PATH="${1:-./contracts/openapi/openapi_v1.0.6_enveloped.yaml}"
OUT_DIR="${2:-./packages/api-client/generated/ts-fetch-client}"

echo "Generating TS client (typescript-fetch) from: $SPEC_PATH"
echo "Output: $OUT_DIR"

docker run --rm -v "$(pwd):/local" openapitools/openapi-generator-cli:v7.6.0   generate -i "/local/${SPEC_PATH#./}"   -g typescript-fetch   -o "/local/${OUT_DIR#./}"

echo "Generated: $OUT_DIR"
