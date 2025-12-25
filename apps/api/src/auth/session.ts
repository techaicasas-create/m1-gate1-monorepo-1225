import jwt from "jsonwebtoken";
import { ApiError } from "../errors.js";
import { config } from "../config.js";

export type SessionUser = {
  userId: string;
  orgId: string;
  roles: string[]; // e.g. ["ADMIN","STAFF","OWNER","TENANT"]
};

export function signSession(user: SessionUser, ttlSeconds: number): string {
  return jwt.sign(user, config.sessionSecret, { expiresIn: ttlSeconds });
}

export function verifySession(token: string): SessionUser {
  try {
    return jwt.verify(token, config.sessionSecret) as SessionUser;
  } catch (e) {
    throw new ApiError(401, "UNAUTHORIZED", "Invalid session");
  }
}
