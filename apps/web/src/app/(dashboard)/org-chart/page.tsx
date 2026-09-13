"use client";

import { useMemo, useState, useCallback } from "react";
import { ApiPersonRepository } from "@/lib/org-tree/ApiPersonRepository";
import { useOrgTree } from "@/lib/org-tree/useOrgTree";
import { Person, OrgChartViewMode } from "@/lib/org-tree/types";
import { buildTree, buildDepartmentTree, getPathToRoot } from "@/lib/org-tree/tree";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  Typography,
  Icon,
  Card,
  CardContent,
} from "@vkieu/mui";
import { Button } from "@vkieu/mui/buttons";
import { MOCK_VACANCIES } from "@/lib/org-tree/mock-data";
import { useOrgChartPeople, useOrgUnits } from "@/services";
import { useCompanyId } from "@/hooks/use-company";
import { Skeleton } from "@/components/ui/skeleton";
import OrgFlow from "@/components/flow-org/OrgFlow";
import FlowOrgHeader from "@/components/flow-org/FlowOrgHeader";
import ReparentModal from "@/components/flow-org/ReparentModal";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PendingDrop {
  draggedId: string;
  newParentId: string | null;
  personName: string;
  directReportCount: number;
}

interface PendingGroupMove {
  parentId: string;
  targetId: string | null;
  persons: Person[];
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrgChartPage() {
  const companyId = useCompanyId();
  const { data: orgChartPeople, isLoading: peopleLoading } = useOrgChartPeople(companyId);
  const { data: orgUnits = [] } = useOrgUnits(companyId);

  const repository = useMemo(
    () => new ApiPersonRepository(orgChartPeople ?? [], companyId),
    [orgChartPeople, companyId],
  );
  const { unallocated, persons, loading, error, reparent } = useOrgTree(repository);

  // ── Local state ────────────────────────────────────────────────────────
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null);
  const [pendingGroupMove, setPendingGroupMove] = useState<PendingGroupMove | null>(null);
  const [selectedUnits, setSelectedUnits] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<OrgChartViewMode>("reporting");

  // ── Handlers ───────────────────────────────────────────────────────────
  const toggleUnit = useCallback((unitName: string) => {
    setSelectedUnits((prev) => {
      const next = new Set(prev);
      if (next.has(unitName)) next.delete(unitName);
      else next.add(unitName);
      return next;
    });
  }, []);

  const clearUnits = useCallback(() => setSelectedUnits(new Set()), []);

  // ── Derived ────────────────────────────────────────────────────────────
  const isAllView = selectedUnits.size === 0;

  const filteredPersons = useMemo(() => persons, [persons]);

  const activeTree = useMemo(() => {
    if (viewMode === "department") {
      return buildDepartmentTree(filteredPersons.filter((p) => p.parentId !== null));
    }
    if (isAllView) {
      const roots = filteredPersons.filter((p) => p.parentId === null);
      const trueRoot = roots.reduce<Person | null>((best, p) => {
        if (!best) return p;
        const bestCount = filteredPersons.filter((x) => x.parentId === best.id).length;
        const pCount = filteredPersons.filter((x) => x.parentId === p.id).length;
        return pCount > bestCount ? p : best;
      }, null);
      if (!trueRoot) return [];
      const reachable = new Set<string>();
      const queue = [trueRoot.id];
      while (queue.length) {
        const cur = queue.shift()!;
        reachable.add(cur);
        filteredPersons.filter((p) => p.parentId === cur).forEach((p) => queue.push(p.id));
      }
      return buildTree(filteredPersons.filter((p) => reachable.has(p.id)));
    }
    return buildTree(filteredPersons.filter((p) => p.departmentName && selectedUnits.has(p.departmentName)));
  }, [isAllView, selectedUnits, filteredPersons, viewMode]);

  const selectedMemberCount = useMemo(() => {
    if (isAllView) return filteredPersons.length;
    return filteredPersons.filter((p) => p.departmentName && selectedUnits.has(p.departmentName)).length;
  }, [isAllView, selectedUnits, filteredPersons]);

  const matchedIds = useMemo<Set<string>>(() => {
    const q = search.trim().toLowerCase();
    if (!q) return new Set();
    return new Set(
      filteredPersons
        .filter((p) =>
          p.fullName.toLowerCase().includes(q) ||
          (p.uin && p.uin.toLowerCase().includes(q)) ||
          p.title.toLowerCase().includes(q) ||
          (p.departmentName && p.departmentName.toLowerCase().includes(q)) ||
          p.status.toLowerCase().includes(q),
        )
        .map((p) => p.id),
    );
  }, [filteredPersons, search]);

  const pathToRoot = useMemo(() => {
    if (matchedIds.size !== 1) return undefined;
    return getPathToRoot(filteredPersons, Array.from(matchedIds)[0]);
  }, [matchedIds, filteredPersons]);

