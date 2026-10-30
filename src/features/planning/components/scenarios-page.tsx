"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Button, List, ListItem, Switch, TextField } from "@windmorph/react";
import { EmptyState, Tag } from "@windmorph/react-pro";
import { FormDialog } from "@/components/ui/form-dialog";
import { Icon } from "@/components/ui/icon";
import { IsoDateField } from "@/components/ui/iso-date-field";
import { ItemMenu } from "@/components/ui/item-menu";
import { useRunAction } from "@/features/structure/use-run-action";
import { useWorkspace } from "@/features/workspaces/workspace-context";
import {
  applyRateCards,
  copyScenario,
  createScenario,
  deleteScenario,
  renameScenario,
  setLiveScenario,
  setScenarioArchived,
  setScenarioStatus,
} from "../scenario-actions";
import type { Scenario } from "../types";

type Editing = { kind: "new" } | { kind: "copy" | "rename"; scenario: Scenario };

/** Adds months to the first of a month, as an ISO date. */
function addMonths(month: string, count: number): string {
  const [year, m] = month.split("-").map(Number) as [number, number];
  const date = new Date(Date.UTC(year, m - 1 + count, 1));
  return date.toISOString().slice(0, 10);
}

/** The workspace's plans: create, copy, the submit and approve flow, the live plan and costs. */
export function ScenariosPage({
  scenarios,
  lifecycle,
  horizonYears,
}: {
  scenarios: Scenario[];
  lifecycle: boolean;
  horizonYears: number;
}) {
  const t = useTranslations("scenarios");
  const format = useFormatter();
  const { workspace, permissions } = useWorkspace();
  const [run, pending] = useRunAction();
  const [editing, setEditing] = useState<Editing | null>(null);
  const [fromPeople, setFromPeople] = useState(true);
  const canEdit = (permissions["planning.edit"] ?? []).includes("workspace");
  const canApprove = (permissions["planning.approve"]?.length ?? 0) > 0;
  const canApply = (permissions["rate_cards.apply"]?.length ?? 0) > 0;
  const thisMonth = `${new Date().toISOString().slice(0, 7)}-01`;

  const month = (iso: string) =>
    format.dateTime(new Date(`${iso}T00:00:00Z`), {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  const summary = (s: Scenario) =>
    [
      t("months", { from: month(s.firstPeriod), to: month(s.lastPeriod) }),
      s.baselineName && t("copiedFrom", { name: s.baselineName }),
      s.costsAppliedAt
        ? t("costsApplied", {
            date: format.dateTime(new Date(s.costsAppliedAt), { dateStyle: "medium" }),
          })
        : t("costsNotApplied"),
    ]
      .filter(Boolean)
      .join(" · ");

  function onAction(s: Scenario, key: string) {
    const name = s.name;
    if (key === "rename" || key === "copy") setEditing({ kind: key, scenario: s });
    if (key === "submit") run(() => setScenarioStatus(s.id, "submitted"), t("submitted", { name }));
    if (key === "approve") run(() => setScenarioStatus(s.id, "approved"), t("approved", { name }));
    if (key === "return") run(() => setScenarioStatus(s.id, "draft"), t("returned", { name }));
    if (key === "live") run(() => setLiveScenario(s.id), t("madeLive", { name }));
    if (key === "apply") run(() => applyRateCards(s.id), t("costsAppliedDone", { name }));
    if (key === "archive" || key === "restore")
      run(
        () => setScenarioArchived(s.id, key === "archive"),
        t(key === "archive" ? "archivedDone" : "restored", { name })
      );
    if (key === "delete") run(() => deleteScenario(s.id), t("deleted", { name }));
  }

  // Changes are allowed in drafts, or in any plan when the lifecycle is off.
  const open = (s: Scenario) => !s.archived && (!lifecycle || s.status === "draft");

  return (
    <section aria-labelledby="scenarios-title" className="flex max-w-4xl flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="scenarios-title" className="text-headline-small text-on-surface">
          {t("title")}
        </h2>
        {canEdit && (
          <Button
            variant="filled"
            leadingIcon={<Icon name="add" />}
            onPress={() => {
              setFromPeople(true);
              setEditing({ kind: "new" });
            }}
          >
            {t("add")}
          </Button>
        )}
      </header>
      <p className="text-body-medium text-on-surface-variant">
        {lifecycle ? t("introLifecycle") : t("intro")}
      </p>

      {scenarios.length === 0 ? (
        <EmptyState
          titleAs="h3"
          icon={<Icon name="insights" />}
          title={t("emptyTitle")}
          description={canEdit ? t("emptyEditor") : t("emptyViewer")}
        />
      ) : (
        <List aria-label={t("title")} aria-busy={pending || undefined}>
          {scenarios.map((s) => (
            <ListItem
              key={s.id}
              textValue={s.name}
              supportingText={summary(s)}
              trailing={
                <div className="flex items-center gap-2">
                  {s.isLive && <Tag color="primary">{t("live")}</Tag>}
                  {lifecycle && <Tag color="neutral">{t(`statuses.${s.status}`)}</Tag>}
                  {s.archived && <Tag color="neutral">{t("archived")}</Tag>}
                  <ItemMenu
                    label={t("actions", { name: s.name })}
                    onAction={(key) => onAction(s, key)}
                    actions={[
                      canEdit && { key: "rename", label: t("rename"), icon: "edit" },
                      canEdit && { key: "copy", label: t("copy"), icon: "content_copy" },
                      canApply && open(s) && { key: "apply", label: t("apply"), icon: "calculate" },
                      lifecycle &&
                        canEdit &&
                        open(s) && { key: "submit", label: t("submit"), icon: "send" },
                      lifecycle &&
                        canApprove &&
                        s.status === "submitted" && {
                          key: "approve",
                          label: t("approve"),
                          icon: "check_circle",
                        },
                      lifecycle &&
                        canApprove &&
                        s.status !== "draft" &&
                        !s.isLive && { key: "return", label: t("return"), icon: "undo" },
                      canApprove &&
                        !s.isLive &&
                        !s.archived &&
                        (!lifecycle || s.status === "approved") && {
                          key: "live",
                          label: t("makeLive"),
                          icon: "star",
                        },
                      canEdit &&
                        !s.isLive &&
                        (s.archived
                          ? { key: "restore", label: t("restore"), icon: "unarchive" }
                          : { key: "archive", label: t("archive"), icon: "archive" }),
                      canEdit && !s.isLive && { key: "delete", label: t("delete"), icon: "delete" },
                    ]}
                  />
                </div>
              }
            >
              {s.name}
            </ListItem>
          ))}
        </List>
      )}

      {editing?.kind === "new" && (
        <FormDialog
          title={t("dialogAdd")}
          submitLabel={t("create")}
          action={createScenario.bind(null, workspace.id)}
          done={(name) => t("created", { name })}
          onClose={() => setEditing(null)}
        >
          {(fieldError) => (
            <>
              <TextField
                className="w-full"
                name="name"
                label={t("name")}
                required
                invalid={Boolean(fieldError("name"))}
                errorMessage={fieldError("name")}
              />
              <div className="grid grid-cols-2 gap-4">
                <IsoDateField
                  name="firstPeriod"
                  label={t("firstMonth")}
                  defaultValue={thisMonth}
                  required
                  errorMessage={fieldError("firstPeriod")}
                />
                <IsoDateField
                  name="lastPeriod"
                  label={t("lastMonth")}
                  defaultValue={addMonths(thisMonth, horizonYears * 12 - 1)}
                  required
                  errorMessage={fieldError("lastPeriod")}
                />
              </div>
              <p className="text-body-small text-on-surface-variant">{t("monthsHelp")}</p>
              <Switch checked={fromPeople} onCheckedChange={setFromPeople}>
                {t("fromPeople")}
              </Switch>
              <p className="text-body-small text-on-surface-variant">{t("fromPeopleHelp")}</p>
              <input type="hidden" name="fromPeople" value={String(fromPeople)} />
            </>
          )}
        </FormDialog>
      )}
      {(editing?.kind === "copy" || editing?.kind === "rename") && (
        <FormDialog
          title={t(editing.kind === "copy" ? "dialogCopy" : "dialogRename")}
          submitLabel={t(editing.kind === "copy" ? "copy" : "save")}
          action={(editing.kind === "copy" ? copyScenario : renameScenario).bind(
            null,
            editing.scenario.id
          )}
          done={(name) => t(editing.kind === "copy" ? "copied" : "saved", { name })}
          onClose={() => setEditing(null)}
        >
          {(fieldError) => (
            <TextField
              className="w-full"
              name="name"
              label={t("name")}
              required
              defaultValue={
                editing.kind === "copy"
                  ? t("copyName", { name: editing.scenario.name })
                  : editing.scenario.name
              }
              invalid={Boolean(fieldError("name"))}
              errorMessage={fieldError("name")}
            />
          )}
        </FormDialog>
      )}
    </section>
  );
}
