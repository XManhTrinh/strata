import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/monitoring";

/** Error monitoring on the server and edge, once a DSN is set. */
export function register() {
  const options = sentryOptions();
  if (options) Sentry.init(options);
}

export const onRequestError = Sentry.captureRequestError;
