"use client";

import { useState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Button, Select, SelectItem } from "@windmorph/react";
import { CopyField } from "@/components/ui/copy-field";
import { useWorkspace } from "@/features/workspaces/workspace-context";
import { useSnackbar } from "@/lib/snackbar";
import { disableJoinLink, setJoinLink } from "../join-actions";
import type { JoinLink, RoleOption } from "../types";

const EXPIRY = ["never", "7", "30", "90"] as const;

/**
 * The workspace's join link: anyone who opens it can ask to join, and people who may invite
 * approve each request. The link itself is shown once, when it's made.
 */
export function JoinLinkCard({ link, roles }: { link: JoinLink | null; roles: RoleOption[] }) {
  const t = useTranslations("members.joinLink");
  const te = useTranslations("errors");
  const format = useFormatter();
  const { workspace } = useWorkspace();
  const snackbar = useSnackbar();
  const [pending, startTransition] = useTransition();
  const [shown, setShown] = useState<string | null>(null);
  const [roleId, setRoleId] = useState(
    link?.roleId ?? roles.find((r) => r.templateRoleKey === "member")?.id ?? roles[0]?.id ?? ""
  );
  const [expiry, setExpiry] = useState<(typeof EXPIRY)[number]>("30");

  function make() {
    startTransition(async () => {
      const result = await setJoinLink(
        workspace.id,
        roleId,
        expiry === "never" ? null : Number(expiry)
      );
      if (result.ok) setShown(result.link);
      else void snackbar.showSnackbar(te(result.error));
    });
  }
  function switchOff() {
    startTransition(async () => {
      const result = await disableJoinLink(workspace.id);
      setShown(null);
      void snackbar.showSnackbar(result.ok ? t("switchedOff") : te(result.error));
    });
  }

  const role = roles.find((r) => r.id === link?.roleId)?.name ?? "";
  return (
    <section aria-labelledby="join-link-title" className="max-w-form flex flex-col gap-3">
      <h3 id="join-link-title" className="text-title-large text-on-surface">
        {t("title")}
      </h3>
      <p className="text-body-medium text-on-surface-variant">{t("intro")}</p>
      {link && (
        <p className="text-body-medium text-on-surface">
          {t("on", {
            role,
            expires: link.expiresAt
              ? format.dateTime(new Date(link.expiresAt), { dateStyle: "medium" })
              : t("noExpiry"),
          })}
        </p>
      )}
      {shown && <CopyField label={t("link")} value={shown} />}
      <div className="grid gap-3 sm:grid-cols-2">
        <Select
          searchable={roles.length > 7}
          labels={{ search: t("role") }}
          className="w-full"
          label={t("role")}
          value={roleId}
          onChange={(key) => key != null && setRoleId(String(key))}
        >
          {roles.map((r) => (
            <SelectItem key={r.id}>{r.name}</SelectItem>
          ))}
        </Select>
        <Select
          className="w-full"
          label={t("expires")}
          value={expiry}
          onChange={(key) => key != null && setExpiry(key as (typeof EXPIRY)[number])}
        >
          {EXPIRY.map((e) => (
            <SelectItem key={e}>{t(`expiry.${e}`)}</SelectItem>
          ))}
        </Select>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant={link ? "outlined" : "filled"} pending={pending} onPress={make}>
          {t(link ? "replace" : "create")}
        </Button>
        {link && (
          <Button variant="text" disabled={pending} onPress={switchOff}>
            {t("switchOff")}
          </Button>
        )}
      </div>
    </section>
  );
}
