import type { FastifyInstance } from "fastify";
import { sendOk } from "../envelope.js";
import { ApiError } from "../errors.js";
import type { SessionUser } from "../auth/session.js";

declare module "fastify" {
  interface FastifyRequest {
    user?: SessionUser;
  }
}

export async function registerMe(app: FastifyInstance) {
  app.get("/me", async (req, reply) => {
    if (!req.user) throw new ApiError(401, "UNAUTHORIZED", "Unauthorized");
    return sendOk(reply, req.id, { user: req.user });
  });
}
