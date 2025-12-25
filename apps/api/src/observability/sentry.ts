import * as Sentry from "@sentry/node";

import { config } from "../config.js";

let enabled = false;

export function initSentry() {
  if (!config.sentryDsn) return;
  if (enabled) return;
  Sentry.init({
    dsn: config.sentryDsn,
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
