"use client";

import { type ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { SkipToContent } from "./skip-to-content";
import { useSidebar } from "@/hooks/use-sidebar";
import { useUserPermissions } from "@/hooks/use-user-permissions";
import { RouteAnnouncer } from "@/components/accessibility/route-announcer";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const { collapsed } = useSidebar();
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
        {/* Sidebar - handles its own responsive visibility (persistent on desktop, Sheet on mobile) */}
        {hasAdminPermissions && <Sidebar />}

        {/* Main content area */}
        <div
          className={`flex flex-col min-h-screen transition-[margin-left] duration-200 ease-in-out ${
            hasAdminPermissions
              ? collapsed
                ? "md:ml-16"
                : "md:ml-64"
              : ""
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
