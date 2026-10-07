"use client";

import { type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  ThemeProvider,
  SnackbarHost,
  useSnackbarHostState,
  createTheme,
} from "@vkieu/mui";
import { SnackbarContext } from "@/lib/snackbar";

const facebookTheme = createTheme({ name: "facebook", seed: "#1877F2" });

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
      <ThemeProvider
        themes={["baseline", facebookTheme]}
        defaultTheme="facebook"
        storage="cookie"
      >
        <SnackbarContext.Provider value={snackbarState}>
          <SnackbarHost state={snackbarState} />
          {children}
        </SnackbarContext.Provider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
