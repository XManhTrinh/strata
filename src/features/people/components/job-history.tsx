"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import {
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  List,
  ListItem,
} from "@windmorph/react";
import { Tag } from "@windmorph/react-pro";
import { ItemMenu } from "@/components/ui/item-menu";
import { useRunAction } from "@/features/structure/use-run-action";
import { removeJobChange } from "../actions";
import type { JobRecord } from "../types";

/** Every dated job record, newest first: scheduled changes, the current one, then the past. */
export function JobHistory({ jobs, canEdit }: { jobs: JobRecord[]; canEdit: boolean }) {
  const t = useTranslations("person.jobRecord");
  const tc = useTranslations("common");
  const format = useFormatter();
  const [run] = useRunAction();
  const [removing, setRemoving] = useState<JobRecord | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const date = (iso: string) =>
    format.dateTime(new Date(iso), { dateStyle: "medium", timeZone: "UTC" });
  const first = jobs.at(-1);

  return (
    <>
      <List aria-label={t("title")}>
        {jobs.map((job) => {
          const scheduled = job.validFrom > today;
          const current = !scheduled && (!job.validTo || job.validTo > today);
          const period = job.validTo
            ? t("fromTo", { from: date(job.validFrom), to: date(job.validTo) })
            : t("fromOn", { from: date(job.validFrom) });
          const summary = [job.positionName, job.unitName].filter(Boolean).join(" · ");
          return (
            <ListItem
              key={job.id}
              textValue={`${period} ${summary}`}
              overline={period}
              supportingText={[
                job.managerName && `${t("manager")}: ${job.managerName}`,
                job.careerLevelName,
                job.employmentTypeName,
              ]
                .filter(Boolean)
                .join(" · ")}
              trailing={
                <div className="flex items-center gap-2">
                  {scheduled && <Tag color="primary">{t("scheduled")}</Tag>}
                  {current && <Tag color="neutral">{t("current")}</Tag>}
                  {canEdit && job.id !== first?.id && (
                    <ItemMenu
                      label={t("remove")}
                      actions={[{ key: "remove", label: t("remove"), icon: "delete" }]}
                      onAction={() => setRemoving(job)}
                    />
                  )}
                </div>
              }
            >
              {summary || t("none")}
            </ListItem>
          );
        })}
      </List>
      {removing && (
        <Dialog open onOpenChange={(open) => !open && setRemoving(null)}>
          <DialogTitle>{t("removeTitle")}</DialogTitle>
          <DialogContent>{t("removeBody")}</DialogContent>
          <DialogActions>
            <Button variant="text" onPress={() => setRemoving(null)}>
              {tc("cancel")}
            </Button>
            <Button
              variant="text"
              onPress={() => {
                run(() => removeJobChange(removing.id), t("removed"));
                setRemoving(null);
              }}
            >
              {t("remove")}
            </Button>
          </DialogActions>
        </Dialog>
      )}
    </>
  );
}
