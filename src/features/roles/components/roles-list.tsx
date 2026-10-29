"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, List, ListItem } from "@windmorph/react";
import { Tag } from "@windmorph/react-pro";
import { Icon } from "@/components/ui/icon";
import { useCan, useWorkspace } from "@/features/workspaces/workspace-context";
import type { RoleSummary } from "../queries";
import { NewRoleDialog } from "./new-role-dialog";

export function RolesList({ roles }: { roles: RoleSummary[] }) {
  const t = useTranslations("roles");
  const { workspace } = useWorkspace();
  const canManage = useCan("roles.manage");
  const [creating, setCreating] = useState(false);

  return (
    <section aria-labelledby="roles-title" className="flex max-w-2xl flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="roles-title" className="text-headline-small text-on-surface">
          {t("title")}
        </h2>
        {canManage && (
          <Button
            variant="filled"
            leadingIcon={<Icon name="add" />}
            onPress={() => setCreating(true)}
          >
            {t("newRole")}
          </Button>
        )}
      </header>
      <p className="text-body-medium text-on-surface-variant">{t("intro")}</p>
      <List aria-label={t("title")}>
        {roles.map((role) => (
          <ListItem
            key={role.id}
            href={`/w/${workspace.slug}/settings/roles/${role.id}`}
            textValue={role.name}
            supportingText={role.description || undefined}
            trailing={
              role.isSystem ? (
                <Tag color="primary">{t("system")}</Tag>
              ) : role.archived ? (
                <Tag color="neutral">{t("archived")}</Tag>
              ) : (
                <Icon name="chevron_right" />
              )
            }
          >
            {role.name}
          </ListItem>
        ))}
      </List>
      {creating && <NewRoleDialog onClose={() => setCreating(false)} />}
    </section>
  );
}
