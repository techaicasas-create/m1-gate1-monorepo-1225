import * as Sentry from "@sentry/node";

const sentryDsn = (config as any).sentryDsn ?? process.env.SENTRY_DSN;


import { config } from "../config.js";

let enabled = false;

export function initSentry() {
  if (!sentryDsn) return;
  if (enabled) return;
  Sentry.init({
    dsn: sentryDsn,
    environment: config.appEnv,
    // Gate2/M2：先接入 error collection；tracing/pprof 后续按需开启
    tracesSampleRate: 0,
  });
  enabled = true;
}

export function captureException(err: unknown, extras?: Record<string, unknown>) {
  if (!enabled) return;
  Sentry.captureException(err, { extra: extras });
}
