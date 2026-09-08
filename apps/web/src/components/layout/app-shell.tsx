"use client";

import { type ReactNode } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { SkipToContent } from "./skip-to-content";
import { RouteAnnouncer } from "@/components/accessibility/route-announcer";

interface AppShellProps {
  children: ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  return (
    <>
      <SkipToContent />
      <RouteAnnouncer />
      <div className="h-screen bg-background overflow-hidden">
        <Sidebar />
        <div className="flex flex-col h-screen md:ml-24">
          <Header />
          <main id="main-content" className="flex-1 min-h-0 px-4 pb-4 md:px-6 md:pb-6" tabIndex={-1}>
            {children}
          </main>
        </div>
      </div>
    </>
  );
}
