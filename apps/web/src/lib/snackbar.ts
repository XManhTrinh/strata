"use client";

import { createContext, useContext } from "react";
import { SnackbarHostState } from "@windmorph/react";

export const SnackbarContext = createContext<SnackbarHostState | null>(null);

export function useSnackbar(): SnackbarHostState {
  const ctx = useContext(SnackbarContext);
  if (!ctx) {
    throw new Error("useSnackbar must be used within a SnackbarContext.Provider");
  }
  return ctx;
}
