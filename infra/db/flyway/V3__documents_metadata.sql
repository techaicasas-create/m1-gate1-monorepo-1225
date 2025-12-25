-- V3__documents_metadata.sql
-- M2: 补齐文件中心/审计需要的最小字段（对应 OpenAPI Document）

ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS expires_at timestamptz,
  ADD COLUMN IF NOT EXISTS sha256 text,
  ADD COLUMN IF NOT EXISTS uploader text,
  ADD COLUMN IF NOT EXISTS storage_provider text;

-- 可选：将现有行的 storage_provider 设为 NULL（由应用层回填）
