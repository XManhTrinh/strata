import type { BrowserOptions } from "@sentry/nextjs";

/**
 * Sentry settings shared by the server, edge and browser. Errors only, with no personal data:
 * no user details, cookies, headers, bodies, query strings, database values or local variables.
 * Off (undefined) until NEXT_PUBLIC_SENTRY_DSN is set.
 */
export function sentryOptions(): BrowserOptions | undefined {
  const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
  if (!dsn) return undefined;
  return {
    dsn,
    environment: process.env.NEXT_PUBLIC_VERCEL_ENV ?? process.env.NODE_ENV,
    tracesSampleRate: 0.1,
    dataCollection: {
      userInfo: false,
      cookies: false,
      httpHeaders: false,
      httpBodies: [],
      urlQueryParams: false,
      databaseQueryData: false,
      stackFrameVariables: false,
    },
  };
}
