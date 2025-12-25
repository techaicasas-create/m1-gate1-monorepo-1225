import type { FastifyInstance } from "fastify";
import { sendOk } from "../envelope.js";
import { config } from "../config.js";
import { ApiError } from "../errors.js";
import { newCsrfToken, requireCsrf } from "../auth/csrf.js";
import { signSession, verifySession, type SessionUser } from "../auth/session.js";

export async function registerAuth(app: FastifyInstance) {
  // 仅示例：用 refresh cookie 续签 session，并刷新 refresh（rotation）
  app.post("/auth/refresh", async (req, reply) => {
    const csrfHeader = req.headers["x-csrf-token"] as string | undefined;
    const csrfCookie = (req.cookies as any)[config.csrfCookieName] as string | undefined;
    requireCsrf(csrfHeader, csrfCookie);

    const refresh = (req.cookies as any)[config.refreshCookieName] as string | undefined;
    if (!refresh) throw new ApiError(401, "UNAUTHORIZED", "Missing refresh cookie");

    const user = verifySession(refresh);

    // refresh rotation
    const nextRefresh = signSession(user, config.refreshTtlSeconds);
    const nextSession = signSession(user, config.sessionTtlSeconds);

    reply.setCookie(config.refreshCookieName, nextRefresh, cookieOpts());
    reply.setCookie(config.sessionCookieName, nextSession, cookieOpts());

    // refresh 时也补发 csrf（可选）
    ensureCsrfCookie(reply);

    return sendOk(reply, req.id, { ok: true });
  });

  app.post("/auth/logout", async (req, reply) => {
    const csrfHeader = req.headers["x-csrf-token"] as string | undefined;
    const csrfCookie = (req.cookies as any)[config.csrfCookieName] as string | undefined;
    requireCsrf(csrfHeader, csrfCookie);

    // clear cookies
    reply.clearCookie(config.sessionCookieName, cookieOpts());
    reply.clearCookie(config.refreshCookieName, cookieOpts());
    reply.clearCookie(config.csrfCookieName, { path: "/", domain: config.cookieDomain });

    return sendOk(reply, req.id, { ok: true });
  });

  // 仅示例：用于本地快速造一个 session（真实项目请删除）
  app.post("/auth/_debug_login", async (req, reply) => {
    const body = (req.body ?? {}) as Partial<SessionUser>;
    if (!body.userId || !body.orgId) throw new ApiError(400, "VALIDATION_ERROR", "userId/orgId required");
    const user: SessionUser = {
      userId: body.userId,
      orgId: body.orgId,
      roles: Array.isArray(body.roles) ? body.roles : ["ADMIN"],
    };

    const refresh = signSession(user, config.refreshTtlSeconds);
    const session = signSession(user, config.sessionTtlSeconds);
    reply.setCookie(config.refreshCookieName, refresh, cookieOpts());
    reply.setCookie(config.sessionCookieName, session, cookieOpts());

    ensureCsrfCookie(reply);

    return sendOk(reply, req.id, { ok: true, user });
  });
}

function cookieOpts() {
  return {
    path: "/",
    httpOnly: true,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    domain: config.cookieDomain,
  } as const;
}

function ensureCsrfCookie(reply: any) {
  const token = newCsrfToken();
  // CSRF cookie 通常需要 JS 读取，所以不设 HttpOnly
  reply.setCookie(config.csrfCookieName, token, {
    path: "/",
    httpOnly: false,
    secure: config.cookieSecure,
    sameSite: config.cookieSameSite,
    domain: config.cookieDomain,
  });
}
