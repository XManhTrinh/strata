"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import { AppBar } from "@/components/layout/app-bar";
import { Icon } from "@vkieu/mui";
import { Card, CardContent } from "@vkieu/mui";
import { Chip } from "@vkieu/mui";
import { Skeleton } from "@/components/ui/skeleton";
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

// ─── Formatters ───────────────────────────────────────────────────────────────

function fmtGBP(n: number) {
  return new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }).format(n);
}

function fmtNum(n: number) {
  return new Intl.NumberFormat("en-GB").format(n);
}

// ─── Stats computation ────────────────────────────────────────────────────────

interface DivisionStats {
  name: string;
  headcount: number;
  permCount: number;
  subConCount: number;
  totalAnnualCost: number;
  avgCost: number;
}

interface SquadStats {
  division: string;
  squad: string;
  headcount: number;
  permCount: number;
  subConCount: number;
  totalAnnualCost: number;
}

function computeDivisionStats(members: Person[]): DivisionStats[] {
  const map = new Map<string, Person[]>();
  for (const m of members) {
    const div = m.metadata?.["Division"] || m.orgUnitName || "Unassigned";
    if (!map.has(div)) map.set(div, []);
    map.get(div)!.push(m);
  }

  return Array.from(map.entries())
    .map(([name, people]) => {
      const totalCost = people.reduce((sum, p) => sum + (p.annualCost ?? 0), 0);
      return {
        name,
        headcount: people.length,
        permCount: people.filter((p) => p.employmentType === "Perm").length,
        subConCount: people.filter((p) => p.employmentType === "SubCon").length,
        totalAnnualCost: totalCost,
        avgCost: people.length > 0 ? Math.round(totalCost / people.length) : 0,
      };
    })
    .sort((a, b) => b.totalAnnualCost - a.totalAnnualCost);
}

