"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Select, SelectItem, Switch, TextField } from "@windmorph/react";
import { FormDialog } from "@/components/ui/form-dialog";
import { Icon } from "@/components/ui/icon";
import { PersonPicker } from "@/features/people/components/person-picker";
import { useWorkspace } from "@/features/workspaces/workspace-context";
import { saveTimeType } from "../settings-actions";
import type { RoleChoice, TimeType } from "../types";

/** Colours chosen from a fixed set, so every type stays readable on the calendar. */
const TYPE_COLORS = {
  green: "#2E7D32",
  red: "#C62828",
  purple: "#6A1B9A",
  teal: "#00838F",
  blue: "#1565C0",
  orange: "#EF6C00",
  brown: "#6D4C41",
  grey: "#546E7A",
} as const;
const ICONS = [
  "beach_access",
  "sick",
  "school",
  "home_work",
  "groups",
  "event",
  "flight",
  "child_friendly",
  "volunteer_activism",
  "work_off",
] as const;
const FLAGS = [
  "usesAllowance",
  "needsApproval",
  "isAway",
  "paid",
  "bookForOthers",
  "allowsRecurrence",
] as const;
type Flag = (typeof FLAGS)[number];

export function TimeTypeDialog({
  type,
  roles,
  onClose,
}: {
  type?: TimeType;
  roles: RoleChoice[];
  onClose: () => void;
}) {
  const t = useTranslations("timeSettings");
  const { workspace } = useWorkspace();
  const [flags, setFlags] = useState<Record<Flag, boolean>>({
    usesAllowance: type?.usesAllowance ?? false,
    needsApproval: type?.needsApproval ?? false,
    isAway: type?.isAway ?? true,
    paid: type?.paid ?? true,
    bookForOthers: type?.bookForOthers ?? true,
    allowsRecurrence: type?.allowsRecurrence ?? false,
  });
  const [approver, setApprover] = useState<string>(
    type && type.approver !== "none" ? type.approver : "line_manager"
  );
  const colorKey =
    (Object.entries(TYPE_COLORS).find(
      ([, hex]) => hex.toLowerCase() === type?.color.toLowerCase()
    )?.[0] as keyof typeof TYPE_COLORS | undefined) ?? "blue";
  // Only events repeat: no allowance and no approval.
  const canRepeat = !flags.usesAllowance && !flags.needsApproval;

  const select = (
    name: string,
    label: string,
    value: string,
    options: [string, string][],
    onChange?: (v: string) => void
  ) => (
    <Select
      className="w-full"
      name={name}
      label={label}
      defaultValue={onChange ? undefined : value}
      value={onChange ? value : undefined}
      onChange={onChange ? (key) => key != null && onChange(String(key)) : undefined}
    >
      {options.map(([key, text]) => (
        <SelectItem key={key}>{text}</SelectItem>
      ))}
    </Select>
  );

  return (
    <FormDialog
      title={t(type ? "types.dialogEdit" : "types.dialogAdd")}
      submitLabel={t(type ? "save" : "add")}
      action={saveTimeType.bind(null, workspace.id, type?.id ?? null)}
      done={(name) => t(type ? "saved" : "added", { name })}
      onClose={onClose}
    >
      {(fieldError) => (
        <>
          <TextField
            className="w-full"
            name="name"
            label={t("name")}
            required
            defaultValue={type?.name ?? ""}
            invalid={Boolean(fieldError("name"))}
            errorMessage={fieldError("name")}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              className="w-full"
              name="color"
              label={t("types.color")}
              defaultValue={TYPE_COLORS[colorKey]}
            >
              {Object.entries(TYPE_COLORS).map(([key, hex]) => (
                <SelectItem
                  key={hex}
                  textValue={t(`types.colors.${key as keyof typeof TYPE_COLORS}`)}
                  leadingIcon={
                    <span
                      className="inline-block size-4 rounded-full"
                      style={{ background: hex }}
                    />
                  }
                >
                  {t(`types.colors.${key as keyof typeof TYPE_COLORS}`)}
                </SelectItem>
              ))}
            </Select>
            <Select
              className="w-full"
              name="icon"
              label={t("types.icon")}
              defaultValue={type?.icon ?? "event"}
            >
              {ICONS.map((icon) => (
                <SelectItem
                  key={icon}
                  textValue={t(`types.icons.${icon}`)}
                  leadingIcon={<Icon name={icon} />}
                >
                  {t(`types.icons.${icon}`)}
                </SelectItem>
              ))}
            </Select>
          </div>
          {FLAGS.map((flag) =>
            flag === "allowsRecurrence" && !canRepeat ? null : (
              <div key={flag} className="flex flex-col gap-1">
                <Switch
                  checked={flags[flag]}
                  onCheckedChange={(on) => setFlags({ ...flags, [flag]: on })}
                >
                  {t(`types.${flag}`)}
                </Switch>
                <span className="text-body-small text-on-surface-variant">
                  {t(`types.${flag}Help`)}
                </span>
                <input
                  type="hidden"
                  name={flag}
                  value={String(flags[flag] && (flag !== "allowsRecurrence" || canRepeat))}
                />
              </div>
            )
          )}
          {flags.needsApproval ? (
            <>
              {select(
                "approver",
                t("types.approver"),
                approver,
                (["line_manager", "team_lead", "person", "role"] as const).map((a) => [
                  a,
                  t(`types.approvers.${a}`),
                ]),
                setApprover
              )}
              {approver === "person" && (
                <PersonPicker
                  name="approverMemberId"
                  label={t("types.approverPerson")}
                  defaultValue={
                    type?.approverMemberId
                      ? { id: type.approverMemberId, name: type.approverMemberName ?? "" }
                      : null
                  }
                />
              )}
              {approver === "role" &&
                select(
                  "approverRoleId",
                  t("types.approverRole"),
                  type?.approverRoleId ?? roles[0]?.id ?? "",
                  roles.map((r) => [r.id, r.name])
                )}
            </>
          ) : (
            <input type="hidden" name="approver" value="none" />
          )}
          {select(
            "visibility",
            t("types.visibility"),
            type?.visibility ?? "everyone",
            (["everyone", "team", "private"] as const).map((v) => [v, t(`types.visibilities.${v}`)])
          )}
          {select(
            "bookableBy",
            t("types.bookableBy"),
            type?.bookableBy ?? "everyone",
            (["everyone", "managers", "admins"] as const).map((v) => [v, t(`types.bookables.${v}`)])
          )}
          {select("notifyRoleId", t("types.notifyRole"), type?.notifyRoleId ?? "none", [
            ["none", t("types.notifyNone")],
            ...roles.map((r): [string, string] => [r.id, r.name]),
          ])}
        </>
      )}
    </FormDialog>
  );
}
