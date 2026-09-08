"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AppBar } from "@/components/layout/app-bar";
import { Icon } from "@vkieu/mui";
import { Card, CardContent } from "@vkieu/mui";
import { Chip } from "@vkieu/mui";
import { Button } from "@vkieu/mui/buttons";
import { Skeleton } from "@/components/ui/skeleton";
import { Select } from "@vkieu/mui";
import { TextField } from "@vkieu/mui";
import { Divider } from "@vkieu/mui";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@vkieu/mui";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { toast } from "sonner";
import {
  useCapacitySummary,
  useSaveAllocations,
  useRateCards,
  useUpsertRateCard,
  useDeleteRateCard,
  useOrgUnitTree,
} from "@/services";
import type { SquadCapacitySummary, PeriodValues, MemberAllocation, UpsertAllocationDto } from "@/services";
import { useCompanyId } from "@/hooks/use-company";
import { pageTransitionVariants, defaultTransition } from "@/lib/motion";
import { OrgUnitTreeSelect } from "@/components/ui/org-unit-tree-select";

// ─── Constants ────────────────────────────────────────────────────────────────

const PERIODS = ["p1","p2","p3","p4","p5","p6","p7","p8","p9","p10","p11","p12"] as const;
const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

type PeriodKey = typeof PERIODS[number];

function fmtNum(n: number) {
  return new Intl.NumberFormat("en-GB").format(n);
}

function fmtGBP(n: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP", maximumFractionDigits: 0 }).format(n);
}

function fmtFTE(n: number) {
  return n % 1 === 0 ? String(n) : n.toFixed(2);
}

function sumPeriods(pv: PeriodValues): number {
  return PERIODS.reduce((s, pk) => s + pv[pk], 0);
}

function zeroPeriods(): PeriodValues {
  return { p1:0,p2:0,p3:0,p4:0,p5:0,p6:0,p7:0,p8:0,p9:0,p10:0,p11:0,p12:0 };
}

// ─── Draft State Types ────────────────────────────────────────────────────────

/** Key: "membershipId|orgUnitId" → period values */
type DraftMap = Map<string, PeriodValues>;

function draftKey(membershipId: string, orgUnitId: string) {
  return `${membershipId}|${orgUnitId}`;
}

function buildDraftFromServer(squads: SquadCapacitySummary[]): DraftMap {
  const draft: DraftMap = new Map();
  for (const squad of squads) {
    for (const m of squad.members) {
      draft.set(draftKey(m.membershipId, squad.orgUnitId), { ...m.allocations });
    }
  }
  return draft;
}

function draftsEqual(a: DraftMap, b: DraftMap): boolean {
  if (a.size !== b.size) return false;
  for (const [key, av] of a) {
    const bv = b.get(key);
    if (!bv) return false;
    for (const pk of PERIODS) {
      if (av[pk] !== bv[pk]) return false;
    }
  }
  return true;
}

