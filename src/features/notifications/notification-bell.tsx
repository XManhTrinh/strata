"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormatter, useNow, useTranslations } from "next-intl";
import {
  Badge,
  BadgedBox,
  Button,
  ButtonGroup,
  Dialog,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  Menu,
  MenuItem,
  MenuTrigger,
} from "@windmorph/react";
import { EmptyState } from "@windmorph/react-pro";
import { Icon } from "@/components/ui/icon";
import { useWorkspace } from "@/features/workspaces/workspace-context";
import { getBrowserClient } from "@/lib/supabase/client";
import type { Database } from "@/lib/supabase/database.types";
import { notificationIcon, notificationMessage, notificationPath } from "./message";

type Notification = Pick<
  Database["public"]["Tables"]["notifications"]["Row"],
  "id" | "kind" | "payload" | "read_at" | "created_at" | "workspace_id"
>;

const PAGE = 30;
const COLUMNS = "id, kind, payload, read_at, created_at, workspace_id";
type Group = "today" | "week" | "earlier";

/** Only this workspace's and personal notifications: leaves out the user's other workspaces. */
function here<Q extends { or: (filter: string) => Q }>(query: Q, othersKey: string): Q {
  return othersKey ? query.or(`workspace_id.is.null,workspace_id.not.in.(${othersKey})`) : query;
}

/**
 * The bell: this workspace's notifications, and personal ones (no workspace, or one you're not in,
 * such as a declined request to join), live via Realtime. Each opens what it's about and is marked
 * read; All or Unread, grouped by when. Full screen on phones. Other workspaces' unread show in
 * the workspace switcher.
 */
