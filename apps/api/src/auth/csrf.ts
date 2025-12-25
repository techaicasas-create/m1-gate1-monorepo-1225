import crypto from "node:crypto";
import { ApiError } from "../errors.js";
import { config } from "../config.js";

export function newCsrfToken(): string {
  // double-submit token: random + HMAC
  const raw = crypto.randomBytes(16).toString("hex");
  const sig = crypto
    .createHmac("sha256", config.csrfSecret)
    .update(raw)
    .digest("hex");
  return `${raw}.${sig}`;
}

export function verifyCsrfToken(token: string): boolean {
  const [raw, sig] = token.split(".");
  if (!raw || !sig) return false;
  const expected = crypto
    .createHmac("sha256", config.csrfSecret)
    .update(raw)
    .digest("hex");
  return crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected));
}

export function requireCsrf(headerToken?: string, cookieToken?: string) {
  if (!headerToken) throw new ApiError(403, "FORBIDDEN", "Missing CSRF token");
  if (!cookieToken) throw new ApiError(403, "FORBIDDEN", "Missing CSRF cookie");
  if (headerToken !== cookieToken) throw new ApiError(403, "FORBIDDEN", "CSRF token mismatch");
  if (!verifyCsrfToken(headerToken)) throw new ApiError(403, "FORBIDDEN", "CSRF token invalid");
}