// ─── Stat Card ────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, icon, color }: {
  label: string; value: string; sub?: string; icon: string; color: string;
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
  const currentYear = new Date().getFullYear();
  const [fiscalYear, setFiscalYear] = useState(currentYear);
  const [selectedSquadIds, setSelectedSquadIds] = useState<Set<string>>(new Set());
  const [employmentFilter, setEmploymentFilter] = useState<"all" | "Perm" | "SubCon">("all");
  const [activeTab, setActiveTab] = useState<"phasing" | "rate-cards">("phasing");
  const [showRateCardDialog, setShowRateCardDialog] = useState(false);
  const [rateCardForm, setRateCardForm] = useState({ division: "", location: "", grade: "", annualCost: "" });

  // Context menu for allocating member to another squad
  const [contextMenu, setContextMenu] = useState<{
    x: number; y: number;
    membershipId: string; fullName: string;
    currentSquadId: string;
  } | null>(null);

  const { data: squads, isLoading, isError, error } = useCapacitySummary(companyId, fiscalYear);
  const { data: orgUnits = [] } = useOrgUnitTree(companyId);
  const { data: rateCards = [] } = useRateCards(companyId);
  const saveAllocationsMutation = useSaveAllocations();
  const upsertRateCardMutation = useUpsertRateCard();
  const deleteRateCardMutation = useDeleteRateCard();

  // Local draft for allocations
  const [localDraft, setLocalDraft] = useState<DraftMap>(new Map());
  const [serverDraft, setServerDraft] = useState<DraftMap>(new Map());

  // Sync server → local on data load
  useEffect(() => {
    if (squads) {
      const draft = buildDraftFromServer(squads);
      setServerDraft(draft);
      setLocalDraft(new Map(draft.entries()));
    }
  }, [squads]);

  const isDirty = !draftsEqual(serverDraft, localDraft);

  // Compute change count
  const changeCount = useMemo(() => {
    let count = 0;
    for (const [key, lv] of localDraft) {
      const sv = serverDraft.get(key);
      if (!sv) { count++; continue; }
      for (const pk of PERIODS) {
        if (lv[pk] !== sv[pk]) { count++; break; }
      }
    }
    return count;
  }, [localDraft, serverDraft]);

  const filteredSquads = useMemo(() => {
    if (!squads) return [];

    // Build a lookup of all known members across all squads
    const memberLookup = new Map<string, MemberAllocation>();
    for (const sq of squads) {
      for (const m of sq.members) {
        memberLookup.set(m.membershipId, m);
      }
    }

    // Find draft entries that don't exist in server data (newly added allocations)
    const draftAdditions = new Map<string, MemberAllocation[]>(); // orgUnitId → new members
    for (const [key] of localDraft) {
      if (serverDraft.has(key)) continue; // exists on server, not new
      const [membershipId, orgUnitId] = key.split("|");
      const existsInSquad = squads.some(
        (sq) => sq.orgUnitId === orgUnitId && sq.members.some((m) => m.membershipId === membershipId),
      );
      if (existsInSquad) continue; // already rendered

      const sourceMember = memberLookup.get(membershipId);
      if (!sourceMember) continue;

      if (!draftAdditions.has(orgUnitId)) draftAdditions.set(orgUnitId, []);
      draftAdditions.get(orgUnitId)!.push({
        ...sourceMember,
        allocations: localDraft.get(key)!,
        monthlyCost: zeroPeriods(), // will be recomputed in rendering
      });
    }

    // Merge draft additions into squad data
    let result = squads.map((sq) => {
      const additions = draftAdditions.get(sq.orgUnitId);
      if (!additions || additions.length === 0) return sq;
      return {
        ...sq,
        members: [...sq.members, ...additions],
      };
    });

    // Also create squad entries for org units that only exist in draft (shouldn't happen normally)

    // Filter by selected squads (empty set = all)
    if (selectedSquadIds.size > 0) {
      result = result.filter((s) => selectedSquadIds.has(s.orgUnitId));
    }
    // Filter members by employment type
    if (employmentFilter !== "all") {
      result = result.map((sq) => ({
        ...sq,
        members: sq.members.filter((m) => m.employmentType === employmentFilter),
        permCount: employmentFilter === "Perm" ? sq.permCount : 0,
        subConCount: employmentFilter === "SubCon" ? sq.subConCount : 0,
      })).filter((sq) => sq.members.length > 0);
    }
    return result;
  }, [squads, selectedSquadIds, employmentFilter, localDraft, serverDraft]);

  // ─── Handlers ─────────────────────────────────────────────────────────────

  const handleFTEChange = useCallback((membershipId: string, orgUnitId: string, period: PeriodKey, value: number) => {
    setLocalDraft((prev) => {
      const next = new Map(prev);
      const key = draftKey(membershipId, orgUnitId);
      const existing = next.get(key) ?? zeroPeriods();
      next.set(key, { ...existing, [period]: value });
      return next;
    });
  }, []);

  const handleDiscard = () => {
    setLocalDraft(new Map(serverDraft.entries()));
  };

  const handleAllocateToSquad = useCallback((membershipId: string, targetSquadId: string) => {
    setLocalDraft((prev) => {
      const next = new Map(prev);
      const key = draftKey(membershipId, targetSquadId);
      if (!next.has(key)) {
        // Default 0.5 FTE for secondary squad allocation
        next.set(key, { p1:0.5,p2:0.5,p3:0.5,p4:0.5,p5:0.5,p6:0.5,p7:0.5,p8:0.5,p9:0.5,p10:0.5,p11:0.5,p12:0.5 });
      }
      return next;
    });
    setContextMenu(null);
    toast.success("Added squad allocation — adjust FTE and save");
  }, []);

  const handleSave = () => {
    if (!isDirty) return;
    const allocations: UpsertAllocationDto[] = [];
    for (const [key, pv] of localDraft) {
      const [membershipId, orgUnitId] = key.split("|");
      allocations.push({ membershipId, orgUnitId, fiscalYear, ...pv });
    }
    saveAllocationsMutation.mutate(
      { companyId, allocations },
      {
        onSuccess: () => toast.success(`Saved ${allocations.length} allocation${allocations.length !== 1 ? "s" : ""}`),
        onError: (err) => toast.error(err.message || "Failed to save"),
      },
    );
  };

  const handleCreateRateCard = () => {
    const cost = parseFloat(rateCardForm.annualCost);
    if (!rateCardForm.division || !rateCardForm.location || !rateCardForm.grade || isNaN(cost) || cost <= 0) {
      toast.error("All fields are required"); return;
    }
    upsertRateCardMutation.mutate(
      { companyId, division: rateCardForm.division, location: rateCardForm.location, grade: rateCardForm.grade, annualCost: cost },
      {
        onSuccess: () => {
          toast.success("Rate card saved");
          setShowRateCardDialog(false);
          setRateCardForm({ division: "", location: "", grade: "", annualCost: "" });
        },
        onError: (err) => toast.error(err.message || "Failed to save"),
      },
    );
  };

  // ─── Aggregations ─────────────────────────────────────────────────────────

  // Cross-squad FTE totals per person (for overallocation detection)
  // Scans ALL draft entries, not just server squad members
  const personTotalFTE = useMemo(() => {
    const map = new Map<string, PeriodValues>();
    for (const [key, alloc] of localDraft) {
      const [membershipId] = key.split("|");
      const existing = map.get(membershipId) ?? zeroPeriods();
      for (const pk of PERIODS) existing[pk] += alloc[pk];
      map.set(membershipId, existing);
    }
    return map;
  }, [localDraft]);

  const totalFTE = useMemo(() => {
    const t = zeroPeriods();
    for (const sq of filteredSquads) {
      for (const m of sq.members) {
        const alloc = localDraft.get(draftKey(m.membershipId, sq.orgUnitId)) ?? m.allocations;
        for (const pk of PERIODS) t[pk] += alloc[pk];
      }
    }
    return t;
  }, [filteredSquads, localDraft]);

  const totalCost = useMemo(() => {
    const t = zeroPeriods();
    for (const sq of filteredSquads) {
      for (const m of sq.members) {
        const alloc = localDraft.get(draftKey(m.membershipId, sq.orgUnitId)) ?? m.allocations;
        const monthlyCost = m.annualCost ? m.annualCost / 12 : 0;
        for (const pk of PERIODS) t[pk] += Math.round(alloc[pk] * monthlyCost);
      }
    }
    return t;
  }, [filteredSquads, localDraft]);

  const totalMembers = filteredSquads.reduce((s, sq) => s + sq.members.length, 0);
  const totalPerm = filteredSquads.reduce((s, sq) => s + sq.permCount, 0);
  const totalSubCon = filteredSquads.reduce((s, sq) => s + sq.subConCount, 0);
  const annualCostTotal = sumPeriods(totalCost);
  const avgMonthlyFTE = sumPeriods(totalFTE) / 12;

  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const y = currentYear - 1 + i;
    return { value: String(y), label: `FY ${y}` };
  });

  // ─── Loading ────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="space-y-6">
        <AppBar><div>
          <h1 className="text-[28px] leading-9 font-normal text-surface-foreground">Capacity Planning</h1>
          <p className="text-[14px] leading-5 text-surface-variant-foreground">Team allocation and monthly phasing.</p>
        </div></AppBar>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} variant="elevated"><CardContent className="p-5 space-y-3">
              <Skeleton className="h-10 w-10 rounded-full" /><Skeleton className="h-3 w-20" /><Skeleton className="h-7 w-28" />
            </CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <AppBar><div><h1 className="text-[28px] leading-9 font-normal text-surface-foreground">Capacity Planning</h1></div></AppBar>
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
    <motion.div className="space-y-6" variants={pageTransitionVariants} initial="initial" animate="enter" exit="exit" transition={defaultTransition}>
      {/* Header */}
      <AppBar className="justify-between">
        <div>
          <h1 className="text-[28px] leading-9 font-normal text-surface-foreground">Capacity Planning</h1>
          <p className="text-[14px] leading-5 text-surface-variant-foreground">
            FTE allocation per squad · P1–P12 monthly phasing
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={String(fiscalYear)} onValueChange={(v) => setFiscalYear(Number(v))} variant="outlined" options={yearOptions} className="w-32" />
        </div>
      </AppBar>

      {/* Filters Row */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Employment type filter */}
        <Chip variant="filter" selected={employmentFilter === "all"} onClick={() => setEmploymentFilter("all")}>All</Chip>
        <Chip variant="filter" selected={employmentFilter === "Perm"} onClick={() => setEmploymentFilter(employmentFilter === "Perm" ? "all" : "Perm")} leadingIcon="badge">Perm</Chip>
        <Chip variant="filter" selected={employmentFilter === "SubCon"} onClick={() => setEmploymentFilter(employmentFilter === "SubCon" ? "all" : "SubCon")} leadingIcon="engineering">Contractors</Chip>

        <div className="w-px h-6 bg-outline-variant mx-1" />

        {/* Org unit tree multi-select */}
        <OrgUnitTreeSelect
          tree={orgUnits}
          selectedIds={selectedSquadIds}
          onSelectionChange={setSelectedSquadIds}
          placeholder="Filter by org unit..."
        />
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard label="Avg Monthly FTE" value={fmtFTE(avgMonthlyFTE)} sub={`${totalMembers} members`} icon="groups" color="bg-primary-container" />
        <StatCard label="Permanent" value={fmtNum(totalPerm)} sub={`${totalMembers > 0 ? Math.round((totalPerm / totalMembers) * 100) : 0}% of headcount`} icon="badge" color="bg-secondary-container" />
        <StatCard label="Contractors" value={fmtNum(totalSubCon)} sub={`${totalMembers > 0 ? Math.round((totalSubCon / totalMembers) * 100) : 0}% of headcount`} icon="engineering" color="bg-tertiary-container" />
        <StatCard label="Annual Cost" value={fmtGBP(annualCostTotal)} sub={`FY ${fiscalYear}`} icon="payments" color="bg-error-container" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 border-b border-outline-variant">
        <button
          type="button"
          onClick={() => setActiveTab("phasing")}
          className={`px-4 py-2.5 text-[14px] font-medium transition-colors border-b-2 ${activeTab === "phasing" ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"}`}
        >
          FTE Phasing
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("rate-cards")}
          className={`px-4 py-2.5 text-[14px] font-medium transition-colors border-b-2 ${activeTab === "rate-cards" ? "text-primary border-primary" : "text-muted-foreground border-transparent hover:text-foreground"}`}
        >
          Rate Cards ({rateCards.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "phasing" ? (
        <>
          {/* FTE Phasing Table per Squad */}
          {filteredSquads.length === 0 ? (
            <Card variant="elevated">
              <CardContent className="flex flex-col items-center py-16 text-center">
                <Icon name="stacked_bar_chart" size={40} className="text-muted-foreground/30 mb-4" />
                <p className="text-[16px] font-medium text-foreground mb-1">No capacity data</p>
                <p className="text-[14px] text-muted-foreground">Import members to generate default allocations.</p>
              </CardContent>
            </Card>
          ) : (
            filteredSquads.map((squad) => {
              // Compute squad FTE totals from local draft
              const squadFTETotals = zeroPeriods();
              const squadCostTotals = zeroPeriods();
              for (const m of squad.members) {
                const alloc = localDraft.get(draftKey(m.membershipId, squad.orgUnitId)) ?? m.allocations;
                const monthlyCost = m.annualCost ? m.annualCost / 12 : 0;
                for (const pk of PERIODS) {
                  squadFTETotals[pk] += alloc[pk];
                  squadCostTotals[pk] += Math.round(alloc[pk] * monthlyCost);
                }
              }

              return (
                <Card key={squad.orgUnitId} variant="elevated">
                  <CardContent className="p-0">
                    <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between">
                      <div>
                        <h3 className="text-[16px] font-medium text-surface-foreground">{squad.orgUnitName}</h3>
                        <p className="text-[12px] text-surface-variant-foreground">
                          {squad.parentName ? `${squad.parentName} · ` : ""}{squad.members.length} members · {squad.permCount} perm · {squad.subConCount} contractors
                        </p>
                      </div>
                      <Chip variant="filter" selected>{fmtFTE(sumPeriods(squadFTETotals) / 12)} avg FTE</Chip>
                    </div>
                    <div className="overflow-x-auto">
                      <Table>
                        <TableHeader className="sticky top-0 z-10 bg-surface">
                          <TableRow>
                            <TableHead className="sticky left-0 z-20 bg-surface min-w-50">Member</TableHead>
                            <TableHead className="min-w-15 text-center">Type</TableHead>
                            <TableHead className="min-w-12.5 text-center">Grade</TableHead>
                            {PERIODS.map((pk, i) => (
                              <TableHead key={pk} className="text-center min-w-14">
                                <div className="text-[11px]">
                                  <span className="font-medium">{pk.toUpperCase()}</span><br/>
                                  <span className="text-surface-variant-foreground font-normal">{MONTH_LABELS[i]}</span>
                                </div>
                              </TableHead>
                            ))}
                            <TableHead className="text-right min-w-22.5">Annual Cost</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {squad.members.map((member) => {
                            const alloc = localDraft.get(draftKey(member.membershipId, squad.orgUnitId)) ?? member.allocations;
                            const monthlyCost = member.annualCost ? member.annualCost / 12 : 0;
                            const memberAnnualCost = PERIODS.reduce((s, pk) => s + alloc[pk] * monthlyCost, 0);

                            return (
                              <TableRow key={member.membershipId}>
                                <TableCell className="sticky left-0 z-10 bg-surface">
                                  <div
                                    onContextMenu={(e) => {
                                      e.preventDefault();
                                      setContextMenu({
                                        x: e.clientX, y: e.clientY,
                                        membershipId: member.membershipId,
                                        fullName: member.fullName,
                                        currentSquadId: squad.orgUnitId,
                                      });
                                    }}
                                    className="cursor-context-menu"
                                  >
                                    <p className="text-[13px] font-medium text-foreground truncate max-w-45">{member.fullName}</p>
                                    <p className="text-[11px] text-muted-foreground">{member.position ?? ""}</p>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <span className={`text-[11px] font-medium ${member.employmentType === "Perm" ? "text-emerald-600" : "text-blue-600"}`}>
                                    {member.employmentType === "Perm" ? "P" : "C"}
                                  </span>
                                </TableCell>
                                <TableCell className="text-center text-[12px] text-muted-foreground">{member.grade ?? "—"}</TableCell>
                                {PERIODS.map((pk) => (
                                  <TableCell key={pk} className="text-center p-1">
                                    {(() => {
                                      const personTotal = personTotalFTE.get(member.membershipId);
                                      const totalFte = personTotal ? personTotal[pk] : 0;
                                      const isOver = totalFte > 1;
                                      const isUnder = totalFte > 0 && totalFte < 1;
                                      return (
                                        <input
                                          type="number"
                                          min="0"
                                          max="1"
                                          step="0.05"
                                          value={alloc[pk]}
                                          onChange={(e) => {
                                            const val = parseFloat(e.target.value);
                                            if (!isNaN(val) && val >= 0 && val <= 1) {
                                              handleFTEChange(member.membershipId, squad.orgUnitId, pk, Math.round(val * 100) / 100);
                                            }
                                          }}
                                          onBlur={(e) => {
                                            const val = parseFloat(e.target.value);
                                            if (isNaN(val) || val < 0) handleFTEChange(member.membershipId, squad.orgUnitId, pk, 0);
                                            else if (val > 1) handleFTEChange(member.membershipId, squad.orgUnitId, pk, 1);
                                          }}
                                          className={`w-14 h-7 text-[12px] text-center bg-transparent border rounded focus:border-primary focus:outline-none ${
                                            isOver
                                              ? "border-red-400 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 font-semibold"
                                              : isUnder
                                              ? "border-amber-400 bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400"
                                              : "border-outline-variant/50"
                                          }`}
                                          title={
                                            isOver ? `Overallocated: ${totalFte.toFixed(2)} FTE total` :
                                            isUnder ? `Underallocated: ${totalFte.toFixed(2)} FTE total (${((1 - totalFte) * 100).toFixed(0)}% unaccounted)` :
                                            undefined
                                          }
                                        />
                                      );
                                    })()}
                                  </TableCell>
                                ))}
                                <TableCell className="text-right text-[12px] font-medium">
                                  {member.annualCost ? fmtGBP(Math.round(memberAnnualCost)) : "—"}
                                </TableCell>
                              </TableRow>
                            );
                          })}

                          {/* Squad FTE totals */}
                          <TableRow className="border-t-2 border-outline-variant bg-surface-container-low/50 font-medium">
                            <TableCell className="sticky left-0 z-10 bg-surface-container-low/50 text-[12px]">FTE Total</TableCell>
                            <TableCell />
                            <TableCell />
                            {PERIODS.map((pk) => (
                              <TableCell key={pk} className="text-center text-[12px] font-semibold">{fmtFTE(squadFTETotals[pk])}</TableCell>
                            ))}
                            <TableCell className="text-right text-[12px] font-semibold">{fmtGBP(sumPeriods(squadCostTotals))}</TableCell>
                          </TableRow>

                          {/* Squad cost totals */}
                          <TableRow className="bg-surface-container-low/30">
                            <TableCell className="sticky left-0 z-10 bg-surface-container-low/30 text-[12px] text-muted-foreground">Monthly Cost</TableCell>
                            <TableCell />
                            <TableCell />
                            {PERIODS.map((pk) => (
                              <TableCell key={pk} className="text-center text-[11px] text-muted-foreground">{fmtGBP(squadCostTotals[pk])}</TableCell>
                            ))}
                            <TableCell />
                          </TableRow>
                        </TableBody>
                      </Table>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}

          {/* Grand Total Row */}
          {filteredSquads.length > 1 && (
            <Card variant="elevated">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="min-w-50">Grand Total</TableHead>
                        <TableHead className="min-w-15" />
                        <TableHead className="min-w-12.5" />
                        {PERIODS.map((pk, i) => (
                          <TableHead key={pk} className="text-center min-w-14 text-[11px]">{pk.toUpperCase()}</TableHead>
                        ))}
                        <TableHead className="text-right min-w-22.5">Total</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow className="font-semibold">
                        <TableCell>FTE</TableCell><TableCell /><TableCell />
                        {PERIODS.map((pk) => (
                          <TableCell key={pk} className="text-center">{fmtFTE(totalFTE[pk])}</TableCell>
                        ))}
                        <TableCell className="text-right">{fmtFTE(sumPeriods(totalFTE))}</TableCell>
                      </TableRow>
                      <TableRow className="text-muted-foreground">
                        <TableCell>Cost</TableCell><TableCell /><TableCell />
                        {PERIODS.map((pk) => (
                          <TableCell key={pk} className="text-center text-[12px]">{fmtGBP(totalCost[pk])}</TableCell>
                        ))}
                        <TableCell className="text-right font-semibold text-foreground">{fmtGBP(annualCostTotal)}</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Floating Save Bar */}
          <AnimatePresence>
            {isDirty && (
              <motion.div
                initial={{ y: 80, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 80, opacity: 0 }}
                transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 bg-surface-container border border-outline-variant rounded-full px-6 py-3 shadow-xl flex items-center gap-4"
              >
                <p className="text-[13px] text-surface-variant-foreground">
                  <span className="font-medium text-foreground">{changeCount}</span> unsaved change{changeCount !== 1 ? "s" : ""}
                </p>
                <Button variant="text" onClick={handleDiscard} disabled={saveAllocationsMutation.isPending}>Discard</Button>
                <Button onClick={handleSave} disabled={saveAllocationsMutation.isPending}>
                  <Icon name="save" size={18} />
                  {saveAllocationsMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </>
      ) : (
        /* Rate Cards Tab */
        <Card variant="elevated">
          <CardContent className="p-0">
            <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between">
              <div>
                <h3 className="text-[16px] font-medium text-surface-foreground">Perm Rate Cards</h3>
                <p className="text-[12px] text-surface-variant-foreground">
                  Annual cost lookup by Division × Location × Grade. SubCon uses day rate × 228.
                </p>
              </div>
              <Button onClick={() => setShowRateCardDialog(true)}>
                <Icon name="add" size={18} />Add Rate Card
              </Button>
            </div>
            {rateCards.length === 0 ? (
              <div className="flex flex-col items-center py-16 text-center">
                <Icon name="credit_card" size={40} className="text-muted-foreground/30 mb-4" />
                <p className="text-[16px] font-medium text-foreground mb-1">No rate cards</p>
                <p className="text-[14px] text-muted-foreground">Add rate cards to compute Perm staff costs by Division, Location, and Grade.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Division</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Grade</TableHead>
                      <TableHead className="text-right">Annual Cost</TableHead>
                      <TableHead className="text-right">Monthly</TableHead>
                      <TableHead className="w-12" />
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rateCards.map((rc) => (
                      <TableRow key={rc.id}>
                        <TableCell className="font-medium">{rc.division}</TableCell>
                        <TableCell>{rc.location}</TableCell>
                        <TableCell>{rc.grade}</TableCell>
                        <TableCell className="text-right font-medium">{fmtGBP(Number(rc.annualCost))}</TableCell>
                        <TableCell className="text-right text-muted-foreground">{fmtGBP(Math.round(Number(rc.annualCost) / 12))}</TableCell>
                        <TableCell className="text-right">
                          <button
                            type="button"
                            onClick={() => deleteRateCardMutation.mutate({ companyId, id: rc.id }, {
                              onSuccess: () => toast.success("Rate card deleted"),
                              onError: (err) => toast.error(err.message || "Failed to delete"),
                            })}
                            className="text-muted-foreground hover:text-error transition-colors"
                            aria-label="Delete"
                          >
                            <Icon name="delete" size={18} />
                          </button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Add Rate Card Dialog */}
      <Dialog open={showRateCardDialog} onOpenChange={setShowRateCardDialog}>
        <DialogContent icon="credit_card">
          <DialogHeader centered>
            <DialogTitle>Add Rate Card</DialogTitle>
            <DialogDescription>Define annual cost for a Division × Location × Grade combination.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <TextField variant="outlined" label="Division" value={rateCardForm.division} onChange={(e) => setRateCardForm({ ...rateCardForm, division: e.target.value })} placeholder="e.g. Digital" />
            <TextField variant="outlined" label="Location" value={rateCardForm.location} onChange={(e) => setRateCardForm({ ...rateCardForm, location: e.target.value })} placeholder="e.g. UK, AMEA" />
            <TextField variant="outlined" label="Grade" value={rateCardForm.grade} onChange={(e) => setRateCardForm({ ...rateCardForm, grade: e.target.value })} placeholder="e.g. L4, L5" />
            <TextField variant="outlined" label="Annual Cost (£)" type="number" value={rateCardForm.annualCost} onChange={(e) => setRateCardForm({ ...rateCardForm, annualCost: e.target.value })} placeholder="e.g. 65000" />
          </div>
          <DialogFooter>
            <Button variant="text" onClick={() => setShowRateCardDialog(false)}>Cancel</Button>
            <Button variant="text" onClick={handleCreateRateCard} disabled={upsertRateCardMutation.isPending}>
              {upsertRateCardMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Context Menu: Allocate to Squad */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setContextMenu(null)} />
          <div
            className="fixed z-50 min-w-50 rounded-lg border border-outline-variant bg-surface shadow-xl py-1"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <div className="px-3 py-2 border-b border-outline-variant">
              <p className="text-[12px] font-medium text-surface-variant-foreground">Allocate to squad</p>
              <p className="text-[13px] text-foreground truncate">{contextMenu.fullName}</p>
            </div>
            <div className="max-h-75 overflow-y-auto py-1">
              {(squads ?? [])
                .filter((s) => s.orgUnitId !== contextMenu.currentSquadId)
                .filter((s) => !localDraft.has(draftKey(contextMenu.membershipId, s.orgUnitId)))
                .map((s) => (
                  <button
                    key={s.orgUnitId}
                    type="button"
                    onClick={() => handleAllocateToSquad(contextMenu.membershipId, s.orgUnitId)}
                    className="w-full text-left px-3 py-2 text-[13px] hover:bg-surface-foreground/8 transition-colors flex items-center gap-2"
                  >
                    <Icon name="add" size={16} className="text-primary" />
                    {s.orgUnitName}
                  </button>
                ))}
              {(squads ?? [])
                .filter((s) => s.orgUnitId !== contextMenu.currentSquadId)
                .filter((s) => !localDraft.has(draftKey(contextMenu.membershipId, s.orgUnitId)))
                .length === 0 && (
                <p className="px-3 py-2 text-[12px] text-muted-foreground">Already in all squads</p>
              )}
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
