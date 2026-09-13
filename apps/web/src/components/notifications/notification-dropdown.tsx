"use client";

import { useState } from "react";
import { IconButton } from "@vkieu/mui/buttons";
import { Button } from "@vkieu/mui/buttons";
import { Icon } from "@vkieu/mui";
import { Badge } from "@vkieu/mui";
import { Tooltip } from "@vkieu/mui";
import { Divider } from "@vkieu/mui";
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

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
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

  return (
    <div className="relative">
      <Tooltip content={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`} side="bottom">
        <Badge variant="count" count={unreadCount} visible={unreadCount > 0}>
          <IconButton
            variant="standard"
            size="s"
            onClick={() => setIsOpen(!isOpen)}
            aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
            aria-expanded={isOpen}
          >
            <Icon name="notifications" size={24} />
          </IconButton>
        </Badge>
      </Tooltip>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div
            className="absolute right-0 top-full mt-2 w-80 rounded-2xl bg-[hsl(var(--surface))] shadow-xl border border-outline-variant/50 z-50 overflow-hidden"
            role="menu"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3">
              <h3 className="text-[14px] leading-5 font-medium text-on-surface">Notifications</h3>
              {unreadCount > 0 && (
                <Button
                  variant="text"
                  size="s"
                  onClick={handleMarkAllAsRead}
                  disabled={markAllAsReadMutation.isPending}
                  className="text-[12px] text-primary"
                >
                  Mark all read
                </Button>
              )}
            </div>
            <Divider />

            {/* List */}
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center py-10 text-center">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-surface-container-highest/50 mb-3">
                    <Icon name="notifications_none" size={24} className="text-surface-variant-foreground/40" />
                  </div>
                  <p className="text-[13px] text-surface-variant-foreground">No notifications yet</p>
                </div>
              ) : (
                notifications.map((notification: Notification) => {
                  const style = getNotificationIcon(notification.type);
                  return (
                    <div
                      key={notification.id}
                      className={`flex items-start gap-3 px-4 py-3 border-b border-outline-variant/30 last:border-b-0 hover:bg-surface-foreground/4 transition-colors ${
                        !notification.read ? "bg-primary/4" : ""
                      }`}
                      role="menuitem"
                    >
                      {/* Icon */}
                      <div className={`flex items-center justify-center w-9 h-9 rounded-full ${style.bg} shrink-0 mt-0.5`}>
                        <Icon name={style.icon} size={18} className={style.color} />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <p className={`text-[13px] leading-5 ${!notification.read ? "font-medium text-on-surface" : "text-surface-variant-foreground"}`}>
                          {notification.title}
                        </p>
                        <p className="text-[12px] leading-4 text-surface-variant-foreground mt-0.5">
                          {notification.message}
                        </p>
                        <p className="text-[11px] text-surface-variant-foreground/60 mt-1">
                          {formatTimeAgo(notification.createdAt)}
                        </p>
                      </div>

                      {/* Mark as read */}
                      {!notification.read && (
                        <Tooltip content="Mark as read" side="left">
                          <IconButton
                            variant="standard"
                            size="xs"
                            compact
                            onClick={() => handleMarkAsRead(notification.id)}
                            aria-label="Mark as read"
                          >
                            <Icon name="done" size={18} className="text-primary" />
                          </IconButton>
                        </Tooltip>
                      )}
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
