"use client";

import { useEffect, useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Badge, BadgedBox, Button, IconButton, List, ListItem, SideSheet } from "@windmorph/react";
import { EmptyState } from "@windmorph/react-pro";
import { Icon } from "@/components/ui/icon";
import { useWorkspace } from "@/features/workspaces/workspace-context";
import { getBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";

type Notification = Pick<
  Database["public"]["Tables"]["notifications"]["Row"],
  "id" | "kind" | "payload" | "read_at" | "created_at"
>;

const LIMIT = 30;
const KINDS = [
  "role.assigned",
  "role.removed",
  "ownership.received",
  "invitation.received",
  "invitation.accepted",
];

/** The bell: unread count, a side sheet with recent notifications, live updates via Realtime. */
export function NotificationBell() {
  const t = useTranslations("notifications");
  const format = useFormatter();
  const { user } = useWorkspace();
  const [items, setItems] = useState<Notification[]>([]);
  const [open, setOpen] = useState(false);
  const unread = items.filter((n) => !n.read_at).length;

  useEffect(() => {
    const supabase = getBrowserClient();
    let active = true;

    supabase
      .from("notifications")
      .select("id, kind, payload, read_at, created_at")
      .order("created_at", { ascending: false })
      .limit(LIMIT)
      .then(({ data }) => {
        if (active && data) setItems(data);
      });

    // RLS limits Realtime to the user's own rows; the filter keeps traffic small.
    const channel = supabase
      .channel(`notifications:${user.id}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${user.id}`,
        },
        (change) => setItems((current) => [change.new as Notification, ...current].slice(0, LIMIT))
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [user.id]);

  async function markAllRead() {
    setItems((current) =>
      current.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))
    );
    await getBrowserClient().rpc("mark_all_notifications_read");
  }

  function text(n: Notification): string {
    const payload = (n.payload ?? {}) as Record<string, string>;
    const kind = KINDS.includes(n.kind) ? n.kind : "unknown";
    return t(`kinds.${kind}` as Parameters<typeof t>[0], {
      role: payload.role_name ?? "",
      workspace: payload.workspace_name ?? "",
      name: payload.member_name ?? "",
    });
  }

  const icon = <Icon name="notifications" />;

  return (
    <>
      <IconButton
        aria-label={unread > 0 ? t("labelUnread", { count: unread }) : t("label")}
        icon={
          unread > 0 ? <BadgedBox badge={<Badge max={99}>{unread}</Badge>}>{icon}</BadgedBox> : icon
        }
        onPress={() => setOpen(true)}
      />
      <SideSheet
        variant="modal"
        open={open}
        onOpenChange={setOpen}
        title={t("title")}
        labels={{ close: t("close") }}
        actions={
          unread > 0 ? (
            <Button variant="text" onPress={() => void markAllRead()}>
              {t("markAllRead")}
            </Button>
          ) : undefined
        }
      >
        {items.length === 0 ? (
          <EmptyState titleAs="h3" icon={<Icon name="notifications_off" />} title={t("empty")} />
        ) : (
          <List aria-label={t("title")}>
            {items.map((n) => (
              <ListItem
                key={n.id}
                textValue={text(n)}
                leading={
                  <Icon name={n.read_at ? "drafts" : "mark_email_unread"} filled={!n.read_at} />
                }
                supportingText={format.relativeTime(new Date(n.created_at))}
              >
                {text(n)}
              </ListItem>
            ))}
          </List>
        )}
      </SideSheet>
    </>
  );
}
