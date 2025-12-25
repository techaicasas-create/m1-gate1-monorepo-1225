import { Storage } from "@google-cloud/storage";

import { config } from "../config.js";

export type PresignResult = {
  uploadUrl: string;
  method: "PUT";
  headers: Record<string, string>;
  expiresAt: string; // ISO datetime
};

export type DownloadResult = {
  downloadUrl: string;
  expiresAt: string; // ISO datetime
};

let gcsStorage: Storage | null = null;

function getStorage(): Storage {
  if (!gcsStorage) gcsStorage = new Storage();
  return gcsStorage;
}

export async function presignUploadUrl(args: {
  bucket: string;
  objectKey: string;
  mime: string;
}): Promise<PresignResult> {
  const expiresMs = Date.now() + config.signedUrlTtlSeconds * 1000;
  const expiresAt = new Date(expiresMs).toISOString();

  if (config.storageProvider === "gcs") {
    if (!args.bucket) throw new Error("GCS bucket not configured (GCS_BUCKET_PRIVATE)");
    const storage = getStorage();
    const file = storage.bucket(args.bucket).file(args.objectKey);
    const [url] = await file.getSignedUrl({
      version: "v4",
      action: "write",
      expires: expiresMs,
      contentType: args.mime,
    });
    return {
      uploadUrl: url,
      method: "PUT",
      headers: {
        "content-type": args.mime,
      },
      expiresAt,
    };
  }

  // local provider: upload is handled by API itself (dev/CI only)
  throw new Error("presignUploadUrl: local provider should be constructed at route layer");
}

export async function presignDownloadUrl(args: {
  bucket: string;
  objectKey: string;
  responseContentDisposition?: string;
}): Promise<DownloadResult> {
  const expiresMs = Date.now() + config.signedUrlTtlSeconds * 1000;
  const expiresAt = new Date(expiresMs).toISOString();

  if (config.storageProvider === "gcs") {
    if (!args.bucket) throw new Error("GCS bucket not configured (GCS_BUCKET_PRIVATE)");
    const storage = getStorage();
    const file = storage.bucket(args.bucket).file(args.objectKey);
    const [url] = await file.getSignedUrl({
      version: "v4",
      action: "read",
      expires: expiresMs,
      responseDisposition: args.responseContentDisposition,
    });
    return { downloadUrl: url, expiresAt };
  }

  throw new Error("presignDownloadUrl: local provider should be constructed at route layer");
}
