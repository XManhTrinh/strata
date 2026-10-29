"use client";

import { useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  Menu,
  MenuItem,
  MenuTrigger,
} from "@windmorph/react";
import { Avatar, Tag } from "@windmorph/react-pro";
import { Icon } from "@/components/ui/icon";
import { useCan, useWorkspace } from "@/features/workspaces/workspace-context";
import { useSnackbar } from "@/lib/snackbar";
import { setMemberStatus } from "../actions";
import type { MemberRow, PendingInvitation, RoleOption } from "../types";
import { InviteDialog } from "./invite-dialog";
import { LeaveWorkspaceDialog, MakeOwnerDialog } from "./ownership-dialogs";
import { MemberRolesDialog } from "./member-roles-dialog";
import { PendingInvitations } from "./pending-invitations";

export function MembersSettings({
  members,
  roles,
  invitations,
}: {
  members: MemberRow[];
  roles: RoleOption[];
  invitations: PendingInvitation[];
}) {
  const t = useTranslations("members");
  const te = useTranslations("errors");
  const { workspace } = useWorkspace();
  const snackbar = useSnackbar();
  const canInvite = useCan("members.invite");
  const canManage = useCan("members.manage");
  const canAssign = useCan("roles.assign");
  const [inviteOpen, setInviteOpen] = useState(false);
  const [rolesFor, setRolesFor] = useState<MemberRow | null>(null);
  const [deactivating, setDeactivating] = useState<MemberRow | null>(null);
  const [makingOwner, setMakingOwner] = useState<MemberRow | null>(null);
  const [leaving, setLeaving] = useState(false);
  const iAmOwner = members.some((m) => m.isYou && m.isOwner);
  const canMakeOwner = (m: MemberRow) =>
    iAmOwner && !m.isYou && !m.isOwner && m.status === "active" && m.hasAccount;
  const [pending, startTransition] = useTransition();
  const roleName = (id: string) => roles.find((r) => r.id === id)?.name ?? "";

  function changeStatus(member: MemberRow, status: "active" | "inactive") {
    startTransition(async () => {
      const result = await setMemberStatus(workspace.id, member.id, status);
      setDeactivating(null);
      void snackbar.showSnackbar(
        result.ok
          ? t(status === "inactive" ? "deactivated" : "reactivated", { name: member.fullName })
          : te(result.error)
      );
    });
  }

  return (
    <section className="flex flex-col gap-8" aria-labelledby="members-title">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="members-title" className="text-headline-small text-on-surface">
          {t("title")}
        </h2>
        {canInvite && (
          <Button
            variant="filled"
            leadingIcon={<Icon name="person_add" />}
            onPress={() => setInviteOpen(true)}
          >
            {t("invite")}
          </Button>
        )}
      </header>

      <List aria-label={t("title")}>
        {members.map((member) => {
          const actions =
            member.isYou || canAssign || (canManage && !member.isOwner) || canMakeOwner(member);
          return (
            <ListItem
              key={member.id}
              textValue={member.fullName}
              leading={
                <Avatar
                  name={member.fullName}
                  src={member.avatarUrl ?? undefined}
                  decorative
                  size="md"
                />
              }
              supportingText={member.email ?? undefined}
              trailing={
                <span className="flex items-center gap-2">
                  {member.isOwner && <Tag color="primary">{t("owner")}</Tag>}
                  {member.status !== "active" && (
                    <Tag color="neutral">{t(`status.${member.status}`)}</Tag>
                  )}
                  <span className="text-body-medium text-on-surface-variant expanded:inline hidden">
                    {member.roleIds.map(roleName).join(", ") || t("noRoles")}
                  </span>
                  {actions && (
                    <MenuTrigger>
                      <IconButton
                        aria-label={t("actions", { name: member.fullName })}
                        icon={<Icon name="more_vert" />}
                      />
                      <Menu
                        aria-label={t("actions", { name: member.fullName })}
                        onAction={(key) => {
                          if (key === "roles") setRolesFor(member);
                          if (key === "deactivate") setDeactivating(member);
                          if (key === "reactivate") changeStatus(member, "active");
                          if (key === "make-owner") setMakingOwner(member);
                          if (key === "leave") setLeaving(true);
                        }}
                      >
                        {[
                          !member.isYou && canAssign && (
                            <MenuItem
                              key="roles"
                              leadingIcon={<Icon name="admin_panel_settings" />}
                            >
                              {t("changeRoles")}
                            </MenuItem>
                          ),
                          !member.isYou &&
                            canManage &&
                            !member.isOwner &&
                            member.status === "active" && (
                              <MenuItem key="deactivate" leadingIcon={<Icon name="person_off" />}>
                                {t("deactivate")}
                              </MenuItem>
                            ),
                          !member.isYou && canManage && member.status === "inactive" && (
                            <MenuItem key="reactivate" leadingIcon={<Icon name="person_check" />}>
                              {t("reactivate")}
                            </MenuItem>
                          ),
                          canMakeOwner(member) && (
                            <MenuItem key="make-owner" leadingIcon={<Icon name="shield_person" />}>
                              {t("makeOwner")}
                            </MenuItem>
                          ),
                          member.isYou && (
                            <MenuItem key="leave" leadingIcon={<Icon name="logout" />}>
                              {t("leave")}
                            </MenuItem>
                          ),
                        ].filter((item) => item !== false)}
                      </Menu>
                    </MenuTrigger>
                  )}
                  {member.isYou && (
                    <span className="text-label-large text-primary">{t("you")}</span>
                  )}
                </span>
              }
            >
              {member.fullName}
            </ListItem>
          );
        })}
      </List>

      {canInvite && (
        <section className="flex flex-col gap-3" aria-labelledby="pending-title">
          <h3 id="pending-title" className="text-title-large text-on-surface">
            {t("pending.title")}
          </h3>
          <PendingInvitations invitations={invitations} roles={roles} />
        </section>
      )}

      {canInvite && <InviteDialog roles={roles} open={inviteOpen} onOpenChange={setInviteOpen} />}
      {rolesFor && (
        <MemberRolesDialog member={rolesFor} roles={roles} onClose={() => setRolesFor(null)} />
      )}
      {makingOwner && <MakeOwnerDialog member={makingOwner} onClose={() => setMakingOwner(null)} />}
      {leaving && <LeaveWorkspaceDialog onClose={() => setLeaving(false)} />}
      {deactivating && (
        <Dialog open onOpenChange={(open) => !open && setDeactivating(null)}>
          <DialogTitle>{t("deactivateTitle", { name: deactivating.fullName })}</DialogTitle>
          <DialogContent>{t("deactivateBody")}</DialogContent>
          <DialogActions>
            <Button variant="text" onPress={() => setDeactivating(null)}>
              {t("cancel")}
            </Button>
            <Button
              variant="text"
              pending={pending}
              onPress={() => changeStatus(deactivating, "inactive")}
            >
              {t("deactivate")}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </section>
  );
}
