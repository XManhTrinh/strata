"use client";

import { useMemo, useState, useCallback } from "react";
import { motion } from "motion/react";
import { MockPersonRepository } from "@/lib/org-tree/MockPersonRepository";
import { useOrgTree } from "@/lib/org-tree/useOrgTree";
import { ALL_SQUADS } from "@/lib/org-tree/squads";
import { Person } from "@/lib/org-tree/types";
import { AppBar } from "@/components/layout/app-bar";
import { Button } from "@strata/mui/buttons";
import { Icon } from "@strata/mui";
import { Card, CardContent } from "@strata/mui";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { pageTransitionVariants, defaultTransition } from "@/lib/motion";

function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

interface SquadStats {
  name: string;
  headcount: number;
  totalSalary: number;
  avgSalary: number;
  persons: Person[];
}

interface RoleStats {
  role: string;
  headcount: number;
  totalSalary: number;
  avgSalary: number;
}

function useSquadStats(persons: Person[]): SquadStats[] {
  return useMemo(() => {
    return ALL_SQUADS.map((name) => {
      const members = persons.filter((p) => p.squads.includes(name));
      const totalSalary = members.reduce((sum, p) => sum + p.salary, 0);
      return {
        name,
        headcount: members.length,
        totalSalary,
        avgSalary: members.length > 0 ? Math.round(totalSalary / members.length) : 0,
        persons: members,
      };
    }).sort((a, b) => b.totalSalary - a.totalSalary);
  }, [persons]);
}

function useRoleStats(persons: Person[]): RoleStats[] {
  return useMemo(() => {
    const roleMap = new Map<string, Person[]>();
    for (const p of persons) {
      const role = p.title;
      if (!roleMap.has(role)) roleMap.set(role, []);
      roleMap.get(role)!.push(p);
    }
    return Array.from(roleMap.entries())
      .map(([role, members]) => ({
        role,
        headcount: members.length,
        totalSalary: members.reduce((sum, p) => sum + p.salary, 0),
        avgSalary: Math.round(members.reduce((sum, p) => sum + p.salary, 0) / members.length),
      }))
      .sort((a, b) => b.totalSalary - a.totalSalary);
  }, [persons]);
}

function StatCard({ label, value, sub, icon }: { label: string; value: string; sub?: string; icon: string }) {
  return (
    <Card variant="elevated">
      <CardContent className="p-5">
        <div className="flex items-center gap-3 mb-3">
          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-primary/12">
            <Icon name={icon} size={20} className="text-primary" />
          </div>
        </div>
        <p className="text-[12px] leading-4 font-medium text-surface-variant-foreground uppercase tracking-wider">{label}</p>
        <p className="text-[24px] leading-8 font-normal text-surface-foreground mt-1">{value}</p>
        {sub && <p className="text-[12px] leading-4 text-surface-variant-foreground mt-1">{sub}</p>}
      </CardContent>
    </Card>
  );
}

function SquadBar({ stat, maxSalary, color, onHover, onLeave, isHovered }: {
  stat: SquadStats; maxSalary: number; color: string;
  onHover: (stat: SquadStats, color: string, e: React.MouseEvent) => void;
  onLeave: () => void;
  isHovered: boolean;
}) {
  const pct = maxSalary > 0 ? (stat.totalSalary / maxSalary) * 100 : 0;
  return (
    <div
      className={`flex items-center gap-4 rounded-lg px-2 py-1.5 -mx-2 transition-colors ${isHovered ? "bg-surface-foreground/8" : ""}`}
      onMouseEnter={(e) => onHover(stat, color, e)}
      onMouseMove={(e) => onHover(stat, color, e)}
      onMouseLeave={onLeave}
    >
      <span className="w-36 shrink-0 text-[14px] font-medium text-surface-foreground text-right">{stat.name}</span>
      <div className="flex-1 h-8 bg-surface-variant/20 rounded-lg overflow-hidden relative">
        <div
          className="h-full rounded-lg transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
        <span className="absolute inset-0 flex items-center px-3 text-[12px] font-medium text-surface-foreground">
          {fmt(stat.totalSalary)} · {stat.headcount} people
        </span>
      </div>
    </div>
  );
}

