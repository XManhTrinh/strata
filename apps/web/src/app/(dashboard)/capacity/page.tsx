"use client";

import { useMemo, useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { PageBar } from "@vkieu/mui";
import { Icon } from "@vkieu/mui";
import { Card, CardContent } from "@vkieu/mui";
import { Chip } from "@vkieu/mui";
import { Button } from "@vkieu/mui/buttons";
import { Skeleton } from "@/components/ui/skeleton";
import { Select } from "@vkieu/mui";
import { TextField } from "@vkieu/mui";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@vkieu/mui";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  useCapacitySummary,
  useSaveAllocations,
  useRateCards,
  useUpsertRateCard,
  useDeleteRateCard,
  useOrgUnitTree,
  useCompanySettings,
} from "@/services";
import type { SquadCapacitySummary, PeriodValues, MemberAllocation, UpsertAllocationDto } from "@/services";
import { useCompanyId } from "@/hooks/use-company";
import { pageTransitionVariants, defaultTransition } from "@/lib/motion";
import { OrgUnitTreeSelect } from "@/components/ui/org-unit-tree-select";

// ─── Constants ────────────────────────────────────────────────────────────────

const PERIODS = ["p1","p2","p3","p4","p5","p6","p7","p8","p9","p10","p11","p12"] as const;
const MONTH_LABELS_ALL = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];

