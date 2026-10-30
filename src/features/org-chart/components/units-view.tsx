"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, List, ListItem } from "@windmorph/react";
import { Avatar } from "@windmorph/react-pro";
import { TreeView } from "@/components/ui/tree-view";
import { buildTree } from "@/features/structure/hierarchy";
import type { OrgLevel, OrgUnit } from "@/features/structure/types";
import type { ChartPerson, UnitCount } from "../types";

/** The unit tree with headcounts on the date; a unit's people beside it. */
export function UnitsView({
  units,
  levels,
  counts,
  selectedUnitId,
  people,
  unitHref,
  profileHref,
}: {
  units: OrgUnit[];
  levels: OrgLevel[];
  counts: UnitCount[];
  selectedUnitId: string | null;
  people: ChartPerson[];
  unitHref: (unitId: string) => string;
  profileHref: (person: ChartPerson) => string;
}) {
  const t = useTranslations("orgChart");
  const tree = buildTree(units, false);
  const count = new Map(counts.map((c) => [c.id, c]));
  const level = new Map(levels.map((l) => [l.id, l.name]));
  const [expanded, setExpanded] = useState<Set<string | number>>(
    () => new Set(tree.map((n) => n.id))
  );
  const selected = units.find((u) => u.id === selectedUnitId);

  return (
    <div className="expanded:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] grid gap-6">
      <TreeView
        aria-label={t("views.units")}
        items={tree}
        textValue={(u) => u.name}
        expandedKeys={expanded}
        onExpandedChange={setExpanded}
        dependencies={[counts, selectedUnitId]}
      >
        {(unit) => {
          const c = count.get(unit.id);
          return (
            <>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="truncate">{unit.name}</span>
                <span className="text-body-small text-on-surface-variant truncate">
                  {[
                    unit.levelId && level.get(unit.levelId),
                    t("unitCount", { direct: c?.direct ?? 0, total: c?.total ?? 0 }),
                  ]
                    .filter(Boolean)
                    .join(" · ")}
                </span>
              </span>
              <Button
                variant={unit.id === selectedUnitId ? "tonal" : "text"}
                href={unitHref(unit.id)}
                aria-label={t("unitPeople", { unit: unit.name })}
              >
                {c?.direct ?? 0}
              </Button>
            </>
          );
        }}
      </TreeView>
      <section className="flex flex-col gap-2">
        {selected ? (
          <>
            <h2 className="text-title-medium text-on-surface px-4">
              {t("unitPeople", { unit: selected.name })}
            </h2>
            <List aria-label={t("unitPeople", { unit: selected.name })}>
              {people.map((p) => (
                <ListItem
                  key={p.id}
                  href={profileHref(p)}
                  textValue={p.name}
                  leading={
                    <Avatar name={p.name} src={p.avatarUrl ?? undefined} size="sm" decorative />
                  }
                  supportingText={p.position ?? undefined}
                >
                  {p.name}
                </ListItem>
              ))}
            </List>
          </>
        ) : (
          <p className="text-body-medium text-on-surface-variant px-4">{t("chooseUnit")}</p>
        )}
      </section>
    </div>
  );
}
