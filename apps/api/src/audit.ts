import type pg from "pg";

// M2: minimal audit log writer (aligns with infra/db/flyway/V1__init.sql audit_log)
export type AuditEvent = {
  orgId: string;
  requestId: string;
  actorUserId?: string;
  action: string;
  entityType: string;
  entityId?: string;
  summary?: string;
  ip?: string;
  userAgent?: string;
};

function clamp(s: string, max: number): string {
  if (s.length <= max) return s;
  return s.slice(0, max - 3) + "...";
}

export async function writeAudit(client: pg.PoolClient, e: AuditEvent): Promise<void> {
  const summary = e.summary ? clamp(e.summary, 1000) : null;
  await client.query(
    `insert into audit_log(org_id, request_id, actor_user_id, action, entity_type, entity_id, summary, ip, user_agent)
     values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      e.orgId,
      e.requestId,
      e.actorUserId || null,
      e.action,
      e.entityType,
      e.entityId || null,
      summary,
      e.ip || null,
      e.userAgent || null,
    ]
  );
}
