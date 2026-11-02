"use client";

import { useEffect, useState } from "react";
import { useFormatter, useNow, useTranslations } from "next-intl";
import { Badge, BadgedBox, Button, IconButton, List, ListItem, SideSheet } from "@windmorph/react";
import { EmptyState } from "@windmorph/react-pro";
import { Icon } from "@/components/ui/icon";
import { useWorkspace } from "@/features/workspaces/workspace-context";
import { getBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { notificationMessage } from "./message";

type Notification = Pick<
  Database["public"]["Tables"]["notifications"]["Row"],
  "id" | "kind" | "payload" | "read_at" | "created_at"
>;

const LIMIT = 30;

/** The bell: unread count, a side sheet with recent notifications, live updates via Realtime. */
export function NotificationBell() {
  const t = useTranslations("notifications");
  const format = useFormatter();
  // "5 minutes ago" moves on while the sheet is open.
  const now = useNow({ updateInterval: 60_000 });
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
    const { key, values } = notificationMessage(n.kind, n.payload, (iso) =>
      format.dateTime(new Date(iso), { day: "numeric", month: "short", timeZone: "UTC" })
    );
    return t(key as Parameters<typeof t>[0], values);
  }

  const icon = <Icon name="notifications" />;

  return (
    <>
      <IconButton
        variant="standard"
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
      >
        {unread > 0 && (
          // In the list, not the sheet's header, where it would crowd the title.
          <div className="flex justify-end pb-2">
            <Button variant="text" onPress={() => void markAllRead()}>
              {t("markAllRead")}
            </Button>
          </div>
        )}
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
                supportingText={format.relativeTime(new Date(n.created_at), now)}
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
