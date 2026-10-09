"use client";

import React, { useMemo, useState, useCallback, useEffect, useRef, useDeferredValue } from "react";
import { motion, AnimatePresence } from "motion/react";
import {TopAppBar,Card,InputChip,
  Tabs,
  Tab,
  Button,
  Select,
  SelectItem} from "@vkieu/mui";
import { CardContent } from "@/components/ui/card-content";
import { Icon } from "@/components/ui/icon";
import { Typography } from "@/components/ui/typography";
import { Skeleton, SkeletonGroup } from "@vkieu/mui/vk";
import {
  Table, TableHeader, TableBody, TableRow, TableHead, TableCell,
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import {
  useCapacitySummary,
  useSaveAllocations,
  useOrgUnitTree,
  useCompanySettings,
} from "@/services";
import type { SquadCapacitySummary, PeriodValues, MemberAllocation, UpsertAllocationDto } from "@/services";
import { useCompanyId } from "@/hooks/use-company";
import { pageTransitionVariants, defaultTransition } from "@/lib/motion";
import { OrgUnitTreeSelect } from "@/components/ui/org-unit-tree-select";
import { VirtualizedAllocationTable } from "@/components/capacity/virtualized-allocation-table";

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
          <Icon name={icon} size={24} className="text-primary-container-foreground" />
        </div>
        <Typography variant="body-small" color="surface-variant-foreground" className="uppercase tracking-wide">{label}</Typography>
        <Typography variant="headline-medium" className="mt-1">{value}</Typography>
        {sub && <Typography variant="body-small" color="surface-variant-foreground" className="mt-1">{sub}</Typography>}
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

  // Collapsible squad tables — only expanded squads mount their table DOM
  const [expandedSquads, setExpandedSquads] = useState<Set<string>>(new Set());
  // Signature of the squad SET (group mode + squad ids) we last computed a
  // default expansion for. Keyed on structure — NOT allocation values — so that
  // editing a cell (which changes groupedData's identity but not which squads
  // exist) never resets the user's expand/collapse state.
  const initialExpandRef = useRef<string | null>(null);

  // Context menu for allocating member to another squad
  const [contextMenu, setContextMenu] = useState<{
    x: number; y: number;
    membershipId: string; fullName: string;
    currentSquadId: string;
  } | null>(null);

  const { data: orgUnits = [] } = useOrgUnitTree(companyId);

  // Top-level org units (divisions) become tabs. Capacity loads per tab so we
  // never fetch all members at once — key to performance at 5k+ people.
  const divisionTabs = useMemo(
    () => [...orgUnits].sort((a, b) => a.name.localeCompare(b.name)),
    [orgUnits],
  );
  const [activeDivisionId, setActiveDivisionId] = useState<string>("");
  useEffect(() => {
    if (!activeDivisionId && divisionTabs.length > 0) {
      setActiveDivisionId(divisionTabs[0].id);
    }
  }, [divisionTabs, activeDivisionId]);

  const { data: squads, isLoading, isError, error } = useCapacitySummary(
    companyId,
    fiscalYear,
    activeDivisionId || undefined,
    true, // require a division — never fetch the whole company at once
  );
  const { data: companySettings } = useCompanySettings(companyId);

  const fiscalYearStartMonth = (companySettings?.settings as Record<string, unknown>)?.fiscalYearStart as number ?? 1;
  const MONTH_LABELS = useMemo(() => buildMonthLabels(fiscalYearStartMonth), [fiscalYearStartMonth]);
  const saveAllocationsMutation = useSaveAllocations();

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

  /** Stable expansion key for a rendered squad card. */
  const squadExpandKey = useCallback(
    (squad: SquadCapacitySummary) => `${groupBy}-${squad.orgUnitId}-${squad.orgUnitName}`,
    [groupBy],
  );

  // Thresholds for deciding whether to default-expand or default-collapse.
  const MANY_SQUADS = 3;
  const MANY_MEMBERS = 200;

  // Structural signature of the current squad set: group mode + the sorted list
  // of expand keys. This changes when squads load, the filter changes, or the
  // group-by mode changes — but NOT when allocation values are edited.
  const squadSetSignature = useMemo(
    () => `${groupBy}::${groupedData.map(squadExpandKey).sort().join("|")}`,
    [groupBy, groupedData, squadExpandKey],
  );

  // Compute the default expansion ONCE per squad set. With many squads or many
  // total members, default everything collapsed so we don't mount huge tables at
  // once. Because the guard is keyed on the structural signature, editing a cell
  // never re-runs this and never resets the user's expand/collapse choices.
  useEffect(() => {
    if (initialExpandRef.current === squadSetSignature) return;
    initialExpandRef.current = squadSetSignature;

    const totalMemberRows = groupedData.reduce((s, sq) => s + sq.members.length, 0);
    const collapseByDefault = groupedData.length > MANY_SQUADS || totalMemberRows > MANY_MEMBERS;

    if (collapseByDefault) {
      setExpandedSquads(new Set());
    } else {
      setExpandedSquads(new Set(groupedData.map(squadExpandKey)));
    }
  }, [squadSetSignature, groupedData, squadExpandKey]);

  const allExpanded = groupedData.length > 0 && groupedData.every((sq) => expandedSquads.has(squadExpandKey(sq)));

  const handleToggleAll = useCallback(() => {
    setExpandedSquads((prev) => {
      const everyExpanded = groupedData.length > 0 && groupedData.every((sq) => prev.has(squadExpandKey(sq)));
      return everyExpanded ? new Set() : new Set(groupedData.map(squadExpandKey));
    });
  }, [groupedData, squadExpandKey]);

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

  const toggleSquad = useCallback((orgUnitKey: string) => {
    setExpandedSquads((prev) => {
      const next = new Set(prev);
      if (next.has(orgUnitKey)) next.delete(orgUnitKey);
      else next.add(orgUnitKey);
      return next;
    });
  }, []);

  const handleContextMenu = useCallback(
    (e: React.MouseEvent, member: MemberAllocation, orgUnitId: string) => {
      e.preventDefault();
      setContextMenu({
        x: e.clientX, y: e.clientY,
        membershipId: member.membershipId,
        fullName: member.fullName,
        currentSquadId: orgUnitId,
      });
    },
    [],
  );

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

  // ─── Aggregations ─────────────────────────────────────────────────────────

  // Heavy, dataset-wide aggregates are driven off a DEFERRED copy of the draft.
  // While a user types into a cell, `localDraft` updates immediately (so the
  // edited input stays responsive), but these O(n) reductions over the whole
  // dataset run at a lower priority and are allowed to lag a frame behind. This
  // keeps typing smooth even with thousands of members.
  const deferredDraft = useDeferredValue(localDraft);

  // Cross-squad FTE totals per person (for overallocation detection)
  // Scans ALL draft entries, not just server squad members
  const personTotalFTE = useMemo(() => {
    const map = new Map<string, PeriodValues>();
    for (const [key, alloc] of deferredDraft) {
      const [membershipId] = key.split("|");
      const existing = map.get(membershipId) ?? zeroPeriods();
      for (const pk of PERIODS) existing[pk] += alloc[pk];
      map.set(membershipId, existing);
    }
    return map;
  }, [deferredDraft]);

  const totalFTE = useMemo(() => {
    const t = zeroPeriods();
    for (const sq of groupedData) {
      for (const m of sq.members) {
        const alloc = deferredDraft.get(draftKey(m.membershipId, sq.orgUnitId)) ?? m.allocations;
        for (const pk of PERIODS) t[pk] += alloc[pk];
      }
    }
    return t;
  }, [groupedData, deferredDraft]);

  const totalCost = useMemo(() => {
    const t = zeroPeriods();
    for (const sq of groupedData) {
      for (const m of sq.members) {
        const alloc = deferredDraft.get(draftKey(m.membershipId, sq.orgUnitId)) ?? m.allocations;
        const monthlyCost = m.annualCost ? m.annualCost / 12 : 0;
        for (const pk of PERIODS) t[pk] += Math.round(alloc[pk] * monthlyCost);
      }
    }
    return t;
  }, [groupedData, deferredDraft]);

  // Stable resolvers passed to the virtualized table. `getAlloc` returns the
  // live draft value for a member+squad; `getPersonTotals` returns the deferred
  // cross-squad totals used for over/under-allocation cell coloring.
  const getAlloc = useCallback(
    (membershipId: string, orgUnitId: string): PeriodValues =>
      localDraft.get(draftKey(membershipId, orgUnitId)) ?? zeroPeriods(),
    [localDraft],
  );
  const getPersonTotals = useCallback(
    (membershipId: string): PeriodValues => personTotalFTE.get(membershipId) ?? zeroPeriods(),
    [personTotalFTE],
  );

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
  const activeDivisionName =
    divisionTabs.find((d) => d.id === activeDivisionId)?.name ?? "";

  return (
    <motion.div className="space-y-6" variants={pageTransitionVariants} initial="initial" animate="enter" exit="exit" transition={defaultTransition}>
      {/* Header */}
      <TopAppBar
        className="justify-between"
        title={<Typography variant="headline-medium">Capacity Planning</Typography>}
        subtitle={`FTE allocation ${groupBy === "squad" ? "per squad" : groupBy === "all" ? "— all members" : `grouped by ${groupByOptions.find((o) => o.value === groupBy)?.label ?? groupBy}`} · P1–P12 monthly phasing`}
        actions={
          <div className="flex items-center gap-3">
            <Select aria-label="Fiscal year" selectedKey={String(fiscalYear)} onSelectionChange={(key) => setFiscalYear(Number(key))} variant="outlined" className="w-32">
              {yearOptions.map((o) => (
                <SelectItem key={o.value}>{o.label}</SelectItem>
              ))}
            </Select>
          </div>
        }
      />

      {/* Division tabs — capacity loads per division (lazy). */}
      {divisionTabs.length > 0 && (
        <Tabs selectedKey={activeDivisionId} onSelectionChange={(k) => setActiveDivisionId(k as string)} variant="primary" scrollable>
          {divisionTabs.map((d) => (
              <Tab key={d.id} title={d.name} />
            ))}
        </Tabs>
      )}

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i} variant="elevated"><CardContent className="p-5 space-y-3">
              <SkeletonGroup label="Loading capacity data">
                <Skeleton className="h-10 w-10" corner="full" /><Skeleton className="h-3 w-20" corner="extra-small" /><Skeleton className="h-7 w-28" corner="extra-small" />
              </SkeletonGroup>
            </CardContent></Card>
          ))}
        </div>
      ) : isError ? (
        <Card variant="elevated" className="max-w-md mx-auto">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Icon name="error" size={32} className="text-error mb-3" />
            <Typography variant="body-medium" color="surface-variant-foreground">{error?.message || "Failed to load"}</Typography>
          </CardContent>
        </Card>
      ) : (squads ?? []).length === 0 ? (
        <Card variant="elevated" className="max-w-md mx-auto">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Icon name="groups" size={32} className="text-surface-variant-foreground mb-3" />
            <Typography variant="body-medium" color="surface-variant-foreground">
              No allocations in {activeDivisionName || "this division"} yet.
            </Typography>
          </CardContent>
        </Card>
      ) : (
      <>

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
            selectedKey={groupBy}
            onSelectionChange={(key) => setGroupBy(key == null ? "" : String(key))}
            className="w-40"
            label="Group by"
          >
            {groupByOptions.map((o) => (
              <SelectItem key={o.value}>{o.label}</SelectItem>
            ))}
          </Select>
          <Select
            aria-label="Employment type"
            variant="outlined"
            selectedKey={employmentFilter}
            onSelectionChange={(key) => setEmploymentFilter(String(key) as "all" | "Perm" | "SubCon")}
            className="w-40"
          >
            <SelectItem key="all">All Types</SelectItem>
            <SelectItem key="Perm">Permanent</SelectItem>
            <SelectItem key="SubCon">Contractors</SelectItem>
          </Select>
        </div>
      </div>

      {/* Applied org unit filters */}
      {selectedSquadIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-1">
          {(squads ?? [])
            .filter((s) => selectedSquadIds.has(s.orgUnitId))
            .map((s) => (
              <InputChip key={s.orgUnitId} onRemove={() => {
                const next = new Set(selectedSquadIds);
                next.delete(s.orgUnitId);
                setSelectedSquadIds(next);
              }}>
                {s.orgUnitName}
              </InputChip>
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

      {/* FTE Phasing */}
          {/* Bulk expand / collapse */}
          {groupedData.length > 0 && (
            <div className="flex justify-end">
              <Button variant="text" onClick={handleToggleAll}>
                <Icon name={allExpanded ? "unfold_less" : "unfold_more"} size={18} />
                {allExpanded ? "Collapse all" : "Expand all"}
              </Button>
            </div>
          )}

          {/* FTE Phasing Table per Squad */}
          {groupedData.length === 0 ? (
            <Card variant="elevated">
              <CardContent className="flex flex-col items-center py-16 text-center">
                <Icon name="stacked_bar_chart" size={40} className="text-surface-variant-foreground/30 mb-4" />
                <Typography variant="title-medium" className="mb-1">No capacity data</Typography>
                <Typography variant="body-medium" color="surface-variant-foreground">Import members to generate default allocations.</Typography>
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

              const expandKey = squadExpandKey(squad);
              const isExpanded = expandedSquads.has(expandKey);

              return (
                <Card key={expandKey} variant="elevated">
                  <CardContent className="p-0">
                    <button
                      type="button"
                      onClick={() => toggleSquad(expandKey)}
                      aria-expanded={isExpanded}
                      className="w-full px-5 py-4 border-b border-outline-variant flex items-center justify-between gap-3 text-left hover:bg-surface-foreground/4 transition-colors"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <Icon
                          name={isExpanded ? "expand_less" : "expand_more"}
                          size={22}
                          className="text-surface-variant-foreground shrink-0"
                        />
                        <div className="min-w-0">
                          <Typography variant="title-medium">{squad.orgUnitName}</Typography>
                          <Typography variant="body-small" color="surface-variant-foreground">
                            {squad.parentName ? `${squad.parentName} · ` : ""}{squad.members.length} members · {squad.permCount} perm · {squad.subConCount} contractors
                          </Typography>
                        </div>
                      </div>
                      <span className="shrink-0 inline-flex items-center h-8 rounded-lg bg-secondary-container px-3 text-sm font-medium text-secondary-container-foreground">
                        {fmtFTE(sumPeriods(squadFTETotals) / 12)} avg FTE
                      </span>
                    </button>
                    {isExpanded && (
                      <VirtualizedAllocationTable
                        members={squad.members}
                        orgUnitId={squad.orgUnitId}
                        monthLabels={MONTH_LABELS}
                        getAlloc={getAlloc}
                        getPersonTotals={getPersonTotals}
                        onFTEChange={handleFTEChange}
                        onContextMenu={handleContextMenu}
                        squadFTETotals={squadFTETotals}
                        squadCostTotals={squadCostTotals}
                      />
                    )}
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
                      <TableRow className="text-surface-variant-foreground">
                        <TableCell>Cost</TableCell><TableCell /><TableCell />
                        {PERIODS.map((pk) => (
                          <TableCell key={pk} className="text-center text-[12px]">{fmtGBP(totalCost[pk])}</TableCell>
                        ))}
                        <TableCell className="text-right font-semibold text-surface-foreground">{fmtGBP(annualCostTotal)}</TableCell>
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
                <Typography variant="body-small" color="surface-variant-foreground">
                  <span className="font-medium text-surface-foreground">{changeCount}</span> unsaved change{changeCount !== 1 ? "s" : ""}
                </Typography>
                <Button variant="text" onClick={handleDiscard} disabled={saveAllocationsMutation.isPending}>Discard</Button>
                <Button onClick={handleSave} disabled={saveAllocationsMutation.isPending}>
                  <Icon name="save" size={18} />
                  {saveAllocationsMutation.isPending ? "Saving..." : "Save"}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
      </>
      )}

      {/* Context Menu: Allocate to Squad */}
      {contextMenu && (
        <>
          <div className="fixed inset-0 z-50" onClick={() => setContextMenu(null)} />
          <div
            className="fixed z-50 min-w-50 rounded-lg border border-outline-variant bg-surface shadow-xl py-1"
            style={{ left: contextMenu.x, top: contextMenu.y }}
          >
            <div className="px-3 py-2 border-b border-outline-variant">
              <Typography variant="body-small" color="surface-variant-foreground" className="font-medium">Allocate to squad</Typography>
              <Typography variant="body-small" className="truncate">{contextMenu.fullName}</Typography>
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
                <Typography variant="body-small" color="surface-variant-foreground" className="px-3 py-2">Already in all squads</Typography>
              )}
            </div>
          </div>
        </>
      )}
    </motion.div>
  );
}
