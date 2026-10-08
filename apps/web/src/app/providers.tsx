"use client";

import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  ThemeProvider,
  SnackbarHost,
  useSnackbarHostState,
} from "@vkieu/mui";
import { SnackbarContext } from "@/lib/snackbar";

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
      <ThemeProvider storage="cookie">
        <SnackbarContext.Provider value={snackbarState}>
          <SnackbarHost state={snackbarState} className="fixed inset-x-0 bottom-0 z-50" />
          {children}
        </SnackbarContext.Provider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
