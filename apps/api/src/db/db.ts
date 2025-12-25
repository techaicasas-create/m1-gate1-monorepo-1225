import pg from "pg";
import { config } from "../config.js";

export const pool = config.databaseUrl
  ? new pg.Pool({ connectionString: config.databaseUrl })
  : null;

export type DbSessionContext = {
  orgId: string;
  userId?: string;
  role?: string;
  requestId?: string;
};

/**
 * 在一个事务内注入 app.org_id，便于 RLS policy 生效。
 */
export async function withOrg<T>(orgId: string, fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  return withCtx({ orgId }, fn);
}

/**
 * 在一个事务内注入 RLS/审计上下文。
 *
 * 约定（对齐 infra/db/flyway/V1__init.sql 的注释）：
 *   SELECT set_config('app.org_id', :org_id, true);
 *   SELECT set_config('app.user_id', :user_id, true);
 *   SELECT set_config('app.role', :role, true);
 *   SELECT set_config('app.request_id', :request_id, true);
 */
export async function withCtx<T>(ctx: DbSessionContext, fn: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  if (!pool) throw new Error("DATABASE_URL/DB_URL not configured");
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    await client.query("select set_config('app.org_id', $1, true)", [ctx.orgId]);
    if (ctx.userId) await client.query("select set_config('app.user_id', $1, true)", [ctx.userId]);
    if (ctx.role) await client.query("select set_config('app.role', $1, true)", [ctx.role]);
    if (ctx.requestId) await client.query("select set_config('app.request_id', $1, true)", [ctx.requestId]);

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
