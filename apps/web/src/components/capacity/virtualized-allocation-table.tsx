"use client";

import React, { useCallback, useRef, useState } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { cn } from "@/lib/utils";
import type { MemberAllocation, PeriodValues } from "@/services";

/**
 * Virtualized FTE allocation grid.
 *
 * Renders a spreadsheet-style grid where only the rows currently visible in the
 * viewport exist in the DOM (row windowing via @tanstack/react-virtual), and
 * cells render as static text that upgrade to a single `<input>` only while
 * being edited (the "one active editor" pattern used by Google Sheets). This
 * keeps the DOM node count bounded regardless of dataset size, so tables with
 * thousands of members stay responsive.
 */

const PERIODS = ["p1","p2","p3","p4","p5","p6","p7","p8","p9","p10","p11","p12"] as const;
type PeriodKey = typeof PERIODS[number];

const ROW_HEIGHT = 40; // px — fixed so virtualization offsets are exact
const MAX_VIEWPORT_HEIGHT = 560; // px — cap the scroll area for large squads
const OVERSCAN = 8;

// Column template shared by header, body rows, and totals so everything aligns.
// The Member column takes exactly 1/4 of the width (matching the first KPI card
// in the 4-card grid above), and the remaining columns fill the other 3/4.
// Ratio: member 3fr : (type + grade + 12 periods + cost) 9fr  =>  1/4 : 3/4.
// Each column carries a minmax floor so below MIN_WIDTH the table scrolls
// horizontally instead of crushing the numeric inputs.
// member 3fr : (type 0.5 + grade 0.5 + 12×0.5 periods + cost 2.0 = 9fr)  =>  1/4 : 3/4
const GRID_TEMPLATE =
  "minmax(200px, 3fr) minmax(40px, 0.5fr) minmax(48px, 0.5fr) repeat(12, minmax(48px, 0.5fr)) minmax(96px, 2fr)";
const MIN_WIDTH = 200 + 40 + 48 + 12 * 48 + 96; // 960px floor for horizontal scroll

function fmtFTE(n: number): string {
  return n % 1 === 0 ? String(n) : n.toFixed(2);
}

function fmtGBP(n: number): string {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);
}

function sumPeriods(pv: PeriodValues): number {
  return PERIODS.reduce((s, pk) => s + pv[pk], 0);
}

// ─── Editable Cell ──────────────────────────────────────────────────────────

interface CellProps {
  membershipId: string;
  orgUnitId: string;
  period: PeriodKey;
  value: number;
  /** This person's total FTE for this period across all squads. */
  personPeriodTotal: number;
  isEditing: boolean;
  onStartEdit: (membershipId: string, period: PeriodKey) => void;
  onStopEdit: (membershipId: string, period: PeriodKey) => void;
  onCommit: (membershipId: string, orgUnitId: string, period: PeriodKey, value: number) => void;
}

/**
 * Editing sub-component. It owns the in-progress text in its OWN local state and
 * only commits to the parent on blur/Enter. This deliberately avoids pushing to
 * the parent draft on every keystroke — doing so triggers a deferred/concurrent
 * re-render upstream that can remount this cell and steal focus (the input
 * "collapses" mid-type). Keeping the edit local until commit keeps focus stable.
 */
function CellEditor({
  membershipId,
  orgUnitId,
  period,
  value,
  onStopEdit,
  onCommit,
}: Pick<CellProps, "membershipId" | "orgUnitId" | "period" | "value" | "onStopEdit" | "onCommit">) {
  const [draft, setDraft] = useState<string>(() => String(value));

  const commit = useCallback(() => {
    const val = parseFloat(draft);
    let clamped: number;
    if (isNaN(val) || val < 0) clamped = 0;
    else if (val > 1) clamped = 1;
    else clamped = Math.round(val * 100) / 100;
    onCommit(membershipId, orgUnitId, period, clamped);
    onStopEdit(membershipId, period);
  }, [draft, membershipId, orgUnitId, period, onCommit, onStopEdit]);

  return (
    <input
      type="number"
      min="0"
      max="1"
      step="0.05"
      autoFocus
      value={draft}
      onFocus={(e) => e.target.select()}
      onChange={(e: React.ChangeEvent<HTMLInputElement>) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.target as HTMLInputElement).blur();
        } else if (e.key === "Escape") {
          // Cancel without committing.
          setDraft(String(value));
          onStopEdit(membershipId, period);
        }
      }}
      className="w-full h-8 text-[12px] text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none bg-surface border border-primary rounded focus:outline-none"
    />
  );
}

