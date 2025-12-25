import type { FastifyInstance } from "fastify";
import { sendOk } from "../envelope.js";

export async function registerHealth(app: FastifyInstance) {
  app.get("/health", async (req, reply) => {
    return sendOk(reply, req.id, { status: "ok" });
  });
}
