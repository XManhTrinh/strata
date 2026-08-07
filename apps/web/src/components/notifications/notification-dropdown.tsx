"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Icon } from "@/components/ui/icon";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import { Divider } from "@/components/ui/divider";

interface Notification {
  id: string;
  message: string;
  type: string;
  isRead: boolean;
  createdAt: string;
}

const mockNotifications: Notification[] = [
  { id: "1", message: "Leave request from Sarah Chen requires approval", type: "LEAVE_REQUEST", isRead: false, createdAt: "2 min ago" },
  { id: "2", message: "Q4 Headcount Report is ready for download", type: "REPORT_READY", isRead: false, createdAt: "15 min ago" },
  { id: "3", message: "Budget exceeded for Marketing department", type: "SYSTEM_ALERT", isRead: false, createdAt: "1 hour ago" },
  { id: "4", message: "Emily Rodriguez's leave has been approved", type: "LEAVE_APPROVED", isRead: true, createdAt: "3 hours ago" },
  { id: "5", message: "New employee onboarded: Carlos Mendez", type: "SYSTEM_ALERT", isRead: true, createdAt: "Yesterday" },
];

export function NotificationDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState(mockNotifications);

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const markAsRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  return (
    <div className="relative">
      <Tooltip content={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`} side="bottom">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
          aria-expanded={isOpen}
          aria-haspopup="true"
          className="relative"
        >
          <Icon name="notifications" size={24} />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1">
              <Badge variant="count" count={unreadCount} />
            </span>
          )}
        </Button>
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
            <div className="flex items-center justify-between px-4 py-3">
              <h3 className="text-[14px] leading-5 font-medium text-foreground">Notifications</h3>
              {unreadCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={markAllAsRead}
                  className="text-[12px] text-primary"
                >
                  Mark all read
                </Button>
              )}
            </div>
            <Divider />
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center py-8 text-center">
                  <Icon name="notifications_none" size={40} className="text-muted-foreground/40 mb-2" />
                  <p className="text-[14px] leading-5 text-muted-foreground">
                    No notifications
                  </p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-outline-variant/50 last:border-b-0 hover:bg-surface-foreground/8 transition-colors ${
                      !notification.isRead ? "bg-primary/5" : ""
                    }`}
                    role="menuitem"
                  >
                    <div className="flex items-center justify-center h-8 w-8 rounded-full bg-primary/12 shrink-0 mt-0.5">
                      <Icon
                        name={notification.isRead ? "notifications_none" : "notifications_active"}
                        size={18}
                        className={notification.isRead ? "text-muted-foreground" : "text-primary"}
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-[13px] leading-[18px] ${
                          !notification.isRead ? "font-medium text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {notification.message}
                      </p>
                      <p className="mt-0.5 text-[11px] leading-4 text-muted-foreground">
                        {notification.createdAt}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <Tooltip content="Mark as read" side="left">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 shrink-0"
                          onClick={() => markAsRead(notification.id)}
                          aria-label="Mark as read"
                        >
                          <Icon name="done" size={18} className="text-primary" />
                        </Button>
                      </Tooltip>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
