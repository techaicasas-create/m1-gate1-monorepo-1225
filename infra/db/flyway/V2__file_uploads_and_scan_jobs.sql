-- V2__file_uploads_and_scan_jobs.sql
-- M2: 文件中心直传/扫描骨架所需的最小元数据表

CREATE TABLE IF NOT EXISTS file_uploads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id),
  doc_id uuid NOT NULL REFERENCES documents(id),
  bucket text,
  object_key text,
  mime text,
  size bigint,
  token text NOT NULL,
  status text NOT NULL DEFAULT 'PRESIGNED', -- PRESIGNED / UPLOADED / COMPLETED / EXPIRED
  expires_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  uploaded_at timestamptz,
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_file_uploads_org ON file_uploads(org_id);
CREATE INDEX IF NOT EXISTS idx_file_uploads_doc ON file_uploads(doc_id);

ALTER TABLE file_uploads ENABLE ROW LEVEL SECURITY;
CREATE POLICY file_uploads_org_isolation ON file_uploads
  USING (org_id = current_setting('app.org_id')::uuid)
  WITH CHECK (org_id = current_setting('app.org_id')::uuid);


CREATE TABLE IF NOT EXISTS file_scan_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id),
  doc_id uuid NOT NULL REFERENCES documents(id),
  status text NOT NULL DEFAULT 'PENDING', -- PENDING / RUNNING / DONE / FAILED
  attempts int NOT NULL DEFAULT 0,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (doc_id)
);

CREATE INDEX IF NOT EXISTS idx_file_scan_jobs_org ON file_scan_jobs(org_id);
CREATE INDEX IF NOT EXISTS idx_file_scan_jobs_status ON file_scan_jobs(status);

ALTER TABLE file_scan_jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY file_scan_jobs_org_isolation ON file_scan_jobs
  USING (org_id = current_setting('app.org_id')::uuid)
  WITH CHECK (org_id = current_setting('app.org_id')::uuid);

-- updated_at 自动刷新（复用 V1 set_updated_at）
DROP TRIGGER IF EXISTS trg_file_scan_jobs_set_updated_at ON file_scan_jobs;
CREATE TRIGGER trg_file_scan_jobs_set_updated_at
  BEFORE UPDATE ON file_scan_jobs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
