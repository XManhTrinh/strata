"use client";

import { type ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ReducedMotionProvider } from "@/components/accessibility/reduced-motion";
import { CommandPalette } from "@/components/navigation/command-palette";
import { MobileNav } from "@/components/navigation/mobile-nav";
import { AuthGuard } from "@/components/auth/auth-guard";
import { CompanyProvider } from "@/components/auth/company-provider";
import { ImportProgressProvider } from "@/components/import/import-progress-provider";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <CompanyProvider>
        <ImportProgressProvider>
        <ReducedMotionProvider>
          <AppShell>
            <div className="w-full min-w-0 overflow-x-auto space-y-4 md:space-y-6 h-full min-h-0">
              {children}
            </div>
          </AppShell>
          <CommandPalette />
          <MobileNav />
        </ReducedMotionProvider>
        </ImportProgressProvider>
      </CompanyProvider>
    </AuthGuard>
  );
}
