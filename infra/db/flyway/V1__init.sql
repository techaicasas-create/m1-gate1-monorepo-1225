-- V1__init.sql
-- M0-ULTIMATE baseline schema (generated from PG_SQL落地清单.xlsx)
-- 注意：这是 Gate0 用于“落库口径 + RLS 模板”的最小可执行版本，业务字段可在后续版本迭代补齐。
-- 并发控制：核心可变更表包含 row_version；写操作需使用 WHERE id=? AND row_version=? 并 row_version=row_version+1。
-- 约定：应用侧在每个请求开始时设置：
--   SELECT set_config('app.org_id', :org_id, true);
--   SELECT set_config('app.user_id', :user_id, true);
--   SELECT set_config('app.role', :role, true);

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =============
-- Core tables
-- =============

CREATE TABLE IF NOT EXISTS orgs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id),
  email text NOT NULL,
  display_name text,
  last_login_at timestamptz,
  row_version bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (email, org_id)
);

CREATE TABLE IF NOT EXISTS roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id),
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (name, org_id)
);

CREATE TABLE IF NOT EXISTS user_roles (
  org_id uuid NOT NULL REFERENCES orgs(id),
  user_id uuid NOT NULL REFERENCES users(id),
  role_id uuid NOT NULL REFERENCES roles(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role_id)
);

-- 联系人/主体（房东/租客/供应商）
CREATE TABLE IF NOT EXISTS parties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id),
  type text NOT NULL, -- OWNER / TENANT / VENDOR / ...
  external_ref text,
  display_name text,
  email text,
  phone text,
  row_version bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (external_ref, org_id)
);

CREATE TABLE IF NOT EXISTS properties (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id),
  external_id text,
  title text,
  address_line1 text,
  city text,
  postal_code text,
  country text DEFAULT 'ES',
  published boolean NOT NULL DEFAULT false,
  row_version bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (external_id, org_id)
);

-- 房源与主体绑定（例如：owner<->property）
CREATE TABLE IF NOT EXISTS property_parties (
  org_id uuid NOT NULL REFERENCES orgs(id),
  property_id uuid NOT NULL REFERENCES properties(id),
  party_id uuid NOT NULL REFERENCES parties(id),
  role text NOT NULL, -- OWNER / MANAGER / ...
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (property_id, party_id, role)
);

-- 申请流程
CREATE TABLE IF NOT EXISTS applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id),
  tenant_party_id uuid REFERENCES parties(id),
  status text NOT NULL DEFAULT 'DRAFT',
  row_version bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 租约
CREATE TABLE IF NOT EXISTS leases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id),
  external_id text,
  property_id uuid REFERENCES properties(id),
  tenant_party_id uuid REFERENCES parties(id),
  status text NOT NULL DEFAULT 'DRAFT',
  row_version bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (external_id, org_id)
);

-- 账单
CREATE TABLE IF NOT EXISTS invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id),
  external_id text,
  lease_id uuid REFERENCES leases(id),
  status text NOT NULL DEFAULT 'DRAFT',
  amount numeric(18,2),
  currency text DEFAULT 'EUR',
  due_date date,
  locked boolean NOT NULL DEFAULT false,
  row_version bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (external_id, org_id)
);

-- 收款凭证
CREATE TABLE IF NOT EXISTS payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id),
  external_id text,
  invoice_id uuid REFERENCES invoices(id),
  status text NOT NULL DEFAULT 'SUBMITTED', -- SUBMITTED / VERIFIED / REJECTED / REVERSED
  amount numeric(18,2),
  proof_document_id uuid,
  row_version bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (external_id, org_id)
);

-- Document / Files
CREATE TABLE IF NOT EXISTS documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id),
  name text NOT NULL,
  doc_type text NOT NULL,
  visibility text NOT NULL,
  mime text NOT NULL,
  size bigint NOT NULL,
  bucket text,
  object_key text,
  scan_status text NOT NULL DEFAULT 'UPLOADED', -- UPLOADED / SCANNING / READY / BLOCKED / FAILED
  owner_id uuid,
  tenant_id uuid,
  property_id uuid,
  lease_id uuid,
  invoice_id uuid,
  ticket_id uuid,
  row_version bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 工单
