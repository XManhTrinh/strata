"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  TextField,
  Switch,
  Divider,
  Button,
  Select,
  SelectItem,
  Autocomplete,
  AutocompleteItem,
} from "@vkieu/mui";
import { Icon } from "@/components/ui/icon";
import type {
  RateCard,
  RateCardGroup,
  RateCardRuleOperator,
  RuleCondition,
  UpsertRateCardInput,
  AvailableColumn,
} from "@/services";

const NO_GROUP = "__none__";

const OPERATOR_OPTIONS: { value: RateCardRuleOperator; label: string }[] = [
  { value: "EQUALS", label: "equals" },
  { value: "NOT_EQUALS", label: "does not equal" },
  { value: "STARTS_WITH", label: "starts with" },
  { value: "STARTS_WITH_ANY", label: "starts with any of (comma-separated)" },
  { value: "ENDS_WITH", label: "ends with" },
  { value: "CONTAINS", label: "contains" },
  { value: "IN", label: "is one of (comma-separated)" },
];

const QUARTERS = [1, 2, 3, 4] as const;
type Quarter = (typeof QUARTERS)[number];

/** Per-quarter draft as strings (empty = unset). */
type QuarterDraft = Record<Quarter, { dayRate: string; workingDays: string }>;

function emptyQuarters(): QuarterDraft {
  return {
    1: { dayRate: "", workingDays: "" },
    2: { dayRate: "", workingDays: "" },
    3: { dayRate: "", workingDays: "" },
    4: { dayRate: "", workingDays: "" },
  };
}

function numStr(v: string | number | null): string {
  if (v === null || v === undefined || v === "") return "";
  return String(v);
}

function toNum(s: string): number | null {
  const t = s.trim();
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function fmtGBP(n: number): string {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(n);
}

export interface RateCardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  card: RateCard | null;
  availableColumns: AvailableColumn[];
  groups: RateCardGroup[];
  /** Preselect this group when creating a new card (e.g. "+ card" within a group). */
  defaultGroupId?: string | null;
  /** Next priority when creating (usually cards.length). */
  nextPriority: number;
  onSubmit: (input: UpsertRateCardInput) => void;
  isSubmitting?: boolean;
}

