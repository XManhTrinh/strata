import { timingSafeEqual } from "node:crypto";
import { sendNotificationEmails } from "@/features/notifications/emails";

/** True when the request carries the jobs secret. */
function authorised(request: Request, secret: string): boolean {
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  const expected = Buffer.from(`Bearer ${secret}`);
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/**
 * Called every minute by the database's scheduler with the jobs secret. Without the secret it
 * doesn't exist; without an email provider it does nothing.
 */
export async function POST(request: Request) {
  const secret = process.env.JOBS_SECRET;
  if (!secret || !authorised(request, secret)) return new Response("Not found", { status: 404 });
  if (!process.env.SMTP_URL)
    return Response.json({ sent: 0, failed: 0, skipped: "no email provider" });
  return Response.json(await sendNotificationEmails(secret));
}
