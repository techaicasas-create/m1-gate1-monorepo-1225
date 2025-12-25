import process from "node:process";

export type AppEnv = "dev" | "staging" | "prod";

export type CookieSameSite = "lax" | "strict" | "none";

function parseSameSite(v?: string): CookieSameSite {
  // fastify-cookie uses lowercase variants: 'lax' | 'strict' | 'none'
  const s = (v || "lax").trim().toLowerCase();
  if (s === "lax" || s === "strict" || s === "none") return s;
  return "lax";
}

export const config = {
  appEnv: (process.env.APP_ENV as AppEnv) || "dev",
  port: Number(process.env.PORT || 8080),

  requestIdHeader: process.env.REQUEST_ID_HEADER || "X-Request-Id",

  // DB
  // - 本地/CI：通常用 DATABASE_URL
  // - Cloud Run/Secret Manager：不少团队习惯用 DB_URL
  databaseUrl: process.env.DATABASE_URL || process.env.DB_URL || "",

  // CORS (comma separated origins)
  frontendOrigins: (process.env.FRONTEND_ORIGINS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),

  // Cookie
  cookieSecure: (process.env.COOKIE_SECURE || "true").toLowerCase() === "true",
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,
  cookieSameSite: parseSameSite(process.env.COOKIE_SAMESITE),

  sessionCookieName: process.env.SESSION_COOKIE_NAME || "session",
  refreshCookieName: process.env.REFRESH_COOKIE_NAME || "refresh",
  csrfCookieName: process.env.CSRF_COOKIE_NAME || "csrf",

  // ⚠️ 示例用：真实项目请使用 Secret Manager
  sessionSecret: process.env.SESSION_SECRET || "CHANGE_ME",
  csrfSecret: process.env.CSRF_SECRET || "CHANGE_ME",

  sessionTtlSeconds: Number(process.env.SESSION_TTL_SECONDS || 60 * 60 * 24 * 14), // 14d
  refreshTtlSeconds: Number(process.env.REFRESH_TTL_SECONDS || 60 * 60 * 24 * 30), // 30d

  // Files / Signed URL
  storageProvider: (process.env.STORAGE_PROVIDER || "local") as "local" | "gcs",
  gcsBucketPrivate: process.env.GCS_BUCKET_PRIVATE || process.env.GCS_BUCKET || "",
  signedUrlTtlSeconds: Number(process.env.SIGNED_URL_TTL_SECONDS || 300),
  fileMaxSizeMb: Number(process.env.FILE_MAX_SIZE_MB || 25),
  allowedMimeTypes: (process.env.ALLOWED_MIME_TYPES || "application/pdf,image/jpeg,image/png,image/webp")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
  fileScanEnabled: (process.env.FILE_SCAN_ENABLED || "true").toLowerCase() === "true",
};
