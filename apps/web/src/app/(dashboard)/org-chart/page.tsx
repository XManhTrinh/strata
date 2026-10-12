"use client";

import { useMemo, useState, useCallback } from "react";
import { ApiPersonRepository } from "@/lib/org-tree/ApiPersonRepository";
import { useOrgTree } from "@/lib/org-tree/useOrgTree";
import { Person, OrgChartViewMode } from "@/lib/org-tree/types";
import { buildTree, buildDepartmentTree, getPathToRootNodes } from "@/lib/org-tree/tree";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogActions,
  Card,
  Button,
  LoadingIndicator,
} from "@vkieu/windmorph";
import { Icon } from "@/components/ui/icon";
import { CardContent } from "@/components/ui/card-content";
import { MOCK_VACANCIES } from "@/lib/org-tree/mock-data";
import { useOrgChartPeople, useOrgUnitTree } from "@/services";
import { useCompanyId } from "@/hooks/use-company";
import { Skeleton, SkeletonGroup } from "@vkieu/windmorph/vk";
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
  const { data: orgUnitTree = [] } = useOrgUnitTree(companyId);

  const repository = useMemo(
    () => new ApiPersonRepository(orgChartPeople ?? [], companyId),
    [orgChartPeople, companyId],
  );
  const { unallocated, persons, loading, error, reparent } = useOrgTree(repository);

  // ── Local state ────────────────────────────────────────────────────────
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null);
  const [pendingGroupMove, setPendingGroupMove] = useState<PendingGroupMove | null>(null);
  const [selectedUnitIds, setSelectedUnitIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<OrgChartViewMode>("reporting");
  const [focusedId, setFocusedId] = useState<string | null>(null);

  // ── Handlers ───────────────────────────────────────────────────────────
  const clearUnits = useCallback(() => setSelectedUnitIds(new Set()), []);
  const focusPerson = useCallback((id: string) => setFocusedId(id), []);
  const clearFocus = useCallback(() => setFocusedId(null), []);

  // ── Derived ────────────────────────────────────────────────────────────
  // The tree-select cascades parent → descendants into selectedUnitIds, so a
  // person matches when their org unit id is in the selected set (selecting a
  // Division automatically includes all its clusters/squads).
  const isAllView = selectedUnitIds.size === 0;

  // Unallocated people (no manager AND no reports) belong in the right panel,
  // not the reporting canvas — exclude them from the chart trees.
  const unallocatedIds = useMemo(
    () => new Set(unallocated.map((p) => p.id)),
    [unallocated],
  );

  const filteredPersons = useMemo(
    () => persons.filter((p) => !unallocatedIds.has(p.id)),
    [persons, unallocatedIds],
  );

  const focusedPerson = useMemo(
    () => (focusedId ? persons.find((p) => p.id === focusedId) ?? null : null),
    [focusedId, persons],
  );

  const activeTree = useMemo(() => {
    // Focus mode: the clicked person, their full ancestor chain up to the root,
    // and their direct children.
    if (focusedPerson) {
      const byId = new Map(persons.map((p) => [p.id, p]));
      const slice: Person[] = [];

      // Walk up from the focused person to the root, collecting ancestors.
      let cur: Person | undefined = focusedPerson;
      const ancestorGuard = new Set<string>();
      while (cur && !ancestorGuard.has(cur.id)) {
        ancestorGuard.add(cur.id);
        slice.push(cur);
        cur = cur.parentId ? byId.get(cur.parentId) : undefined;
      }

      // Add the focused person's direct children.
      for (const p of persons) {
        if (p.parentId === focusedPerson.id) slice.push(p);
      }

      // Root the slice: any member whose parent isn't in the slice becomes a
      // root (handles the true root and any data gaps in the ancestor chain).
      const sliceIds = new Set(slice.map((p) => p.id));
      const rooted = slice.map((p) =>
        p.parentId && sliceIds.has(p.parentId) ? p : { ...p, parentId: null },
      );

      return buildTree(rooted);
    }
    if (viewMode === "department") {
      return buildDepartmentTree(filteredPersons.filter((p) => p.parentId !== null));
    }
    if (isAllView) {
      // Show the full forest: every reporting tree (each top-level person and
      // their subtree), not just the single biggest root.
      return buildTree(filteredPersons);
    }
    return buildTree(filteredPersons.filter((p) => p.departmentId && selectedUnitIds.has(p.departmentId)));
  }, [focusedPerson, persons, isAllView, selectedUnitIds, filteredPersons, viewMode]);

  const selectedMemberCount = useMemo(() => {
    if (isAllView) return filteredPersons.length;
    return filteredPersons.filter((p) => p.departmentId && selectedUnitIds.has(p.departmentId)).length;
  }, [isAllView, selectedUnitIds, filteredPersons]);

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
    return getPathToRootNodes(filteredPersons, Array.from(matchedIds)[0]);
  }, [matchedIds, filteredPersons]);

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
        <span className="text-body-small text-on-surface-variant" key="filter">
          Showing <strong className="text-on-surface">{selectedMemberCount}</strong>{" "}
          {selectedMemberCount === 1 ? "person" : "people"}
        </span>,
      );
    }

    if (search.trim() && matchedIds.size > 0) {
      parts.push(
        <span className="text-body-small text-on-surface-variant" key="search">
          {matchedIds.size} {matchedIds.size === 1 ? "match" : "matches"} highlighted
        </span>,
      );
    }

    if (parts.length === 0) return undefined;
    return <div className="flex items-center gap-3">{parts}</div>;
  }, [isAllView, selectedMemberCount, search, matchedIds]);

  // ── Loading ────────────────────────────────────────────────────────────
  if (peopleLoading || loading) {
    return (
      <div className="flex flex-col h-[calc(100vh-100px)]">
        <SkeletonGroup label="Loading org chart">
          <div className="flex items-center gap-4 px-6 h-16 border-b border-outline-variant">
            <Skeleton className="h-6 w-24" corner="extra-small" />
            <Skeleton className="h-8 w-48" corner="full" />
            <div className="flex-1" />
            <Skeleton className="h-10 w-64" corner="full" />
            <Skeleton className="h-8 w-32" corner="full" />
          </div>
        </SkeletonGroup>
        <div className="flex-1 flex items-center justify-center">
          <LoadingIndicator aria-label="Loading org chart" />
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
            <div className="flex items-center justify-center h-14 w-14 rounded-full bg-error/12 mb-4">
              <Icon name="error" size={24} className="text-error" />
            </div>
            <h2 className="text-title-medium mb-2">Unable to load org chart</h2>
            <p className="text-body-medium text-on-surface-variant mb-6">
              {error}
            </p>
            <Button
              variant="filled"
              leadingIcon={<Icon name="refresh" />}
              onClick={() => window.location.reload()}
            >
              Retry
            </Button>
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
        orgUnitTree={orgUnitTree}
        selectedUnitIds={selectedUnitIds}
        onSelectionChange={setSelectedUnitIds}
        onClearSquads={clearUnits}
        totalCount={filteredPersons.length}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        searchResultCount={search.trim() ? matchedIds.size : undefined}
        pathToRoot={pathToRoot}
        onFocusPerson={focusPerson}
        statusText={statusText}
      />

      {/* Canvas */}
      <main className="flex-1 min-h-0 relative">
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

        {/* Focus mode banner */}
        {focusedPerson && (
          <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 rounded-full bg-surface-container border border-outline-variant px-4 py-2 shadow-lg">
            <Icon name="center_focus_strong" size={18} className="text-primary" />
            <p className="text-body-small text-on-surface-variant">
              Focused on{" "}
              <span className="text-label-large text-on-surface">{focusedPerson.fullName}</span>
            </p>
            <Button
              variant="text"
              size="xs"
              onClick={clearFocus}
              leadingIcon={<Icon name="close" size={16} />}
            >
              Exit focus
            </Button>
          </div>
        )}
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
        <Dialog open onOpenChange={() => setPendingGroupMove(null)} icon={<Icon name="group" />} role="alertdialog">
          <DialogTitle>Move {pendingGroupMove.persons.length} people</DialogTitle>
          <DialogContent>
            <p className="text-body-medium text-on-surface-variant">
              Move all {pendingGroupMove.persons.length} direct reports{" "}
              {pendingGroupMove.targetId
                ? `under ${filteredPersons.find((p) => p.id === pendingGroupMove.targetId)?.fullName ?? "the target"}`
                : "to unallocated"}?
            </p>
          </DialogContent>
          <DialogActions>
              <Button variant="text" onClick={() => setPendingGroupMove(null)}>Cancel</Button>
              <Button
                variant="filled"
                onClick={() => {
                  for (const p of pendingGroupMove.persons) void wrappedReparent(p.id, pendingGroupMove.targetId, true);
                  setPendingGroupMove(null);
                }}
              >
                Confirm
              </Button>
          </DialogActions>
        </Dialog>
      )}
    </div>
  );
}
