import type { NextConfig } from "next";
import { withSentryConfig } from "@sentry/nextjs/config";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const supabase = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const realtime = supabase.replace(/^http/, "ws");
const dev = process.env.NODE_ENV === "development";

// Only our own scripts, styles and fonts; data from Supabase (API, Realtime, signed images); never
// framed. Inline scripts stay allowed because Next.js inlines its bootstrap; React needs eval in
// development only.
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  `img-src 'self' data: blob: ${supabase}`,
  "font-src 'self'",
  `connect-src 'self' ${supabase} ${realtime}`,
  "frame-ancestors 'none'",
  "base-uri 'self'",
  "object-src 'none'",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
];

const nextConfig: NextConfig = {
  transpilePackages: ["@windmorph/react", "@windmorph/react-pro"],
  poweredByHeader: false,
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

// Sentry only acts once NEXT_PUBLIC_SENTRY_DSN is set; source maps upload only with an auth token.
export default withSentryConfig(withNextIntl(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  sourcemaps: { disable: !process.env.SENTRY_AUTH_TOKEN },
  tunnelRoute: "/monitoring",
  silent: !process.env.CI,
  telemetry: false,
});
