"use client";

import { useOptimistic, useState, useTransition } from "react";
import { useTranslations } from "next-intl";
import { Button, Divider, IconButton, TextField } from "@windmorph/react";
import { Alert, Tag } from "@windmorph/react-pro";
import { Icon } from "@/components/ui/icon";
import { useCan, useWorkspace } from "@/features/workspaces/workspace-context";
import { useSnackbar } from "@/lib/snackbar";
import type { Database } from "@/lib/supabase/database.types";
import { setRoleArchived, setRolePermission, updateRoleDetails } from "../actions";
import type { RoleSummary } from "../queries";
import { NewRoleDialog } from "./new-role-dialog";
import { type PermissionDef, PermissionRow } from "./permission-row";

type Reach = Database["public"]["Enums"]["reach"];
type FeatureKey =
  "workspace" | "members" | "roles" | "people" | "org_chart" | "time" | "planning" | "rate_cards";

export function RoleEditor({
  role,
  features,
  permissions,
  grants,
}: {
  role: RoleSummary;
  features: { key: string; on: boolean }[];
  permissions: PermissionDef[];
  grants: Record<string, Reach>;
}) {
  const t = useTranslations("roles");
  const te = useTranslations("errors");
  const { workspace } = useWorkspace();
  const snackbar = useSnackbar();
  const canManage = useCan("roles.manage");
  const readOnly = !canManage || role.isSystem;
  const [, startTransition] = useTransition();
  const [name, setName] = useState(role.name);
  const [description, setDescription] = useState(role.description);
  const [duplicating, setDuplicating] = useState(false);
  const [current, setOptimistic] = useOptimistic(
    grants,
    (state: Record<string, Reach>, change: { key: string; reach: Reach | null }) => {
      const next = { ...state };
      if (change.reach) next[change.key] = change.reach;
      else delete next[change.key];
      return next;
    }
  );

  function run(
    action: () => Promise<{ ok: boolean; error?: Parameters<typeof te>[0] }>,
    done: string
  ) {
    startTransition(async () => {
      const result = await action();
      void snackbar.showSnackbar(result.ok ? done : te(result.error ?? "generic"));
    });
  }

  function change(key: string, reach: Reach | null) {
    startTransition(async () => {
      setOptimistic({ key, reach });
      const result = await setRolePermission(workspace.id, role.id, key, reach);
      if (!result.ok) void snackbar.showSnackbar(te(result.error));
    });
  }

  return (
    <section aria-labelledby="role-title" className="flex max-w-3xl flex-col gap-6">
      <header className="flex flex-wrap items-center gap-3">
        <IconButton
          href={`/w/${workspace.slug}/settings/roles`}
          aria-label={t("back")}
          icon={<Icon name="arrow_back" />}
        />
        <h2 id="role-title" className="text-headline-small text-on-surface flex-1">
          {role.name}
        </h2>
        {role.isSystem && <Tag color="primary">{t("system")}</Tag>}
        {role.archived && <Tag color="neutral">{t("archived")}</Tag>}
        {canManage && !role.isSystem && (
          <>
            <Button variant="outlined" onPress={() => setDuplicating(true)}>
              {t("duplicate")}
            </Button>
            <Button
              variant="text"
              onPress={() =>
                run(
                  () => setRoleArchived(role.id, !role.archived),
                  t(role.archived ? "restoredDone" : "archivedDone")
                )
              }
            >
              {role.archived ? t("restore") : t("archive")}
            </Button>
          </>
        )}
      </header>

      {role.isSystem && <Alert severity="info">{t("adminNotice")}</Alert>}
      {!role.isSystem && !canManage && <Alert severity="info">{t("readOnly")}</Alert>}

      {!readOnly && (
        <div className="flex flex-col gap-4">
          <TextField className="w-full" label={t("fields.name")} value={name} onChange={setName} />
          <TextField
            className="w-full"
            label={t("fields.description")}
            multiline
            rows={2}
            value={description}
            onChange={setDescription}
          />
          <Button
            variant="tonal"
            className="self-end"
            disabled={name === role.name && description === role.description}
            onPress={() => run(() => updateRoleDetails(role.id, name, description), t("saved"))}
          >
            {t("save")}
          </Button>
        </div>
      )}

      {features.map((feature) => (
        <section
          key={feature.key}
          aria-labelledby={`feature-${feature.key}`}
          className="flex flex-col"
        >
          <Divider />
          <h3
            id={`feature-${feature.key}`}
            className="text-title-medium text-on-surface flex items-center gap-2 pt-4"
          >
            {t(`features.${feature.key as FeatureKey}`)}
            {!feature.on && <Tag color="neutral">{t("featureOff")}</Tag>}
          </h3>
          {permissions
            .filter((p) => p.featureKey === feature.key)
            .map((permission) => (
              <PermissionRow
                key={permission.key}
                permission={permission}
                reach={role.isSystem ? "workspace" : (current[permission.key] ?? null)}
                readOnly={readOnly}
                onChange={(reach) => change(permission.key, reach)}
              />
            ))}
        </section>
      ))}

      {duplicating && <NewRoleDialog copyFrom={role} onClose={() => setDuplicating(false)} />}
    </section>
  );
}
