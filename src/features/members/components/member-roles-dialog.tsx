"use client";

import { useOptimistic, useTransition } from "react";
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
import { setMemberRole } from "../actions";
import type { MemberRow, RoleOption } from "../types";

/** Ticking a role assigns it straight away; the database refuses what the user can't grant. */
export function MemberRolesDialog({
  member,
  roles,
  onClose,
}: {
  member: MemberRow;
  roles: RoleOption[];
  onClose: () => void;
}) {
  const t = useTranslations("members");
  const te = useTranslations("errors");
  const { workspace } = useWorkspace();
  const snackbar = useSnackbar();
  const [, startTransition] = useTransition();
  const [roleIds, setOptimisticRoleIds] = useOptimistic(
    member.roleIds,
    (current: string[], change: { roleId: string; assigned: boolean }) =>
      change.assigned ? [...current, change.roleId] : current.filter((id) => id !== change.roleId)
  );

  function toggle(roleId: string, assigned: boolean) {
    startTransition(async () => {
      setOptimisticRoleIds({ roleId, assigned });
      const result = await setMemberRole(workspace.id, member.id, roleId, assigned);
      void snackbar.showSnackbar(result.ok ? t("roleUpdated") : te(result.error));
    });
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogTitle>{t("rolesDialogTitle", { name: member.fullName })}</DialogTitle>
      <DialogContent className="flex flex-col gap-3">
        <p className="text-body-medium text-on-surface-variant">{t("rolesDialogBody")}</p>
        {roles.map((role) => (
          <Checkbox
            key={role.id}
            checked={roleIds.includes(role.id)}
            onCheckedChange={(checked) => toggle(role.id, checked)}
          >
            {role.name}
          </Checkbox>
        ))}
      </DialogContent>
      <DialogActions>
        <Button variant="text" onPress={onClose}>
          {t("done")}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
