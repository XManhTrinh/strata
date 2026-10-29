"use client";

import type { ReactNode } from "react";
import { ThemeProvider } from "@windmorph/react";
import { SnackbarProvider } from "@/lib/snackbar";
import { STRATA_DEFAULT_THEME, STRATA_THEMES } from "@/lib/theme-config";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider themes={STRATA_THEMES} defaultTheme={STRATA_DEFAULT_THEME} storage="cookie">
      <SnackbarProvider>{children}</SnackbarProvider>
    </ThemeProvider>
  );
}
