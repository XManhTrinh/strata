import "server-only";
import { z } from "zod";

const serverEnvSchema = z.object({
  // smtp://127.0.0.1:54325 locally (Mailpit); the provider's SMTP URL on staging and production.
  SMTP_URL: z.url(),
  EMAIL_FROM: z.string().min(3),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

let cached: ServerEnv | undefined;

/** Server-only variables, checked on first use. Never import this from client code. */
export function getServerEnv(): ServerEnv {
  if (!cached) {
    const result = serverEnvSchema.safeParse({
      SMTP_URL: process.env.SMTP_URL,
      EMAIL_FROM: process.env.EMAIL_FROM,
    });
    if (!result.success) {
      const names = result.error.issues.map((issue) => issue.path.join(".")).join(", ");
      throw new Error(`Invalid or missing server environment variables: ${names}`);
    }
    cached = result.data;
  }
  return cached;
}
