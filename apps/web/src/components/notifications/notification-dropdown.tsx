"use client";

import { useState } from "react";

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
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 rounded-md hover:bg-secondary text-muted-foreground transition-colors"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ""}`}
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        <span aria-hidden="true">🔔</span>
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] font-bold text-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setIsOpen(false)}
            aria-hidden="true"
          />
          <div
            className="absolute right-0 top-full mt-2 w-80 rounded-md border border-border bg-card shadow-lg z-50"
            role="menu"
          >
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={markAllAsRead}
                  className="text-xs text-primary hover:underline"
                  type="button"
                >
                  Mark all read
                </button>
              )}
            </div>
            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <p className="px-4 py-6 text-center text-sm text-muted-foreground">
                  No notifications
                </p>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className={`flex items-start gap-3 px-4 py-3 border-b border-border last:border-b-0 hover:bg-muted/30 transition-colors ${
                      !notification.isRead ? "bg-primary/5" : ""
                    }`}
                    role="menuitem"
                  >
                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-sm leading-tight ${
                          !notification.isRead ? "font-medium text-foreground" : "text-muted-foreground"
                        }`}
                      >
                        {notification.message}
                      </p>
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {notification.createdAt}
                      </p>
                    </div>
                    {!notification.isRead && (
                      <button
                        onClick={() => markAsRead(notification.id)}
                        className="shrink-0 rounded-full p-1 text-xs text-primary hover:bg-primary/10 transition-colors"
                        aria-label="Mark as read"
                        type="button"
                      >
                        ✓
                      </button>
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
