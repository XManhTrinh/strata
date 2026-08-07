"use client";

import { type ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { SkipToContent } from "./skip-to-content";
import { useUserPermissions } from "@/hooks/use-user-permissions";
import { RouteAnnouncer } from "@/components/accessibility/route-announcer";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { permissions } = useUserPermissions();

  // Sidebar is shown if user has any permission beyond just org_chart and calendar
  const hasAdminPermissions = permissions.some(
    (p) => p.feature !== "org_chart" && p.feature !== "calendar" && p.feature !== "leave"
  );

  return (
    <>
      <SkipToContent />
      <RouteAnnouncer />
      <div className="min-h-screen bg-background">
        {/* Sidebar - handles its own responsive visibility (rail on desktop, Sheet on mobile) */}
        {hasAdminPermissions && <Sidebar />}

        {/* Main content area — rail is always 80px (md:ml-20) */}
        <div
          className={`flex flex-col min-h-screen ${
            hasAdminPermissions ? "md:ml-20" : ""
          }`}
        >
          <Header />
          <main id="main-content" className="flex-1 px-4 pb-4 md:px-6 md:pb-6" tabIndex={-1}>
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
