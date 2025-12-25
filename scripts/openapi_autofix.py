#!/usr/bin/env python3
"""Autofix OpenAPI metadata (operationId/description) and keep yaml/json in sync.

Gate2 / M2 目标：逐步恢复 OpenAPI lint 严格度。
- operationId: required
- description: required

本脚本只补齐 *metadata*，不改变接口语义。

Usage:
  python3 scripts/openapi_autofix.py
"""

from __future__ import annotations

import json
import re
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parents[1]
SPEC_YAML = ROOT / "contracts" / "openapi" / "openapi_v1.0.6_enveloped.yaml"
SPEC_JSON = ROOT / "contracts" / "openapi" / "openapi_v1.0.6_enveloped.json"

# Docs/key_docs 下也有一份（用于交付包/参考）。保持同步。
DOCS_YAML = ROOT / "docs" / "key_docs" / "OpenAPI_v1.0.6_enveloped.yaml"
DOCS_JSON = ROOT / "docs" / "key_docs" / "OpenAPI_v1.0.6_enveloped.json"

HTTP_METHODS = ["get", "post", "put", "patch", "delete", "options", "head"]


def pascal(s: str) -> str:
    parts = re.split(r"[^A-Za-z0-9]+", s)
    return "".join(p[:1].upper() + p[1:] for p in parts if p)


def op_id(method: str, path: str) -> str:
    # e.g. POST /documents/{docId}/download -> postDocumentsByDocIdDownload
    segs = [seg for seg in path.strip("/").split("/") if seg]
    out = [method.lower()]
    for seg in segs:
        if seg.startswith("{") and seg.endswith("}"):
            name = seg[1:-1]
            out.append("By" + pascal(name))
        else:
            out.append(pascal(seg))
    return "".join(out)


def main() -> int:
    if not SPEC_YAML.exists():
        raise SystemExit(f"Spec not found: {SPEC_YAML}")

    data = yaml.safe_load(SPEC_YAML.read_text(encoding="utf-8"))
    paths = data.get("paths") or {}

    changed = 0

    for p, ops in paths.items():
        if not isinstance(ops, dict):
            continue
        for m in HTTP_METHODS:
            if m not in ops:
                continue
            op = ops.get(m)
            if not isinstance(op, dict):
                continue
            if not op.get("operationId"):
                op["operationId"] = op_id(m, p)
                changed += 1
            # operation-description: require description; if missing, fall back to summary
            if not op.get("description"):
                summary = op.get("summary")
                op["description"] = summary or "(autofix)"
                changed += 1

    # Write YAML (keep insertion order; do not sort keys)
    SPEC_YAML.write_text(
        yaml.safe_dump(
            data,
            allow_unicode=True,
            sort_keys=False,
            default_flow_style=False,
            width=120,
        ),
        encoding="utf-8",
    )

    # Write JSON
    SPEC_JSON.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    # Sync to docs/key_docs if present
    if DOCS_YAML.exists():
        DOCS_YAML.write_text(SPEC_YAML.read_text(encoding="utf-8"), encoding="utf-8")
    if DOCS_JSON.exists():
        DOCS_JSON.write_text(SPEC_JSON.read_text(encoding="utf-8"), encoding="utf-8")

    print(f"openapi_autofix: updated metadata fields: {changed}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
