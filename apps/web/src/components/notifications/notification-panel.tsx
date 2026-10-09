"use client";

import {
  Badge,
  BadgedBox,
  Button,
  IconButton,
  List,
  ListItem,
  SheetTrigger,
  SideSheet,
} from "@vkieu/mui";
import { Icon } from "@/components/ui/icon";
import { useCompanyId } from "@/hooks/use-company";
import { useRealtimeNotifications } from "@/hooks/use-realtime-notifications";
import {
  useNotifications,
  useUnreadCount,
  useMarkAsRead,
  useMarkAllAsRead,
  type Notification,
} from "@/services";

// ─── Helpers ────────────────────────────────────────────────────────────────────

function getNotificationIcon(type: string): { icon: string; color: string; bg: string } {
  switch (type) {
    case "import_complete":
      return { icon: "cloud_done", color: "text-primary", bg: "bg-primary/12" };
    case "import_error":
      return { icon: "error", color: "text-error", bg: "bg-error/12" };
    case "system":
      return { icon: "info", color: "text-tertiary", bg: "bg-tertiary/12" };
    default:
      return { icon: "notifications", color: "text-primary", bg: "bg-primary/12" };
  }
}

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const date = new Date(dateStr).getTime();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// ─── Component ──────────────────────────────────────────────────────────────────

export function NotificationPanel() {
  const companyId = useCompanyId();

  // Subscribe to Supabase Realtime for live push notifications
  useRealtimeNotifications(companyId);

  const { data: notifications = [] } = useNotifications(companyId);
  const { data: unreadData } = useUnreadCount(companyId);
  const markAsReadMutation = useMarkAsRead(companyId);
  const markAllAsReadMutation = useMarkAllAsRead(companyId);

  const unreadCount = unreadData?.count ?? 0;

  const handleMarkAsRead = (id: string) => {
    markAsReadMutation.mutate(id);
  };

  const handleMarkAllAsRead = () => {
    markAllAsReadMutation.mutate();
  };

  const bellIcon = (
    <IconButton
      variant="standard"
      size="sm"
      aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
      icon={<Icon name="notifications" size={24} />}
    />
  );

  return (
    <SheetTrigger>
      {unreadCount > 0 ? (
        <BadgedBox badge={<Badge>{unreadCount > 99 ? "99+" : unreadCount}</Badge>}>
          {bellIcon}
        </BadgedBox>
      ) : (
        bellIcon
      )}
      <SideSheet
        variant="modal"
        title="Notifications"
        className="w-96"
        actions={({ close }) => (
          <>
            {unreadCount > 0 && (
              <Button
                variant="text"
                size="sm"
                onPress={handleMarkAllAsRead}
                disabled={markAllAsReadMutation.isPending}
              >
                Mark all read
              </Button>
            )}
            <IconButton
              icon={<Icon name="close" />}
              aria-label="Close notifications"
              onPress={close}
            />
          </>
        )}
      >
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center py-10 text-center">
            <div className="flex items-center justify-center w-12 h-12 rounded-full bg-surface-container-highest/50 mb-3">
              <Icon
                name="notifications_none"
                size={24}
                className="text-surface-variant-foreground/40"
              />
            </div>
            <p className="text-body-small text-surface-variant-foreground">
              No notifications yet
            </p>
          </div>
        ) : (
          <List aria-label="Notifications">
            {notifications.map((notification: Notification) => {
              const style = getNotificationIcon(notification.type);
              const unread = !notification.read;
              return (
                <ListItem
                  key={notification.id}
                  className={unread ? "bg-primary/4" : undefined}
                  leading={
                    <div
                      className={`flex items-center justify-center w-9 h-9 rounded-full ${style.bg}`}
                    >
                      <Icon name={style.icon} size={18} className={style.color} />
                    </div>
                  }
                  supportingText={
                    <>
                      {notification.message}
                      <span className="block text-surface-variant-foreground/60">
                        {formatTimeAgo(notification.createdAt)}
                      </span>
                    </>
                  }
                  trailing={
                    unread ? (
                      <IconButton
                        variant="standard"
                        size="xs"
                        aria-label="Mark as read"
                        onPress={() => handleMarkAsRead(notification.id)}
                        icon={<Icon name="done" size={18} className="text-primary" />}
                      />
                    ) : undefined
                  }
                >
                  <span className={unread ? "font-medium" : undefined}>
                    {notification.title}
                  </span>
                </ListItem>
              );
            })}
          </List>
        )}
      </SideSheet>
    </SheetTrigger>
  );
}
