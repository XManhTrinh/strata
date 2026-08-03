"use client";

import { useMemo, useState, useCallback } from "react";
import { MockPersonRepository } from "@/lib/org-tree/MockPersonRepository";
import { useOrgTree } from "@/lib/org-tree/useOrgTree";
import { ALL_SQUADS, TRIBES } from "@/lib/org-tree/squads";
import { Person } from "@/lib/org-tree/types";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";


const LEAVE_TYPES = {
  annual: { label: "Annual Leave", color: "bg-blue-500", light: "bg-blue-100 dark:bg-blue-900/40 text-blue-700 dark:text-blue-300" },
  sick: { label: "Sick Leave", color: "bg-red-400", light: "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-300" },
  wfh: { label: "Work from Home", color: "bg-green-500", light: "bg-green-100 dark:bg-green-900/40 text-green-700 dark:text-green-300" },
  conference: { label: "Conference", color: "bg-purple-500", light: "bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300" },
} as const;

type LeaveType = keyof typeof LEAVE_TYPES;

interface LeaveEntry {
  personId: string;
  type: LeaveType;
  startDate: string;
  endDate: string;
}

function getInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2);
}

function generateMockLeaves(persons: Person[]): LeaveEntry[] {
  const leaves: LeaveEntry[] = [];
  const types: LeaveType[] = ["annual", "sick", "wfh", "conference"];
  const year = new Date().getFullYear();

  let seed = 42;
  function rand() { seed = (seed * 16807 + 0) % 2147483647; return (seed - 1) / 2147483646; }

  for (const p of persons) {
    const numLeaves = Math.floor(rand() * 4) + 1;
    for (let i = 0; i < numLeaves; i++) {
      const month = Math.floor(rand() * 12);
      const day = Math.floor(rand() * 20) + 1;
      const duration = Math.floor(rand() * 5) + 1;
      const type = types[Math.floor(rand() * types.length)];
      const start = new Date(year, month, day);
      const end = new Date(year, month, day + duration);
      leaves.push({
        personId: p.id,
        type,
        startDate: start.toISOString().split("T")[0],
        endDate: end.toISOString().split("T")[0],
      });
    }
  }
  return leaves;
}

function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function formatMonth(year: number, month: number) {
  return new Date(year, month).toLocaleDateString("en-US", { month: "long", year: "numeric" });
}

function isWeekend(year: number, month: number, day: number) {
  const d = new Date(year, month, day).getDay();
  return d === 0 || d === 6;
}

