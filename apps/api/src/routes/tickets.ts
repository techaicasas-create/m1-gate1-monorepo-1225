import type { FastifyInstance } from "fastify";
import { sendOk, sendErr } from "../envelope.js";
import { ApiError } from "../errors.js";
import { withOrg } from "../db/db.js";

/**
 * 并发控制示例（If-Match/ETag）：
 * - 表：tickets（V1__init.sql 已包含 row_version）
 * - GET 返回 ETag: W/"<row_version>"
 * - PATCH 缺 If-Match -> 428 (PRECONDITION_REQUIRED)
 * - PATCH If-Match 过期 -> 412 (PRECONDITION_FAILED)
 */
export async function registerTickets(app: FastifyInstance) {
  app.get("/tickets/:ticketId", async (req, reply) => {
    if (!req.user) throw new ApiError(401, "UNAUTHORIZED", "Unauthorized");

    const { ticketId } = req.params as any;

    const row = await withOrg(req.user.orgId, async (client) => {
      const { rows } = await client.query(
        "select id, org_id, status, title, description, row_version, created_at, updated_at from tickets where id = $1",
        [ticketId]
      );
      return rows[0];
    });

    if (!row) throw new ApiError(404, "NOT_FOUND", "Ticket not found");

    const etag = `W/"${row.row_version}"`;
    reply.header("ETag", etag);
    return sendOk(reply, req.id, { ticket: row });
  });

  app.patch("/tickets/:ticketId", async (req, reply) => {
    if (!req.user) throw new ApiError(401, "UNAUTHORIZED", "Unauthorized");

    const { ticketId } = req.params as any;
    const ifMatch = req.headers["if-match"] as string | undefined;
    if (!ifMatch) throw new ApiError(428, "PRECONDITION_REQUIRED", "Missing If-Match");

    const expected = parseEtagVersion(ifMatch);
    if (expected === null) throw new ApiError(400, "BAD_REQUEST", "Invalid If-Match");

    const body = (req.body ?? {}) as any;
    const nextStatus = body.status as string | undefined;
    const nextTitle = body.title as string | undefined;
    const nextDescription = body.description as string | undefined;

    const updated = await withOrg(req.user.orgId, async (client) => {
      const { rows } = await client.query(
        `update tickets
         set status = coalesce($2, status),
             title = coalesce($3, title),
             description = coalesce($4, description),
             row_version = row_version + 1,
             updated_at = now()
         where id = $1 and row_version = $5
         returning id, org_id, status, title, description, row_version, updated_at`,
        [ticketId, nextStatus, nextTitle, nextDescription, expected]
      );
      return rows[0];
    });

    if (!updated) {
      // 可能是：找不到（RLS）或 row_version 冲突
      // 再查一次判断（演示用；真实项目可优化）
      const current = await withOrg(req.user.orgId, async (client) => {
        const { rows } = await client.query("select row_version from tickets where id=$1", [ticketId]);
        return rows[0];
      });
      if (!current) throw new ApiError(404, "NOT_FOUND", "Ticket not found");
      throw new ApiError(412, "PRECONDITION_FAILED", "ETag stale");
    }

    const etag = `W/"${updated.row_version}"`;
    reply.header("ETag", etag);
    return sendOk(reply, req.id, { ticket: updated });
  });
}

function parseEtagVersion(v: string): number | null {
  // Accept: W/"123" or "123"
  const m = v.match(/(\d+)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}
