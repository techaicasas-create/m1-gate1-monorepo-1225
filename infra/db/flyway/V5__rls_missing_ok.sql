DO $$
DECLARE
  t text;
  tables text[] := ARRAY[
    'users',
    'parties',
    'properties',
    'leases',
    'tickets',
    'invoices',
    'documents',
    'notifications',
    'audit_log',
    'idempotency',
    'file_uploads',
    'file_scan_jobs'
  ];
BEGIN
  FOREACH t IN ARRAY tables LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS %I_org_isolation ON public.%I;', t, t);
      EXECUTE format($sql$
        CREATE POLICY %I_org_isolation ON public.%I
          USING (org_id = current_setting('app.org_id', true)::uuid)
          WITH CHECK (org_id = current_setting('app.org_id', true)::uuid);
      $sql$, t, t);
    END IF;
  END LOOP;
END $$;
