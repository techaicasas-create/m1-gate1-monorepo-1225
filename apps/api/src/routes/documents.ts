import type { FastifyInstance } from "fastify";

import { config } from "../config.js";
import { requireCsrf } from "../auth/csrf.js";
import { ApiError } from "../errors.js";
import { sendOk } from "../envelope.js";
import { withCtx } from "../db/db.js";
import { presignDownloadUrl } from "../files/storage.js";
import { writeAudit } from "../audit.js";

function getRequestBase(req: any): string {
  const proto = (req.headers["x-forwarded-proto"] as string | undefined) || "http";
  const host =
    (req.headers["x-forwarded-host"] as string | undefined) ||
    (req.headers["host"] as string | undefined) ||
    "localhost";
  return `${proto}://${host}`;
}

function safeFileName(name: string): string {
  return String(name || "")
    .replace(/[\r\n\t]/g, " ")
    .replace(/[\\/]/g, "_")
    .slice(0, 200);
}

function parseEtagVersion(v: string): number | null {
  const m = v.match(/(\d+)/);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) ? n : null;
}

function mapDocument(row: any, downloadUrl: string | null) {
  return {
    id: row.id,
    name: row.name,
    docType: row.doc_type,
    expiresAt: row.expires_at,
    visibility: row.visibility,
    ownerId: row.owner_id,
    tenantId: row.tenant_id,
    propertyId: row.property_id,
    leaseId: row.lease_id,
    invoiceId: row.invoice_id,
    ticketId: row.ticket_id,
    entityType: row.entity_type,
    entityId: row.entity_id,
    mime: row.mime,
    size: row.size,
    sha256: row.sha256,
    uploader: row.uploader,
    createdAt: row.created_at,
    storageProvider: row.storage_provider,
    bucket: row.bucket,
    objectKey: row.object_key,
    downloadUrl,
    rowVersion: row.row_version,
    scanStatus: row.scan_status,
  };
}

