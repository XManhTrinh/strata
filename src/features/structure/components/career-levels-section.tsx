"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button, TextField } from "@windmorph/react";
import { Icon } from "@/components/ui/icon";
import { useWorkspace } from "@/features/workspaces/workspace-context";
import { saveCareerLevel } from "../job-actions";
import type { CareerLevel } from "../types";
import { FormDialog } from "@/components/ui/form-dialog";
import { OrderedEntries } from "./ordered-entries";

/** The career ladder, one list per track, junior first. */
export function CareerLevelsSection({ levels }: { levels: CareerLevel[] }) {
  const t = useTranslations("jobs");
  const { workspace } = useWorkspace();
  const [editing, setEditing] = useState<CareerLevel | "new" | null>(null);
  const tracks = [...new Set(levels.map((l) => l.track))];
  const level = editing === "new" ? null : editing;

  return (
    <section aria-labelledby="career-levels-title" className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h3 id="career-levels-title" className="text-title-large text-on-surface">
          {t("levels.title")}
        </h3>
        <Button variant="tonal" leadingIcon={<Icon name="add" />} onPress={() => setEditing("new")}>
          {t("levels.add")}
        </Button>
      </header>
      <p className="text-body-medium text-on-surface-variant">
        {levels.length ? t("levels.intro") : t("levels.empty")}
      </p>
      {tracks.map((track) => {
        const label = track ?? t("levels.noTrack");
        return (
          <div key={track ?? ""} className="flex flex-col gap-1">
            {(tracks.length > 1 || track) && (
              <h4 className="text-title-small text-on-surface-variant px-4">{label}</h4>
            )}
            <OrderedEntries
              label={tracks.length > 1 || track ? label : t("levels.title")}
              table="career_levels"
              entries={levels.filter((l) => l.track === track)}
              onEdit={setEditing}
            />
          </div>
        );
      })}
      {editing && (
        <FormDialog
          title={t(level ? "levels.dialogEdit" : "levels.dialogAdd")}
          submitLabel={t(level ? "save" : "add")}
          action={saveCareerLevel.bind(
            null,
            workspace.id,
            level && { id: level.id, track: level.track }
          )}
          done={(name) => t(level ? "saved" : "added", { name })}
          onClose={() => setEditing(null)}
        >
          {(fieldError) => (
            <>
              <TextField
                className="w-full"
                name="name"
                label={t("name")}
                required
                defaultValue={level?.name ?? ""}
                invalid={Boolean(fieldError("name"))}
                errorMessage={fieldError("name")}
              />
              <TextField
                className="w-full"
                name="track"
                label={t("levels.track")}
                supportingText={t("levels.trackHelp")}
                defaultValue={level?.track ?? ""}
              />
            </>
          )}
        </FormDialog>
      )}
    </section>
  );
}