  const unitCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const unit of orgUnits) counts[unit.name] = filteredPersons.filter((p) => p.departmentName === unit.name).length;
    return counts;
  }, [filteredPersons, orgUnits]);

  // ── Callbacks ──────────────────────────────────────────────────────────
  const onEdit = useCallback((_person: Person) => {
    // TODO: open person detail panel
  }, []);

  const wrappedReparent = useCallback(
    async (draggedId: string, newParentId: string | null, moveWithChildren?: boolean) => {
      await reparent(draggedId, newParentId, moveWithChildren);
    },
    [reparent],
  );

  const onPendingDrop = useCallback((info: PendingDrop) => setPendingDrop(info), []);
  const onPendingGroupMove = useCallback((info: PendingGroupMove) => setPendingGroupMove(info), []);

  // ── Status text for header ─────────────────────────────────────────────
  const statusText = useMemo(() => {
    const parts: React.ReactNode[] = [];

    if (!isAllView) {
      parts.push(
        <Typography key="filter" variant="body-small" color="surface-variant-foreground" as="span">
          Showing <strong className="text-surface-foreground">{selectedMemberCount}</strong>{" "}
          {selectedMemberCount === 1 ? "person" : "people"}
        </Typography>,
      );
    }

    if (search.trim() && matchedIds.size > 0) {
      parts.push(
        <Typography key="search" variant="body-small" color="surface-variant-foreground" as="span">
          {matchedIds.size} {matchedIds.size === 1 ? "match" : "matches"} highlighted
        </Typography>,
      );
    }

    if (parts.length === 0) return undefined;
    return <div className="flex items-center gap-3">{parts}</div>;
  }, [isAllView, selectedMemberCount, search, matchedIds]);

  // ── Loading ────────────────────────────────────────────────────────────
  if (peopleLoading || loading) {
    return (
      <div className="flex flex-col h-[calc(100vh-100px)]">
        <div className="flex items-center gap-4 px-6 h-16 border-b border-outline-variant">
          <Skeleton className="h-6 w-24" />
          <Skeleton className="h-8 w-48 rounded-full" />
          <div className="flex-1" />
          <Skeleton className="h-10 w-64 rounded-full" />
          <Skeleton className="h-8 w-32 rounded-full" />
        </div>
        <div className="flex-1 flex items-center justify-center">
          <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="flex flex-col h-[calc(100vh-100px)] items-center justify-center">
        <Card variant="elevated" className="max-w-sm">
          <CardContent className="flex flex-col items-center py-12 px-8 text-center">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-error/12 mb-4">
              <Icon name="error" size={24} className="text-error" />
            </div>
            <Typography variant="title-medium" className="mb-2">Unable to load org chart</Typography>
            <Typography variant="body-medium" color="surface-variant-foreground">
              {error}
            </Typography>
          </CardContent>
        </Card>
      </div>
    );
  }

  // ── Main ───────────────────────────────────────────────────────────────
  return (
    <div className="flex flex-col overflow-hidden h-[calc(100vh-100px)]">
      <FlowOrgHeader
        search={search}
        onSearchChange={setSearch}
        selectedSquads={selectedUnits}
        onToggleSquad={toggleUnit}
        onClearSquads={clearUnits}
        squadCounts={unitCounts}
        totalCount={filteredPersons.length}
        orgUnits={orgUnits}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        searchResultCount={search.trim() ? matchedIds.size : undefined}
        pathToRoot={pathToRoot}
        statusText={statusText}
      />

      {/* Canvas */}
      <main className="flex-1 min-h-0">
        <OrgFlow
          tree={activeTree}
          unallocated={unallocated}
          persons={filteredPersons}
          matchedIds={matchedIds}
          onEdit={onEdit}
          reparent={wrappedReparent}
          onPendingDrop={onPendingDrop}
          onPendingGroupMove={onPendingGroupMove}
          vacancies={MOCK_VACANCIES}
          onContextMenuAction={() => {}}
        />
      </main>

      {/* Reparent modal */}
      {pendingDrop && (
        <ReparentModal
          personName={pendingDrop.personName}
          directReportCount={pendingDrop.directReportCount}
          targetIsUnallocated={pendingDrop.newParentId === null}
          persons={filteredPersons}
          draggedId={pendingDrop.draggedId}
          onMoveWithReports={() => {
            void wrappedReparent(pendingDrop.draggedId, pendingDrop.newParentId, true);
            setPendingDrop(null);
          }}
          onLeaveReports={() => {
            void wrappedReparent(pendingDrop.draggedId, pendingDrop.newParentId, false);
            setPendingDrop(null);
          }}
          onReassignReports={(newParentId) => {
            void wrappedReparent(pendingDrop.draggedId, pendingDrop.newParentId, false);
            setPendingDrop(null);
            filteredPersons
              .filter((p) => p.parentId === pendingDrop.draggedId)
              .forEach((p) => void wrappedReparent(p.id, newParentId, true));
          }}
          onCancel={() => setPendingDrop(null)}
        />
      )}

      {/* Group move dialog */}
      {pendingGroupMove && (
        <Dialog open onOpenChange={() => setPendingGroupMove(null)}>
          <DialogContent icon="group" alert>
            <DialogHeader centered>
              <DialogTitle>Move {pendingGroupMove.persons.length} people</DialogTitle>
              <DialogDescription>
                Move all {pendingGroupMove.persons.length} direct reports{" "}
                {pendingGroupMove.targetId
                  ? `under ${filteredPersons.find((p) => p.id === pendingGroupMove.targetId)?.fullName ?? "the target"}`
                  : "to unallocated"}?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="text" onClick={() => setPendingGroupMove(null)}>Cancel</Button>
              <Button
                onClick={() => {
                  for (const p of pendingGroupMove.persons) void wrappedReparent(p.id, pendingGroupMove.targetId, true);
                  setPendingGroupMove(null);
                }}
              >
                Confirm
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