function computeSquadStats(members: Person[]): SquadStats[] {
  const map = new Map<string, { division: string; people: Person[] }>();
  for (const m of members) {
    const squad = m.metadata?.["Squad"] || m.orgUnitName || "Unassigned";
    const division = m.metadata?.["Division"] || "Unknown";
    if (!map.has(squad)) map.set(squad, { division, people: [] });
    map.get(squad)!.people.push(m);
  }

  return Array.from(map.entries())
    .map(([squad, { division, people }]) => ({
      division,
      squad,
      headcount: people.length,
      permCount: people.filter((p) => p.employmentType === "Perm").length,
      subConCount: people.filter((p) => p.employmentType === "SubCon").length,
      totalAnnualCost: people.reduce((sum, p) => sum + (p.annualCost ?? 0), 0),
    }))
    .sort((a, b) => b.totalAnnualCost - a.totalAnnualCost);
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  icon,
  color,
}: {
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
        <p className="text-[12px] leading-4 text-surface-variant-foreground uppercase tracking-wide">
          {label}
        </p>
        <p className="text-[28px] leading-9 font-normal text-surface-foreground mt-1">
          {value}
        </p>
        {sub && (
          <p className="text-[12px] leading-4 text-surface-variant-foreground mt-1">
            {sub}
          </p>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Cost Bar ─────────────────────────────────────────────────────────────────

const DIVISION_COLORS = [
  "bg-blue-500",
  "bg-violet-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-pink-500",
  "bg-cyan-500",
  "bg-rose-500",
  "bg-teal-500",
];

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function BudgetsPage() {
  const companyId = useCompanyId();
  const { data, isLoading, isError, error } = usePeople({
    companyId,
    pageSize: 500,
  });

  const members = data?.data ?? [];

  const totalAnnualCost = useMemo(
    () => members.reduce((sum, m) => sum + (m.annualCost ?? 0), 0),
    [members],
  );
  const permCount = members.filter((m) => m.employmentType === "Perm").length;
  const subConCount = members.filter((m) => m.employmentType === "SubCon").length;
  const avgCost = members.length > 0 ? Math.round(totalAnnualCost / members.length) : 0;

  const divisionStats = useMemo(() => computeDivisionStats(members), [members]);
  const squadStats = useMemo(() => computeSquadStats(members), [members]);

  if (isLoading) {
    return (
      <div className="space-y-6">
        <AppBar>
          <div>
            <h1 className="text-[28px] leading-9 font-normal text-surface-foreground">
              Budget & Cost
            </h1>
            <p className="text-[14px] leading-5 text-surface-variant-foreground">
              Headcount costs across divisions and squads.
            </p>
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

  if (isError) {
    return (
      <div className="space-y-6">
        <AppBar>
          <div>
            <h1 className="text-[28px] leading-9 font-normal text-surface-foreground">
              Budget & Cost
            </h1>
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

  return (
    <motion.div
      className="space-y-6"
      variants={pageTransitionVariants}
      initial="initial"
      animate="enter"
      exit="exit"
      transition={defaultTransition}
    >
      <AppBar>
        <div>
          <h1 className="text-[28px] leading-9 font-normal text-surface-foreground">
            Budget & Cost
          </h1>
          <p className="text-[14px] leading-5 text-surface-variant-foreground">
            Headcount costs across divisions and squads · {fmtNum(members.length)} members
          </p>
        </div>
      </AppBar>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard
          label="Total Annual Cost"
          value={fmtGBP(totalAnnualCost)}
          sub={`${fmtNum(members.length)} members`}
          icon="payments"
          color="bg-primary-container"
        />
        <StatCard
          label="Avg Cost / Head"
          value={fmtGBP(avgCost)}
          sub="per annum"
          icon="person"
          color="bg-secondary-container"
        />
        <StatCard
          label="Permanent"
          value={fmtNum(permCount)}
          sub={`${members.length > 0 ? Math.round((permCount / members.length) * 100) : 0}% of headcount`}
          icon="badge"
          color="bg-tertiary-container"
        />
        <StatCard
          label="Contractors"
          value={fmtNum(subConCount)}
          sub={`${members.length > 0 ? Math.round((subConCount / members.length) * 100) : 0}% of headcount`}
          icon="engineering"
          color="bg-error-container"
        />
      </div>

      {/* Division Cost Breakdown */}
      <Card variant="elevated">
        <CardContent className="p-5">
          <h2 className="text-[16px] leading-6 font-medium text-surface-foreground mb-4">
            Cost by Division
          </h2>
          <div className="space-y-3">
            {divisionStats.map((stat, idx) => {
              const pct = totalAnnualCost > 0 ? (stat.totalAnnualCost / totalAnnualCost) * 100 : 0;
              const barColor = DIVISION_COLORS[idx % DIVISION_COLORS.length];
              return (
                <div key={stat.name}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${barColor}`} />
                      <span className="text-[14px] font-medium text-surface-foreground">
                        {stat.name}
                      </span>
                      <Chip variant="filter">{stat.headcount} people</Chip>
                    </div>
                    <span className="text-[14px] font-medium text-surface-foreground">
                      {fmtGBP(stat.totalAnnualCost)}
                    </span>
                  </div>
                  <div className="h-2 bg-surface-variant/30 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${barColor} rounded-full transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <span className="text-[11px] text-surface-variant-foreground">
                      {stat.permCount} perm · {stat.subConCount} contractors
                    </span>
                    <span className="text-[11px] text-surface-variant-foreground">
                      Avg {fmtGBP(stat.avgCost)}/head
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Squad Cost Table */}
      <Card variant="elevated">
        <CardContent className="p-0">
          <div className="px-5 py-4 border-b border-outline-variant">
            <h2 className="text-[16px] leading-6 font-medium text-surface-foreground">
              Cost by Squad
            </h2>
          </div>
          <div className="max-h-100 overflow-y-auto">
            <Table>
              <TableHeader className="sticky top-0 z-10 bg-surface shadow-sm">
                <TableRow>
                  <TableHead>Squad</TableHead>
                  <TableHead>Division</TableHead>
                  <TableHead className="text-right">Headcount</TableHead>
                  <TableHead className="text-right">Perm</TableHead>
                  <TableHead className="text-right">SubCon</TableHead>
                  <TableHead className="text-right">Annual Cost</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {squadStats.map((stat) => (
                  <TableRow key={stat.squad}>
                    <TableCell className="font-medium">{stat.squad}</TableCell>
                    <TableCell className="text-surface-variant-foreground">
                      {stat.division}
                    </TableCell>
                    <TableCell className="text-right">{stat.headcount}</TableCell>
                    <TableCell className="text-right">{stat.permCount}</TableCell>
                    <TableCell className="text-right">{stat.subConCount}</TableCell>
                    <TableCell className="text-right font-medium">
                      {fmtGBP(stat.totalAnnualCost)}
                    </TableCell>
                  </TableRow>
                ))}
                {/* Totals row */}
                <TableRow className="border-t-2 border-outline-variant font-medium bg-surface-container-low/50">
                  <TableCell>Total</TableCell>
                  <TableCell></TableCell>
                  <TableCell className="text-right">{fmtNum(members.length)}</TableCell>
                  <TableCell className="text-right">{fmtNum(permCount)}</TableCell>
                  <TableCell className="text-right">{fmtNum(subConCount)}</TableCell>
                  <TableCell className="text-right">{fmtGBP(totalAnnualCost)}</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
