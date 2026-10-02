"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  TextField,
  Select,
  Switch,
  Icon,
  Typography,
  Divider,
} from "@vkieu/mui";
import { Button } from "@vkieu/mui/buttons";
import { ComboBox } from "@/components/ui/combo-box";
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent icon="request_quote" className="max-w-2xl">
        <DialogHeader centered>
          <DialogTitle>{card ? "Edit rate card" : "New rate card"}</DialogTitle>
          <DialogDescription>
            Match members by their imported columns, then set the day rate and working
            days per quarter.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 max-h-[60vh] overflow-y-auto pr-1">
          <TextField
            variant="outlined"
            label="Rate card name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. UK Opex Contractor"
          />

          <Select
            variant="outlined"
            label="Group"
            value={groupId}
            onValueChange={setGroupId}
            options={groupOptions}
            className="w-full"
          />

          <div className="flex items-center justify-between gap-3 rounded-lg border border-outline-variant px-4 py-3">
            <div>
              <Typography variant="body-medium">Default fallback</Typography>
              <Typography variant="body-small" color="surface-variant-foreground">
                Matches any member not caught by a higher-priority card. Conditions ignored.
              </Typography>
            </div>
            <Switch checked={isDefault} onCheckedChange={setIsDefault} />
          </div>

          {/* Conditions */}
          {!isDefault && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Typography variant="title-small">Conditions (all must match)</Typography>
                  <div className="relative">
                    <button
                      type="button"
                      onClick={() => setShowConditionsHelp((v) => !v)}
                      aria-label="How conditions work"
                      aria-expanded={showConditionsHelp}
                      className="flex items-center text-surface-variant-foreground hover:text-primary transition-colors"
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
                          <Typography variant="label-large" className="font-medium">
                            How conditions work
                          </Typography>
                          <Typography variant="body-small" color="surface-variant-foreground">
                            A rate card matches a member only when <span className="font-medium text-surface-foreground">all</span> of its conditions are true (AND). Pick a column, an operator, and a value.
                          </Typography>
                          <ul className="space-y-1.5 text-[12px] text-surface-variant-foreground">
                            <li><span className="font-medium text-surface-foreground">equals</span> — exact match (e.g. Grade = D).</li>
                            <li><span className="font-medium text-surface-foreground">does not equal</span> — anything except the value.</li>
                            <li><span className="font-medium text-surface-foreground">starts with</span> — value is a prefix (e.g. OUC starts with Q). One prefix only.</li>
                            <li><span className="font-medium text-surface-foreground">starts with any of</span> — comma-separated prefixes; matches if the value starts with any one (e.g. OUC starts with any of XB, XE). Acts like OR.</li>
                            <li><span className="font-medium text-surface-foreground">ends with</span> — value is a suffix.</li>
                            <li><span className="font-medium text-surface-foreground">contains</span> — value appears anywhere.</li>
                            <li><span className="font-medium text-surface-foreground">is one of</span> — matches any <span className="font-medium text-surface-foreground">exact</span> value in a comma-separated list (e.g. UK, AMEA). Acts like OR, but exact values, not prefixes.</li>
                          </ul>
                          <Typography variant="body-small" color="surface-variant-foreground">
                            For &ldquo;starts with X <span className="font-medium text-surface-foreground">or</span> Y&rdquo;, use <span className="font-medium text-surface-foreground">starts with any of</span>. For exact &ldquo;X or Y&rdquo;, use <span className="font-medium text-surface-foreground">is one of</span>.
                          </Typography>
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
                <Typography variant="body-small" color="surface-variant-foreground">
                  No conditions yet.
                </Typography>
              ) : (
                <div className="space-y-2">
                  {conditions.map((c, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <Select
                        variant="outlined"
                        value={c.column}
                        onValueChange={(v) => updateCondition(i, { column: v })}
                        options={columnOptions}
                        searchable
                        className="flex-1"
                      />
                      <Select
                        variant="outlined"
                        value={c.operator}
                        onValueChange={(v) => updateCondition(i, { operator: v as RateCardRuleOperator })}
                        options={OPERATOR_OPTIONS}
                        className="w-44"
                      />
                      <ComboBox
                        value={c.value}
                        onChange={(v) => updateCondition(i, { value: v })}
                        options={valuesByColumn.get(c.column) ?? []}
                        placeholder="value"
                        className="flex-1"
                      />
                      <button
                        type="button"
                        onClick={() => removeCondition(i)}
                        className="text-surface-variant-foreground hover:text-error transition-colors shrink-0"
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
            <Typography variant="title-small">Rates per quarter</Typography>
            <Typography variant="body-small" color="surface-variant-foreground">
              Monthly cost = day rate × working days. Annual = each quarter&apos;s monthly cost × 3.
            </Typography>

            <div className="space-y-2">
              {QUARTERS.map((q) => (
                <div key={q} className="grid grid-cols-[40px_1fr_1fr_120px] gap-2 items-center">
                  <Typography variant="body-medium" className="font-medium">Q{q}</Typography>
                  <TextField
                    variant="outlined"
                    type="number"
                    label="Day rate (£)"
                    value={quarters[q].dayRate}
                    onChange={(e) => updateQuarter(q, "dayRate", e.target.value)}
                  />
                  <TextField
                    variant="outlined"
                    type="number"
                    label="Working days"
                    value={quarters[q].workingDays}
                    onChange={(e) => updateQuarter(q, "workingDays", e.target.value)}
                  />
                  <div className="text-right">
                    <Typography variant="body-small" color="surface-variant-foreground">Monthly</Typography>
                    <Typography variant="body-medium" className="font-medium">
                      {fmtGBP(preview.perQuarterMonthly[q - 1])}
                    </Typography>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between rounded-lg bg-surface-container-low px-4 py-3">
              <Typography variant="title-small">Annual cost (1.0 FTE)</Typography>
              <Typography variant="title-medium">{fmtGBP(preview.annual)}</Typography>
            </div>
          </div>

          {error && (
            <Typography variant="body-small" color="error">
              {error}
            </Typography>
          )}
        </div>

        <DialogFooter>
          <Button variant="text" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting ? "Saving…" : card ? "Save changes" : "Create rate card"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
