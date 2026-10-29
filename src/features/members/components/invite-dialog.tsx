"use client";

import { useActionState, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Select,
  SelectItem,
  TextField,
} from "@windmorph/react";
import { FormError } from "@/features/auth/components/form-error";
import { useWorkspace } from "@/features/workspaces/workspace-context";
import { useSnackbar } from "@/lib/snackbar";
import { type InviteState, inviteMembers } from "../actions";
import type { RoleOption } from "../types";

const initialState: InviteState = { status: "idle" };

export function InviteDialog({
  roles,
  open,
  onOpenChange,
}: {
  roles: RoleOption[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("members.inviteDialog");
  const tc = useTranslations("members");
  const te = useTranslations("errors");
  const { workspace } = useWorkspace();
  const snackbar = useSnackbar();
  const [state, action, pending] = useActionState(
    inviteMembers.bind(null, workspace.id),
    initialState
  );
  const [emails, setEmails] = useState("");
  // Default to the least-privileged starter role.
  const [roleId, setRoleId] = useState(
    () =>
      (
        roles.find((r) => r.templateRoleKey === "member") ??
        roles.find((r) => !r.isSystem) ??
        roles[0]
      )?.id ?? ""
  );

  const sentCount = state.results?.filter((r) => !r.error).length ?? 0;
  const failed = state.results?.filter((r) => r.error) ?? [];

  useEffect(() => {
    if (state.results && sentCount > 0) void snackbar.showSnackbar(t("sent", { count: sentCount }));
    if (state.status === "success") onOpenChange(false);
  }, [state, sentCount, snackbar, t, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange} fullScreen="compact">
      <form action={action} noValidate className="contents">
        <DialogTitle>{t("title")}</DialogTitle>
        <DialogContent className="flex flex-col gap-4">
          <FormError error={state.error} />
          {failed.length > 0 && (
            <div role="status" className="text-body-medium text-error flex flex-col gap-1">
              <span>{t("failedFor")}</span>
              {failed.map((r) => (
                <span key={r.email}>{`${r.email}: ${r.error ? te(r.error) : ""}`}</span>
              ))}
            </div>
          )}
          <TextField
            className="w-full"
            name="emails"
            label={t("emails")}
            multiline
            rows={3}
            required
            value={emails}
            onChange={setEmails}
            supportingText={t("emailsHint")}
            invalid={Boolean(state.fieldErrors?.emails)}
            errorMessage={state.fieldErrors?.emails && te(state.fieldErrors.emails)}
          />
          <Select
            className="w-full"
            name="roleId"
            label={t("role")}
            value={roleId}
            onChange={(key) => key != null && setRoleId(String(key))}
            invalid={Boolean(state.fieldErrors?.roleId)}
          >
            {roles.map((role) => (
              <SelectItem key={role.id}>{role.name}</SelectItem>
            ))}
          </Select>
        </DialogContent>
        <DialogActions>
          <Button variant="text" onPress={() => onOpenChange(false)}>
            {tc("cancel")}
          </Button>
          <Button type="submit" variant="text" pending={pending}>
            {t("send")}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