const AllocationCell = React.memo(function AllocationCell({
  membershipId,
  orgUnitId,
  period,
  value,
  personPeriodTotal,
  isEditing,
  onStartEdit,
  onStopEdit,
  onCommit,
}: CellProps) {
  const isOver = personPeriodTotal > 1;
  const isUnder = personPeriodTotal > 0 && personPeriodTotal < 1;

  const stateClass = isOver
    ? "text-error font-semibold bg-error-container/40 dark:bg-error-container/20"
    : isUnder
    ? "text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20"
    : "text-surface-foreground";

  const title = isOver
    ? `Overallocated: ${personPeriodTotal.toFixed(2)} FTE total`
    : isUnder
    ? `Underallocated: ${personPeriodTotal.toFixed(2)} FTE total (${((1 - personPeriodTotal) * 100).toFixed(0)}% unaccounted)`
    : undefined;

  if (isEditing) {
    return (
      <CellEditor
        membershipId={membershipId}
        orgUnitId={orgUnitId}
        period={period}
        value={value}
        onStopEdit={onStopEdit}
        onCommit={onCommit}
      />
    );
  }

  return (
    <button
      type="button"
      title={title}
      onClick={() => onStartEdit(membershipId, period)}
      className={cn(
        "w-full h-8 text-[12px] text-center rounded border border-transparent hover:border-outline-variant hover:bg-surface-foreground/4 transition-colors cursor-text",
        stateClass,
      )}
    >
      {fmtFTE(value)}
    </button>
  );
});

// ─── Row ──────────────────────────────────────────────────────────────────────

interface RowProps {
  member: MemberAllocation;
  orgUnitId: string;
  alloc: PeriodValues;
  personTotalByPeriod: PeriodValues;
  memberAnnualCost: number;
  editingPeriod: PeriodKey | null;
  onStartEdit: (membershipId: string, period: PeriodKey) => void;
  onStopEdit: (membershipId: string, period: PeriodKey) => void;
  onCommit: (membershipId: string, orgUnitId: string, period: PeriodKey, value: number) => void;
  onContextMenu: (e: React.MouseEvent, member: MemberAllocation, orgUnitId: string) => void;
}

const AllocationRow = React.memo(function AllocationRow({
  member,
  orgUnitId,
  alloc,
  personTotalByPeriod,
  memberAnnualCost,
  editingPeriod,
  onStartEdit,
  onStopEdit,
  onCommit,
  onContextMenu,
}: RowProps) {
  return (
    <div
      className="grid items-center border-b border-outline-variant hover:bg-surface-foreground/4"
      style={{ gridTemplateColumns: GRID_TEMPLATE, height: ROW_HEIGHT }}
    >
      {/* Member (sticky left) */}
      <div
        onContextMenu={(e) => onContextMenu(e, member, orgUnitId)}
        className="sticky left-0 z-10 bg-surface h-full flex flex-col justify-center px-3 cursor-context-menu"
      >
        <span className="text-[13px] font-medium text-surface-foreground truncate leading-tight">{member.fullName}</span>
        {member.position && (
          <span className="text-[11px] text-surface-variant-foreground truncate leading-tight">{member.position}</span>
        )}
      </div>

      {/* Type */}
      <div className="text-center">
        <span className={cn("text-[11px] font-medium", member.employmentType === "Perm" ? "text-emerald-600" : "text-primary")}>
          {member.employmentType === "Perm" ? "P" : "C"}
        </span>
      </div>

      {/* Grade */}
      <div className="text-center text-[12px] text-surface-variant-foreground">{member.grade ?? "—"}</div>

      {/* Period cells */}
      {PERIODS.map((pk) => (
        <div key={pk} className="px-0.5">
          <AllocationCell
            membershipId={member.membershipId}
            orgUnitId={orgUnitId}
            period={pk}
            value={alloc[pk]}
            personPeriodTotal={personTotalByPeriod[pk]}
            isEditing={editingPeriod === pk}
            onStartEdit={onStartEdit}
            onStopEdit={onStopEdit}
            onCommit={onCommit}
          />
        </div>
      ))}

      {/* Annual cost */}
      <div className="text-right pr-3 text-[12px] font-medium text-surface-foreground">
        {member.annualCost ? fmtGBP(Math.round(memberAnnualCost)) : "—"}
      </div>
    </div>
  );
});

// ─── Table ──────────────────────────────────────────────────────────────────

export interface VirtualizedAllocationTableProps {
  members: MemberAllocation[];
  orgUnitId: string;
  monthLabels: string[];
  /** Resolve the current (draft-aware) allocations for a member+squad. */
  getAlloc: (membershipId: string, orgUnitId: string) => PeriodValues;
  /** Resolve a person's cross-squad FTE total per period. */
  getPersonTotals: (membershipId: string) => PeriodValues;
  onFTEChange: (membershipId: string, orgUnitId: string, period: PeriodKey, value: number) => void;
  onContextMenu: (e: React.MouseEvent, member: MemberAllocation, orgUnitId: string) => void;
  squadFTETotals: PeriodValues;
  squadCostTotals: PeriodValues;
}

