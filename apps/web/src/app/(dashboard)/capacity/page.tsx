"use client";

import { useMemo, useState } from "react";
import { motion } from "motion/react";
import { AppBar } from "@/components/layout/app-bar";
import { Icon } from "@vkieu/mui";
import { Card, CardContent } from "@vkieu/mui";
import { Chip } from "@vkieu/mui";
import { Skeleton } from "@/components/ui/skeleton";
import { Select } from "@vkieu/mui";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { usePeople } from "@/services";
import type { Person } from "@/services";
import { useCompanyId } from "@/hooks/use-company";
import { pageTransitionVariants, defaultTransition } from "@/lib/motion";

// ─── Constants ────────────────────────────────────────────────────────────────

const PERIODS = ["P1", "P2", "P3", "P4", "P5", "P6", "P7", "P8", "P9", "P10", "P11", "P12"] as const;
const MONTH_LABELS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const DIVISION_COLORS: Record<string, string> = {};
const COLOR_PALETTE = [
  "bg-blue-500", "bg-violet-500", "bg-emerald-500", "bg-amber-500",
  "bg-pink-500", "bg-cyan-500", "bg-rose-500", "bg-teal-500",
];
const DOT_PALETTE = [
  "bg-blue-400", "bg-violet-400", "bg-emerald-400", "bg-amber-400",
  "bg-pink-400", "bg-cyan-400", "bg-rose-400", "bg-teal-400",
];

function getDivisionColor(division: string, index: number) {
  if (!DIVISION_COLORS[division]) {
    DIVISION_COLORS[division] = COLOR_PALETTE[index % COLOR_PALETTE.length];
  }
  return DIVISION_COLORS[division];
}

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtNum(n: number) {
  return new Intl.NumberFormat("en-GB").format(n);
}

function fmtPct(n: number) {
  return `${Math.round(n)}%`;
}

// ─── Data Computation ─────────────────────────────────────────────────────────

interface SquadCapacity {
  division: string;
  squad: string;
  total: number;
  perm: number;
  subCon: number;
  /** P1–P12 headcount (flat for now — all periods same as total) */
  monthly: number[];
}

interface DivisionCapacity {
  name: string;
  total: number;
  perm: number;
  subCon: number;
  squads: SquadCapacity[];
  permPct: number;
}

