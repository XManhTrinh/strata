"use client";

import { useMemo, useState, useCallback } from "react";
import { MockPersonRepository } from "@/lib/org-tree/MockPersonRepository";
import { useOrgTree } from "@/lib/org-tree/useOrgTree";
import { ALL_SQUADS } from "@/lib/org-tree/squads";
import { Person } from "@/lib/org-tree/types";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";


const SPRINT_DAYS = 10;
const HOURS_PER_DAY = 8;

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2);
}

function getSprintStart(date: Date): Date {
  const d = new Date(date);
  d.setDate(d.getDate() - d.getDay() + 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

function formatDate(d: Date) {
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
}

function formatSprintRange(start: Date) {
  const end = new Date(start);
  end.setDate(end.getDate() + SPRINT_DAYS - 1);
  return `${formatDate(start)} – ${formatDate(end)}`;
}

interface SprintCapacity {
  personId: string;
  totalDays: number;
  leaveDays: number;
  availableDays: number;
  availableHours: number;
  plannedHours: number;
  utilization: number;
}

interface SquadCapacity {
  name: string;
  members: number;
  totalHours: number;
  availableHours: number;
  plannedHours: number;
  utilization: number;
  persons: (SprintCapacity & { person: Person })[];
}

function generateMockLeaves(persons: Person[]): Map<string, string[]> {
  const map = new Map<string, string[]>();
  let seed = 42;
  function rand() { seed = (seed * 16807 + 0) % 2147483647; return (seed - 1) / 2147483646; }

  const year = new Date().getFullYear();
  for (const p of persons) {
    const dates: string[] = [];
    const numLeaves = Math.floor(rand() * 3) + 1;
    for (let i = 0; i < numLeaves; i++) {
      const month = Math.floor(rand() * 12);
      const day = Math.floor(rand() * 20) + 1;
      const dur = Math.floor(rand() * 4) + 1;
      for (let d = 0; d < dur; d++) {
        const dt = new Date(year, month, day + d);
        const dow = dt.getDay();
        if (dow !== 0 && dow !== 6) {
          dates.push(dt.toISOString().split("T")[0]);
        }
      }
    }
    map.set(p.id, dates);
  }
  return map;
}

function generatePlannedHours(persons: Person[], seed: number): Map<string, number> {
  const map = new Map<string, number>();
  let s = seed;
  function rand() { s = (s * 16807 + 0) % 2147483647; return (s - 1) / 2147483646; }
  for (const p of persons) {
    const base = SPRINT_DAYS * HOURS_PER_DAY;
    map.set(p.id, Math.round(base * (0.5 + rand() * 0.6)));
  }
  return map;
}

function useSprintCapacity(persons: Person[], sprintStart: Date) {
  return useMemo(() => {
    const leaves = generateMockLeaves(persons);
    const planned = generatePlannedHours(persons, sprintStart.getTime() % 10000);

    const sprintDates: string[] = [];
    for (let i = 0; i < SPRINT_DAYS; i++) {
      const d = new Date(sprintStart);
      d.setDate(d.getDate() + i);
      const dow = d.getDay();
      if (dow !== 0 && dow !== 6) {
        sprintDates.push(d.toISOString().split("T")[0]);
      }
    }

    const capacities: Map<string, SprintCapacity> = new Map();
    for (const p of persons) {
      const personLeaves = leaves.get(p.id) ?? [];
      const leaveDays = sprintDates.filter((d) => personLeaves.includes(d)).length;
      const availableDays = sprintDates.length - leaveDays;
      const availableHours = availableDays * HOURS_PER_DAY;
      const plannedHours = Math.min(planned.get(p.id) ?? 0, availableHours);
      capacities.set(p.id, {
        personId: p.id,
        totalDays: sprintDates.length,
        leaveDays,
        availableDays,
        availableHours,
        plannedHours,
        utilization: availableHours > 0 ? Math.round((plannedHours / availableHours) * 100) : 0,
      });
    }
    return capacities;
  }, [persons, sprintStart]);
}

function useSquadCapacities(persons: Person[], capacities: Map<string, SprintCapacity>): SquadCapacity[] {
  return useMemo(() => {
    return ALL_SQUADS.map((name) => {
      const members = persons.filter((p) => p.squads.includes(name));
      let totalHours = 0, availableHours = 0, plannedHours = 0;
      const personCaps = members.map((p) => {
        const cap = capacities.get(p.id)!;
        totalHours += cap.totalDays * HOURS_PER_DAY;
        availableHours += cap.availableHours;
        plannedHours += cap.plannedHours;
        return { ...cap, person: p };
      });
      return {
        name,
        members: members.length,
        totalHours,
        availableHours,
        plannedHours,
        utilization: availableHours > 0 ? Math.round((plannedHours / availableHours) * 100) : 0,
        persons: personCaps.sort((a, b) => b.utilization - a.utilization),
      };
    }).sort((a, b) => b.utilization - a.utilization);
  }, [persons, capacities]);
}

function UtilBar({ pct, size = "md" }: { pct: number; size?: "sm" | "md" }) {
  const color = pct > 90 ? "bg-red-500" : pct > 70 ? "bg-amber-500" : "bg-green-500";
  const h = size === "sm" ? "h-2" : "h-3";
  return (
    <div className={`flex-1 ${h} bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden`}>
      <div className={`${h} ${color} rounded-full transition-all duration-500`} style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  );
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

function SquadCapacityCard({ squad, expanded, onToggle }: { squad: SquadCapacity; expanded: boolean; onToggle: () => void }) {
  const statusColor = squad.utilization > 90 ? "text-red-500" : squad.utilization > 70 ? "text-amber-500" : "text-green-500";
  const statusLabel = squad.utilization > 90 ? "Over-allocated" : squad.utilization > 70 ? "High load" : "Healthy";

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <button type="button" onClick={onToggle} className="w-full px-5 py-4 flex items-center gap-4 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors text-left">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-sm font-semibold text-gray-900 dark:text-gray-100">{squad.name}</span>
            <span className="text-xs text-gray-400 dark:text-gray-500">{squad.members} members</span>
            <span className={`text-xs font-medium ${statusColor}`}>{statusLabel}</span>
          </div>
          <div className="flex items-center gap-3">
            <UtilBar pct={squad.utilization} />
            <span className="text-sm font-bold text-gray-900 dark:text-gray-100 w-12 text-right">{squad.utilization}%</span>
          </div>
        </div>
        <div className="text-right shrink-0">
          <p className="text-xs text-gray-400 dark:text-gray-500">{squad.plannedHours}h / {squad.availableHours}h</p>
        </div>
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={`text-gray-400 transition-transform ${expanded ? "rotate-180" : ""}`}
        >
          <path d="M6 9l6 6 6-6"/>
        </svg>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 dark:border-gray-700">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-gray-100 dark:border-gray-700">
                <th className="px-5 py-2 text-left font-medium text-gray-500 dark:text-gray-400">Person</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 dark:text-gray-400">Available</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 dark:text-gray-400">Leave</th>
                <th className="px-3 py-2 text-right font-medium text-gray-500 dark:text-gray-400">Planned</th>
                <th className="px-3 py-2 font-medium text-gray-500 dark:text-gray-400 w-32">Utilization</th>
              </tr>
            </thead>
            <tbody>
              {squad.persons.map(({ person, availableDays, leaveDays, plannedHours, availableHours, utilization }) => (
                <tr key={person.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/20 transition-colors">
                  <td className="px-5 py-2">
                    <div className="flex items-center gap-2">
                      <Avatar>
                        <AvatarImage src={person.avatarUrl} alt={person.fullName} />
                        <AvatarFallback>{getInitials(person.fullName)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 dark:text-gray-100">{person.fullName}</p>
                        <p className="text-gray-400 dark:text-gray-500 text-[10px]">{person.title}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{availableDays}d ({availableHours}h)</td>
                  <td className="px-3 py-2 text-right">
                    {leaveDays > 0 ? (
                      <span className="text-red-500 font-medium">{leaveDays}d</span>
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600">—</span>
                    )}
                  </td>
                  <td className="px-3 py-2 text-right text-gray-700 dark:text-gray-300">{plannedHours}h</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <UtilBar pct={utilization} size="sm" />
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300 w-8 text-right">{utilization}%</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

function CapacityHeatmap({ squads }: { squads: SquadCapacity[] }) {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-5">
      <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-4">Capacity Heatmap</h3>
      <div className="grid grid-cols-5 gap-3">
        {squads.map((sq) => {
          const bg = sq.utilization > 90 ? "bg-red-100 dark:bg-red-900/30 border-red-200 dark:border-red-800"
            : sq.utilization > 70 ? "bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800"
            : "bg-green-100 dark:bg-green-900/30 border-green-200 dark:border-green-800";
          const text = sq.utilization > 90 ? "text-red-700 dark:text-red-400"
            : sq.utilization > 70 ? "text-amber-700 dark:text-amber-400"
            : "text-green-700 dark:text-green-400";
          return (
            <div key={sq.name} className={`border rounded-xl p-3 ${bg} transition-colors`}>
              <p className="text-xs font-medium text-gray-700 dark:text-gray-300">{sq.name}</p>
              <p className={`text-lg font-bold ${text} mt-1`}>{sq.utilization}%</p>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{sq.members} people · {sq.availableHours}h</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function CapacityPage() {
  const repository = useMemo(() => new MockPersonRepository(), []);
  const { persons, loading, error } = useOrgTree(repository);

  const [sprintOffset, setSprintOffset] = useState(0);
  const [expandedSquads, setExpandedSquads] = useState<Set<string>>(new Set());

  const sprintStart = useMemo(() => {
    const base = getSprintStart(new Date());
    const d = new Date(base);
    d.setDate(d.getDate() + sprintOffset * SPRINT_DAYS);
    return d;
  }, [sprintOffset]);

  const capacities = useSprintCapacity(persons, sprintStart);
  const squadCapacities = useSquadCapacities(persons, capacities);

  const totalAvailable = useMemo(() => {
    let h = 0;
    capacities.forEach((c) => { h += c.availableHours; });
    return h;
  }, [capacities]);

  const totalPlanned = useMemo(() => {
    let h = 0;
    capacities.forEach((c) => { h += c.plannedHours; });
    return h;
  }, [capacities]);

  const totalOnLeave = useMemo(() => {
    let d = 0;
    capacities.forEach((c) => { d += c.leaveDays; });
    return d;
  }, [capacities]);

  const overallUtil = totalAvailable > 0 ? Math.round((totalPlanned / totalAvailable) * 100) : 0;

  const toggleSquad = useCallback((name: string) => {
    setExpandedSquads((prev) => {
      const next = new Set(prev);
      if (next.has(name)) { next.delete(name); } else { next.add(name); }
      return next;
    });
  }, []);

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
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Capacity Planner</h1>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setSprintOffset((p) => p - 1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
            </button>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-900 dark:text-gray-100">{formatSprintRange(sprintStart)}</p>
              <p className="text-[10px] text-gray-400 dark:text-gray-500">{SPRINT_DAYS}-day sprint</p>
            </div>
            <button type="button" onClick={() => setSprintOffset((p) => p + 1)} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
            {sprintOffset !== 0 && (
              <button type="button" onClick={() => setSprintOffset(0)} className="text-xs text-indigo-500 hover:text-indigo-400 font-medium ml-2">
                Today
              </button>
            )}
          </div>
        </div>

        {/* Overview */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Available Hours" value={`${totalAvailable}h`} sub={`${persons.length} people`} />
          <StatCard label="Planned Hours" value={`${totalPlanned}h`} sub={`of ${totalAvailable}h available`} />
          <StatCard label="Utilization" value={`${overallUtil}%`} sub={overallUtil > 90 ? "⚠ Over-allocated" : overallUtil > 70 ? "High load" : "Healthy"} />
          <StatCard label="On Leave" value={`${totalOnLeave} days`} sub="this sprint" />
        </div>

        {/* Heatmap */}
        <div className="mb-8">
          <CapacityHeatmap squads={squadCapacities} />
        </div>

        {/* Squad breakdown */}
        <div className="space-y-3">
          {squadCapacities.map((sq) => (
            <SquadCapacityCard
              key={sq.name}
              squad={sq}
              expanded={expandedSquads.has(sq.name)}
              onToggle={() => toggleSquad(sq.name)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
