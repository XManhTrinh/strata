"use client";

import { useOptimistic, useState, useTransition } from "react";
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
import { RoleUnitsDialog } from "./role-units-dialog";
import type { MemberRow, RoleOption } from "../types";

/** Ticking a role assigns it straight away; the database refuses what the user can't grant. */
export function MemberRolesDialog({
  member,
  roles,
  units,
  onClose,
}: {
  member: MemberRow;
  roles: RoleOption[];
  units: { id: string; label: string }[];
  onClose: () => void;
}) {
  const t = useTranslations("members");
  const te = useTranslations("errors");
  const { workspace } = useWorkspace();
  const snackbar = useSnackbar();
  const [, startTransition] = useTransition();
  const [unitsFor, setUnitsFor] = useState<RoleOption | null>(null);
  const unitLabel = new Map(units.map((u) => [u.id, u.label]));
  const assignment = (roleId: string) => member.assignments.find((a) => a.roleId === roleId);
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
    <Dialog role="dialog" open onOpenChange={(open) => !open && onClose()}>
      <DialogTitle>{t("rolesDialogTitle", { name: member.fullName })}</DialogTitle>
      <DialogContent className="flex flex-col gap-3">
        <p className="text-body-medium text-on-surface-variant">{t("rolesDialogBody")}</p>
        {roles.map((role) => {
          const assigned = assignment(role.id);
          return (
            <div key={role.id} className="flex flex-col gap-1">
              <Checkbox
                checked={roleIds.includes(role.id)}
                onCheckedChange={(checked) => toggle(role.id, checked)}
              >
                {role.name}
              </Checkbox>
              {/* Roles on specific units say which, once the assignment exists. */}
              {role.unitReach && assigned && roleIds.includes(role.id) && (
                <div className="ms-10 flex flex-wrap items-center gap-2">
                  <span className="text-body-small text-on-surface-variant">
                    {assigned.unitIds.length
                      ? t("units", {
                          units: assigned.unitIds.map((id) => unitLabel.get(id) ?? "").join(", "),
                        })
                      : t("noUnits")}
                  </span>
                  <Button variant="text" onPress={() => setUnitsFor(role)}>
                    {t("chooseUnits")}
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </DialogContent>
      <DialogActions>
        <Button variant="text" onPress={onClose}>
          {t("done")}
        </Button>
      </DialogActions>
      {unitsFor && assignment(unitsFor.id) && (
        <RoleUnitsDialog
          personName={member.fullName}
          roleName={unitsFor.name}
          assignmentId={assignment(unitsFor.id)!.id}
          unitIds={assignment(unitsFor.id)!.unitIds}
          units={units}
          onClose={() => setUnitsFor(null)}
        />
      )}
    </Dialog>
  );
}
