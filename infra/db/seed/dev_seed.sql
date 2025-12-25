-- DEV seed（最小联调数据）
-- 注意：STAGING 不允许从 PROD 全量复制，按最小数据自己造。
-- 这里仅用于本地 contract tests 示例。

insert into orgs(id, slug, name) values
  ('11111111-1111-1111-1111-111111111111', 'demo-org', 'Demo Org')
on conflict (id) do nothing;

insert into users(id, org_id, email, display_name) values
  ('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'demo@example.com', 'Demo Admin')
on conflict (id) do nothing;

insert into tickets(id, org_id, status, title, description, created_by, updated_by) values
  ('33333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'OPEN', 'Seed Ticket', 'seed', '22222222-2222-2222-2222-222222222222', '22222222-2222-2222-2222-222222222222')
on conflict (id) do nothing;
