"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import {
  TopAppBar,
  Card,
  FilterChip,
} from "@vkieu/mui";
import { CardContent } from "@/components/ui/card-content";
import { Icon } from "@/components/ui/icon";
import { Typography } from "@/components/ui/typography";
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
          <Icon name={icon} size={24} className="text-primary-container-foreground" />
        </div>
        <Typography variant="label-medium" color="surface-variant-foreground" className="uppercase tracking-wide">
          {label}
        </Typography>
        <Typography variant="headline-medium" className="mt-1">
          {value}
        </Typography>
        {sub && (
          <Typography variant="body-small" color="surface-variant-foreground" className="mt-1">
            {sub}
          </Typography>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Cost Bar ─────────────────────────────────────────────────────────────────

const DIVISION_COLORS = [
  "bg-primary",
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
        <TopAppBar title={<Typography variant="headline-medium">Budget &amp; Cost</Typography>} subtitle="Headcount costs across divisions and squads." />
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
        <TopAppBar title={<Typography variant="headline-medium">Budget &amp; Cost</Typography>} />
        <Card variant="elevated" className="max-w-md mx-auto">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Icon name="error" size={32} className="text-error mb-3" />
            <Typography variant="body-medium" color="surface-variant-foreground">
              {error?.message || "Failed to load"}
            </Typography>
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
      <TopAppBar title={<Typography variant="headline-medium">Budget &amp; Cost</Typography>} subtitle={`Headcount costs across divisions and squads · ${fmtNum(members.length)} members`} />

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
          <Typography variant="title-medium" className="mb-4">
            Cost by Division
          </Typography>
          <div className="space-y-3">
            {divisionStats.map((stat, idx) => {
              const pct = totalAnnualCost > 0 ? (stat.totalAnnualCost / totalAnnualCost) * 100 : 0;
              const barColor = DIVISION_COLORS[idx % DIVISION_COLORS.length];
              return (
                <div key={stat.name}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <div className={`w-3 h-3 rounded-full ${barColor}`} />
                      <Typography variant="body-medium" as="span">
                        {stat.name}
                      </Typography>
                      <FilterChip>{stat.headcount} people</FilterChip>
                    </div>
                    <Typography variant="body-medium" as="span">
                      {fmtGBP(stat.totalAnnualCost)}
                    </Typography>
                  </div>
                  <div className="h-2 bg-surface-variant/30 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${barColor} rounded-full transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="flex justify-between mt-1">
                    <Typography variant="label-small" color="surface-variant-foreground" as="span">
                      {stat.permCount} perm · {stat.subConCount} contractors
                    </Typography>
                    <Typography variant="label-small" color="surface-variant-foreground" as="span">
                      Avg {fmtGBP(stat.avgCost)}/head
                    </Typography>
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
            <Typography variant="title-medium">
              Cost by Squad
            </Typography>
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