export async function registerDocuments(app: FastifyInstance) {
  // List
  app.get("/documents", async (req, reply) => {
    if (!req.user) throw new ApiError(401, "UNAUTHORIZED", "Unauthorized");

    const q = (req.query || {}) as any;
    const limit = Math.min(Math.max(Number(q.limit || 50), 1), 200);

    const filters: string[] = [];
    const params: any[] = [];
    let i = 1;

    const add = (sql: string, val: any) => {
      filters.push(sql.replace("$", `$${i}`));
      params.push(val);
      i += 1;
    };

    if (q.ownerId) add("owner_id = $", q.ownerId);
    if (q.tenantId) add("tenant_id = $", q.tenantId);
    if (q.leaseId) add("lease_id = $", q.leaseId);
    if (q.invoiceId) add("invoice_id = $", q.invoiceId);
    if (q.ticketId) add("ticket_id = $", q.ticketId);
    if (q.entityType) add("entity_type = $", q.entityType);
    if (q.entityId) add("entity_id = $", q.entityId);

    const where = filters.length ? `where ${filters.join(" and ")}` : "";

    const ctx = {
      orgId: req.user.orgId,
      userId: req.user.userId,
      role: req.user.roles?.[0],
      requestId: req.id,
    };

    const rows = await withCtx(ctx, async (client) => {
      const { rows } = await client.query(
        `select * from documents ${where} order by created_at desc limit ${limit}`,
        params
      );
      return rows;
    });

    // list does not auto attach downloadUrl (avoid signing N URLs)
    const data = rows.map((r: any) => mapDocument(r, null));
    return sendOk(reply, req.id, data);
  });

  // Get
  app.get("/documents/:docId", async (req, reply) => {
    if (!req.user) throw new ApiError(401, "UNAUTHORIZED", "Unauthorized");
    const { docId } = req.params as any;

    const ctx = {
      orgId: req.user.orgId,
      userId: req.user.userId,
      role: req.user.roles?.[0],
      requestId: req.id,
    };

    const doc = await withCtx(ctx, async (client) => {
      const { rows } = await client.query(`select * from documents where id=$1`, [docId]);
      return rows[0];
    });

    if (!doc) throw new ApiError(404, "NOT_FOUND", "Document not found");

    const etag = `W/"${doc.row_version}"`;
    reply.header("ETag", etag);

    let downloadUrl: string | null = null;
    if (doc.scan_status === "READY") {
      if (config.storageProvider === "gcs") {
        const signed = await presignDownloadUrl({
          bucket: doc.bucket,
          objectKey: doc.object_key,
          responseContentDisposition: `attachment; filename="${safeFileName(doc.name)}"`,
        });
        downloadUrl = signed.downloadUrl;
      } else {
        // local provider: protected download endpoint
        const base = getRequestBase(req);
        downloadUrl = `${base}/v1/files/_local-download/${doc.id}`;
      }
    }

    return sendOk(reply, req.id, mapDocument(doc, downloadUrl));
  });

  // Patch
  app.patch("/documents/:docId", async (req, reply) => {
    if (!req.user) throw new ApiError(401, "UNAUTHORIZED", "Unauthorized");

    const csrfHeader = req.headers["x-csrf-token"] as string | undefined;
    const csrfCookie = (req.cookies as any)[config.csrfCookieName] as string | undefined;
    requireCsrf(csrfHeader, csrfCookie);

    const { docId } = req.params as any;
    const ifMatch = req.headers["if-match"] as string | undefined;
    if (!ifMatch) throw new ApiError(428, "PRECONDITION_REQUIRED", "Missing If-Match");

    const expected = parseEtagVersion(ifMatch);
    if (expected === null) throw new ApiError(400, "BAD_REQUEST", "Invalid If-Match");

    const body = (req.body || {}) as any;
    const nextDocType = body.docType ? String(body.docType) : null;
    const nextVisibility = body.visibility ? String(body.visibility) : null;
    const nextExpiresAt = body.expiresAt ? String(body.expiresAt) : null;

    const ctx = {
      orgId: req.user.orgId,
      userId: req.user.userId,
      role: req.user.roles?.[0],
      requestId: req.id,
    };

    const updated = await withCtx(ctx, async (client) => {
      const { rows } = await client.query(
        `update documents
         set doc_type = coalesce($2, doc_type),
             visibility = coalesce($3, visibility),
             expires_at = coalesce($4::timestamptz, expires_at),
             row_version = row_version + 1,
             updated_at = now()
         where id=$1 and row_version=$5
         returning *`,
        [docId, nextDocType, nextVisibility, nextExpiresAt, expected]
      );
      return rows[0];
    });

    if (!updated) {
      // differentiate not found vs etag stale
      const current = await withCtx(ctx, async (client) => {
        const { rows } = await client.query(`select row_version from documents where id=$1`, [docId]);
        return rows[0];
      });
      if (!current) throw new ApiError(404, "NOT_FOUND", "Document not found");
      throw new ApiError(412, "PRECONDITION_FAILED", "ETag stale");
    }

    await withCtx(ctx, async (client) => {
      await writeAudit(client, {
        orgId: req.user!.orgId,
        requestId: req.id,
        actorUserId: req.user!.userId,
        action: "DOCUMENT_PATCH",
        entityType: "document",
        entityId: docId,
        summary: JSON.stringify({ docType: nextDocType, visibility: nextVisibility, expiresAt: nextExpiresAt }),
        ip: req.ip,
        userAgent: String(req.headers["user-agent"] || ""),
      });
    });

    const etag = `W/"${updated.row_version}"`;
    reply.header("ETag", etag);
    return sendOk(reply, req.id, mapDocument(updated, null));
  });

  // Download (302 redirect to signed URL OR 200 with envelope Document)
  app.get("/documents/:docId/download", async (req, reply) => {
    if (!req.user) throw new ApiError(401, "UNAUTHORIZED", "Unauthorized");
    const { docId } = req.params as any;

    const ctx = {
      orgId: req.user.orgId,
      userId: req.user.userId,
      role: req.user.roles?.[0],
      requestId: req.id,
    };

    const doc = await withCtx(ctx, async (client) => {
      const { rows } = await client.query(`select * from documents where id=$1`, [docId]);
      return rows[0];
    });

    if (!doc) throw new ApiError(404, "NOT_FOUND", "Document not found");
    if (doc.scan_status !== "READY") throw new ApiError(409, "CONFLICT", "Document not ready");

    let downloadUrl: string;
    if (config.storageProvider === "gcs") {
      const signed = await presignDownloadUrl({
        bucket: doc.bucket,
        objectKey: doc.object_key,
        responseContentDisposition: `attachment; filename="${safeFileName(doc.name)}"`,
      });
      downloadUrl = signed.downloadUrl;
    } else {
      const base = getRequestBase(req);
      downloadUrl = `${base}/v1/files/_local-download/${doc.id}`;
    }

    await withCtx(ctx, async (client) => {
      await writeAudit(client, {
        orgId: req.user!.orgId,
        requestId: req.id,
        actorUserId: req.user!.userId,
        action: "DOCUMENT_DOWNLOAD",
        entityType: "document",
        entityId: docId,
        ip: req.ip,
        userAgent: String(req.headers["user-agent"] || ""),
      });
    });

    const accept = String(req.headers["accept"] || "");
    if (accept.includes("application/json")) {
      return sendOk(reply, req.id, mapDocument(doc, downloadUrl));
    }

    reply.redirect(302, downloadUrl);
  });
}