function computeCapacityData(members: Person[]): {
  divisions: DivisionCapacity[];
  squads: SquadCapacity[];
  totalHeadcount: number;
  totalPerm: number;
  totalSubCon: number;
  divisionCount: number;
  squadCount: number;
} {
  // Group by squad
  const squadMap = new Map<string, { division: string; people: Person[] }>();
  for (const m of members) {
    const squad = m.metadata?.["Squad"] || m.orgUnitName || "Unassigned";
    const division = m.metadata?.["Division"] || "Unknown";
    if (!squadMap.has(squad)) squadMap.set(squad, { division, people: [] });
    squadMap.get(squad)!.people.push(m);
  }

  const squads: SquadCapacity[] = Array.from(squadMap.entries())
    .map(([squad, { division, people }]) => {
      const perm = people.filter((p) => p.employmentType === "Perm").length;
      const subCon = people.filter((p) => p.employmentType === "SubCon").length;
      const total = people.length;
      return {
        division,
        squad,
        total,
        perm,
        subCon,
        monthly: Array(12).fill(total),
      };
    })
    .sort((a, b) => a.division.localeCompare(b.division) || b.total - a.total);

  // Aggregate by division
  const divMap = new Map<string, SquadCapacity[]>();
  for (const s of squads) {
    if (!divMap.has(s.division)) divMap.set(s.division, []);
    divMap.get(s.division)!.push(s);
  }

  const divisions: DivisionCapacity[] = Array.from(divMap.entries())
    .map(([name, divSquads]) => {
      const total = divSquads.reduce((s, q) => s + q.total, 0);
      const perm = divSquads.reduce((s, q) => s + q.perm, 0);
      const subCon = divSquads.reduce((s, q) => s + q.subCon, 0);
      return {
        name,
        total,
        perm,
        subCon,
        squads: divSquads,
        permPct: total > 0 ? (perm / total) * 100 : 0,
      };
    })
    .sort((a, b) => b.total - a.total);

  const totalHeadcount = members.length;
  const totalPerm = members.filter((m) => m.employmentType === "Perm").length;
  const totalSubCon = members.filter((m) => m.employmentType === "SubCon").length;

  return {
    divisions,
    squads,
    totalHeadcount,
    totalPerm,
    totalSubCon,
    divisionCount: divisions.length,
    squadCount: squads.length,
  };
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon, color }: {
  label: string;
  value: string;
  sub?: string;
  icon: string;
  color: string;
}) {
  return (
    <Card variant="elevated">
      <CardContent className="p-5">
        <div className={`flex items-center justify-center w-10 h-10 rounded-full ${color} mb-3`}>
          <Icon name={icon} size={24} className="text-on-primary-container" />
        </div>
        <p className="text-[12px] leading-4 text-surface-variant-foreground uppercase tracking-wide">{label}</p>
        <p className="text-[28px] leading-9 font-normal text-surface-foreground mt-1">{value}</p>
        {sub && <p className="text-[12px] leading-4 text-surface-variant-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function CapacityPage() {
  const companyId = useCompanyId();
  const { data, isLoading, isError, error } = usePeople({ companyId, pageSize: 500 });
  const [divisionFilter, setDivisionFilter] = useState<string>("all");

  const members = data?.data ?? [];

  const capacityData = useMemo(() => computeCapacityData(members), [members]);

  const filteredSquads = useMemo(() => {
    if (divisionFilter === "all") return capacityData.squads;
    return capacityData.squads.filter((s) => s.division === divisionFilter);
  }, [capacityData.squads, divisionFilter]);

  const filteredTotal = filteredSquads.reduce((s, q) => s + q.total, 0);
  const filteredPerm = filteredSquads.reduce((s, q) => s + q.perm, 0);
  const filteredSubCon = filteredSquads.reduce((s, q) => s + q.subCon, 0);

  // ─── Loading ────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        <AppBar>
          <div>
            <h1 className="text-[28px] leading-9 font-normal text-surface-foreground">Capacity Planning</h1>
            <p className="text-[14px] leading-5 text-surface-variant-foreground">Team allocation and monthly phasing.</p>
          </div>
        </AppBar>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} variant="elevated">
              <CardContent className="p-5 space-y-3">
                <Skeleton className="h-10 w-10 rounded-full" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-7 w-28" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // ─── Error ──────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="space-y-6">
        <AppBar>
          <div>
            <h1 className="text-[28px] leading-9 font-normal text-surface-foreground">Capacity Planning</h1>
          </div>
        </AppBar>
        <Card variant="elevated" className="max-w-md mx-auto">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Icon name="error" size={32} className="text-error mb-3" />
            <p className="text-[14px] text-muted-foreground">{error?.message || "Failed to load"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const divisionOptions = [
    { value: "all", label: "All Divisions" },
    ...capacityData.divisions.map((d) => ({ value: d.name, label: d.name })),
  ];

  return (
    <motion.div
      className="space-y-6"
      variants={pageTransitionVariants}
      initial="initial"
      animate="enter"
      exit="exit"
      transition={defaultTransition}
    >
      {/* Header */}
      <AppBar className="justify-between">
        <div>
          <h1 className="text-[28px] leading-9 font-normal text-surface-foreground">Capacity Planning</h1>
          <p className="text-[14px] leading-5 text-surface-variant-foreground">
            Team allocation and monthly phasing · {fmtNum(capacityData.totalHeadcount)} members across {capacityData.squadCount} squads
          </p>
        </div>
        <Select
          value={divisionFilter}
          onValueChange={setDivisionFilter}
          variant="outlined"
          options={divisionOptions}
          className="w-48"
        />
      </AppBar>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Headcount"
          value={fmtNum(capacityData.totalHeadcount)}
          sub={`${capacityData.divisionCount} divisions · ${capacityData.squadCount} squads`}
          icon="groups"
          color="bg-primary-container"
        />
        <StatCard
          label="Permanent Staff"
          value={fmtNum(capacityData.totalPerm)}
          sub={`${fmtPct(capacityData.totalHeadcount > 0 ? (capacityData.totalPerm / capacityData.totalHeadcount) * 100 : 0)} of headcount`}
          icon="badge"
          color="bg-secondary-container"
        />
        <StatCard
          label="Contractors"
          value={fmtNum(capacityData.totalSubCon)}
          sub={`${fmtPct(capacityData.totalHeadcount > 0 ? (capacityData.totalSubCon / capacityData.totalHeadcount) * 100 : 0)} of headcount`}
          icon="engineering"
          color="bg-tertiary-container"
        />
        <StatCard
          label="Avg Squad Size"
          value={capacityData.squadCount > 0 ? (capacityData.totalHeadcount / capacityData.squadCount).toFixed(1) : "0"}
          sub="members per squad"
          icon="stacked_bar_chart"
          color="bg-error-container"
        />
      </div>

      {/* Division Allocation Breakdown */}
      <Card variant="elevated">
        <CardContent className="p-5">
          <h2 className="text-[16px] leading-6 font-medium text-surface-foreground mb-4">Allocation by Division</h2>

          {/* Stacked bar */}
          <div className="flex h-8 rounded-full overflow-hidden mb-4">
            {capacityData.divisions.map((div, idx) => {
              const pct = capacityData.totalHeadcount > 0 ? (div.total / capacityData.totalHeadcount) * 100 : 0;
              if (pct === 0) return null;
              return (
                <div
                  key={div.name}
                  className={`${getDivisionColor(div.name, idx)} transition-all relative group`}
                  style={{ width: `${pct}%` }}
                  title={`${div.name}: ${div.total} (${fmtPct(pct)})`}
                >
                  {pct > 8 && (
                    <span className="absolute inset-0 flex items-center justify-center text-[11px] font-medium text-white">
                      {fmtPct(pct)}
                    </span>
                  )}
                </div>
              );
            })}
          </div>

          {/* Legend + stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {capacityData.divisions.map((div, idx) => (
              <div key={div.name} className="flex items-start gap-2">
                <div className={`w-3 h-3 rounded-full mt-0.5 shrink-0 ${getDivisionColor(div.name, idx)}`} />
                <div>
                  <p className="text-[13px] font-medium text-surface-foreground">{div.name}</p>
                  <p className="text-[11px] text-surface-variant-foreground">
                    {div.total} people · {div.squads.length} squads
                  </p>
                  <p className="text-[11px] text-surface-variant-foreground">
                    {div.perm} perm · {div.subCon} contractors
                  </p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Monthly Phasing Table (P1–P12) */}
      <Card variant="elevated">
        <CardContent className="p-0">
          <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between">
            <div>
              <h2 className="text-[16px] leading-6 font-medium text-surface-foreground">
                Monthly Phasing — Headcount by Squad
              </h2>
              <p className="text-[12px] text-surface-variant-foreground mt-0.5">
                {divisionFilter !== "all" ? `Filtered: ${divisionFilter}` : "All divisions"} · {filteredSquads.length} squads
              </p>
            </div>
            <Chip variant="filter" selected>
              {fmtNum(filteredTotal)} total
            </Chip>
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-surface">
                <TableRow>
                  <TableHead className="sticky left-0 z-20 bg-surface min-w-[180px]">Squad</TableHead>
                  <TableHead className="min-w-[90px]">Division</TableHead>
                  <TableHead className="text-center min-w-[50px]">HC</TableHead>
                  <TableHead className="text-center min-w-[40px]">
                    <span className="text-emerald-600">P</span>
                  </TableHead>
                  <TableHead className="text-center min-w-[40px]">
                    <span className="text-blue-600">C</span>
                  </TableHead>
                  {PERIODS.map((p, i) => (
                    <TableHead key={p} className="text-center min-w-[48px]">
                      <div className="text-[11px] leading-tight">
                        <span className="font-medium">{p}</span>
                        <br />
                        <span className="text-surface-variant-foreground font-normal">{MONTH_LABELS[i]}</span>
                      </div>
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredSquads.map((squad) => (
                  <TableRow key={squad.squad} className="hover:bg-surface-foreground/4">
                    <TableCell className="sticky left-0 z-10 bg-surface font-medium text-[13px]">
                      {squad.squad}
                    </TableCell>
                    <TableCell className="text-[12px] text-surface-variant-foreground">{squad.division}</TableCell>
                    <TableCell className="text-center font-medium">{squad.total}</TableCell>
                    <TableCell className="text-center text-[12px] text-emerald-600">{squad.perm}</TableCell>
                    <TableCell className="text-center text-[12px] text-blue-600">{squad.subCon}</TableCell>
                    {squad.monthly.map((count, i) => (
                      <TableCell key={i} className="text-center text-[12px]">
                        <span className={count > 0 ? "text-surface-foreground" : "text-surface-variant-foreground/40"}>
                          {count}
                        </span>
                      </TableCell>
                    ))}
                  </TableRow>
                ))}

                {/* Division subtotal rows */}
                {divisionFilter === "all" && capacityData.divisions.map((div) => {
                  const divTotal = div.squads.reduce((s, q) => s + q.total, 0);
                  return (
                    <TableRow key={`sub-${div.name}`} className="bg-surface-container-low/50 border-t border-outline-variant">
                      <TableCell className="sticky left-0 z-10 bg-surface-container-low/50 font-medium text-[12px] text-surface-variant-foreground">
                        {div.name} subtotal
                      </TableCell>
                      <TableCell />
                      <TableCell className="text-center font-medium text-[12px]">{divTotal}</TableCell>
                      <TableCell className="text-center text-[12px] text-emerald-600 font-medium">{div.perm}</TableCell>
                      <TableCell className="text-center text-[12px] text-blue-600 font-medium">{div.subCon}</TableCell>
                      {PERIODS.map((_, i) => (
                        <TableCell key={i} className="text-center text-[12px] font-medium text-surface-variant-foreground">
                          {divTotal}
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}

                {/* Grand total */}
                <TableRow className="border-t-2 border-outline-variant font-medium bg-surface-container-low/80">
                  <TableCell className="sticky left-0 z-10 bg-surface-container-low/80 font-medium">Total</TableCell>
                  <TableCell />
                  <TableCell className="text-center font-semibold">{fmtNum(filteredTotal)}</TableCell>
                  <TableCell className="text-center text-emerald-600 font-semibold">{fmtNum(filteredPerm)}</TableCell>
                  <TableCell className="text-center text-blue-600 font-semibold">{fmtNum(filteredSubCon)}</TableCell>
                  {PERIODS.map((_, i) => (
                    <TableCell key={i} className="text-center font-semibold">{fmtNum(filteredTotal)}</TableCell>
                  ))}
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Squad Size Distribution */}
      <Card variant="elevated">
        <CardContent className="p-5">
          <h2 className="text-[16px] leading-6 font-medium text-surface-foreground mb-4">Squad Size Distribution</h2>
          <div className="space-y-2">
            {filteredSquads.map((squad, idx) => {
              const maxSize = Math.max(...filteredSquads.map((s) => s.total), 1);
              const pct = (squad.total / maxSize) * 100;
              const permPct = squad.total > 0 ? (squad.perm / squad.total) * 100 : 0;
              return (
                <div key={squad.squad} className="group">
                  <div className="flex items-center gap-3">
                    <span className="text-[13px] text-surface-foreground w-40 truncate shrink-0" title={squad.squad}>
                      {squad.squad}
                    </span>
                    <div className="flex-1 h-6 bg-surface-variant/20 rounded overflow-hidden flex">
                      <div
                        className="bg-emerald-500/80 h-full transition-all"
                        style={{ width: `${(squad.perm / maxSize) * 100}%` }}
                        title={`${squad.perm} perm`}
                      />
                      <div
                        className="bg-blue-500/80 h-full transition-all"
                        style={{ width: `${(squad.subCon / maxSize) * 100}%` }}
                        title={`${squad.subCon} contractors`}
                      />
                    </div>
                    <span className="text-[13px] font-medium text-surface-foreground w-8 text-right shrink-0">
                      {squad.total}
                    </span>
                  </div>
                </div>
              );
            })}
            {/* Legend */}
            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-outline-variant">
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-emerald-500/80" />
                <span className="text-[11px] text-surface-variant-foreground">Permanent</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded bg-blue-500/80" />
                <span className="text-[11px] text-surface-variant-foreground">Contractor</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
