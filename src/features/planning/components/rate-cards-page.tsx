"use client";

import { useState, useTransition } from "react";
import { useFormatter, useTranslations } from "next-intl";
import { Button, List, ListItem, Select, SelectItem, TextField } from "@windmorph/react";
import { Tag } from "@windmorph/react-pro";
import { FormDialog } from "@/components/ui/form-dialog";
import { Icon } from "@/components/ui/icon";
import { IsoDateField } from "@/components/ui/iso-date-field";
import { ItemMenu } from "@/components/ui/item-menu";
import { PersonPicker } from "@/features/people/components/person-picker";
import { useRunAction } from "@/features/structure/use-run-action";
import { useWorkspace } from "@/features/workspaces/workspace-context";
import {
  deleteRateCardContainer,
  previewRateCard,
  saveRateCardGroup,
  saveRateCardSet,
  setRateCardArchived,
} from "../actions";
import type { FieldChoice, RateCard, RateCardGroup, RateCardPreview, RateCardSet } from "../types";
import { RateCardDialog } from "./rate-card-dialog";

type Editing =
  | { kind: "card"; card?: RateCard }
  | { kind: "set"; set?: RateCardSet }
  | { kind: "group"; group?: RateCardGroup };

/**
 * Rate cards in their sets and groups (which only organise the screen), in the order they are
 * tried, with a preview of which card someone gets.
 */
