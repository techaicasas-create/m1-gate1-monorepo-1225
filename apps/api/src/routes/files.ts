import type { FastifyInstance } from "fastify";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

import { v4 as uuidv4 } from "uuid";

import { config } from "../config.js";
import { requireCsrf } from "../auth/csrf.js";
import { ApiError } from "../errors.js";
import { sendOk } from "../envelope.js";
import { withCtx } from "../db/db.js";
import { presignUploadUrl, presignDownloadUrl } from "../files/storage.js";
import { writeAudit } from "../audit.js";

const LOCAL_STORAGE_ROOT = process.env.LOCAL_STORAGE_ROOT || "/tmp/aicasa_storage";

function getRequestBase(req: any): string {
  const proto = (req.headers["x-forwarded-proto"] as string | undefined) || "http";
  const host = (req.headers["x-forwarded-host"] as string | undefined) || (req.headers["host"] as string | undefined) || "localhost";
  return `${proto}://${host}`;
}

function safeFileName(name: string): string {
  // remove path separators & control chars
  return name
    .replace(/[\r\n\t]/g, " ")
    .replace(/[\\/]/g, "_")
    .slice(0, 200);
}

function ensureWithinRoot(root: string, objectKey: string): string {
  const full = path.resolve(root, objectKey);
  const fullRoot = path.resolve(root);
  if (!full.startsWith(fullRoot)) throw new ApiError(400, "BAD_REQUEST", "Invalid objectKey");
  return full;
}

