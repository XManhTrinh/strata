"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
} from "@windmorph/react";
import { useWorkspace } from "@/features/workspaces/workspace-context";
import { useSnackbar } from "@/lib/snackbar";
import { leaveWorkspace, transferOwnership } from "../actions";
import type { MemberRow } from "../types";

export function MakeOwnerDialog({ member, onClose }: { member: MemberRow; onClose: () => void }) {
  const t = useTranslations("members");
  const te = useTranslations("errors");
  const { workspace } = useWorkspace();
  const snackbar = useSnackbar();
  const [keep, setKeep] = useState(true);
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogTitle>{t("makeOwnerTitle", { name: member.fullName })}</DialogTitle>
      <DialogContent className="flex flex-col gap-4">
        <p>{t("makeOwnerBody")}</p>
        <Checkbox checked={keep} onCheckedChange={setKeep}>
          {t("keepOwnership")}
        </Checkbox>
      </DialogContent>
      <DialogActions>
        <Button variant="text" onPress={onClose}>
          {t("cancel")}
        </Button>
        <Button
          variant="text"
          pending={pending}
          onPress={() =>
            startTransition(async () => {
              const result = await transferOwnership(workspace.id, member.id, keep);
              void snackbar.showSnackbar(
                result.ok ? t("ownerAdded", { name: member.fullName }) : te(result.error)
              );
              onClose();
            })
          }
        >
          {t("makeOwner")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export function LeaveWorkspaceDialog({ onClose }: { onClose: () => void }) {
  const t = useTranslations("members");
  const te = useTranslations("errors");
  const router = useRouter();
  const { workspace } = useWorkspace();
  const snackbar = useSnackbar();
  const [pending, startTransition] = useTransition();

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogTitle>{t("leaveTitle")}</DialogTitle>
      <DialogContent>{t("leaveBody")}</DialogContent>
      <DialogActions>
        <Button variant="text" onPress={onClose}>
          {t("cancel")}
        </Button>
        <Button
          variant="text"
          pending={pending}
          onPress={() =>
            startTransition(async () => {
              const result = await leaveWorkspace(workspace.id);
              if (result.ok) router.push("/");
              else {
                void snackbar.showSnackbar(te(result.error));
                onClose();
              }
            })
          }
        >
          {t("leave")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