export function VirtualizedAllocationTable({
  members,
  orgUnitId,
  monthLabels,
  getAlloc,
  getPersonTotals,
  onFTEChange,
  onContextMenu,
  squadFTETotals,
  squadCostTotals,
}: VirtualizedAllocationTableProps) {
  const scrollRef = useRef<HTMLDivElement>(null);

  // Single active editor: { membershipId, period } or null.
  const [editing, setEditing] = useState<{ membershipId: string; period: PeriodKey } | null>(null);

  const handleStartEdit = useCallback((membershipId: string, period: PeriodKey) => {
    setEditing({ membershipId, period });
  }, []);

  // Stop editing a SPECIFIC cell. Only clears if that cell is still the active
  // one — this prevents a blur→commit on the old cell from clobbering a fresh
  // selection when the user clicks straight into another cell (blur fires before
  // the new cell's click resolves, so a naive setEditing(null) would win).
  const handleStopEdit = useCallback((membershipId: string, period: PeriodKey) => {
    setEditing((prev) =>
      prev && prev.membershipId === membershipId && prev.period === period ? null : prev,
    );
  }, []);

  const rowVirtualizer = useVirtualizer({
    count: members.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => ROW_HEIGHT,
    overscan: OVERSCAN,
  });

  // Height of the scroll area: cap at MAX_VIEWPORT_HEIGHT, shrink for small squads.
  const bodyHeight = Math.min(members.length * ROW_HEIGHT, MAX_VIEWPORT_HEIGHT);
  const virtualItems = rowVirtualizer.getVirtualItems();

  return (
    <div className="overflow-x-auto">
      <div style={{ minWidth: MIN_WIDTH, width: "100%" }}>
        {/* Header */}
        <div
          className="grid items-stretch bg-surface border-b border-outline-variant sticky top-0 z-20"
          style={{ gridTemplateColumns: GRID_TEMPLATE }}
        >
          <div className="sticky left-0 z-10 bg-surface flex items-center px-3 h-11 text-sm font-medium text-surface-variant-foreground">
            Member
          </div>
          <div className="flex items-center justify-center h-11 text-sm font-medium text-surface-variant-foreground">Type</div>
          <div className="flex items-center justify-center h-11 text-sm font-medium text-surface-variant-foreground">Grade</div>
          {PERIODS.map((pk, i) => (
            <div key={pk} className="flex flex-col items-center justify-center h-11 text-[11px]">
              <span className="font-medium text-surface-variant-foreground">{pk.toUpperCase()}</span>
              <span className="text-surface-variant-foreground font-normal">{monthLabels[i]}</span>
            </div>
          ))}
          <div className="flex items-center justify-end pr-3 h-11 text-sm font-medium text-surface-variant-foreground">
            Annual Cost
          </div>
        </div>

        {/* Virtualized body */}
        <div
          ref={scrollRef}
          className="overflow-y-auto"
          style={{ height: bodyHeight }}
        >
          <div style={{ height: rowVirtualizer.getTotalSize(), position: "relative" }}>
            {virtualItems.map((vItem) => {
              const member = members[vItem.index];
              const alloc = getAlloc(member.membershipId, orgUnitId);
              const monthlyCost = member.annualCost ? member.annualCost / 12 : 0;
              const memberAnnualCost = PERIODS.reduce((s, pk) => s + alloc[pk] * monthlyCost, 0);
              const isRowEditing = editing?.membershipId === member.membershipId;

              return (
                <div
                  key={member.membershipId}
                  style={{
                    position: "absolute",
                    top: 0,
                    left: 0,
                    width: "100%",
                    transform: `translateY(${vItem.start}px)`,
                  }}
                >
                  <AllocationRow
                    member={member}
                    orgUnitId={orgUnitId}
                    alloc={alloc}
                    personTotalByPeriod={getPersonTotals(member.membershipId)}
                    memberAnnualCost={memberAnnualCost}
                    editingPeriod={isRowEditing ? editing!.period : null}
                    onStartEdit={handleStartEdit}
                    onStopEdit={handleStopEdit}
                    onCommit={onFTEChange}
                    onContextMenu={onContextMenu}
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Totals */}
        <div
          className="grid items-center border-t-2 border-outline-variant bg-surface-container-low/50 font-medium"
          style={{ gridTemplateColumns: GRID_TEMPLATE, height: ROW_HEIGHT }}
        >
          <div className="sticky left-0 z-10 bg-surface-container-low flex items-center px-3 h-full text-[12px]">FTE Total</div>
          <div /><div />
          {PERIODS.map((pk) => (
            <div key={pk} className="text-center text-[12px] font-semibold">{fmtFTE(squadFTETotals[pk])}</div>
          ))}
          <div className="text-right pr-3 text-[12px] font-semibold">{fmtGBP(sumPeriods(squadCostTotals))}</div>
        </div>
        <div
          className="grid items-center bg-surface-container-low/30"
          style={{ gridTemplateColumns: GRID_TEMPLATE, height: ROW_HEIGHT }}
        >
          <div className="sticky left-0 z-10 bg-surface-container-low flex items-center px-3 h-full text-[12px] text-surface-variant-foreground">Monthly Cost</div>
          <div /><div />
          {PERIODS.map((pk) => (
            <div key={pk} className="text-center text-[11px] text-surface-variant-foreground">{fmtGBP(squadCostTotals[pk])}</div>
          ))}
          <div />
        </div>
      </div>
    </div>
  );
}
