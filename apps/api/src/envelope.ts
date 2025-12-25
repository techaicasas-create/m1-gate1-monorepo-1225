import type { FastifyReply } from "fastify";

export type EnvelopeSuccess<T> = {
  requestId: string;
  timestamp: string;
  data: T;
};

export type ErrorEnvelope = {
  requestId: string;
  timestamp: string;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
};

export function nowIso(): string {
  return new Date().toISOString();
}

export function sendOk<T>(reply: FastifyReply, requestId: string, data: T, statusCode = 200) {
  const body: EnvelopeSuccess<T> = { requestId, timestamp: nowIso(), data };
  return reply.status(statusCode).send(body);
}

export function sendErr(
  reply: FastifyReply,
  requestId: string,
  statusCode: number,
  code: string,
  message: string,
  details?: unknown
) {
  const body: ErrorEnvelope = {
    requestId,
    timestamp: nowIso(),
    error: { code, message, details },
  };
  return reply.status(statusCode).send(body);
}