export function RateCardsPage({
  sets,
  groups,
  cards,
  fields,
  currency,
  canEdit,
}: {
  sets: RateCardSet[];
  groups: RateCardGroup[];
  cards: RateCard[];
  fields: FieldChoice[];
  currency: string;
  canEdit: boolean;
}) {
  const t = useTranslations("rateCards");
  const format = useFormatter();
  const { workspace } = useWorkspace();
  const [run, pending] = useRunAction();
  const [editing, setEditing] = useState<Editing | null>(null);
  const thisMonth = `${new Date().toISOString().slice(0, 7)}-01`;

  const fieldLabel = (field: string) =>
    field.startsWith("custom:")
      ? (fields.find((f) => `custom:${f.key}` === field)?.label ?? field)
      : t(`fields.${field as "unit"}`);
  const summary = (card: RateCard) => {
    const who = card.isDefault
      ? t("everyoneElse")
      : card.conditions
          .map((c) => `${fieldLabel(c.field)} ${t(`operators.${c.operator}`)} ${c.value}`)
          .join(t("and"));
    const rate = [...card.rates].reverse().find((r) => r.validFrom <= thisMonth);
    return [
      t("priorityShort", { priority: card.priority }),
      who,
      rate
        ? t("rateNow", {
            amount: format.number(rate.dayRate, { style: "currency", currency: rate.currency }),
            days: rate.workingDays,
          })
        : t("noRateNow"),
    ].join(" · ");
  };

  const cardList = (list: RateCard[], label: string) =>
    list.length === 0 ? (
      <p className="text-body-medium text-on-surface-variant px-4">{t("noCards")}</p>
    ) : (
      <List aria-label={label} aria-busy={pending || undefined} className="max-w-form">
        {list.map((card) => (
          <ListItem
            key={card.id}
            textValue={card.name}
            supportingText={summary(card)}
            trailing={
              <div className="flex items-center gap-2">
                {card.isDefault && <Tag color="primary">{t("default")}</Tag>}
                {card.archived && <Tag color="neutral">{t("archived")}</Tag>}
                {canEdit && (
                  <ItemMenu
                    label={t("actions", { name: card.name })}
                    onAction={(key) => {
                      if (key === "edit") setEditing({ kind: "card", card });
                      if (key === "archive" || key === "restore")
                        run(
                          () => setRateCardArchived(card.id, key === "archive"),
                          t(key === "archive" ? "archivedDone" : "restored", { name: card.name })
                        );
                    }}
                    actions={[
                      { key: "edit", label: t("edit"), icon: "edit" },
                      card.archived
                        ? { key: "restore", label: t("restore"), icon: "unarchive" }
                        : { key: "archive", label: t("archive"), icon: "archive" },
                    ]}
                  />
                )}
              </div>
            }
          >
            {card.name}
          </ListItem>
        ))}
      </List>
    );

  const containerMenu = (
    kind: "set" | "group",
    item: RateCardSet | RateCardGroup,
    onEdit: () => void
  ) =>
    canEdit && (
      <ItemMenu
        label={t("actions", { name: item.name })}
        onAction={(key) => {
          if (key === "edit") onEdit();
          if (key === "delete")
            run(
              () =>
                deleteRateCardContainer(
                  kind === "set" ? "rate_card_sets" : "rate_card_groups",
                  item.id
                ),
              t("deleted", { name: item.name })
            );
        }}
        actions={[
          { key: "edit", label: t("rename"), icon: "edit" },
          { key: "delete", label: t("delete"), icon: "delete" },
        ]}
      />
    );

  const groupSection = (group: RateCardGroup) => (
    <section key={group.id} className="flex flex-col gap-1">
      <div className="flex items-center justify-between gap-2 px-4">
        <h4 className="text-title-small text-on-surface-variant">{group.name}</h4>
        {containerMenu("group", group, () => setEditing({ kind: "group", group }))}
      </div>
      {cardList(
        cards.filter((c) => c.groupId === group.id),
        group.name
      )}
    </section>
  );
  const ungrouped = cards.filter((c) => !c.groupId);
  const looseGroups = groups.filter((g) => !g.setId);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_20rem]">
      <section aria-labelledby="rate-cards-title" className="flex flex-col gap-4">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <h2 id="rate-cards-title" className="text-headline-small text-on-surface">
            {t("title")}
          </h2>
          {canEdit && (
            <div className="flex flex-wrap gap-2">
              <Button variant="outlined" onPress={() => setEditing({ kind: "set" })}>
                {t("addSet")}
              </Button>
              <Button variant="outlined" onPress={() => setEditing({ kind: "group" })}>
                {t("addGroup")}
              </Button>
              <Button
                variant="filled"
                leadingIcon={<Icon name="add" />}
                onPress={() => setEditing({ kind: "card" })}
              >
                {t("add")}
              </Button>
            </div>
          )}
        </header>
        <p className="text-body-medium text-on-surface-variant">{t("intro")}</p>

        {sets.map((set) => (
          <section key={set.id} className="flex flex-col gap-3">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-title-medium text-on-surface">{set.name}</h3>
              {containerMenu("set", set, () => setEditing({ kind: "set", set }))}
            </div>
            {groups.filter((g) => g.setId === set.id).length === 0 ? (
              <p className="text-body-medium text-on-surface-variant px-4">{t("noGroups")}</p>
            ) : (
              groups.filter((g) => g.setId === set.id).map(groupSection)
            )}
          </section>
        ))}
        {looseGroups.length > 0 && (
          <section className="flex flex-col gap-3">
            {sets.length > 0 && (
              <h3 className="text-title-medium text-on-surface">{t("notInSet")}</h3>
            )}
            {looseGroups.map(groupSection)}
          </section>
        )}
        {(ungrouped.length > 0 || groups.length === 0) && (
          <section className="flex flex-col gap-1">
            {groups.length > 0 && (
              <h3 className="text-title-medium text-on-surface">{t("notInGroup")}</h3>
            )}
            {cardList(ungrouped, t("notInGroup"))}
          </section>
        )}
      </section>

      <RatePreview />

      {editing?.kind === "card" && (
        <RateCardDialog
          card={editing.card}
          sets={sets}
          groups={groups}
          fields={fields}
          currency={currency}
          nextPriority={
            Math.max(0, ...cards.filter((c) => !c.isDefault).map((c) => c.priority)) + 10
          }
          onClose={() => setEditing(null)}
        />
      )}
      {editing?.kind === "set" && (
        <FormDialog
          title={t(editing.set ? "setDialogEdit" : "setDialogAdd")}
          submitLabel={t(editing.set ? "save" : "add")}
          action={saveRateCardSet.bind(null, workspace.id, editing.set?.id ?? null)}
          done={(name) => t(editing.set ? "saved" : "added", { name })}
          onClose={() => setEditing(null)}
        >
          {(fieldError) => (
            <TextField
              className="w-full"
              name="name"
              label={t("name")}
              required
              defaultValue={editing.set?.name ?? ""}
              invalid={Boolean(fieldError("name"))}
              errorMessage={fieldError("name")}
            />
          )}
        </FormDialog>
      )}
      {editing?.kind === "group" && (
        <FormDialog
          title={t(editing.group ? "groupDialogEdit" : "groupDialogAdd")}
          submitLabel={t(editing.group ? "save" : "add")}
          action={saveRateCardGroup.bind(null, workspace.id, editing.group?.id ?? null)}
          done={(name) => t(editing.group ? "saved" : "added", { name })}
          onClose={() => setEditing(null)}
        >
          {(fieldError) => (
            <>
              <TextField
                className="w-full"
                name="name"
                label={t("name")}
                required
                defaultValue={editing.group?.name ?? ""}
                invalid={Boolean(fieldError("name"))}
                errorMessage={fieldError("name")}
              />
              <Select
                searchable={sets.length + 1 > 7}
                labels={{ search: t("set") }}
                className="w-full"
                name="setId"
                label={t("set")}
                defaultValue={editing.group?.setId ?? "none"}
              >
                {[
                  <SelectItem key="none">{t("noSet")}</SelectItem>,
                  ...sets.map((s) => <SelectItem key={s.id}>{s.name}</SelectItem>),
                ]}
              </Select>
            </>
          )}
        </FormDialog>
      )}
    </div>
  );
}