export function NotificationBell() {
  const t = useTranslations("notifications");
  const format = useFormatter();
  // "5 minutes ago" moves on while it's open.
  const now = useNow({ updateInterval: 60_000 });
  const router = useRouter();
  const { user, workspace, workspaces } = useWorkspace();
  const others = workspaces.filter((w) => w.id !== workspace.id).map((w) => w.id);
  const othersKey = others.join(",");
  const [items, setItems] = useState<Notification[]>([]);
  const [more, setMore] = useState(false);
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const unread = items.filter((n) => !n.read_at).length;

  useEffect(() => {
    const supabase = getBrowserClient();
    let active = true;

    here(supabase.from("notifications").select(COLUMNS), othersKey)
      .order("created_at", { ascending: false })
      .limit(PAGE)
      .then(({ data }) => {
        if (!active || !data) return;
        setItems(data);
        setMore(data.length === PAGE);
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
        (change) => {
          const n = change.new as Notification;
          const elsewhere = othersKey.split(",").filter(Boolean);
          if (!n.workspace_id || !elsewhere.includes(n.workspace_id)) {
            setItems((current) => [n, ...current]);
          }
        }
      )
      .subscribe();

    return () => {
      active = false;
      void supabase.removeChannel(channel);
    };
  }, [user.id, workspace.id, othersKey]);

  async function showMore() {
    const last = items.at(-1);
    if (!last) return;
    const { data } = await here(getBrowserClient().from("notifications").select(COLUMNS), othersKey)
      .lt("created_at", last.created_at)
      .order("created_at", { ascending: false })
      .limit(PAGE);
    setItems((current) => [...current, ...(data ?? [])]);
    setMore((data ?? []).length === PAGE);
  }

  async function markAllRead() {
    setItems((current) =>
      current.map((n) => ({ ...n, read_at: n.read_at ?? new Date().toISOString() }))
    );
    await getBrowserClient().rpc("mark_all_notifications_read", { p_workspace_id: workspace.id });
  }

  function openItem(n: Notification) {
    const readAt = new Date().toISOString();
    if (!n.read_at) {
      setItems((current) => current.map((x) => (x.id === n.id ? { ...x, read_at: readAt } : x)));
      void getBrowserClient().from("notifications").update({ read_at: readAt }).eq("id", n.id);
    }
    const path = notificationPath(n.kind, n.payload);
    if (path === null) return;
    const slug = workspaces.find((w) => w.id === n.workspace_id)?.slug;
    setOpen(false);
    router.push(slug ? `/w/${slug}${path}` : "/");
  }

  function text(n: Notification): string {
    const { key, values } = notificationMessage(n.kind, n.payload, (iso) =>
      format.dateTime(new Date(iso), { day: "numeric", month: "short", timeZone: "UTC" })
    );
    return t(key as Parameters<typeof t>[0], values);
  }

  function groupOf(n: Notification): Group {
    const created = new Date(n.created_at);
    if (created.toDateString() === now.toDateString()) return "today";
    return now.getTime() - created.getTime() < 7 * 86_400_000 ? "week" : "earlier";
  }

  const shown = filter === "unread" ? items.filter((n) => !n.read_at) : items;
  const groups = (["today", "week", "earlier"] as const)
    .map((group) => ({ group, entries: shown.filter((n) => groupOf(n) === group) }))
    .filter((g) => g.entries.length > 0);
  const bell = <Icon name="notifications" />;

  return (
    <>
      <IconButton
        variant="standard"
        aria-label={unread > 0 ? t("labelUnread", { count: unread }) : t("label")}
        icon={
          unread > 0 ? <BadgedBox badge={<Badge max={99}>{unread}</Badge>}>{bell}</BadgedBox> : bell
        }
        onPress={() => setOpen(true)}
      />
      <Dialog
        role="dialog"
        open={open}
        onOpenChange={setOpen}
        fullScreen="compact"
        // Under the bell, over a page that stays visible.
        classNames={{
          scrim: "bg-transparent",
          positioner: "medium:items-start medium:justify-end medium:pt-16 medium:pe-4",
          panel: "medium:w-[400px] medium:max-h-[min(70dvh,640px)] gap-2 p-0",
        }}
      >
        <div className="flex items-center gap-1 ps-6 pe-2 pt-3">
          <DialogTitle className="flex-1 p-0">{t("title")}</DialogTitle>
          <MenuTrigger>
            <IconButton
              variant="standard"
              aria-label={t("more")}
              icon={<Icon name="more_vert" />}
            />
            <Menu
              aria-label={t("more")}
              onAction={(key) => {
                if (key === "read") void markAllRead();
                if (key === "settings") {
                  setOpen(false);
                  router.push("/account/notifications");
                }
              }}
            >
              <MenuItem key="read" leadingIcon={<Icon name="done_all" />}>
                {t("markAllRead")}
              </MenuItem>
              <MenuItem key="settings" leadingIcon={<Icon name="settings" />}>
                {t("settings")}
              </MenuItem>
            </Menu>
          </MenuTrigger>
          <IconButton
            variant="standard"
            aria-label={t("close")}
            icon={<Icon name="close" />}
            onPress={() => setOpen(false)}
          />
        </div>
        <div className="px-6">
          <ButtonGroup
            variant="connected"
            selectionMode="single"
            className="w-auto"
            aria-label={t("filter")}
            selectedKeys={[filter]}
            onSelectionChange={(keys) => {
              const [key] = keys;
              if (key) setFilter(key as "all" | "unread");
            }}
          >
            <Button toggle value="all">
              {t("all")}
            </Button>
            <Button toggle value="unread">
              {unread > 0 ? t("unreadCount", { count: unread }) : t("unread")}
            </Button>
          </ButtonGroup>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto pb-2">
          {groups.length === 0 ? (
            <EmptyState
              titleAs="h3"
              icon={<Icon name="notifications_off" />}
              title={t(filter === "unread" ? "emptyUnread" : "empty")}
            />
          ) : (
            groups.map(({ group, entries }) => (
              <section key={group} aria-labelledby={`notifications-${group}`}>
                <h3
                  id={`notifications-${group}`}
                  className="text-title-small text-on-surface-variant px-6 pt-3 pb-1"
                >
                  {t(`groups.${group}`)}
                </h3>
                <List
                  aria-label={t(`groups.${group}`)}
                  onAction={(key) => {
                    const n = entries.find((x) => x.id === key);
                    if (n) openItem(n);
                  }}
                >
                  {entries.map((n) => (
                    <ListItem
                      key={n.id}
                      textValue={text(n)}
                      leading={
                        <span className="bg-secondary-container text-on-secondary-container flex size-10 items-center justify-center rounded-full">
                          <Icon name={notificationIcon(n.kind)} size={20} />
                        </span>
                      }
                      trailing={
                        n.read_at ? undefined : (
                          <span className="bg-primary block size-2.5 rounded-full">
                            <span className="sr-only">{t("unreadMark")}</span>
                          </span>
                        )
                      }
                      supportingText={format.relativeTime(new Date(n.created_at), now)}
                    >
                      <span className={n.read_at ? undefined : "font-medium"}>{text(n)}</span>
                    </ListItem>
                  ))}
                </List>
              </section>
            ))
          )}
          {more && filter === "all" && (
            <Button variant="text" className="mx-4 mt-1" onPress={() => void showMore()}>
              {t("showMore")}
            </Button>
          )}
        </div>
      </Dialog>
    </>
  );
}