function TopEarners({ persons }: { persons: Person[] }) {
  const top = useMemo(() => [...persons].sort((a, b) => b.salary - a.salary).slice(0, 10), [persons]);
  return (
    <Card variant="elevated">
      <CardContent className="p-5">
        <h3 className="text-[14px] leading-5 font-medium text-surface-foreground mb-4">Top 10 by Salary</h3>
        <div className="space-y-3">
          {top.map((p, i) => (
            <div key={p.id} className="flex items-center gap-3">
              <span className="text-[12px] font-medium text-surface-variant-foreground w-5 text-right">{i + 1}</span>
              <div className="w-8 h-8 rounded-full bg-primary/12 flex items-center justify-center text-[12px] font-medium text-primary shrink-0 overflow-hidden">
                {p.avatarUrl ? <img src={p.avatarUrl} alt={p.fullName} className="w-full h-full object-cover" /> : p.fullName.split(" ").map(w => w[0]).join("").slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium text-surface-foreground truncate">{p.fullName}</p>
                <p className="text-[12px] text-surface-variant-foreground truncate">{p.title}</p>
              </div>
              <span className="text-[14px] font-medium text-surface-foreground">{fmt(p.salary)}</span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function DonutChart({ stats, total, onHover, onLeave, hoveredSquad }: {
  stats: SquadStats[]; total: number;
  onHover: (stat: SquadStats, color: string, e: React.MouseEvent) => void;
  onLeave: () => void;
  hoveredSquad: string | null;
}) {
  const size = 220;
  const strokeWidth = 32;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  let offset = 0;

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {stats.map((s, i) => {
          const pct = total > 0 ? s.totalSalary / total : 0;
          const dashLength = pct * circumference;
          const dashOffset = -offset;
          offset += dashLength;
          return (
            <circle
              key={s.name}
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="none"
              stroke={COLORS[i % COLORS.length]}
              strokeWidth={hoveredSquad === s.name ? strokeWidth + 6 : strokeWidth}
              strokeDasharray={`${dashLength} ${circumference - dashLength}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="round"
              className="transition-all duration-300 cursor-default"
              onMouseEnter={(e) => onHover(s, COLORS[i % COLORS.length], e as unknown as React.MouseEvent)}
              onMouseLeave={onLeave}
            />
          );
        })}
      </svg>
      <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 mt-4">
        {stats.map((s, i) => (
          <div key={s.name} className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
            <span className="text-[12px] text-surface-variant-foreground">{s.name}</span>
            <span className="text-[12px] font-medium text-surface-foreground ml-auto">
              {total > 0 ? ((s.totalSalary / total) * 100).toFixed(1) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function SquadTooltip({ stat, color, position }: { stat: SquadStats; color: string; position: { x: number; y: number } }) {
  const roleBreakdown = useMemo(() => {
    const map = new Map<string, { count: number; salary: number }>();
    for (const p of stat.persons) {
      const entry = map.get(p.title) ?? { count: 0, salary: 0 };
      entry.count++;
      entry.salary += p.salary;
      map.set(p.title, entry);
    }
    return Array.from(map.entries()).sort((a, b) => b[1].salary - a[1].salary);
  }, [stat.persons]);

  return (
    <div
      className="fixed z-50 pointer-events-none"
      style={{ left: position.x + 12, top: position.y + 12 }}
    >
      <Card variant="elevated" className="w-72 shadow-xl">
        <CardContent className="p-4">
          <div className="flex items-center gap-2 mb-3">
            <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-[14px] font-medium text-surface-foreground">{stat.name}</span>
          </div>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <div>
              <p className="text-[10px] text-surface-variant-foreground uppercase">People</p>
              <p className="text-[14px] font-medium text-surface-foreground">{stat.headcount}</p>
            </div>
            <div>
              <p className="text-[10px] text-surface-variant-foreground uppercase">Total</p>
              <p className="text-[14px] font-medium text-surface-foreground">{fmt(stat.totalSalary)}</p>
            </div>
            <div>
              <p className="text-[10px] text-surface-variant-foreground uppercase">Avg</p>
              <p className="text-[14px] font-medium text-surface-foreground">{fmt(stat.avgSalary)}</p>
            </div>
          </div>
          <div className="border-t border-outline-variant pt-2 space-y-1">
            {roleBreakdown.map(([role, { count, salary }]) => (
              <div key={role} className="flex items-center justify-between text-[12px]">
                <span className="text-surface-variant-foreground">{count}× {role}</span>
                <span className="text-surface-foreground font-medium">{fmt(salary)}</span>
              </div>
            ))}
          </div>
          <div className="border-t border-outline-variant mt-2 pt-2 max-h-32 overflow-y-auto space-y-1">
            {stat.persons.slice(0, 20).map((p) => (
              <div key={p.id} className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-primary/12 flex items-center justify-center text-[10px] font-medium text-primary shrink-0 overflow-hidden">
                  {p.avatarUrl ? <img src={p.avatarUrl} alt={p.fullName} className="w-full h-full object-cover" /> : p.fullName.split(" ").map(w => w[0]).join("").slice(0, 2)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[12px] font-medium text-surface-foreground truncate">{p.fullName}</p>
                  <p className="text-[10px] text-surface-variant-foreground truncate">{p.title}</p>
                </div>
                <span className="text-[10px] text-surface-variant-foreground">{fmt(p.salary)}</span>
              </div>
            ))}
            {stat.persons.length > 20 && (
              <p className="text-[10px] text-surface-variant-foreground text-center py-1">+{stat.persons.length - 20} more</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

const COLORS = [
  "#6366f1", "#8b5cf6", "#a78bfa", "#c084fc", "#e879f9",
  "#f472b6", "#fb7185", "#f87171", "#fb923c", "#fbbf24",
];

export default function BudgetsPage() {
  const repository = useMemo(() => new MockPersonRepository(), []);
  const { persons, loading, error } = useOrgTree(repository);

  const totalSalary = useMemo(() => persons.reduce((sum, p) => sum + p.salary, 0), [persons]);
  const avgSalary = persons.length > 0 ? Math.round(totalSalary / persons.length) : 0;
  const unallocatedCount = persons.filter((p) => p.squads.length === 0).length;

  const squadStats = useSquadStats(persons);
  const roleStats = useRoleStats(persons);
  const maxSquadSalary = squadStats.length > 0 ? squadStats[0].totalSalary : 0;

  const [tooltip, setTooltip] = useState<{ stat: SquadStats; color: string; pos: { x: number; y: number } } | null>(null);

  const onSquadHover = useCallback((stat: SquadStats, color: string, e: React.MouseEvent) => {
    setTooltip({ stat, color, pos: { x: e.clientX, y: e.clientY } });
  }, []);

  const onSquadLeave = useCallback(() => setTooltip(null), []);

  if (loading) {
    return (
      <div className="space-y-6">
        <AppBar>
          <div>
            <h1 className="text-[28px] leading-9 font-normal text-surface-foreground">Team Budget &amp; Allocation</h1>
            <p className="text-[14px] leading-5 text-surface-variant-foreground">
              Budget overview across squads and roles.
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
        <Card variant="elevated">
          <CardContent className="p-5 space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-8 w-full rounded-lg" />
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <AppBar>
          <div>
            <h1 className="text-[28px] leading-9 font-normal text-surface-foreground">Team Budget &amp; Allocation</h1>
            <p className="text-[14px] leading-5 text-surface-variant-foreground">
              Budget overview across squads and roles.
            </p>
          </div>
        </AppBar>
        <Card variant="elevated" className="max-w-lg mx-auto">
          <CardContent className="flex flex-col items-center py-12 px-8 text-center">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-error/12 mb-4">
              <Icon name="error" size={24} className="text-error" />
            </div>
            <h2 className="text-[22px] leading-7 font-normal text-surface-foreground mb-2">
              Unable to load budget data
            </h2>
            <p className="text-[14px] leading-5 text-surface-variant-foreground mb-6">{error}</p>
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
          <h1 className="text-[28px] leading-9 font-normal text-surface-foreground">Team Budget &amp; Allocation</h1>
          <p className="text-[14px] leading-5 text-surface-variant-foreground">
            Budget overview across squads and roles.
          </p>
        </div>
      </AppBar>

      {/* Overview cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Total Budget" value={fmt(totalSalary)} sub={`${persons.length} people`} icon="account_balance" />
        <StatCard label="Avg Salary" value={fmt(avgSalary)} icon="trending_up" />
        <StatCard label="Squads" value={String(ALL_SQUADS.length)} sub={`${unallocatedCount} unallocated`} icon="group_work" />
        <StatCard label="Headcount" value={String(persons.length)} sub={`across ${ALL_SQUADS.length} squads`} icon="group" />
      </div>

      {/* Squad budget: bars + donut */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card variant="elevated" className="lg:col-span-2">
          <CardContent className="p-5">
            <h3 className="text-[14px] leading-5 font-medium text-surface-foreground mb-4">Budget by Squad</h3>
            <div className="space-y-3">
              {squadStats.map((s, i) => (
                <SquadBar key={s.name} stat={s} maxSalary={maxSquadSalary} color={COLORS[i % COLORS.length]} onHover={onSquadHover} onLeave={onSquadLeave} isHovered={tooltip?.stat.name === s.name} />
              ))}
            </div>
          </CardContent>
        </Card>
        <Card variant="elevated" className="flex items-center justify-center">
          <CardContent className="p-5">
            <DonutChart stats={squadStats} total={totalSalary} onHover={onSquadHover} onLeave={onSquadLeave} hoveredSquad={tooltip?.stat.name ?? null} />
          </CardContent>
        </Card>
      </div>

      {/* Two column: role table + top earners */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card variant="elevated">
          <CardContent className="p-0">
            <div className="px-5 py-4">
              <h3 className="text-[14px] leading-5 font-medium text-surface-foreground">Budget by Role</h3>
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Role</TableHead>
                  <TableHead className="text-right">Headcount</TableHead>
                  <TableHead className="text-right">Total Salary</TableHead>
                  <TableHead className="text-right">Avg Salary</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {roleStats.map((s) => (
                  <TableRow key={s.role}>
                    <TableCell className="text-[14px] text-surface-foreground">{s.role}</TableCell>
                    <TableCell className="text-[14px] text-surface-variant-foreground text-right">{s.headcount}</TableCell>
                    <TableCell className="text-[14px] text-surface-variant-foreground text-right">{fmt(s.totalSalary)}</TableCell>
                    <TableCell className="text-[14px] text-surface-variant-foreground text-right">{fmt(s.avgSalary)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <TopEarners persons={persons} />
      </div>

      {tooltip && (
        <SquadTooltip stat={tooltip.stat} color={tooltip.color} position={tooltip.pos} />
      )}
    </motion.div>
  );
}
