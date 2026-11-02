"use client";

import { useState } from "react";
import { useFormatter, useTranslations } from "next-intl";
import {
  Autocomplete,
  AutocompleteItem,
  Button,
  IconButton,
  Select,
  SelectItem,
  Switch,
  TextField,
} from "@windmorph/react";
import { FormDialog } from "@/components/ui/form-dialog";
import { Icon } from "@/components/ui/icon";
import { IsoDateField } from "@/components/ui/iso-date-field";
import { useWorkspace } from "@/features/workspaces/workspace-context";
import { saveRateCard } from "../actions";
import {
  BUILT_IN_FIELDS,
  type FieldChoice,
  RATE_OPERATORS,
  type RateCard,
  type RateCardGroup,
  type RateCardSet,
  type RateCondition,
  type RateOperator,
} from "../types";

type Row<T> = T & { key: string };
type RateRow = { validFrom: string; dayRate: string; workingDays: string; currency: string };

/** Rows keep a stable key while they are added and removed. */
const keyed = <T,>(item: T): Row<T> => ({ ...item, key: crypto.randomUUID() });

/** Adds or edits a card: who it applies to (all conditions must match) and its rates by month. */
export function RateCardDialog({
  card,
  sets,
  groups,
  fields,
  nextPriority,
  currency,
  onClose,
}: {
  card?: RateCard;
  sets: RateCardSet[];
  groups: RateCardGroup[];
  fields: FieldChoice[];
  nextPriority: number;
  /** The workspace's currency, for new rates. */
  currency: string;
  onClose: () => void;
}) {
  const t = useTranslations("rateCards");
  const format = useFormatter();
  const { workspace } = useWorkspace();
  const thisMonth = `${new Date().toISOString().slice(0, 7)}-01`;

  const [isDefault, setIsDefault] = useState(card?.isDefault ?? false);
  const [conditions, setConditions] = useState<Row<RateCondition>[]>(
    (card?.conditions ?? []).map(keyed)
  );
  const [rates, setRates] = useState<Row<RateRow>[]>(
    (card?.rates.length
      ? card.rates.map((r) => ({
          validFrom: r.validFrom,
          dayRate: String(r.dayRate),
          workingDays: String(r.workingDays),
          currency: r.currency,
        }))
      : [{ validFrom: thisMonth, dayRate: "", workingDays: "20", currency }]
    ).map(keyed)
  );

  const fieldLabel = (field: string) =>
    field.startsWith("custom:")
      ? (fields.find((f) => `custom:${f.key}` === field)?.label ?? field)
      : t(`fields.${field as (typeof BUILT_IN_FIELDS)[number]}`);
  const fieldOptions = [
    ...BUILT_IN_FIELDS.map((f) => [f, fieldLabel(f)] as const),
    ...fields.map((f) => [`custom:${f.key}`, f.label] as const),
  ];
  const groupLabel = (g: RateCardGroup) => {
    const set = sets.find((s) => s.id === g.setId);
    return set ? t("groupInSet", { group: g.name, set: set.name }) : g.name;
  };

  const updateCondition = (key: string, change: Partial<RateCondition>) =>
    setConditions((rows) => rows.map((r) => (r.key === key ? { ...r, ...change } : r)));
  const updateRate = (key: string, change: Partial<RateRow>) =>
    setRates((rows) => rows.map((r) => (r.key === key ? { ...r, ...change } : r)));
  const monthly = (r: RateRow) => {
    const total = Number(r.dayRate) * Number(r.workingDays);
    return r.dayRate && Number.isFinite(total) && /^[A-Za-z]{3}$/.test(r.currency)
      ? format.number(total, { style: "currency", currency: r.currency.toUpperCase() })
      : null;
  };

  return (
    <FormDialog
      title={t(card ? "dialogEdit" : "dialogAdd")}
      submitLabel={t(card ? "save" : "add")}
      action={saveRateCard.bind(null, workspace.id, card?.id ?? null)}
      done={(name) => t(card ? "saved" : "added", { name })}
      onClose={onClose}
    >
      {(fieldError) => (
        <>
          <TextField
            className="w-full"
            name="name"
            label={t("name")}
            required
            defaultValue={card?.name ?? ""}
            invalid={Boolean(fieldError("name"))}
            errorMessage={fieldError("name")}
          />
          <div className="grid grid-cols-2 gap-4">
            <Select
              className="w-full"
              name="groupId"
              label={t("group")}
              defaultValue={card?.groupId ?? "none"}
            >
              {[
                <SelectItem key="none">{t("noGroup")}</SelectItem>,
                ...groups.map((g) => (
                  <SelectItem key={g.id} textValue={groupLabel(g)}>
                    {groupLabel(g)}
                  </SelectItem>
                )),
              ]}
            </Select>
            <TextField
              className="w-full"
              name="priority"
              type="number"
              inputMode="numeric"
              label={t("priority")}
              supportingText={t("priorityHelp")}
              defaultValue={String(card?.priority ?? nextPriority)}
              invalid={Boolean(fieldError("priority"))}
              errorMessage={fieldError("priority")}
            />
          </div>
          <Switch checked={isDefault} onCheckedChange={setIsDefault}>
            {t("isDefault")}
          </Switch>
          <input type="hidden" name="isDefault" value={String(isDefault)} />

          <fieldset className="flex min-w-0 flex-col gap-3" disabled={isDefault}>
            <legend className="text-title-small text-on-surface mb-1">{t("conditions")}</legend>
            <p className="text-body-small text-on-surface-variant">
              {isDefault ? t("defaultHelp") : t("conditionsHelp")}
            </p>
            {!isDefault &&
              conditions.map((c, index) => (
                <div key={c.key} className="grid grid-cols-[1fr_1fr_1fr_auto] items-start gap-2">
                  {/* Searchable: built-in fields plus the workspace's own. */}
                  <Autocomplete
                    className="w-full"
                    label={t("field")}
                    value={c.field}
                    onChange={(key) =>
                      key != null && updateCondition(c.key, { field: String(key) })
                    }
                  >
                    {fieldOptions.map(([value, label]) => (
                      <AutocompleteItem key={value} textValue={label}>
                        {label}
                      </AutocompleteItem>
                    ))}
                  </Autocomplete>
                  <Select
                    className="w-full"
                    label={t("operator")}
                    value={c.operator}
                    onChange={(key) =>
                      key != null && updateCondition(c.key, { operator: key as RateOperator })
                    }
                  >
                    {RATE_OPERATORS.map((op) => (
                      <SelectItem key={op}>{t(`operators.${op}`)}</SelectItem>
                    ))}
                  </Select>
                  <TextField
                    className="w-full"
                    label={t("value")}
                    value={c.value}
                    supportingText={
                      c.operator === "in" || c.operator === "starts_with_any"
                        ? t("listHelp")
                        : undefined
                    }
                    onChange={(value) => updateCondition(c.key, { value })}
                  />
                  <IconButton
                    variant="standard"
                    aria-label={t("removeCondition", { n: index + 1 })}
                    icon={<Icon name="delete" />}
                    onPress={() => setConditions((rows) => rows.filter((r) => r.key !== c.key))}
                  />
                </div>
              ))}
            {!isDefault && (
              <Button
                variant="text"
                className="self-start"
                leadingIcon={<Icon name="add" />}
                onPress={() =>
                  setConditions((rows) => [
                    ...rows,
                    keyed({ field: "unit", operator: "equals", value: "" }),
                  ])
                }
              >
                {t("addCondition")}
              </Button>
            )}
            {fieldError("conditions") && (
              <p role="alert" className="text-body-small text-error">
                {fieldError("conditions")}
              </p>
            )}
          </fieldset>
          <input
            type="hidden"
            name="conditions"
            value={JSON.stringify(
              isDefault
                ? []
                : conditions.map(({ field, operator, value }) => ({ field, operator, value }))
            )}
          />

          {/* min-w-0: a fieldset is otherwise as wide as its content and overflows the dialog. */}
          <fieldset className="flex min-w-0 flex-col gap-3">
            <legend className="text-title-small text-on-surface mb-1">{t("rates")}</legend>
            <p className="text-body-small text-on-surface-variant">{t("ratesHelp")}</p>
            {rates.map((r, index) => (
              <div key={r.key} className="flex flex-col gap-2">
                {/* When it starts, and removing it; then the amounts on their own row. */}
                <div className="flex items-start gap-2">
                  <div className="min-w-0 flex-1">
                    <IsoDateField
                      name={`rate-${r.key}`}
                      label={t("from")}
                      defaultValue={r.validFrom}
                      onChange={(value) => value && updateRate(r.key, { validFrom: value })}
                    />
                  </div>
                  <IconButton
                    variant="standard"
                    className="mt-2"
                    aria-label={t("removeRate", { n: index + 1 })}
                    icon={<Icon name="delete" />}
                    onPress={() => setRates((rows) => rows.filter((x) => x.key !== r.key))}
                  />
                </div>
                <div className="grid grid-cols-[1fr_1fr_6rem] items-start gap-2">
                  <TextField
                    className="w-full"
                    label={t("dayRate")}
                    type="number"
                    inputMode="decimal"
                    value={r.dayRate}
                    onChange={(dayRate) => updateRate(r.key, { dayRate })}
                  />
                  <TextField
                    className="w-full"
                    label={t("workingDays")}
                    type="number"
                    inputMode="decimal"
                    value={r.workingDays}
                    onChange={(workingDays) => updateRate(r.key, { workingDays })}
                  />
                  <TextField
                    className="w-full"
                    label={t("currency")}
                    value={r.currency}
                    maxLength={3}
                    onChange={(currency) => updateRate(r.key, { currency: currency.toUpperCase() })}
                  />
                </div>
                {monthly(r) && (
                  <p className="text-body-small text-on-surface-variant ps-4">
                    {t("monthly", { amount: monthly(r)! })}
                  </p>
                )}
              </div>
            ))}
            <Button
              variant="text"
              className="self-start"
              leadingIcon={<Icon name="add" />}
              onPress={() =>
                setRates((rows) => [
                  ...rows,
                  keyed({
                    validFrom: thisMonth,
                    dayRate: "",
                    workingDays: rows.at(-1)?.workingDays ?? "20",
                    currency: rows.at(-1)?.currency ?? currency,
                  }),
                ])
              }
            >
              {t("addRate")}
            </Button>
            {fieldError("rates") && (
              <p role="alert" className="text-body-small text-error">
                {fieldError("rates")}
              </p>
            )}
          </fieldset>
          <input
            type="hidden"
            name="rates"
            value={JSON.stringify(
              rates.map(({ validFrom, dayRate, workingDays, currency: code }) => ({
                validFrom,
                dayRate,
                workingDays,
                currency: code,
              }))
            )}
          />
        </>
      )}
    </FormDialog>
  );
}
