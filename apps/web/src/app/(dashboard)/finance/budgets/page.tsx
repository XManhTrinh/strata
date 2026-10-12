"use client";

import { useMemo } from "react";
import { motion } from "motion/react";
import {
  TopAppBar,
  Card,
  AssistChip,
  Button,
  Divider,
} from "@vkieu/windmorph";
import {
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card-content";
import { Icon } from "@/components/ui/icon";
import { Skeleton, SkeletonGroup } from "@vkieu/windmorph/vk";
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
import { useReducedMotionContext } from "@/components/accessibility/reduced-motion";
import {
  pageTransitionVariants,
  defaultTransition,
  resolveAnimationVariants,
} from "@/lib/motion";

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

interface StatCardProps {
  label: string;
  value: string;
  sub?: string;
  icon: string;
  tint: string;
  iconColor: string;
}

function StatCard({ label, value, sub, icon, tint, iconColor }: StatCardProps) {
  return (
    <Card variant="elevated">
      <CardContent className="flex flex-col gap-3 p-6">
        <div
          className={`flex items-center justify-center h-10 w-10 rounded-full ${tint}`}
        >
          <Icon name={icon} size={20} className={iconColor} />
        </div>
        <div>
          <p className="font-brand text-display-small text-on-surface">
            {value}
          </p>
          <p className="mt-1 text-body-medium text-on-surface-variant">
            {label}
          </p>
          {sub && (
            <p className="mt-0.5 text-label-small text-on-surface-variant">
              {sub}
            </p>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Loading Skeleton ──────────────────────────────────────────────────────────

function StatCardSkeleton() {
  return (
    <Card variant="elevated">
      <CardContent className="flex flex-col gap-3 p-6">
        <SkeletonGroup label="Loading budgets">
          <Skeleton className="h-10 w-10" corner="full" />
          <div className="space-y-2">
            <Skeleton className="h-11 w-28" corner="extra-small" />
            <Skeleton className="h-4 w-24" corner="extra-small" />
          </div>
        </SkeletonGroup>
      </CardContent>
    </Card>
  );
}

// ─── Cost Bar colors (data-meaning palette — preserved) ─────────────────────────

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
  const reduced = useReducedMotionContext();
  const companyId = useCompanyId();
  const { data, isLoading, isError, error, refetch } = usePeople({
    companyId,
    pageSize: 500,
  });

  const members = useMemo(() => data?.data ?? [], [data]);

  const totalAnnualCost = useMemo(
    () => members.reduce((sum, m) => sum + (m.annualCost ?? 0), 0),
    [members],
  );
  const permCount = members.filter((m) => m.employmentType === "Perm").length;
  const subConCount = members.filter((m) => m.employmentType === "SubCon").length;
  const avgCost = members.length > 0 ? Math.round(totalAnnualCost / members.length) : 0;

  const divisionStats = useMemo(() => computeDivisionStats(members), [members]);
  const squadStats = useMemo(() => computeSquadStats(members), [members]);

  // ─── Loading State ──────────────────────────────────────────────────────────

  if (isLoading) {
    return (
      <div className="flex flex-col gap-6">
        <TopAppBar
          title={<h1 className="text-headline-medium">Budget &amp; Cost</h1>}
          subtitle="Headcount costs across divisions and squads."
        />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <StatCardSkeleton key={i} />
          ))}
        </div>
      </div>
    );
  }

  // ─── Error State ────────────────────────────────────────────────────────────

  if (isError) {
    return (
      <div className="flex flex-col gap-6">
        <TopAppBar
          title={<h1 className="text-headline-medium">Budget &amp; Cost</h1>}
        />
        <Card variant="filled" className="max-w-lg mx-auto">
          <CardContent className="flex flex-col items-center py-12 px-8 text-center">
            <div className="flex items-center justify-center h-14 w-14 rounded-full bg-error/12 mb-4">
              <Icon name="error" size={24} className="text-error" />
            </div>
            <p className="text-title-medium mb-2">Something went wrong</p>
            <p className="text-body-medium text-on-surface-variant mb-6">
              {error?.message || "Failed to load budget data. Please try again."}
            </p>
            <Button
              variant="filled"
              leadingIcon={<Icon name="refresh" />}
              onClick={() => refetch()}
            >
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Empty State ────────────────────────────────────────────────────────────

  if (members.length === 0) {
    return (
      <div className="flex flex-col gap-6">
        <TopAppBar
          title={<h1 className="text-headline-medium">Budget &amp; Cost</h1>}
          subtitle="Headcount costs across divisions and squads."
        />
        <Card variant="elevated" className="max-w-lg mx-auto">
          <CardContent className="flex flex-col items-center py-12 px-8 text-center">
            <div className="flex items-center justify-center h-14 w-14 rounded-full bg-surface-container-high mb-3">
              <Icon
                name="payments"
                size={24}
                className="text-on-surface-variant"
              />
            </div>
            <p className="text-title-medium mb-1">No cost data yet</p>
            <p className="text-body-medium text-on-surface-variant">
              Add members with cost details to see budget breakdowns.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ─── Main ───────────────────────────────────────────────────────────────────

  const stats: StatCardProps[] = [
    {
      label: "Total Annual Cost",
      value: fmtGBP(totalAnnualCost),
      sub: `${fmtNum(members.length)} members`,
      icon: "payments",
      tint: "bg-primary/12",
      iconColor: "text-primary",
    },
    {
      label: "Avg Cost / Head",
      value: fmtGBP(avgCost),
      sub: "per annum",
      icon: "person",
      tint: "bg-secondary/12",
      iconColor: "text-secondary",
    },
    {
      label: "Permanent",
      value: fmtNum(permCount),
      sub: `${members.length > 0 ? Math.round((permCount / members.length) * 100) : 0}% of headcount`,
      icon: "badge",
      tint: "bg-tertiary/12",
      iconColor: "text-tertiary",
    },
    {
      label: "Contractors",
      value: fmtNum(subConCount),
      sub: `${members.length > 0 ? Math.round((subConCount / members.length) * 100) : 0}% of headcount`,
      icon: "engineering",
      tint: "bg-error/12",
      iconColor: "text-error",
    },
  ];

  return (
    <motion.div
      className="flex flex-col gap-6"
      variants={resolveAnimationVariants(pageTransitionVariants, reduced)}
      initial="initial"
      animate="enter"
      exit="exit"
      transition={defaultTransition}
    >
      <TopAppBar
        title={<h1 className="text-headline-medium">Budget &amp; Cost</h1>}
        subtitle={`Headcount costs across divisions and squads · ${fmtNum(members.length)} members`}
      />

      {/* ─── KPI Cards ──────────────────────────────────────────────────── */}
      <section aria-label="Budget metrics">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {stats.map((stat, index) => (
            <motion.div
              key={stat.label}
              variants={resolveAnimationVariants(pageTransitionVariants, reduced)}
              initial="initial"
              animate="enter"
              transition={{
                ...defaultTransition,
                delay: reduced ? 0 : index * 0.05,
              }}
            >
              <StatCard {...stat} />
            </motion.div>
          ))}
        </div>
      </section>

      <Divider />

      {/* ─── Cost by Division ───────────────────────────────────────────── */}
      <section aria-label="Cost by division">
        <Card variant="elevated">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-title-medium">Cost by Division</CardTitle>
            <AssistChip leadingIcon={<Icon name="pie_chart" />}>
              {fmtNum(divisionStats.length)} divisions
            </AssistChip>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            {divisionStats.map((stat, idx) => {
              const pct =
                totalAnnualCost > 0
                  ? (stat.totalAnnualCost / totalAnnualCost) * 100
                  : 0;
              const barColor = DIVISION_COLORS[idx % DIVISION_COLORS.length];
              const isTopShare = idx === 0;
              return (
                <div key={stat.name}>
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <div className="flex min-w-0 items-center gap-2">
                      <span className={`h-3 w-3 shrink-0 rounded-full ${barColor}`} />
                      <span className="truncate text-body-medium text-on-surface">
                        {stat.name}
                      </span>
                      <AssistChip>{stat.headcount} people</AssistChip>
                    </div>
                    <span
                      className={`shrink-0 text-body-medium ${
                        isTopShare
                          ? "font-brand text-on-surface"
                          : "text-on-surface"
                      }`}
                    >
                      {fmtGBP(stat.totalAnnualCost)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-surface-container-highest">
                    <div
                      className={`h-full rounded-full ${barColor} transition-all`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between">
                    <span className="text-label-small text-on-surface-variant">
                      {stat.permCount} perm · {stat.subConCount} contractors
                    </span>
                    <span className="text-label-small text-on-surface-variant">
                      Avg {fmtGBP(stat.avgCost)}/head
                    </span>
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      </section>

      {/* ─── Cost by Squad ──────────────────────────────────────────────── */}
      <section aria-label="Cost by squad">
        <Card variant="elevated">
          <CardHeader>
            <CardTitle className="text-title-medium">Cost by Squad</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="max-h-100 overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-surface-container-low shadow-sm">
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
                      <TableCell className="font-medium text-on-surface">
                        {stat.squad}
                      </TableCell>
                      <TableCell className="text-on-surface-variant">
                        {stat.division}
                      </TableCell>
                      <TableCell className="text-right text-on-surface">
                        {stat.headcount}
                      </TableCell>
                      <TableCell className="text-right text-on-surface">
                        {stat.permCount}
                      </TableCell>
                      <TableCell className="text-right text-on-surface">
                        {stat.subConCount}
                      </TableCell>
                      <TableCell className="text-right font-medium text-on-surface">
                        {fmtGBP(stat.totalAnnualCost)}
                      </TableCell>
                    </TableRow>
                  ))}
                  {/* Totals row */}
                  <TableRow className="border-t-2 border-outline-variant bg-surface-container-low/50 font-medium">
                    <TableCell className="text-on-surface">Total</TableCell>
                    <TableCell></TableCell>
                    <TableCell className="text-right text-on-surface">
                      {fmtNum(members.length)}
                    </TableCell>
                    <TableCell className="text-right text-on-surface">
                      {fmtNum(permCount)}
                    </TableCell>
                    <TableCell className="text-right text-on-surface">
                      {fmtNum(subConCount)}
                    </TableCell>
                    <TableCell className="text-right text-on-surface">
                      {fmtGBP(totalAnnualCost)}
                    </TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      </section>
    </motion.div>
  );
}
