"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Button } from "@windmorph/react";
import { FileTrigger, ImageCropDialog, type ImageCropResult } from "@windmorph/react-pro";
import { Icon } from "@/components/ui/icon";
import { useWorkspace } from "@/features/workspaces/workspace-context";
import type { ErrorKey } from "@/lib/form-state";
import { useSnackbar } from "@/lib/snackbar";
import { getBrowserClient } from "@/lib/supabase/client";
import { setWorkspaceLogo } from "../actions";

// What people may choose (never SVG, which can carry scripts); the crop is stored as WebP.
const TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_CHOSEN_BYTES = 10 * 1024 * 1024;
/** The stored logo's side: sharp at the rail's 56px on high-density screens. */
const SIDE = 256;

/** Draws the chosen square of the photo (upright, as its EXIF says) at 256px, as WebP. */
async function cropToWebp(file: File, result: ImageCropResult): Promise<Blob> {
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const canvas = document.createElement("canvas");
  canvas.width = SIDE;
  canvas.height = SIDE;
  const { x, y, width, height } = result.crop;
  canvas.getContext("2d")!.drawImage(bitmap, x, y, width, height, 0, 0, SIDE, SIDE);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("crop"))), "image/webp", 0.9)
  );
}

/** The workspace's logo, shown in the navigation: choose, crop to a square, or remove. */
export function LogoEditor() {
  const t = useTranslations("settings.general");
  const te = useTranslations("errors");
  const router = useRouter();
  const snackbar = useSnackbar();
  const { workspace } = useWorkspace();
  const [chosen, setChosen] = useState<{ file: File; url: string } | null>(null);
  const [pending, startTransition] = useTransition();

  function fail(error: ErrorKey) {
    void snackbar.showSnackbar(te(error), { replace: true });
  }

  function choose(file: File | undefined) {
    if (!file) return;
    if (!TYPES.includes(file.type)) return fail("logoWrongType");
    if (file.size > MAX_CHOSEN_BYTES) return fail("logoTooLarge");
    setChosen({ file, url: URL.createObjectURL(file) });
  }

  function close() {
    if (chosen) URL.revokeObjectURL(chosen.url);
    setChosen(null);
  }

  function save(result: ImageCropResult) {
    if (!chosen) return;
    startTransition(async () => {
      const blob = await cropToWebp(chosen.file, result).catch(() => null);
      if (!blob) return fail("generic");
      const path = `${workspace.id}/${crypto.randomUUID()}.webp`;
      const { error } = await getBrowserClient()
        .storage.from("workspace-logos")
        .upload(path, blob, { contentType: "image/webp" });
      if (error) return fail("notAllowed");
      const saved = await setWorkspaceLogo(workspace.id, path);
      if (!saved.ok) return fail(saved.error);
      close();
      void snackbar.showSnackbar(t("logoSaved"), { replace: true });
      router.refresh();
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await setWorkspaceLogo(workspace.id, null);
      if (!result.ok) return fail(result.error);
      void snackbar.showSnackbar(t("logoRemoved"), { replace: true });
      router.refresh();
    });
  }

  return (
    <div className="flex items-center gap-6">
      <span className="rounded-corner-large bg-primary text-on-primary text-title-large grid size-20 shrink-0 place-items-center overflow-hidden">
        {workspace.logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element -- a short-lived signed link
          <img src={workspace.logoUrl} alt="" className="size-full object-cover" />
        ) : (
          <Icon name="image" />
        )}
      </span>
      <div className="flex flex-col gap-2">
        <span className="text-title-medium text-on-surface">{t("logo")}</span>
        <div className="flex flex-wrap gap-2">
          <FileTrigger accept={TYPES} onSelect={(files) => choose(files[0])}>
            <Button
              variant="tonal"
              pending={pending && !chosen}
              leadingIcon={<Icon name="upload" />}
            >
              {t(workspace.logoUrl ? "changeLogo" : "addLogo")}
            </Button>
          </FileTrigger>
          {workspace.logoUrl && (
            <Button variant="text" disabled={pending} onPress={remove}>
              {t("removeLogo")}
            </Button>
          )}
        </div>
        <span className="text-body-small text-on-surface-variant">{t("logoHint")}</span>
      </div>
      {chosen && (
        <ImageCropDialog
          open
          onOpenChange={(open) => !open && close()}
          src={chosen.url}
          aspect={1}
          pending={pending}
          onConfirm={save}
          labels={{
            title: t("logoCropTitle"),
            confirm: t("logoCropSave"),
            cancel: t("logoCropCancel"),
          }}
        />
      )}
    </div>
  );
}
