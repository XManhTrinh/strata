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
  useOrgUnits,
} from "@/services";
import type { SquadCapacitySummary, PeriodValues, MemberAllocation, UpsertAllocationDto } from "@/services";
import { useCompanyId } from "@/hooks/use-company";
import { pageTransitionVariants, defaultTransition } from "@/lib/motion";

// ─── Constants ────────────────────────────────────────────────────────────────

const PERIODS = ["p1","p2","p3","p4","p5","p6","p7","p8","p9","p10","p11","p12"] as const;
const MONTH_LABELS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const FTE_OPTIONS = [
  { value: "0", label: "0" },
  { value: "0.25", label: "0.25" },
  { value: "0.5", label: "0.5" },
  { value: "0.75", label: "0.75" },
  { value: "1", label: "1" },
];

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
  const [selectedSquadId, setSelectedSquadId] = useState<string>("all");
  const [activeTab, setActiveTab] = useState<"phasing" | "rate-cards">("phasing");
  const [showRateCardDialog, setShowRateCardDialog] = useState(false);
  const [rateCardForm, setRateCardForm] = useState({ division: "", location: "", grade: "", annualCost: "" });

  const { data: squads, isLoading, isError, error } = useCapacitySummary(companyId, fiscalYear);
  const { data: orgUnits = [] } = useOrgUnits(companyId);
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
    if (selectedSquadId === "all") return squads;
    return squads.filter((s) => s.orgUnitId === selectedSquadId);
  }, [squads, selectedSquadId]);

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
  const personTotalFTE = useMemo(() => {
    const map = new Map<string, PeriodValues>();
    const allSquads = squads ?? [];
    for (const sq of allSquads) {
      for (const m of sq.members) {
        const alloc = localDraft.get(draftKey(m.membershipId, sq.orgUnitId)) ?? m.allocations;
        const existing = map.get(m.membershipId) ?? zeroPeriods();
        for (const pk of PERIODS) existing[pk] += alloc[pk];
        map.set(m.membershipId, existing);
      }
    }
    return map;
  }, [squads, localDraft]);

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

  const squadFilterOptions = [
    { value: "all", label: "All Squads" },
    ...(squads ?? []).map((s) => ({ value: s.orgUnitId, label: s.orgUnitName })),
  ];

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
          <Select value={selectedSquadId} onValueChange={setSelectedSquadId} variant="outlined" options={squadFilterOptions} className="w-48" />
        </div>
      </AppBar>

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
                            <TableHead className="sticky left-0 z-20 bg-surface min-w-[200px]">Member</TableHead>
                            <TableHead className="min-w-[60px] text-center">Type</TableHead>
                            <TableHead className="min-w-[50px] text-center">Grade</TableHead>
                            {PERIODS.map((pk, i) => (
                              <TableHead key={pk} className="text-center min-w-[56px]">
                                <div className="text-[11px]">
                                  <span className="font-medium">{pk.toUpperCase()}</span><br/>
                                  <span className="text-surface-variant-foreground font-normal">{MONTH_LABELS[i]}</span>
                                </div>
                              </TableHead>
                            ))}
                            <TableHead className="text-right min-w-[90px]">Annual Cost</TableHead>
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
                                  <div>
                                    <p className="text-[13px] font-medium text-foreground truncate max-w-[180px]">{member.fullName}</p>
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
                                      const isOver = personTotal ? personTotal[pk] > 1 : false;
                                      return (
                                        <select
                                          value={String(alloc[pk])}
                                          onChange={(e) => handleFTEChange(member.membershipId, squad.orgUnitId, pk, parseFloat(e.target.value))}
                                          className={`w-14 h-7 text-[12px] text-center bg-transparent border rounded focus:border-primary focus:outline-none cursor-pointer ${
                                            isOver
                                              ? "border-red-400 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 font-semibold"
                                              : "border-outline-variant/50"
                                          }`}
                                          title={isOver ? `Overallocated: ${personTotal![pk].toFixed(2)} FTE total across squads` : undefined}
                                        >
                                          {FTE_OPTIONS.map((o) => (
                                            <option key={o.value} value={o.value}>{o.label}</option>
                                          ))}
                                        </select>
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
                        <TableHead className="min-w-[200px]">Grand Total</TableHead>
                        <TableHead className="min-w-[60px]" />
                        <TableHead className="min-w-[50px]" />
                        {PERIODS.map((pk, i) => (
                          <TableHead key={pk} className="text-center min-w-[56px] text-[11px]">{pk.toUpperCase()}</TableHead>
                        ))}
                        <TableHead className="text-right min-w-[90px]">Total</TableHead>
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
    </motion.div>
  );
}
