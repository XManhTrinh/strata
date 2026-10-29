"use client";

import { useTranslations } from "next-intl";
import { Alert } from "@windmorph/react-pro";
import type { ErrorKey } from "@/lib/form-state";

/** A form-level error; the Alert announces itself to screen readers when it appears. */
export function FormError({ error }: { error?: ErrorKey }) {
  const t = useTranslations("errors");
  if (!error) return null;
  return <Alert severity="error">{t(error)}</Alert>;
}
