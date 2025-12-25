-- V5__rls_missing_ok.sql
-- M2: current_setting('app.org_id') 在未设置时会抛错；
--     为了支持匿名上下文/后台 SERVICE 任务，统一改成 current_setting(..., true)。
--     语义：没设置 org_id -> 看不到任何行（而不是报错）。

-- users
DROP POLICY IF EXISTS users_org_isolation ON users;
CREATE POLICY users_org_isolation ON users
  USING (org_id = current_setting('app.org_id', true)::uuid)
  WITH CHECK (org_id = current_setting('app.org_id', true)::uuid);

-- parties
DROP POLICY IF EXISTS parties_org_isolation ON parties;
CREATE POLICY parties_org_isolation ON parties
  USING (org_id = current_setting('app.org_id', true)::uuid)
  WITH CHECK (org_id = current_setting('app.org_id', true)::uuid);

-- properties
DROP POLICY IF EXISTS properties_org_isolation ON properties;
CREATE POLICY properties_org_isolation ON properties
  USING (org_id = current_setting('app.org_id', true)::uuid)
  WITH CHECK (org_id = current_setting('app.org_id', true)::uuid);

-- leases
DROP POLICY IF EXISTS leases_org_isolation ON leases;
CREATE POLICY leases_org_isolation ON leases
  USING (org_id = current_setting('app.org_id', true)::uuid)
  WITH CHECK (org_id = current_setting('app.org_id', true)::uuid);

-- tickets
DROP POLICY IF EXISTS tickets_org_isolation ON tickets;
CREATE POLICY tickets_org_isolation ON tickets
  USING (org_id = current_setting('app.org_id', true)::uuid)
  WITH CHECK (org_id = current_setting('app.org_id', true)::uuid);

-- invoices
DROP POLICY IF EXISTS invoices_org_isolation ON invoices;
CREATE POLICY invoices_org_isolation ON invoices
  USING (org_id = current_setting('app.org_id', true)::uuid)
  WITH CHECK (org_id = current_setting('app.org_id', true)::uuid);

-- documents
DROP POLICY IF EXISTS documents_org_isolation ON documents;
CREATE POLICY documents_org_isolation ON documents
  USING (org_id = current_setting('app.org_id', true)::uuid)
  WITH CHECK (org_id = current_setting('app.org_id', true)::uuid);

-- notifications
DROP POLICY IF EXISTS notifications_org_isolation ON notifications;
CREATE POLICY notifications_org_isolation ON notifications
  USING (org_id = current_setting('app.org_id', true)::uuid)
  WITH CHECK (org_id = current_setting('app.org_id', true)::uuid);

-- audit_log
DROP POLICY IF EXISTS audit_log_org_isolation ON audit_log;
CREATE POLICY audit_log_org_isolation ON audit_log
  USING (org_id = current_setting('app.org_id', true)::uuid)
  WITH CHECK (org_id = current_setting('app.org_id', true)::uuid);

-- idempotency
DROP POLICY IF EXISTS idempotency_org_isolation ON idempotency;
CREATE POLICY idempotency_org_isolation ON idempotency
  USING (org_id = current_setting('app.org_id', true)::uuid)
  WITH CHECK (org_id = current_setting('app.org_id', true)::uuid);

-- file_uploads
DROP POLICY IF EXISTS file_uploads_org_isolation ON file_uploads;
CREATE POLICY file_uploads_org_isolation ON file_uploads
  USING (org_id = current_setting('app.org_id', true)::uuid)
  WITH CHECK (org_id = current_setting('app.org_id', true)::uuid);

-- file_scan_jobs
DROP POLICY IF EXISTS file_scan_jobs_org_isolation ON file_scan_jobs;
CREATE POLICY file_scan_jobs_org_isolation ON file_scan_jobs
  USING (org_id = current_setting('app.org_id', true)::uuid)
  WITH CHECK (org_id = current_setting('app.org_id', true)::uuid);
