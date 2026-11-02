"use client";

import { useTranslations } from "next-intl";
import { IconButton, TextField } from "@windmorph/react";
import { Icon } from "@/components/ui/icon";
import { useSnackbar } from "@/lib/snackbar";

/** A link (or other text) to copy and share: read-only, with a copy button. */
export function CopyField({ label, value }: { label: string; value: string }) {
  const t = useTranslations("common");
  const snackbar = useSnackbar();
  return (
    <TextField
      className="w-full"
      label={label}
      value={value}
      readOnly
      trailingIcon={
        <IconButton
          variant="standard"
          aria-label={t("copy")}
          icon={<Icon name="content_copy" />}
          onPress={() =>
            void navigator.clipboard.writeText(value).then(() => snackbar.showSnackbar(t("copied")))
          }
        />
      }
    />
  );
}