CREATE TABLE IF NOT EXISTS tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id),
  external_id text,
  lease_id uuid REFERENCES leases(id),
  property_id uuid REFERENCES properties(id),
  created_by_party_id uuid REFERENCES parties(id),
  status text NOT NULL DEFAULT 'OPEN',
  title text,
  description text,
  row_version bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (external_id, org_id)
);

-- 审计
CREATE TABLE IF NOT EXISTS audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id),
  request_id text,
  actor_user_id uuid,
  action text NOT NULL,
  entity_type text NOT NULL,
  entity_id uuid,
  summary text,
  ip text,
  user_agent text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 公域线索（Homepage）
CREATE TABLE IF NOT EXISTS web_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id),
  kind text NOT NULL, -- TENANT_LEAD / LANDLORD_LEAD
  name text,
  email text,
  phone text,
  message text,
  row_version bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 多语言字段（预埋）
CREATE TABLE IF NOT EXISTS translations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES orgs(id),
  key text NOT NULL,
  lang text NOT NULL,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (org_id, key, lang)
);

-- =============
-- Indexes (recommended)
-- =============
CREATE INDEX IF NOT EXISTS idx_users_org ON users(org_id);
CREATE INDEX IF NOT EXISTS idx_roles_org ON roles(org_id);
CREATE INDEX IF NOT EXISTS idx_parties_org ON parties(org_id);
CREATE INDEX IF NOT EXISTS idx_properties_org ON properties(org_id);
CREATE INDEX IF NOT EXISTS idx_leases_org ON leases(org_id);
CREATE INDEX IF NOT EXISTS idx_invoices_org ON invoices(org_id);
CREATE INDEX IF NOT EXISTS idx_payments_org ON payments(org_id);
CREATE INDEX IF NOT EXISTS idx_documents_org ON documents(org_id);
CREATE INDEX IF NOT EXISTS idx_tickets_org ON tickets(org_id);
CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_log(org_id);
CREATE INDEX IF NOT EXISTS idx_web_leads_org ON web_leads(org_id);

-- =============
-- RLS templates (org_id isolation)
-- =============

-- Helper: apply org_id RLS to a table
-- Pattern:
--   ALTER TABLE <t> ENABLE ROW LEVEL SECURITY;
--   CREATE POLICY <t>_org_isolation ON <t>
--     USING (org_id = current_setting('app.org_id')::uuid)
--     WITH CHECK (org_id = current_setting('app.org_id')::uuid);


-- =============
-- Constraints / triggers（M0 修正：金额/扫描状态/updated_at）
-- =============

-- 文档扫描状态机枚举约束（避免出现 PENDING/CLEAN 等历史值）
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_scan_status_chk;
ALTER TABLE documents
  ADD CONSTRAINT documents_scan_status_chk
  CHECK (scan_status IN ('UPLOADED','SCANNING','READY','BLOCKED','FAILED'));

-- updated_at 自动刷新（满足 Gate0：updated_at trigger）
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_orgs_set_updated_at ON orgs;
CREATE TRIGGER trg_orgs_set_updated_at
  BEFORE UPDATE ON orgs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_users_set_updated_at ON users;
CREATE TRIGGER trg_users_set_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_parties_set_updated_at ON parties;
CREATE TRIGGER trg_parties_set_updated_at
  BEFORE UPDATE ON parties
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_properties_set_updated_at ON properties;
CREATE TRIGGER trg_properties_set_updated_at
  BEFORE UPDATE ON properties
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_applications_set_updated_at ON applications;
CREATE TRIGGER trg_applications_set_updated_at
  BEFORE UPDATE ON applications
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_leases_set_updated_at ON leases;
CREATE TRIGGER trg_leases_set_updated_at
  BEFORE UPDATE ON leases
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_invoices_set_updated_at ON invoices;
CREATE TRIGGER trg_invoices_set_updated_at
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_payments_set_updated_at ON payments;
CREATE TRIGGER trg_payments_set_updated_at
  BEFORE UPDATE ON payments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_documents_set_updated_at ON documents;
