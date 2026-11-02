import * as Sentry from "@sentry/nextjs";
import { sentryOptions } from "@/lib/monitoring";

// Browser errors, once a DSN is set; sent through the app (/monitoring), so the CSP and ad
// blockers let them through. No session replay.
const options = sentryOptions();
if (options) Sentry.init(options);

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
