"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@windmorph/react";
import { Avatar, FileTrigger } from "@windmorph/react-pro";
import { Icon } from "@/components/ui/icon";
import type { ErrorKey } from "@/lib/form-state";
import { useSnackbar } from "@/lib/snackbar";
import { getBrowserClient } from "@/lib/supabase/client";
import { setAvatar } from "../actions";

// Must match the `avatars` bucket limits (the bucket enforces them too).
const MAX_BYTES = 2 * 1024 * 1024;
const TYPES = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" } as const;

export function AvatarEditor({
  userId,
  name,
  avatarUrl,
}: {
  userId: string;
  name: string;
  avatarUrl: string | null;
}) {
  const t = useTranslations("account.profile");
  const te = useTranslations("errors");
  const router = useRouter();
  const snackbar = useSnackbar();
  const [pending, startTransition] = useTransition();

  function fail(error: ErrorKey) {
    void snackbar.showSnackbar(te(error), { replace: true });
  }

  function upload(file: File | undefined) {
    if (!file) return;
    const extension = TYPES[file.type as keyof typeof TYPES];
    if (!extension) return fail("photoWrongType");
    if (file.size > MAX_BYTES) return fail("photoTooLarge");

    startTransition(async () => {
      const path = `${userId}/${crypto.randomUUID()}.${extension}`;
      const { error } = await getBrowserClient()
        .storage.from("avatars")
        .upload(path, file, { contentType: file.type });
      if (error) return fail("generic");
      const result = await setAvatar(path);
      if (!result.ok) return fail(result.error);
      void snackbar.showSnackbar(t("photoSaved"), { replace: true });
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await setAvatar(null);
      if (!result.ok) return fail(result.error);
      void snackbar.showSnackbar(t("photoRemoved"), { replace: true });
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-6">
      <Avatar name={name} src={avatarUrl ?? undefined} decorative size="2xl" />
      <div className="flex flex-col gap-2">
        <span className="text-title-medium text-on-surface">{t("photo")}</span>
        <div className="flex flex-wrap gap-2">
          <FileTrigger accept={Object.keys(TYPES)} onSelect={(files) => upload(files[0])}>
            <Button variant="tonal" pending={pending} leadingIcon={<Icon name="photo_camera" />}>
              {t("changePhoto")}
            </Button>
          </FileTrigger>
          {avatarUrl && (
            <Button variant="text" disabled={pending} onPress={remove}>
              {t("removePhoto")}
            </Button>
          )}
        </div>
        <span className="text-body-small text-on-surface-variant">{t("photoHint")}</span>
      </div>
    </div>
  );
}
