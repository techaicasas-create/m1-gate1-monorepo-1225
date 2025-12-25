import Fastify from "fastify";
import cookie from "@fastify/cookie";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import { v4 as uuidv4 } from "uuid";

import { config } from "./config.js";
import { sendErr } from "./envelope.js";
import { ApiError } from "./errors.js";
import { verifySession, type SessionUser } from "./auth/session.js";
import { newCsrfToken } from "./auth/csrf.js";
import { captureException, initSentry } from "./observability/sentry.js";

import { registerHealth } from "./routes/health.js";
import { registerMe } from "./routes/me.js";
import { registerAuth } from "./routes/auth.js";
import { registerTickets } from "./routes/tickets.js";
import { registerFiles } from "./routes/files.js";
import { registerDocuments } from "./routes/documents.js";

declare module "fastify" {
  interface FastifyRequest {
    id: string;
    user?: SessionUser;
  }
}

const app = Fastify({
  logger: true,
  genReqId: (req) => {
    const header = config.requestIdHeader.toLowerCase();
    const existing = req.headers[header] as string | undefined;
    return existing || uuidv4();
  },
});

// Optional: Sentry (if SENTRY_DSN is set)
initSentry();

await app.register(cookie);

// CORS：仅允许白名单前端域名（对齐 env/.env.example FRONTEND_ORIGINS）
await app.register(cors, {
  credentials: true,
  origin: (origin, cb) => {
    // Non-browser / same-origin (no Origin header)
    if (!origin) return cb(null, true);
    if (config.frontendOrigins.length === 0) {
      // dev fallback: allow all (建议生产环境务必配置 FRONTEND_ORIGINS)
      return cb(null, true);
    }
    const ok = config.frontendOrigins.includes(origin);
    return cb(null, ok);
  },
});

await app.register(helmet);

// Gate1：要求所有响应 envelope 含 requestId。这里在错误处理里兜底。
app.setErrorHandler((err, req, reply) => {
  const requestId = req.id || uuidv4();

  if (err instanceof ApiError) {
    return sendErr(reply, requestId, err.statusCode, err.code, err.message, err.details);
  }

  // fastify schema validation errors could be mapped to VALIDATION_ERROR here
  req.log.error({ err }, "Unhandled error");
  captureException(err, { requestId: requestId, url: req.url, method: req.method });
  return sendErr(reply, requestId, 500, "INTERNAL_ERROR", "Internal error");
});

// Always echo request id for tracing (both success & error)
app.addHook("onSend", async (req, reply, payload) => {
  reply.header(config.requestIdHeader, req.id);
  return payload;
});

// 认证：从 session cookie 解析用户（示例）
app.addHook("preHandler", async (req) => {
  const token = (req.cookies as any)[config.sessionCookieName] as string | undefined;
  if (!token) return;

  try {
    req.user = verifySession(token);
  } catch {
    // ignore invalid session; endpoints will return 401
  }
});

// CSRF cookie：如果没有则种一个（示例）
app.addHook("preHandler", async (req, reply) => {
  const csrfCookie = (req.cookies as any)[config.csrfCookieName] as string | undefined;
  if (!csrfCookie) {
    const token = newCsrfToken();
    reply.setCookie(config.csrfCookieName, token, {
      path: "/",
      httpOnly: false,
      secure: config.cookieSecure,
      sameSite: config.cookieSameSite,
      domain: config.cookieDomain,
    });
  }
});

// Routes under /v1
const v1 = async (r: any) => {
  await registerHealth(r);
  await registerMe(r);
  await registerAuth(r);
  await registerTickets(r);
  await registerFiles(r);
  await registerDocuments(r);
};

app.register(v1, { prefix: "/v1" });

await app.listen({ host: "0.0.0.0", port: config.port });
