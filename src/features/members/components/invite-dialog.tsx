"use client";

import { CopyField } from "@/components/ui/copy-field";
import { FORM_DIALOG_CLASSES } from "@/components/ui/form-dialog";
import { useFormAction } from "@/lib/use-form-action";
import { useEffect, useState } from "react";
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
  emailOn,
  open,
  onOpenChange,
}: {
  roles: RoleOption[];
  /** Whether invitations go by email; otherwise the dialog gives links to share. */
  emailOn: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const t = useTranslations("members.inviteDialog");
  const tc = useTranslations("members");
  const te = useTranslations("errors");
  const { workspace } = useWorkspace();
  const snackbar = useSnackbar();
  const [state, onSubmit, pending] = useFormAction(
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

  const sentCount = state.results?.filter((r) => !r.error && !r.link).length ?? 0;
  const failed = state.results?.filter((r) => r.error) ?? [];
  const links = state.results?.filter((r) => r.link) ?? [];

  useEffect(() => {
    if (state.results && sentCount > 0) void snackbar.showSnackbar(t("sent", { count: sentCount }));
    // With links to share, the dialog stays open to show them.
    if (state.status === "success" && !state.results?.some((r) => r.link)) onOpenChange(false);
  }, [state, sentCount, snackbar, t, onOpenChange]);

  return (
    <Dialog
      open={open}
      onOpenChange={onOpenChange}
      fullScreen="compact"
      classNames={FORM_DIALOG_CLASSES}
    >
      <form onSubmit={onSubmit} noValidate className="contents">
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
          {links.length > 0 && (
            <div role="status" className="flex flex-col gap-3">
              <p className="text-body-medium text-on-surface">{t("shareLinks")}</p>
              {links.map((r) => (
                <CopyField key={r.email} label={r.email} value={r.link!} />
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
            searchable={roles.length > 7}
            labels={{ search: t("role") }}
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
            {t(emailOn ? "send" : "create")}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