export async function registerFiles(app: FastifyInstance) {
  // ---- Presign upload (recommended, aligns with OpenAPI /files/presign-upload)
  app.post("/files/presign-upload", async (req, reply) => {
    if (!req.user) throw new ApiError(401, "UNAUTHORIZED", "Unauthorized");

    // CSRF required
    const csrfHeader = req.headers["x-csrf-token"] as string | undefined;
    const csrfCookie = (req.cookies as any)[config.csrfCookieName] as string | undefined;
    requireCsrf(csrfHeader, csrfCookie);

    const body = (req.body || {}) as any;
    const fileName = safeFileName(String(body.fileName || ""));
    const mime = String(body.mime || "");
    const size = Number(body.size || 0);
    const docType = String(body.docType || "Other");
    const visibility = String(body.visibility || "INTERNAL");
    const sha256 = body.sha256 ? String(body.sha256) : null;
    const expiresAtDate = body.expiresAt ? String(body.expiresAt) : null;
    const links = (body.links || {}) as any;

    if (!fileName) throw new ApiError(400, "BAD_REQUEST", "fileName required");
    if (!mime) throw new ApiError(400, "BAD_REQUEST", "mime required");
    if (!Number.isFinite(size) || size <= 0) throw new ApiError(400, "BAD_REQUEST", "size invalid");

    // basic validation
    const maxBytes = config.fileMaxSizeMb * 1024 * 1024;
    if (size > maxBytes) throw new ApiError(400, "BAD_REQUEST", `file too large (max ${config.fileMaxSizeMb}MB)`);
    if (config.allowedMimeTypes.length && !config.allowedMimeTypes.includes(mime)) {
      throw new ApiError(400, "BAD_REQUEST", `mime not allowed: ${mime}`);
    }

    const docId = uuidv4();
    const uploadId = uuidv4();
    const token = crypto.randomBytes(16).toString("hex");

    const objectKey = `org/${req.user.orgId}/documents/${docId}/${fileName}`;
    const bucket = config.storageProvider === "gcs" ? config.gcsBucketPrivate : "local";

    const expiresMs = Date.now() + config.signedUrlTtlSeconds * 1000;
    const expiresAt = new Date(expiresMs).toISOString();

    const ctx = {
      orgId: req.user.orgId,
      userId: req.user.userId,
      role: req.user.roles?.[0],
      requestId: req.id,
    };

    const result = await withCtx(ctx, async (client) => {
      // 1) create document metadata (scanStatus=UPLOADED)
      await client.query(
        `insert into documents(id, org_id, name, doc_type, visibility,
                              owner_id, tenant_id, property_id, lease_id, invoice_id, ticket_id,
                              entity_type, entity_id, mime, size, bucket, object_key, scan_status,
                              expires_at, sha256, uploader, storage_provider)
         values ($1,$2,$3,$4,$5,
                 $6,$7,$8,$9,$10,$11,
                 $12,$13,$14,$15,$16,$17,'UPLOADED',
                 $18,$19,$20,$21)
         on conflict (id) do nothing`,
        [
          docId,
          req.user.orgId,
          fileName,
          docType,
          visibility,
          links.ownerId || null,
          links.tenantId || null,
          links.propertyId || null,
          links.leaseId || null,
          links.invoiceId || null,
          links.ticketId || null,
          links.entityType || null,
          links.entityId || null,
          mime,
          size,
          bucket,
          objectKey,
          expiresAtDate,
          sha256,
          req.user.userId,
          config.storageProvider,
        ]
      );

      // 2) create upload record
      await client.query(
        `insert into file_uploads(id, org_id, doc_id, bucket, object_key, mime, size, token, expires_at)
         values ($1,$2,$3,$4,$5,$6,$7,$8,to_timestamp($9/1000.0))
         on conflict (id) do nothing`,
        [uploadId, req.user.orgId, docId, bucket, objectKey, mime, size, token, expiresMs]
      );

      // 3) generate upload url
      let uploadUrl: string;
      let headers: Record<string, string> = {};

      if (config.storageProvider === "gcs") {
        const presigned = await presignUploadUrl({ bucket, objectKey, mime });
        uploadUrl = presigned.uploadUrl;
        headers = { ...presigned.headers };
      } else {
        // local provider: upload handled by API endpoint
        const base = getRequestBase(req);
        uploadUrl = `${base}/v1/files/_local-upload/${uploadId}`;
        headers = {
          "content-type": mime,
          "x-upload-token": token,
        };
      }

      await writeAudit(client, {
        orgId: req.user.orgId,
        requestId: req.id,
        actorUserId: req.user.userId,
        action: "DOCUMENT_PRESIGN_UPLOAD",
        entityType: "document",
        entityId: docId,
        summary: JSON.stringify({ docType, visibility, mime, size }),
        ip: req.ip,
        userAgent: String(req.headers["user-agent"] || ""),
      });

      return {
        uploadId,
        docId,
        uploadUrl,
        headers,
        expiresAt,
      };
    });

    return sendOk(reply, req.id, {
      uploadId: result.uploadId,
      docId: result.docId,
      uploadUrl: result.uploadUrl,
      method: "PUT",
      headers: result.headers,
      expiresAt: result.expiresAt,
    });
  });

  // ---- Local provider upload endpoint (dev/CI only)
  app.put("/files/_local-upload/:uploadId", async (req, reply) => {
    if (config.storageProvider !== "local") throw new ApiError(404, "NOT_FOUND", "Not found");
    if (!req.user) throw new ApiError(401, "UNAUTHORIZED", "Unauthorized");

    const { uploadId } = req.params as any;
    const token = req.headers["x-upload-token"] as string | undefined;
    if (!token) throw new ApiError(403, "FORBIDDEN", "Missing x-upload-token");

    const ctx = {
      orgId: req.user.orgId,
      userId: req.user.userId,
      role: req.user.roles?.[0],
      requestId: req.id,
    };

    const upload = await withCtx(ctx, async (client) => {
      const { rows } = await client.query(
        `select id, doc_id, object_key, mime, token, expires_at
         from file_uploads
         where id = $1`,
        [uploadId]
      );
      return rows[0];
    });

    if (!upload) throw new ApiError(404, "NOT_FOUND", "Upload not found");
    if (upload.token !== token) throw new ApiError(403, "FORBIDDEN", "Invalid upload token");

    const expiresAt = new Date(upload.expires_at).getTime();
    if (Date.now() > expiresAt) throw new ApiError(409, "CONFLICT", "Upload URL expired");

    // Save stream to local filesystem
    fs.mkdirSync(LOCAL_STORAGE_ROOT, { recursive: true });
    const dest = ensureWithinRoot(LOCAL_STORAGE_ROOT, upload.object_key);
    fs.mkdirSync(path.dirname(dest), { recursive: true });

    const ws = fs.createWriteStream(dest);
    await new Promise<void>((resolve, reject) => {
      req.raw.pipe(ws);
      req.raw.on("error", reject);
      ws.on("error", reject);
      ws.on("finish", () => resolve());
    });

    await withCtx(ctx, async (client) => {
      await client.query(
        `update file_uploads set status='UPLOADED', uploaded_at=now() where id=$1`,
        [uploadId]
      );
    });

    reply.code(200).send({ ok: true });
  });

  // ---- Complete upload (aligns with OpenAPI /files/complete-upload)
  app.post("/files/complete-upload", async (req, reply) => {
    if (!req.user) throw new ApiError(401, "UNAUTHORIZED", "Unauthorized");

    // CSRF required
    const csrfHeader = req.headers["x-csrf-token"] as string | undefined;
    const csrfCookie = (req.cookies as any)[config.csrfCookieName] as string | undefined;
    requireCsrf(csrfHeader, csrfCookie);

    const body = (req.body || {}) as any;
    const uploadId = String(body.uploadId || "");
    const docId = String(body.docId || "");
    const size = body.size != null ? Number(body.size) : null;
    const sha256 = body.sha256 ? String(body.sha256) : null;

    if (!uploadId || !docId) throw new ApiError(400, "BAD_REQUEST", "uploadId and docId required");

    const ctx = {
      orgId: req.user.orgId,
      userId: req.user.userId,
      role: req.user.roles?.[0],
      requestId: req.id,
    };

    const updatedDoc = await withCtx(ctx, async (client) => {
      // Validate upload
      const { rows: uRows } = await client.query(
        `select id, doc_id, status, bucket, object_key, expires_at
         from file_uploads
         where id=$1`,
        [uploadId]
      );
      const u = uRows[0];
      if (!u) throw new ApiError(404, "NOT_FOUND", "Upload not found");
      if (u.doc_id !== docId) throw new ApiError(409, "CONFLICT", "uploadId/docId mismatch");

      if (Date.now() > new Date(u.expires_at).getTime()) throw new ApiError(409, "CONFLICT", "Upload expired");

      if (config.storageProvider === "local" && u.status !== "UPLOADED") {
        throw new ApiError(409, "CONFLICT", "Upload not finished (local)"
        );
      }

      // mark upload completed
      await client.query(
        `update file_uploads set status='COMPLETED', completed_at=now() where id=$1`,
        [uploadId]
      );

      // update document scan status
      const nextStatus = config.fileScanEnabled ? "SCANNING" : "READY";
      const { rows: dRows } = await client.query(
        `update documents
         set scan_status=$2,
             size = coalesce($3, size),
             sha256 = coalesce($4, sha256),
             row_version = row_version + 1,
             updated_at = now()
         where id=$1
         returning *`,
        [docId, nextStatus, size, sha256]
      );
      const d = dRows[0];
      if (!d) throw new ApiError(404, "NOT_FOUND", "Document not found");

      if (config.fileScanEnabled) {
        await client.query(
          `insert into file_scan_jobs(org_id, doc_id, status)
           values ($1,$2,'PENDING')
           on conflict (doc_id) do update set status='PENDING', updated_at=now()`,
          [req.user.orgId, docId]
        );
      }

      await writeAudit(client, {
        orgId: req.user.orgId,
        requestId: req.id,
        actorUserId: req.user.userId,
        action: "DOCUMENT_COMPLETE_UPLOAD",
        entityType: "document",
        entityId: docId,
        summary: JSON.stringify({ uploadId, scanStatus: nextStatus }),
        ip: req.ip,
        userAgent: String(req.headers["user-agent"] || ""),
      });

      return d;
    });

    // Build Document response
    const etag = `W/"${updatedDoc.row_version}"`;
    reply.header("ETag", etag);

    let downloadUrl: string | null = null;
    if (updatedDoc.scan_status === "READY") {
      if (config.storageProvider === "gcs") {
        const signed = await presignDownloadUrl({
          bucket: updatedDoc.bucket,
          objectKey: updatedDoc.object_key,
          responseContentDisposition: `attachment; filename="${safeFileName(updatedDoc.name)}"`,
        });
        downloadUrl = signed.downloadUrl;
      } else {
        const base = getRequestBase(req);
        downloadUrl = `${base}/v1/files/_local-download/${updatedDoc.id}`;
      }
    }

    return sendOk(reply, req.id, mapDocument(updatedDoc, downloadUrl));
  });

  // ---- Local provider download endpoint (dev/CI)
  app.get("/files/_local-download/:docId", async (req, reply) => {
    if (config.storageProvider !== "local") throw new ApiError(404, "NOT_FOUND", "Not found");
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

    const filePath = ensureWithinRoot(LOCAL_STORAGE_ROOT, doc.object_key);
    if (!fs.existsSync(filePath)) throw new ApiError(404, "NOT_FOUND", "File not found");

    reply.header("content-type", doc.mime || "application/octet-stream");
    reply.header("content-disposition", `attachment; filename="${safeFileName(doc.name)}"`);

    const rs = fs.createReadStream(filePath);
    return reply.send(rs);
  });
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