function isInRange(date: string, start: string, end: string) {
  return date >= start && date <= end;
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

function MonthNav({ year, month, onChange }: { year: number; month: number; onChange: (y: number, m: number) => void }) {
  const prev = () => { const m = month === 0 ? 11 : month - 1; onChange(month === 0 ? year - 1 : year, m); };
  const next = () => { const m = month === 11 ? 0 : month + 1; onChange(month === 11 ? year + 1 : year, m); };
  return (
    <div className="flex items-center gap-3">
      <button type="button" onClick={prev} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 18l-6-6 6-6"/></svg>
      </button>
      <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 min-w-40 text-center">{formatMonth(year, month)}</span>
      <button type="button" onClick={next} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500 dark:text-gray-400 transition-colors">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 18l6-6-6-6"/></svg>
      </button>
    </div>
  );
}

function TeamTimeline({ persons, leaves, year, month }: { persons: Person[]; leaves: LeaveEntry[]; year: number; month: number }) {
  const days = getDaysInMonth(year, month);
  const dayHeaders = Array.from({ length: days }, (_, i) => i + 1);

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="border-b border-gray-200 dark:border-gray-700">
              <th className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-3 py-2 text-left font-medium text-gray-500 dark:text-gray-400 min-w-48">Person</th>
              {dayHeaders.map((d) => (
                <th
                  key={d}
                  className={[
                    "px-0.5 py-2 text-center font-medium min-w-7",
                    isWeekend(year, month, d) ? "text-gray-300 dark:text-gray-600 bg-gray-50 dark:bg-gray-800/50" : "text-gray-500 dark:text-gray-400",
                  ].join(" ")}
                >
                  {d}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {persons.map((p) => {
              const personLeaves = leaves.filter((l) => l.personId === p.id);
              return (
                <tr key={p.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50/50 dark:hover:bg-gray-700/20 transition-colors">
                  <td className="sticky left-0 z-10 bg-white dark:bg-gray-800 px-3 py-1.5">
                    <div className="flex items-center gap-2">
                      <Avatar>
                        <AvatarImage src={p.avatarUrl} alt={p.fullName} />
                        <AvatarFallback>{getInitials(p.fullName)}</AvatarFallback>
                      </Avatar>
                      <div className="min-w-0">
                        <p className="font-medium text-gray-900 dark:text-gray-100 text-xs">{p.fullName}</p>
                        <p className="text-gray-400 dark:text-gray-500 text-[10px]">{p.title}</p>
                      </div>
                    </div>
                  </td>
                  {dayHeaders.map((d) => {
                    const dateStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
                    const leave = personLeaves.find((l) => isInRange(dateStr, l.startDate, l.endDate));
                    const weekend = isWeekend(year, month, d);
                    return (
                      <td
                        key={d}
                        className={[
                          "px-0.5 py-1.5 text-center",
                          weekend ? "bg-gray-50 dark:bg-gray-800/50" : "",
                        ].join(" ")}
                      >
                        {leave && (
                          <div
                            className={`w-5 h-5 rounded-sm mx-auto ${LEAVE_TYPES[leave.type].color}`}
                            title={`${LEAVE_TYPES[leave.type].label}: ${leave.startDate} → ${leave.endDate}`}
                          />
                        )}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function LeaveSummary({ persons, leaves }: { persons: Person[]; leaves: LeaveEntry[] }) {
  const summary = useMemo(() => {
    return persons.map((p) => {
      const pLeaves = leaves.filter((l) => l.personId === p.id);
      const byType: Record<LeaveType, number> = { annual: 0, sick: 0, wfh: 0, conference: 0 };
      for (const l of pLeaves) {
        const start = new Date(l.startDate);
        const end = new Date(l.endDate);
        const days = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
        byType[l.type] += days;
      }
      const total = byType.annual + byType.sick + byType.wfh + byType.conference;
      return { person: p, byType, total };
    }).sort((a, b) => b.total - a.total);
  }, [persons, leaves]);

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Leave Summary (Days)</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100 dark:border-gray-700 text-left">
              <th className="px-5 py-3 font-medium text-gray-500 dark:text-gray-400">Person</th>
              {Object.entries(LEAVE_TYPES).map(([key, { label }]) => (
                <th key={key} className="px-3 py-3 font-medium text-gray-500 dark:text-gray-400 text-center">{label}</th>
              ))}
              <th className="px-3 py-3 font-medium text-gray-500 dark:text-gray-400 text-right">Total</th>
            </tr>
          </thead>
          <tbody>
            {summary.slice(0, 15).map(({ person, byType, total }) => (
              <tr key={person.id} className="border-b border-gray-50 dark:border-gray-700/50 hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                <td className="px-5 py-2">
                  <div className="flex items-center gap-2">
                    <Avatar>
                      <AvatarImage src={person.avatarUrl} alt={person.fullName} />
                      <AvatarFallback>{getInitials(person.fullName)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-gray-100">{person.fullName}</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500">{person.title}</p>
                    </div>
                  </div>
                </td>
                {(Object.keys(LEAVE_TYPES) as LeaveType[]).map((key) => (
                  <td key={key} className="px-3 py-2 text-center">
                    {byType[key] > 0 ? (
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${LEAVE_TYPES[key].light}`}>
                        {byType[key]}
                      </span>
                    ) : (
                      <span className="text-gray-300 dark:text-gray-600">—</span>
                    )}
                  </td>
                ))}
                <td className="px-3 py-2 text-right font-semibold text-gray-900 dark:text-gray-100">{total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function CalendarPage() {
  const repository = useMemo(() => new MockPersonRepository(), []);
  const { persons, loading, error } = useOrgTree(repository);

  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth());
  const [selectedSquad, setSelectedSquad] = useState<string | null>(null);

  const leaves = useMemo(() => generateMockLeaves(persons), [persons]);

  const filteredPersons = useMemo(() => {
    if (!selectedSquad) return [];
    return persons.filter((p) => p.squads.includes(selectedSquad));
  }, [persons, selectedSquad]);

  const monthLeaves = useMemo(() => {
    const monthStr = `${year}-${String(month + 1).padStart(2, "0")}`;
    return leaves.filter((l) => l.startDate.startsWith(monthStr) || l.endDate.startsWith(monthStr));
  }, [leaves, year, month]);

  const totalLeaveDays = useMemo(() => {
    return leaves.reduce((sum, l) => {
      const start = new Date(l.startDate);
      const end = new Date(l.endDate);
      return sum + Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    }, 0);
  }, [leaves]);

  const onMonthChange = useCallback((y: number, m: number) => { setYear(y); setMonth(m); }, []);

  const peopleOnLeaveThisMonth = useMemo(() => {
    return new Set(monthLeaves.map((l) => l.personId)).size;
  }, [monthLeaves]);

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
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Team Calendar</h1>
          <MonthNav year={year} month={month} onChange={onMonthChange} />
        </div>

        {/* Overview cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <StatCard label="Total People" value={String(persons.length)} />
          <StatCard label="Total Leave Days" value={String(totalLeaveDays)} sub="this year" />
          <StatCard label="On Leave This Month" value={String(peopleOnLeaveThisMonth)} sub={`of ${filteredPersons.length}`} />
          <StatCard label="Leave Events" value={String(monthLeaves.length)} sub={formatMonth(year, month)} />
        </div>

        {/* Squad filter + legend */}
        <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
          <div className="flex items-center gap-1 overflow-x-auto">
            <button
              type="button"
              onClick={() => setSelectedSquad(null)}
              className={[
                "shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors",
                !selectedSquad ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300" : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700",
              ].join(" ")}
            >
              All
            </button>
            {ALL_SQUADS.map((squad) => (
              <button
                key={squad}
                type="button"
                onClick={() => setSelectedSquad(squad)}
                className={[
                  "shrink-0 px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap",
                  selectedSquad === squad ? "bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300" : "text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700",
                ].join(" ")}
              >
                {squad}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-4">
            {Object.entries(LEAVE_TYPES).map(([key, { label, color }]) => (
              <div key={key} className="flex items-center gap-1.5">
                <span className={`w-3 h-3 rounded-sm ${color}`} />
                <span className="text-xs text-gray-500 dark:text-gray-400">{label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Timeline */}
        <div className="mb-8">
          <TeamTimeline persons={filteredPersons} leaves={leaves} year={year} month={month} />
        </div>

        {/* Leave summary table */}
        <LeaveSummary persons={filteredPersons} leaves={leaves} />
      </div>
    </div>
  );
}
