-- V4__rls_service_role.sql
-- M2: 为后台任务（扫描/通知等）提供最小的 SERVICE 角色 RLS bypass
-- 约定：后台任务在 DB session 里设置 app.role = 'SERVICE'

-- documents
DROP POLICY IF EXISTS documents_service_role ON documents;
CREATE POLICY documents_service_role ON documents
  USING (current_setting('app.role', true) = 'SERVICE')
  WITH CHECK (current_setting('app.role', true) = 'SERVICE');

-- file_scan_jobs
DROP POLICY IF EXISTS file_scan_jobs_service_role ON file_scan_jobs;
CREATE POLICY file_scan_jobs_service_role ON file_scan_jobs
  USING (current_setting('app.role', true) = 'SERVICE')
  WITH CHECK (current_setting('app.role', true) = 'SERVICE');

-- file_uploads (optional)
DROP POLICY IF EXISTS file_uploads_service_role ON file_uploads;
CREATE POLICY file_uploads_service_role ON file_uploads
  USING (current_setting('app.role', true) = 'SERVICE')
  WITH CHECK (current_setting('app.role', true) = 'SERVICE');

-- audit_log
DROP POLICY IF EXISTS audit_log_service_role ON audit_log;
CREATE POLICY audit_log_service_role ON audit_log
  USING (current_setting('app.role', true) = 'SERVICE')
  WITH CHECK (current_setting('app.role', true) = 'SERVICE');
