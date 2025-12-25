import pg from "pg";
import { config } from "../config.js";

export const pool = config.databaseUrl
  ? new pg.Pool({ connectionString: config.databaseUrl })
  : null;

/**
 * 在一个事务内注入 app.org_id，便于 RLS policy 生效。
 */
export async function withOrg<T>(orgId: string, fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  if (!pool) throw new Error("DATABASE_URL not configured");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("select set_config('app.org_id', $1, true)", [orgId]);
    const out = await fn(client);
    await client.query("COMMIT");
    return out;
  } catch (e) {
    await client.query("ROLLBACK");
    throw e;
  } finally {
    client.release();
  }
}