/** Which card a person gets in a month, and what a month of them costs at full time. */
function RatePreview() {
  const t = useTranslations("rateCards.preview");
  const format = useFormatter();
  const { workspace } = useWorkspace();
  const [person, setPerson] = useState<string | null>(null);
  const [month, setMonth] = useState(`${new Date().toISOString().slice(0, 7)}-01`);
  const [result, setResult] = useState<RateCardPreview | null | undefined>(undefined);
  const [pending, startTransition] = useTransition();

  function preview(memberId: string | null, date: string) {
    if (!memberId) return;
    startTransition(async () => setResult(await previewRateCard(workspace.id, memberId, date)));
  }

  return (
    <aside
      aria-labelledby="rate-preview-title"
      className="bg-surface-container-low flex flex-col gap-4 self-start rounded-xl p-4"
    >
      <h2 id="rate-preview-title" className="text-title-medium text-on-surface">
        {t("title")}
      </h2>
      <p className="text-body-small text-on-surface-variant">{t("intro")}</p>
      <PersonPicker
        name="previewMember"
        label={t("person")}
        defaultValue={null}
        onSelect={(p) => {
          setPerson(p.id);
          preview(p.id, month);
        }}
      />
      <IsoDateField
        name="previewMonth"
        label={t("month")}
        defaultValue={month}
        onChange={(value) => {
          if (!value) return;
          setMonth(value);
          preview(person, value);
        }}
      />
      <div aria-live="polite" aria-busy={pending || undefined}>
        {result === null && <p className="text-body-medium text-on-surface">{t("none")}</p>}
        {result && (
          <div className="flex flex-col gap-1">
            <p className="text-title-small text-on-surface">{result.cardName ?? t("noCard")}</p>
            <p className="text-body-medium text-on-surface-variant">
              {result.source === "none"
                ? t("noCost")
                : result.monthlyCost === null || !result.currency
                  ? t(`sources.${result.source}`)
                  : t("cost", {
                      amount: format.number(result.monthlyCost, {
                        style: "currency",
                        currency: result.currency,
                      }),
                      source: t(`sources.${result.source}`),
                    })}
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
