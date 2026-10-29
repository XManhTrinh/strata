"use client";

import { useTransition } from "react";
import { useTranslations } from "next-intl";
import type { ErrorKey } from "@/lib/form-state";
import { useSnackbar } from "@/lib/snackbar";

type Result = { ok: true } | { ok: false; error: ErrorKey };

/** Runs a one-click action (archive, restore, reorder) and reports the outcome in a snackbar. */
export function useRunAction() {
  const te = useTranslations("errors");
  const snackbar = useSnackbar();
  const [pending, startTransition] = useTransition();

  function run(action: () => Promise<Result>, done: string) {
    startTransition(async () => {
      const result = await action();
      void snackbar.showSnackbar(result.ok ? done : te(result.error), { replace: true });
    });
  }

  return [run, pending] as const;
}