/** Build month labels offset by the fiscal year start month (1-indexed). */
function buildMonthLabels(fiscalYearStart: number): string[] {
  const start = (fiscalYearStart - 1) % 12;
  return Array.from({ length: 12 }, (_, i) => MONTH_LABELS_ALL[(start + i) % 12]);
}

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
  const toast = useToast();
  const companyId = useCompanyId();
  const currentYear = new Date().getFullYear();
  const [fiscalYear, setFiscalYear] = useState(currentYear);
  const [selectedSquadIds, setSelectedSquadIds] = useState<Set<string>>(new Set());
  const [employmentFilter, setEmploymentFilter] = useState<"all" | "Perm" | "SubCon">("all");
  const [groupBy, setGroupBy] = useState<"squad" | "all" | string>("squad");
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
  const { data: companySettings } = useCompanySettings(companyId);

  const fiscalYearStartMonth = (companySettings?.settings as Record<string, unknown>)?.fiscalYearStart as number ?? 1;
  const MONTH_LABELS = useMemo(() => buildMonthLabels(fiscalYearStartMonth), [fiscalYearStartMonth]);
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

  // ─── Group By ─────────────────────────────────────────────────────────────

  /** Derive available org levels from breadcrumb data (e.g. Division, Cluster, Tribe, Squad). */
  const groupByOptions = useMemo(() => {
    if (!squads || squads.length === 0) return [{ value: "squad", label: "Squad" }, { value: "all", label: "All" }];

    // Find the max breadcrumb depth and collect names at each level
    const levelNames = new Map<number, Set<string>>();
    for (const sq of squads) {
      for (let i = 0; i < sq.breadcrumb.length; i++) {
        if (!levelNames.has(i)) levelNames.set(i, new Set());
        levelNames.get(i)!.add(sq.breadcrumb[i]);
      }
    }

    // Build options from highest level to lowest
    const maxDepth = Math.max(...Array.from(levelNames.keys()));
    const options: { value: string; label: string }[] = [];

    // Add a labelled option for each breadcrumb level (except the leaf, which is "Squad" default)
    for (let i = 0; i <= maxDepth; i++) {
      if (i === maxDepth) {
        options.push({ value: "squad", label: "Squad" });
      } else {
        // Use the breadcrumb level index as the value (e.g. "level-0" = Division)
        // We'll infer a label from the org unit types or fall back to generic names
        const genericLabels = ["Division", "Cluster", "Tribe", "Team"];
        const label = i < genericLabels.length ? genericLabels[i] : `Level ${i + 1}`;
        options.push({ value: `level-${i}`, label });
      }
    }

    options.push({ value: "all", label: "All" });
    return options;
  }, [squads]);

  /** Regroup filteredSquads based on groupBy selection. */
  const groupedData = useMemo((): SquadCapacitySummary[] => {
    if (groupBy === "squad") return filteredSquads;

    if (groupBy === "all") {
      // Merge all members into a single flat table
      const allMembers: MemberAllocation[] = [];
      const seenMemberships = new Set<string>();
      let permCount = 0;
      let subConCount = 0;

      for (const sq of filteredSquads) {
        for (const m of sq.members) {
          // Deduplicate: a person in multiple squads appears once in "All" view
          if (seenMemberships.has(m.membershipId)) continue;
          seenMemberships.add(m.membershipId);
          allMembers.push(m);
          if (m.employmentType === "Perm") permCount++;
          if (m.employmentType === "SubCon") subConCount++;
        }
      }

      if (allMembers.length === 0) return [];

      return [{
        orgUnitId: "all",
        orgUnitName: "All Members",
        parentName: null,
        breadcrumb: ["All"],
        members: allMembers,
        totals: zeroPeriods(),
        fteTotals: zeroPeriods(),
        permCount,
        subConCount,
      }];
    }

    // Group by breadcrumb level (e.g. "level-0" → breadcrumb[0] = Division)
    const levelIndex = parseInt(groupBy.replace("level-", ""), 10);
    if (isNaN(levelIndex)) return filteredSquads;

    const groups = new Map<string, {
      members: MemberAllocation[];
      seenMemberships: Set<string>;
      breadcrumb: string[];
      permCount: number;
      subConCount: number;
      sourceOrgUnitIds: string[];
    }>();

    for (const sq of filteredSquads) {
      const groupName = sq.breadcrumb[levelIndex] ?? sq.breadcrumb[sq.breadcrumb.length - 1];
      const groupKey = groupName;

      if (!groups.has(groupKey)) {
        groups.set(groupKey, {
          members: [],
          seenMemberships: new Set(),
          breadcrumb: sq.breadcrumb.slice(0, levelIndex + 1),
          permCount: 0,
          subConCount: 0,
          sourceOrgUnitIds: [],
        });
      }

      const group = groups.get(groupKey)!;
      group.sourceOrgUnitIds.push(sq.orgUnitId);

      for (const m of sq.members) {
        if (group.seenMemberships.has(m.membershipId)) continue;
        group.seenMemberships.add(m.membershipId);
        group.members.push(m);
        if (m.employmentType === "Perm") group.permCount++;
        if (m.employmentType === "SubCon") group.subConCount++;
      }
    }

    return Array.from(groups.entries()).map(([name, g]) => ({
      orgUnitId: g.sourceOrgUnitIds[0],
      orgUnitName: name,
      parentName: g.breadcrumb.length > 1 ? g.breadcrumb[g.breadcrumb.length - 2] : null,
      breadcrumb: g.breadcrumb,
      members: g.members,
      totals: zeroPeriods(),
      fteTotals: zeroPeriods(),
      permCount: g.permCount,
      subConCount: g.subConCount,
    })).sort((a, b) => a.orgUnitName.localeCompare(b.orgUnitName));
  }, [filteredSquads, groupBy]);

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
    for (const sq of groupedData) {
      for (const m of sq.members) {
        const alloc = localDraft.get(draftKey(m.membershipId, sq.orgUnitId)) ?? m.allocations;
        for (const pk of PERIODS) t[pk] += alloc[pk];
      }
    }
    return t;
  }, [groupedData, localDraft]);

  const totalCost = useMemo(() => {
    const t = zeroPeriods();
    for (const sq of groupedData) {
      for (const m of sq.members) {
        const alloc = localDraft.get(draftKey(m.membershipId, sq.orgUnitId)) ?? m.allocations;
        const monthlyCost = m.annualCost ? m.annualCost / 12 : 0;
        for (const pk of PERIODS) t[pk] += Math.round(alloc[pk] * monthlyCost);
      }
    }
    return t;
  }, [groupedData, localDraft]);

  // Deduplicate members across squads (a person in 2 squads counts once)
  const uniqueMembers = useMemo(() => {
    const seen = new Map<string, MemberAllocation>();
    for (const sq of groupedData) {
      for (const m of sq.members) {
        if (!seen.has(m.membershipId)) seen.set(m.membershipId, m);
      }
    }
    return seen;
  }, [groupedData]);

  const totalMembers = uniqueMembers.size;
  const totalPerm = Array.from(uniqueMembers.values()).filter((m) => m.employmentType === "Perm").length;
  const totalSubCon = Array.from(uniqueMembers.values()).filter((m) => m.employmentType === "SubCon").length;
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
        <PageBar><div>
          <h1 className="text-[28px] leading-9 font-normal text-surface-foreground">Capacity Planning</h1>
          <p className="text-[14px] leading-5 text-surface-variant-foreground">Team allocation and monthly phasing.</p>
        </div></PageBar>
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
        <PageBar><div><h1 className="text-[28px] leading-9 font-normal text-surface-foreground">Capacity Planning</h1></div></PageBar>
        <Card variant="elevated" className="max-w-md mx-auto">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Icon name="error" size={32} className="text-error mb-3" />
            <p className="text-[14px] text-on-surface-variant">{error?.message || "Failed to load"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <motion.div className="space-y-6" variants={pageTransitionVariants} initial="initial" animate="enter" exit="exit" transition={defaultTransition}>
      {/* Header */}
      <PageBar className="justify-between">
        <div>
          <h1 className="text-[28px] leading-9 font-normal text-surface-foreground">Capacity Planning</h1>
          <p className="text-[14px] leading-5 text-surface-variant-foreground">
            FTE allocation {groupBy === "squad" ? "per squad" : groupBy === "all" ? "— all members" : `grouped by ${groupByOptions.find((o) => o.value === groupBy)?.label ?? groupBy}`} · P1–P12 monthly phasing
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={String(fiscalYear)} onValueChange={(v) => setFiscalYear(Number(v))} variant="outlined" options={yearOptions} className="w-32" />
        </div>
      </PageBar>

      {/* Filters Row */}
      <div className="flex items-center justify-between gap-3">
        {/* Left: Org unit tree multi-select */}
        <OrgUnitTreeSelect
          tree={orgUnits}
          selectedIds={selectedSquadIds}
          onSelectionChange={setSelectedSquadIds}
          placeholder="Filter by org unit..."
          className="w-1/4"
        />

        {/* Right: Group by + Employment type selects */}
        <div className="flex items-center gap-3 shrink-0">
          <Select
            variant="outlined"
            value={groupBy}
            onValueChange={setGroupBy}
            options={groupByOptions}
            className="w-40"
            label="Group by"
          />
          <Select
            variant="outlined"
            value={employmentFilter}
            onValueChange={(v) => setEmploymentFilter(v as "all" | "Perm" | "SubCon")}
            options={[
              { value: "all", label: "All Types" },
              { value: "Perm", label: "Permanent" },
              { value: "SubCon", label: "Contractors" },
            ]}
            className="w-40"
          />
        </div>
      </div>

      {/* Applied org unit filters */}
      {selectedSquadIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          {(squads ?? [])
            .filter((s) => selectedSquadIds.has(s.orgUnitId))
            .map((s) => (
              <Chip key={s.orgUnitId} variant="input" onDismiss={() => {
                const next = new Set(selectedSquadIds);
                next.delete(s.orgUnitId);
                setSelectedSquadIds(next);
              }}>
                {s.orgUnitName}
              </Chip>
            ))}
        </div>
      )}

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
          className={`px-4 py-2.5 text-[14px] font-medium transition-colors border-b-2 ${activeTab === "phasing" ? "text-primary border-primary" : "text-on-surface-variant border-transparent hover:text-on-surface"}`}
        >
          FTE Phasing
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("rate-cards")}
          className={`px-4 py-2.5 text-[14px] font-medium transition-colors border-b-2 ${activeTab === "rate-cards" ? "text-primary border-primary" : "text-on-surface-variant border-transparent hover:text-on-surface"}`}
        >
          Rate Cards ({rateCards.length})
        </button>
      </div>

      {/* Tab Content */}
      {activeTab === "phasing" ? (
        <>
          {/* FTE Phasing Table per Squad */}
          {groupedData.length === 0 ? (
            <Card variant="elevated">
              <CardContent className="flex flex-col items-center py-16 text-center">
                <Icon name="stacked_bar_chart" size={40} className="text-on-surface-variant/30 mb-4" />
                <p className="text-base font-medium text-on-surface mb-1">No capacity data</p>
                <p className="text-[14px] text-on-surface-variant">Import members to generate default allocations.</p>
              </CardContent>
            </Card>
          ) : (
            groupedData.map((squad) => {
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
                <Card key={`${groupBy}-${squad.orgUnitId}-${squad.orgUnitName}`} variant="elevated">
                  <CardContent className="p-0">
                    <div className="px-5 py-4 border-b border-outline-variant flex items-center justify-between">
                      <div>
                        <h3 className="text-base font-medium text-surface-foreground">{squad.orgUnitName}</h3>
                        <p className="text-[12px] text-surface-variant-foreground">
                          {squad.parentName ? `${squad.parentName} · ` : ""}{squad.members.length} members · {squad.permCount} perm · {squad.subConCount} contractors
                        </p>
                      </div>
                      <Chip variant="filter" selected>{fmtFTE(sumPeriods(squadFTETotals) / 12)} avg FTE</Chip>
                    </div>
                    <div className="overflow-x-auto">
                      <Table className="table-fixed">
                        <TableHeader className="sticky top-0 z-10 bg-surface">
                          <TableRow>
                            <TableHead className="sticky left-0 z-20 bg-surface w-50">Member</TableHead>
                            <TableHead className="w-12 text-center">Type</TableHead>
                            <TableHead className="w-12 text-center">Grade</TableHead>
                            {PERIODS.map((pk, i) => (
                              <TableHead key={pk} className="text-center w-14">
                                <div className="text-[11px]">
                                  <span className="font-medium">{pk.toUpperCase()}</span><br/>
                                  <span className="text-surface-variant-foreground font-normal">{MONTH_LABELS[i]}</span>
                                </div>
                              </TableHead>
                            ))}
                            <TableHead className="text-right w-24">Annual Cost</TableHead>
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
                                    <p className="text-[13px] font-medium text-on-surface truncate max-w-45">{member.fullName}</p>
                                    <p className="text-[11px] text-on-surface-variant">{member.position ?? ""}</p>
                                  </div>
                                </TableCell>
                                <TableCell className="text-center">
                                  <span className={`text-[11px] font-medium ${member.employmentType === "Perm" ? "text-emerald-600" : "text-primary"}`}>
                                    {member.employmentType === "Perm" ? "P" : "C"}
                                  </span>
                                </TableCell>
                                <TableCell className="text-center text-[12px] text-on-surface-variant">{member.grade ?? "—"}</TableCell>
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
                                          className={`w-14 h-7 text-[12px] text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none bg-transparent border rounded focus:border-primary focus:outline-none ${
                                            isOver
                                              ? "border-error bg-error-container dark:bg-error-container/20 text-error font-semibold"
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
                            <TableCell className="sticky left-0 z-10 bg-surface-container-low/30 text-[12px] text-on-surface-variant">Monthly Cost</TableCell>
                            <TableCell />
                            <TableCell />
                            {PERIODS.map((pk) => (
                              <TableCell key={pk} className="text-center text-[11px] text-on-surface-variant">{fmtGBP(squadCostTotals[pk])}</TableCell>
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
          {groupedData.length > 1 && (
            <Card variant="elevated">
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <Table className="table-fixed">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-50">Grand Total</TableHead>
                        <TableHead className="w-12" />
                        <TableHead className="w-12" />
                        {PERIODS.map((pk) => (
                          <TableHead key={pk} className="text-center w-14 text-[11px]">{pk.toUpperCase()}</TableHead>
                        ))}
                        <TableHead className="text-right w-24">Total</TableHead>
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
                      <TableRow className="text-on-surface-variant">
                        <TableCell>Cost</TableCell><TableCell /><TableCell />
                        {PERIODS.map((pk) => (
                          <TableCell key={pk} className="text-center text-[12px]">{fmtGBP(totalCost[pk])}</TableCell>
                        ))}
                        <TableCell className="text-right font-semibold text-on-surface">{fmtGBP(annualCostTotal)}</TableCell>
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
                  <span className="font-medium text-on-surface">{changeCount}</span> unsaved change{changeCount !== 1 ? "s" : ""}
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
                <h3 className="text-base font-medium text-surface-foreground">Perm Rate Cards</h3>
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
                <Icon name="credit_card" size={40} className="text-on-surface-variant/30 mb-4" />
                <p className="text-base font-medium text-on-surface mb-1">No rate cards</p>
                <p className="text-[14px] text-on-surface-variant">Add rate cards to compute Perm staff costs by Division, Location, and Grade.</p>
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
                        <TableCell className="text-right text-on-surface-variant">{fmtGBP(Math.round(Number(rc.annualCost) / 12))}</TableCell>
                        <TableCell className="text-right">
                          <button
                            type="button"
                            onClick={() => deleteRateCardMutation.mutate({ companyId, id: rc.id }, {
                              onSuccess: () => toast.success("Rate card deleted"),
                              onError: (err) => toast.error(err.message || "Failed to delete"),
                            })}
                            className="text-on-surface-variant hover:text-error transition-colors"
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
              <p className="text-[13px] text-on-surface truncate">{contextMenu.fullName}</p>
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
                <p className="px-3 py-2 text-[12px] text-on-surface-variant">Already in all squads</p>
              )}
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