export function RateCardDialog({
  open,
  onOpenChange,
  card,
  availableColumns,
  groups,
  defaultGroupId,
  nextPriority,
  onSubmit,
  isSubmitting,
}: RateCardDialogProps) {
  const [name, setName] = useState("");
  const [isDefault, setIsDefault] = useState(false);
  const [groupId, setGroupId] = useState<string>(NO_GROUP);
  const [conditions, setConditions] = useState<RuleCondition[]>([]);
  const [quarters, setQuarters] = useState<QuarterDraft>(emptyQuarters());
  const [error, setError] = useState<string | null>(null);
  const [showConditionsHelp, setShowConditionsHelp] = useState(false);

  const groupOptions = useMemo(
    () => [
      { value: NO_GROUP, label: "Ungrouped" },
      ...groups.map((g) => ({ value: g.id, label: g.name })),
    ],
    [groups],
  );

  const columnOptions = useMemo(() => {
    const opts = availableColumns.map((c) => ({ value: c.column, label: c.column }));
    // A saved condition may reference a column that no members currently expose
    // (e.g. renamed/removed import columns). Surface those so the Select still
    // shows the stored value instead of going blank, and the user can fix it.
    const known = new Set(availableColumns.map((c) => c.column));
    for (const cond of conditions) {
      if (cond.column && !known.has(cond.column)) {
        known.add(cond.column);
        opts.push({ value: cond.column, label: `${cond.column} (not in current data)` });
      }
    }
    return opts;
  }, [availableColumns, conditions]);

  const valuesByColumn = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const c of availableColumns) map.set(c.column, c.values);
    return map;
  }, [availableColumns]);

  const firstColumn = availableColumns[0]?.column ?? "";

  useEffect(() => {
    if (!open) return;
    setName(card?.name ?? "");
    setIsDefault(card?.isDefault ?? false);
    setGroupId(card?.groupId ?? defaultGroupId ?? NO_GROUP);
    setConditions(card?.conditions ?? []);
    setError(null);
    setQuarters(
      card
        ? {
            1: { dayRate: numStr(card.q1DayRate), workingDays: numStr(card.q1WorkingDays) },
            2: { dayRate: numStr(card.q2DayRate), workingDays: numStr(card.q2WorkingDays) },
            3: { dayRate: numStr(card.q3DayRate), workingDays: numStr(card.q3WorkingDays) },
            4: { dayRate: numStr(card.q4DayRate), workingDays: numStr(card.q4WorkingDays) },
          }
        : emptyQuarters(),
    );
  }, [open, card, defaultGroupId]);

  // ── Condition handlers ──
  const addCondition = () =>
    setConditions((prev) => [
      ...prev,
      { column: firstColumn, operator: "EQUALS", value: "" },
    ]);
  const updateCondition = (i: number, patch: Partial<RuleCondition>) =>
    setConditions((prev) => prev.map((c, idx) => (idx === i ? { ...c, ...patch } : c)));
  const removeCondition = (i: number) =>
    setConditions((prev) => prev.filter((_, idx) => idx !== i));

  const updateQuarter = (q: Quarter, field: "dayRate" | "workingDays", value: string) =>
    setQuarters((prev) => ({ ...prev, [q]: { ...prev[q], [field]: value } }));

  // ── Live cost preview ──
  const preview = useMemo(() => {
    const perQuarterMonthly = QUARTERS.map((q) => {
      const dr = toNum(quarters[q].dayRate) ?? 0;
      const wd = toNum(quarters[q].workingDays) ?? 0;
      return dr * wd;
    });
    // Annual = each quarter's monthly cost × 3 months.
    const annual = perQuarterMonthly.reduce((sum, m) => sum + m * 3, 0);
    return { perQuarterMonthly, annual };
  }, [quarters]);

  const handleSubmit = () => {
    if (!name.trim()) return setError("Name is required");
    if (!isDefault && conditions.length === 0) {
      return setError("Add at least one condition, or mark this card as the default fallback");
    }
    for (const c of conditions) {
      if (!c.column || c.value.trim() === "") {
        return setError("Every condition needs a column and a value");
      }
    }
    onSubmit({
      name: name.trim(),
      priority: card?.priority ?? nextPriority,
      isDefault,
      groupId: groupId === NO_GROUP ? null : groupId,
      conditions,
      q1DayRate: toNum(quarters[1].dayRate),
      q1WorkingDays: toNum(quarters[1].workingDays),
      q2DayRate: toNum(quarters[2].dayRate),
      q2WorkingDays: toNum(quarters[2].workingDays),
      q3DayRate: toNum(quarters[3].dayRate),
      q3WorkingDays: toNum(quarters[3].workingDays),
      q4DayRate: toNum(quarters[4].dayRate),
      q4WorkingDays: toNum(quarters[4].workingDays),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange} className="max-w-2xl">
      <DialogTitle>{card ? "Edit rate card" : "New rate card"}</DialogTitle>
      <DialogContent>
        <p className="mb-4">Match members by their imported columns, then set the day rate and working days per quarter.</p>
        <div className="space-y-5 pr-1">
          <TextField
            variant="outlined"
            label="Rate card name"
            className="w-full"
            value={name}
            onChange={(value) => setName(value)}
            placeholder="e.g. UK Opex Contractor"
          />

          <Select
            variant="outlined"
            label="Group"
            selectedKey={groupId}
            onSelectionChange={(key) => setGroupId(key == null ? "" : String(key))}
            className="w-full"
          >
            {groupOptions.map((o) => (
              <SelectItem key={o.value}>{o.label}</SelectItem>
            ))}
          </Select>

          <div className="flex items-center justify-between gap-3 rounded-lg border border-outline-variant px-4 py-3">
            <div>
              <p className="text-body-medium">Default fallback</p>
              <p className="text-body-small text-on-surface-variant">
                Matches any member not caught by a higher-priority card. Conditions ignored.
              </p>
            </div>
            <Switch selected={isDefault} onSelectedChange={setIsDefault} aria-label="Default fallback" />
          </div>

          {/* Conditions */}
          {!isDefault && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <h6 className="text-title-small">Conditions (all must match)</h6>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowConditionsHelp((v) => !v)}
                      aria-label="How conditions work"
                      aria-expanded={showConditionsHelp}
                      className="flex items-center text-on-surface-variant hover:text-primary transition-colors"
                    >
                      <Icon name="info" size={18} />
                    </button>
                    {showConditionsHelp && (
                      <>
                        <div
                          className="fixed inset-0 z-40"
                          onClick={() => setShowConditionsHelp(false)}
                        />
                        <div className="absolute left-0 top-full mt-2 z-50 w-80 rounded-xl bg-surface-container-high border border-outline-variant shadow-lg p-4 space-y-2">
                          <span className="text-label-large font-medium">
                            How conditions work
                          </span>
                          <p className="text-body-small text-on-surface-variant">
                            A rate card matches a member only when <span className="font-medium text-on-surface">all</span> of its conditions are true (AND). Pick a column, an operator, and a value.
                          </p>
                          <ul className="space-y-1.5 text-[12px] text-on-surface-variant">
                            <li><span className="font-medium text-on-surface">equals</span> — exact match (e.g. Grade = D).</li>
                            <li><span className="font-medium text-on-surface">does not equal</span> — anything except the value.</li>
                            <li><span className="font-medium text-on-surface">starts with</span> — value is a prefix (e.g. OUC starts with Q). One prefix only.</li>
                            <li><span className="font-medium text-on-surface">starts with any of</span> — comma-separated prefixes; matches if the value starts with any one (e.g. OUC starts with any of XB, XE). Acts like OR.</li>
                            <li><span className="font-medium text-on-surface">ends with</span> — value is a suffix.</li>
                            <li><span className="font-medium text-on-surface">contains</span> — value appears anywhere.</li>
                            <li><span className="font-medium text-on-surface">is one of</span> — matches any <span className="font-medium text-on-surface">exact</span> value in a comma-separated list (e.g. UK, AMEA). Acts like OR, but exact values, not prefixes.</li>
                          </ul>
                          <p className="text-body-small text-on-surface-variant">
                            For &ldquo;starts with X <span className="font-medium text-on-surface">or</span> Y&rdquo;, use <span className="font-medium text-on-surface">starts with any of</span>. For exact &ldquo;X or Y&rdquo;, use <span className="font-medium text-on-surface">is one of</span>.
                          </p>
                        </div>
                      </>
                    )}
                  </div>
                </div>
                <Button variant="text" onClick={addCondition}>
                  <Icon name="add" size={18} />
                  Add condition
                </Button>
              </div>
              {conditions.length === 0 ? (
                <p className="text-body-small text-on-surface-variant">
                  No conditions yet.
                </p>
              ) : (
                <div className="space-y-2">
                  {conditions.map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Select
                        aria-label="Column"
                        variant="outlined"
                        selectedKey={c.column}
                        onSelectionChange={(key) => updateCondition(i, { column: key == null ? "" : String(key) })}
                        className="flex-1"
                      >
                        {columnOptions.map((o) => (
                          <SelectItem key={o.value}>{o.label}</SelectItem>
                        ))}
                      </Select>
                      <Select
                        aria-label="Operator"
                        variant="outlined"
                        selectedKey={c.operator}
                        onSelectionChange={(key) => updateCondition(i, { operator: String(key) as RateCardRuleOperator })}
                        className="w-44"
                      >
                        {OPERATOR_OPTIONS.map((o) => (
                          <SelectItem key={o.value}>{o.label}</SelectItem>
                        ))}
                      </Select>
                      <Autocomplete
                        aria-label="value"
                        allowsCustomValue
                        variant="outlined"
                        inputValue={c.value}
                        onInputChange={(v) => updateCondition(i, { value: v })}
                        onSelectionChange={(key) => {
                          if (key != null) updateCondition(i, { value: String(key) });
                        }}
                        placeholder="value"
                        className="flex-1"
                      >
                        {(valuesByColumn.get(c.column) ?? []).map((s) => (
                          <AutocompleteItem key={s}>{s}</AutocompleteItem>
                        ))}
                      </Autocomplete>
                      <button
                        type="button"
                        onClick={() => removeCondition(i)}
                        className="text-on-surface-variant hover:text-error transition-colors shrink-0"
                        aria-label="Remove condition"
                      >
                        <Icon name="close" size={18} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <Divider />

          {/* Per-quarter rates */}
          <div className="space-y-3">
            <h6 className="text-title-small">Rates per quarter</h6>
            <p className="text-body-small text-on-surface-variant">
              Monthly cost = day rate × working days. Annual = each quarter&apos;s monthly cost × 3.
            </p>

            <div className="space-y-2">
              {QUARTERS.map((q) => (
                <div key={q} className="grid grid-cols-[40px_1fr_1fr_120px] gap-2 items-center">
                  <p className="text-body-medium font-medium">Q{q}</p>
                  <TextField
                    variant="outlined"
                    type="number"
                    label="Day rate (£)"
                    className="w-full"
                    value={quarters[q].dayRate}
                    onChange={(value) => updateQuarter(q, "dayRate", value)}
                  />
                  <TextField
                    variant="outlined"
                    type="number"
                    label="Working days"
                    className="w-full"
                    value={quarters[q].workingDays}
                    onChange={(value) => updateQuarter(q, "workingDays", value)}
                  />
                  <div className="text-right">
                    <p className="text-body-small text-on-surface-variant">Monthly</p>
                    <p className="text-body-medium font-medium">
                      {fmtGBP(preview.perQuarterMonthly[q - 1])}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between rounded-lg bg-surface-container-low px-4 py-3">
              <h6 className="text-title-small">Annual cost (1.0 FTE)</h6>
              <h6 className="text-title-medium">{fmtGBP(preview.annual)}</h6>
            </div>
          </div>

          {error && (
            <p className="text-body-small text-error">
              {error}
            </p>
          )}
        </div>
      </DialogContent>
      <DialogActions>
        <Button variant="text" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? "Saving…" : card ? "Save changes" : "Create rate card"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
