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
        <AppShell>{children}</AppShell>
        <CommandPalette />
        <MobileNav />
      </ReducedMotionProvider>
    </AuthGuard>
  );
}
