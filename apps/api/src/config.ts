import process from "node:process";

export type AppEnv = "dev" | "staging" | "prod";

function required(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

export const config = {
  appEnv: (process.env.APP_ENV as AppEnv) || "dev",
  port: Number(process.env.PORT || 8080),

  requestIdHeader: process.env.REQUEST_ID_HEADER || "X-Request-Id",

  databaseUrl: process.env.DATABASE_URL || "",

  // Cookie
  cookieSecure: (process.env.COOKIE_SECURE || "true").toLowerCase() === "true",
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,
  cookieSameSite: (process.env.COOKIE_SAMESITE || "Lax") as
    | "Lax"
    | "Strict"
    | "None",

  sessionCookieName: process.env.SESSION_COOKIE_NAME || "session",
  refreshCookieName: process.env.REFRESH_COOKIE_NAME || "refresh",
  csrfCookieName: process.env.CSRF_COOKIE_NAME || "csrf",

  // ⚠️ 示例用：真实项目请使用 Secret Manager
  sessionSecret: process.env.SESSION_SECRET || "CHANGE_ME",
  csrfSecret: process.env.CSRF_SECRET || "CHANGE_ME",

  sessionTtlSeconds: Number(process.env.SESSION_TTL_SECONDS || 60 * 60 * 24 * 14), // 14d
  refreshTtlSeconds: Number(process.env.REFRESH_TTL_SECONDS || 60 * 60 * 24 * 30), // 30d
};
