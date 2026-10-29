"use client";

import type { ReactNode } from "react";
import { TopAppBar } from "@windmorph/react";
import { NotificationBell } from "@/features/notifications/notification-bell";
import { UserMenu } from "./user-menu";
import { WorkspaceSwitcher } from "./workspace-switcher";

/** The one top app bar on every workspace page, with the switcher and account menu. */
export function PageHeader({ title, actions }: { title: ReactNode; actions?: ReactNode }) {
  return (
    <TopAppBar
      title={title}
      className="bg-surface sticky top-0 z-10"
      actions={
        <>
          {actions}
          <NotificationBell />
          <WorkspaceSwitcher />
          <UserMenu />
        </>
      }
    />
  );
}
