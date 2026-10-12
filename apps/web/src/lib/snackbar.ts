"use client";

import { createContext, useContext } from "react";
import { SnackbarHostState } from "@vkieu/windmorph";

export const SnackbarContext = createContext<SnackbarHostState | null>(null);

export function useSnackbar(): SnackbarHostState {
  const ctx = useContext(SnackbarContext);
  if (!ctx) {
    throw new Error("useSnackbar must be used within a SnackbarContext.Provider");
  }
  return ctx;
}
