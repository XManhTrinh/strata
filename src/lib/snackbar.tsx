"use client";

import { type ReactNode, createContext, useContext } from "react";
import { SnackbarHost, type SnackbarHostState, useSnackbarHostState } from "@windmorph/react";

const SnackbarContext = createContext<SnackbarHostState | null>(null);

/** One snackbar host for the app, above the phone navigation bar. */
export function SnackbarProvider({ children }: { children: ReactNode }) {
  const state = useSnackbarHostState();
  return (
    <SnackbarContext.Provider value={state}>
      {children}
      <SnackbarHost state={state} className="medium:bottom-0 fixed inset-x-0 bottom-20 z-30" />
    </SnackbarContext.Provider>
  );
}

/** Shows short confirmations and errors (`showSnackbar`). Never use window.alert. */
export function useSnackbar(): SnackbarHostState {
  const state = useContext(SnackbarContext);
  if (!state) throw new Error("useSnackbar must be used inside SnackbarProvider.");
  return state;
}
