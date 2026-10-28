"use client";

import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  ThemeProvider,
  SnackbarHost,
  useSnackbarHostState,
} from "@windmorph/react";
import { SnackbarContext } from "@/lib/snackbar";
import { STRATA_DEFAULT_THEME, STRATA_THEMES } from "@/lib/theme";

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        refetchOnWindowFocus: false,
      },
    },
  });
}

let browserQueryClient: QueryClient | undefined;

function getQueryClient() {
  if (typeof window === "undefined") {
    return makeQueryClient();
  }
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}

export function Providers({ children }: { children: ReactNode }) {
  const queryClient = getQueryClient();
  const snackbarState = useSnackbarHostState();

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider themes={STRATA_THEMES} defaultTheme={STRATA_DEFAULT_THEME} storage="cookie">
        <SnackbarContext.Provider value={snackbarState}>
          <SnackbarHost state={snackbarState} className="fixed inset-x-0 bottom-0 z-50" />
          {children}
        </SnackbarContext.Provider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
