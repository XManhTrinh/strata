"use client";

import { useMemo, useState, useCallback } from "react";
import { MockPersonRepository } from "@/lib/org-tree/MockPersonRepository";
import { useOrgTree } from "@/lib/org-tree/useOrgTree";
import { ALL_SQUADS, TRIBES } from "@/lib/org-tree/squads";
import { Person } from "@/lib/org-tree/types";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";


function fmt(n: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(n);
}

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2);
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

function StatCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
      <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</p>
      <p className="text-2xl font-bold text-gray-900 dark:text-gray-100 mt-1">{value}</p>
      {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">{sub}</p>}
    </div>
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
      className={["flex items-center gap-4 rounded-lg px-2 py-1 -mx-2 transition-colors", isHovered ? "bg-gray-50 dark:bg-gray-700/30" : ""].join(" ")}
      onMouseEnter={(e) => onHover(stat, color, e)}
      onMouseMove={(e) => onHover(stat, color, e)}
      onMouseLeave={onLeave}
    >
      <span className="w-36 shrink-0 text-sm font-medium text-gray-700 dark:text-gray-300 text-right">{stat.name}</span>
      <div className="flex-1 h-8 bg-gray-100 dark:bg-gray-700 rounded-lg overflow-hidden relative">
        <div
          className="h-full rounded-lg transition-all duration-500"
          style={{ width: `${pct}%`, backgroundColor: color }}
        />
        <span className="absolute inset-0 flex items-center px-3 text-xs font-medium text-gray-700 dark:text-gray-200">
          {fmt(stat.totalSalary)} · {stat.headcount} people
        </span>
      </div>
    </div>
  );
}

function TopEarners({ persons }: { persons: Person[] }) {
  const top = useMemo(() => [...persons].sort((a, b) => b.salary - a.salary).slice(0, 10), [persons]);
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Top 10 by Salary</h3>
      <div className="space-y-3">
        {top.map((p, i) => (
          <div key={p.id} className="flex items-center gap-3">
            <span className="text-xs font-bold text-gray-400 dark:text-gray-500 w-5 text-right">{i + 1}</span>
            <Avatar>
              <AvatarImage src={p.avatarUrl} alt={p.fullName} />
              <AvatarFallback>{getInitials(p.fullName)}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{p.fullName}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">{p.title}</p>
            </div>
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{fmt(p.salary)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function RoleTable({ stats }: { stats: RoleStats[] }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Budget by Role</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700 text-left">
              <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Role</th>
              <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400 text-right">Headcount</th>
              <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400 text-right">Total Salary</th>
              <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400 text-right">Avg Salary</th>
            </tr>
          </thead>
          <tbody>
            {stats.map((s) => (
              <tr key={s.role} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                <td className="px-5 py-3 text-gray-900 dark:text-gray-100">{s.role}</td>
                <td className="px-5 py-3 text-gray-700 dark:text-gray-300 text-right">{s.headcount}</td>
                <td className="px-5 py-3 text-gray-700 dark:text-gray-300 text-right">{fmt(s.totalSalary)}</td>
                <td className="px-5 py-3 text-gray-700 dark:text-gray-300 text-right">{fmt(s.avgSalary)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

const COLORS = [
  "#6366f1", "#8b5cf6", "#a78bfa", "#c084fc", "#e879f9",
  "#f472b6", "#fb7185", "#f87171", "#fb923c", "#fbbf24",
];

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
      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl p-4 w-72">
        <div className="flex items-center gap-2 mb-3">
          <span className="w-3 h-3 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{stat.name}</span>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase">People</p>
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{stat.headcount}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase">Total</p>
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{fmt(stat.totalSalary)}</p>
          </div>
          <div>
            <p className="text-[10px] text-gray-400 dark:text-gray-500 uppercase">Avg</p>
            <p className="text-sm font-bold text-gray-900 dark:text-gray-100">{fmt(stat.avgSalary)}</p>
          </div>
        </div>
        <div className="border-t border-gray-100 dark:border-gray-700 pt-2 space-y-1">
          {roleBreakdown.map(([role, { count, salary }]) => (
            <div key={role} className="flex items-center justify-between text-xs">
              <span className="text-gray-600 dark:text-gray-400">{count}× {role}</span>
              <span className="text-gray-900 dark:text-gray-200 font-medium">{fmt(salary)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-gray-100 dark:border-gray-700 mt-2 pt-2 max-h-32 overflow-y-auto space-y-1">
          {stat.persons.slice(0, 20).map((p) => (
            <div key={p.id} className="flex items-center gap-2">
              <Avatar>
                <AvatarImage src={p.avatarUrl} alt={p.fullName} />
                <AvatarFallback>{getInitials(p.fullName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium text-gray-900 dark:text-gray-100">{p.fullName}</p>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">{p.title}</p>
              </div>
              <span className="text-[10px] text-gray-500 dark:text-gray-400">{fmt(p.salary)}</span>
            </div>
          ))}
          {stat.persons.length > 20 && (
            <p className="text-[10px] text-gray-400 dark:text-gray-500 text-center py-1">+{stat.persons.length - 20} more</p>
          )}
        </div>
      </div>
    </div>
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
            <span className="text-xs text-gray-600 dark:text-gray-400">{s.name}</span>
            <span className="text-xs font-medium text-gray-900 dark:text-gray-200 ml-auto">
              {total > 0 ? ((s.totalSalary / total) * 100).toFixed(1) : 0}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function BudgetPage() {
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
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-20">
        <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-6 py-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Team Budget &amp; Allocation</h1>

        {/* Overview cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total Budget" value={fmt(totalSalary)} sub={`${persons.length} people`} />
          <StatCard label="Avg Salary" value={fmt(avgSalary)} />
          <StatCard label="Squads" value={String(ALL_SQUADS.length)} sub={`${unallocatedCount} unallocated`} />
          <StatCard label="Headcount" value={String(persons.length)} sub={`across ${ALL_SQUADS.length} squads`} />
        </div>

        {/* Squad budget: bars + donut */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Budget by Squad</h3>
            <div className="space-y-3">
              {squadStats.map((s, i) => (
                <SquadBar key={s.name} stat={s} maxSalary={maxSquadSalary} color={COLORS[i % COLORS.length]} onHover={onSquadHover} onLeave={onSquadLeave} isHovered={tooltip?.stat.name === s.name} />
              ))}
            </div>
          </div>
          <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5 flex items-center justify-center">
            <DonutChart stats={squadStats} total={totalSalary} onHover={onSquadHover} onLeave={onSquadLeave} hoveredSquad={tooltip?.stat.name ?? null} />
          </div>
        </div>

        {/* Two column: role table + top earners */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <RoleTable stats={roleStats} />
          <TopEarners persons={persons} />
        </div>
      </div>

      {tooltip && (
        <SquadTooltip stat={tooltip.stat} color={tooltip.color} position={tooltip.pos} />
      )}
    </div>
  );
}
