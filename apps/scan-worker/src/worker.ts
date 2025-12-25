import process from "node:process";

import pg from "pg";
import pino from "pino";

const log = pino({ level: process.env.LOG_LEVEL || "info" });

const DATABASE_URL = process.env.DATABASE_URL || process.env.DB_URL;
if (!DATABASE_URL) {
  throw new Error("Missing DATABASE_URL/DB_URL");
}

const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 2000);
const BATCH_SIZE = Math.min(Math.max(Number(process.env.BATCH_SIZE || 5), 1), 50);
const RUN_ONCE = (process.env.RUN_ONCE || "").toLowerCase() === "true";

const pool = new pg.Pool({ connectionString: DATABASE_URL });

async function setSessionVars(client: pg.PoolClient) {
  // For background tasks, we run as SERVICE role to bypass org isolation policies.
  await client.query("select set_config('app.role', 'SERVICE', true)");
}

async function runOnce(): Promise<number> {
  const client = await pool.connect();
  try {
    await client.query("begin");
    await setSessionVars(client);

    // Pick pending jobs (across orgs) with SKIP LOCKED to allow multiple workers.
    const { rows: jobs } = await client.query(
      `select id, org_id, doc_id, attempts
       from file_scan_jobs
       where status = 'PENDING'
       order by created_at asc
       limit $1
       for update skip locked`,
      [BATCH_SIZE]
    );

    if (jobs.length === 0) {
      await client.query("commit");
      return 0;
    }

    for (const job of jobs) {
      const jobId = job.id;
      const orgId = job.org_id;
      const docId = job.doc_id;

      // Mark RUNNING
      await client.query(
        `update file_scan_jobs
         set status='RUNNING', attempts = attempts + 1
         where id=$1`,
        [jobId]
      );

      // --- Skeleton scan ---
      // Real implementation should:
      // - download object (or stream) from private bucket
      // - run AV scan (e.g., ClamAV) and content checks
      // - mark READY or BLOCKED
      // For Gate2/M2 we provide a deterministic skeleton:
      // - mark document as READY
      await client.query(
        `update documents
         set scan_status='READY', row_version = row_version + 1, updated_at=now()
         where id=$1`,
        [docId]
      );

      await client.query(
        `update file_scan_jobs
         set status='DONE', updated_at=now(), last_error=null
         where id=$1`,
        [jobId]
      );

      // Optional: audit
      await client.query(
        `insert into audit_log(org_id, request_id, actor_user_id, action, entity_type, entity_id, summary)
         values ($1, $2, null, 'DOCUMENT_SCAN_DONE', 'document', $3, $4)`,
        [orgId, `worker-${Date.now()}`, docId, JSON.stringify({ jobId })]
      );

      log.info({ jobId, orgId, docId }, "scan job done");
    }

    await client.query("commit");
    return jobs.length;
  } catch (err) {
    await client.query("rollback");
    log.error({ err }, "scan worker failed");
    return 0;
  } finally {
    client.release();
  }
}

async function main() {
  log.info({ POLL_INTERVAL_MS, BATCH_SIZE, RUN_ONCE }, "scan worker started");

  if (RUN_ONCE) {
    await runOnce();
    await pool.end();
    return;
  }
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const n = await runOnce();
    if (n === 0) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    }
  }
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
