"use client";

import { useTranslations } from "next-intl";
import { Select, SelectItem, Switch } from "@windmorph/react";
import type { Database } from "@/lib/supabase/database.types";

type Reach = Database["public"]["Enums"]["reach"];

// "Specific units" arrives with the hierarchy in Phase 2.
const REACH_OPTIONS = ["none", "own", "reports", "team", "team_and_below", "workspace"] as const;

export type PermissionDef = { key: string; featureKey: string; isScoped: boolean };

/** One permission: a reach choice for permissions on people, an on/off switch otherwise. */
export function PermissionRow({
  permission,
  reach,
  readOnly,
  onChange,
}: {
  permission: PermissionDef;
  reach: Reach | null;
  readOnly: boolean;
  onChange: (reach: Reach | null) => void;
}) {
  const t = useTranslations("roles");
  const tp = useTranslations("permissions");
  // Keys look like "people.view", which next-intl reads as nested messages.
  const name = tp(`${permission.key}.name` as Parameters<typeof tp>[0]);
  const description = tp(`${permission.key}.description` as Parameters<typeof tp>[0]);

  return (
    <div className="medium:flex-row medium:items-center flex flex-col gap-3 py-3">
      <div className="flex min-w-0 flex-1 flex-col">
        <span className="text-body-large text-on-surface">{name}</span>
        <span className="text-body-medium text-on-surface-variant">{description}</span>
      </div>
      {permission.isScoped ? (
        <Select
          className="medium:w-56 w-full"
          aria-label={t("reachLabel", { permission: name })}
          value={reach ?? "none"}
          disabled={readOnly}
          onChange={(key) => key != null && onChange(key === "none" ? null : (key as Reach))}
        >
          {REACH_OPTIONS.map((option) => (
            <SelectItem key={option}>{t(`reach.${option}`)}</SelectItem>
          ))}
        </Select>
      ) : (
        <Switch
          aria-label={name}
          checked={reach !== null}
          disabled={readOnly}
          onCheckedChange={(on) => onChange(on ? "workspace" : null)}
        />
      )}
    </div>
  );
}
