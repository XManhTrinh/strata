import "server-only";
import { createFormatter, createTranslator } from "next-intl";
import { NotificationEmail } from "@/emails/notification-email";
import { sendEmail } from "@/lib/email/send";
import { getPublicEnv } from "@/lib/env";
import { createJobClient } from "@/lib/supabase/job";
import type { Database } from "@/lib/supabase/database.types";
import messages from "@/messages/en.json";
import { notificationMessage, notificationPath } from "./message";

type Claimed = Database["public"]["Functions"]["claim_notification_emails"]["Returns"][number];

/**
 * Claims the notifications due by email, sends one email per person and kind of delivery (each
 * instant batch, or the daily summary), and records what was sent or failed.
 */
export async function sendNotificationEmails(secret: string) {
  const supabase = createJobClient();
  const { data, error } = await supabase.rpc("claim_notification_emails", { p_secret: secret });
  if (error) throw new Error(`Claiming notification emails failed: ${error.message}`);

  const site = getPublicEnv().NEXT_PUBLIC_SITE_URL;
  const groups = new Map<string, Claimed[]>();
  for (const row of data ?? []) {
    const key = `${row.user_id}:${row.delivery}`;
    groups.set(key, [...(groups.get(key) ?? []), row]);
  }

  const sent: string[] = [];
  const failed: { id: string; error: string }[] = [];
  for (const rows of groups.values()) {
    const [first] = rows;
    if (!first) continue;
    const t = createTranslator({ locale: "en", messages, namespace: "emails.notifications" });
    const tKinds = createTranslator({ locale: "en", messages, namespace: "notifications" });
    const format = createFormatter({ locale: "en", timeZone: first.time_zone });
    const items = rows.map((row) => {
      const { key, values } = notificationMessage(row.kind, row.payload, (iso) =>
        format.dateTime(new Date(iso), { day: "numeric", month: "short", timeZone: "UTC" })
      );
      const workspace = row.workspace_slug ? `${site}/w/${row.workspace_slug}` : site;
      return {
        text: tKinds(key as Parameters<typeof tKinds>[0], values),
        context: [
          row.workspace_name,
          format.dateTime(new Date(row.created_at), { dateStyle: "medium", timeStyle: "short" }),
        ]
          .filter(Boolean)
          .join(" · "),
        href: `${workspace}${notificationPath(row.kind, row.payload) ?? ""}`,
      };
    });
    const daily = first.delivery === "daily";
    const count = items.length;
    const subject = daily
      ? t("subjectDaily", { count })
      : count === 1 && items[0]
        ? items[0].text
        : t("subjectMany", { count });
    try {
      await sendEmail({
        to: first.email,
        subject,
        template: NotificationEmail({
          items,
          openUrl: first.workspace_slug ? `${site}/w/${first.workspace_slug}` : site,
          manageUrl: `${site}/account/notifications`,
          text: {
            preview: subject,
            heading: daily ? t("headingDaily", { count }) : t("heading", { count }),
            button: t("button"),
            footer: t("footer"),
            manage: t("manage"),
          },
        }),
      });
      sent.push(...rows.map((r) => r.id));
    } catch (e) {
      const message = e instanceof Error ? e.message : String(e);
      failed.push(...rows.map((r) => ({ id: r.id, error: message })));
    }
  }

  if (sent.length || failed.length) {
    const { error: markError } = await supabase.rpc("mark_notification_emails", {
      p_secret: secret,
      p_sent: sent,
      p_failed: failed,
    });
    if (markError) throw new Error(`Recording notification emails failed: ${markError.message}`);
  }
  return { sent: sent.length, failed: failed.length };
}
