"use client";

import { useCallback, useMemo } from "react";
import { useSnackbar } from "@vkieu/mui";

/**
 * Drop-in replacement for the `toast` object from `sonner`.
 *
 * Backed by `@vkieu/mui` SnackbarProvider — must be rendered above
 * any component that calls `useToast()`.
 *
 * @example
 * ```tsx
 * const toast = useToast();
 * toast.success("Saved");
 * toast.error("Something went wrong");
 * ```
 */
export function useToast() {
  const snackbar = useSnackbar();

  const success = useCallback(
    (message: string) => {
      snackbar.show({ message, duration: 4000 });
    },
    [snackbar],
  );

  const error = useCallback(
    (message: string) => {
      snackbar.show({ message, duration: 6000, priority: "urgent", showClose: true });
    },
    [snackbar],
  );

  return useMemo(() => ({ success, error }), [success, error]);
}
