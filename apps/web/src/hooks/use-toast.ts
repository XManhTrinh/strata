"use client";

import { useCallback, useMemo } from "react";
import { useSnackbar } from "@/lib/snackbar";

/**
 * Drop-in replacement for the `toast` object from `sonner`.
 *
 * Backed by `@vkieu/windmorph` SnackbarHost — must be rendered above
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
      snackbar.showSnackbar({ message, duration: "short" });
    },
    [snackbar],
  );

  const error = useCallback(
    (message: string) => {
      snackbar.showSnackbar({ message, duration: "long", withDismissAction: true });
    },
    [snackbar],
  );

  return useMemo(() => ({ success, error }), [success, error]);
}