CREATE TRIGGER trg_documents_set_updated_at
  BEFORE UPDATE ON documents
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_tickets_set_updated_at ON tickets;
CREATE TRIGGER trg_tickets_set_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_web_leads_set_updated_at ON web_leads;
CREATE TRIGGER trg_web_leads_set_updated_at
  BEFORE UPDATE ON web_leads
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_translations_set_updated_at ON translations;
CREATE TRIGGER trg_translations_set_updated_at
  BEFORE UPDATE ON translations
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
CREATE POLICY users_org_isolation ON users
  USING (org_id = current_setting('app.org_id')::uuid)
  WITH CHECK (org_id = current_setting('app.org_id')::uuid);

ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY roles_org_isolation ON roles
  USING (org_id = current_setting('app.org_id')::uuid)
  WITH CHECK (org_id = current_setting('app.org_id')::uuid);

ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_roles_org_isolation ON user_roles
  USING (org_id = current_setting('app.org_id')::uuid)
  WITH CHECK (org_id = current_setting('app.org_id')::uuid);

ALTER TABLE parties ENABLE ROW LEVEL SECURITY;
CREATE POLICY parties_org_isolation ON parties
  USING (org_id = current_setting('app.org_id')::uuid)
  WITH CHECK (org_id = current_setting('app.org_id')::uuid);

ALTER TABLE properties ENABLE ROW LEVEL SECURITY;
CREATE POLICY properties_org_isolation ON properties
  USING (org_id = current_setting('app.org_id')::uuid)
  WITH CHECK (org_id = current_setting('app.org_id')::uuid);

ALTER TABLE property_parties ENABLE ROW LEVEL SECURITY;
CREATE POLICY property_parties_org_isolation ON property_parties
  USING (org_id = current_setting('app.org_id')::uuid)
  WITH CHECK (org_id = current_setting('app.org_id')::uuid);

ALTER TABLE applications ENABLE ROW LEVEL SECURITY;
CREATE POLICY applications_org_isolation ON applications
  USING (org_id = current_setting('app.org_id')::uuid)
  WITH CHECK (org_id = current_setting('app.org_id')::uuid);

ALTER TABLE leases ENABLE ROW LEVEL SECURITY;
CREATE POLICY leases_org_isolation ON leases
  USING (org_id = current_setting('app.org_id')::uuid)
  WITH CHECK (org_id = current_setting('app.org_id')::uuid);

ALTER TABLE invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY invoices_org_isolation ON invoices
  USING (org_id = current_setting('app.org_id')::uuid)
  WITH CHECK (org_id = current_setting('app.org_id')::uuid);

ALTER TABLE payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY payments_org_isolation ON payments
  USING (org_id = current_setting('app.org_id')::uuid)
  WITH CHECK (org_id = current_setting('app.org_id')::uuid);

ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY documents_org_isolation ON documents
  USING (org_id = current_setting('app.org_id')::uuid)
  WITH CHECK (org_id = current_setting('app.org_id')::uuid);

ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
CREATE POLICY tickets_org_isolation ON tickets
  USING (org_id = current_setting('app.org_id')::uuid)
  WITH CHECK (org_id = current_setting('app.org_id')::uuid);

ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_log_org_isolation ON audit_log
  USING (org_id = current_setting('app.org_id')::uuid)
  WITH CHECK (org_id = current_setting('app.org_id')::uuid);

ALTER TABLE web_leads ENABLE ROW LEVEL SECURITY;
CREATE POLICY web_leads_org_isolation ON web_leads
  USING (org_id = current_setting('app.org_id')::uuid)
  WITH CHECK (org_id = current_setting('app.org_id')::uuid);

ALTER TABLE translations ENABLE ROW LEVEL SECURITY;
CREATE POLICY translations_org_isolation ON translations
  USING (org_id = current_setting('app.org_id')::uuid)
  WITH CHECK (org_id = current_setting('app.org_id')::uuid);