"use client";

import { type ReactNode } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { ReducedMotionProvider } from "@/components/accessibility/reduced-motion";
import { CommandPalette } from "@/components/navigation/command-palette";
import { MobileNav } from "@/components/navigation/mobile-nav";
import { AuthGuard } from "@/components/auth/auth-guard";

export default function DashboardLayout({ children }: { children: ReactNode }) {
  return (
    <AuthGuard>
      <ReducedMotionProvider>
        <AppShell>
          {/* Mobile-first responsive content wrapper:
              - overflow-x-auto ensures data tables can scroll horizontally on mobile
              - Base styles for mobile, md:/lg: for progressive enhancements
              - gap/spacing scales up with viewport */}
          <div className="w-full min-w-0 overflow-x-auto space-y-4 md:space-y-6">
            {children}
          </div>
        </AppShell>
        <CommandPalette />
        <MobileNav />
      </ReducedMotionProvider>
    </AuthGuard>
  );
}
