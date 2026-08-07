"use client";

import { useMemo, useState, useCallback } from "react";
import { ApiPersonRepository } from "@/lib/org-tree/ApiPersonRepository";
import { useOrgTree } from "@/lib/org-tree/useOrgTree";
import { Person, OrgChartViewMode } from "@/lib/org-tree/types";
import { buildTree, buildDepartmentTree, getPathToRoot } from "@/lib/org-tree/tree";
import { Button } from "@/components/ui/button";
import { MOCK_VACANCIES } from "@/lib/org-tree/mock-data";
import { useOrgChartPeople, useOrgUnits } from "@/services";
import OrgFlow from "@/components/flow-org/OrgFlow";
import FlowOrgHeader from "@/components/flow-org/FlowOrgHeader";
import ReparentModal from "@/components/flow-org/ReparentModal";
import ExportButton from "@/components/flow-org/ExportButton";

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

export default function OrgChartPage() {
  const { data: orgChartPeople, isLoading: peopleLoading } = useOrgChartPeople();
  const { data: orgUnits = [] } = useOrgUnits("cm_acme_corp_001");

  const repository = useMemo(
    () => new ApiPersonRepository(orgChartPeople ?? []),
    [orgChartPeople]
  );
  const { unallocated, persons, loading, error, reparent } =
    useOrgTree(repository);

  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null);
  const [pendingGroupMove, setPendingGroupMove] =
    useState<PendingGroupMove | null>(null);
  const [selectedUnits, setSelectedUnits] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<OrgChartViewMode>("reporting");
  const [timelineDate] = useState<string | null>(null);

  const toggleUnit = useCallback((unitName: string) => {
    setSelectedUnits((prev) => {
      const next = new Set(prev);
      if (next.has(unitName)) {
        next.delete(unitName);
      } else {
        next.add(unitName);
      }
      return next;
    });
  }, []);

  const clearUnits = useCallback(() => setSelectedUnits(new Set()), []);

  const isAllView = selectedUnits.size === 0;

  // Filter persons by timeline date
  const filteredPersons = useMemo(() => {
    if (!timelineDate) return persons;
    return persons.filter((p) => {
      if (!p.startDate) return true;
      return p.startDate <= timelineDate;
    });
  }, [persons, timelineDate]);

  const activeTree = useMemo(() => {
    if (viewMode === "department") {
      return buildDepartmentTree(filteredPersons.filter((p) => p.parentId !== null));
    }

    if (isAllView) {
      const roots = filteredPersons.filter((p) => p.parentId === null);
      const trueRoot = roots.reduce(
        (best: Person | null, p: Person) => {
          if (!best) return p;
          const bestCount = filteredPersons.filter((x) => x.parentId === best.id).length;
          const pCount = filteredPersons.filter((x) => x.parentId === p.id).length;
          return pCount > bestCount ? p : best;
        },
        null as Person | null
      );
      if (!trueRoot) return [];
      const reachable = new Set<string>();
      const queue = [trueRoot.id];
      while (queue.length) {
        const cur = queue.shift()!;
        reachable.add(cur);
        filteredPersons
          .filter((p) => p.parentId === cur)
          .forEach((p) => queue.push(p.id));
      }
      return buildTree(filteredPersons.filter((p) => reachable.has(p.id)));
    }
    // Filter by selected org units (match on departmentName)
    const unitFilteredPersons = filteredPersons.filter(
      (p) => p.departmentName && selectedUnits.has(p.departmentName)
    );
    return buildTree(unitFilteredPersons);
  }, [isAllView, selectedUnits, filteredPersons, viewMode]);

  const selectedMemberCount = useMemo(() => {
    if (isAllView) return filteredPersons.length;
    return filteredPersons.filter(
      (p) => p.departmentName && selectedUnits.has(p.departmentName)
    ).length;
  }, [isAllView, selectedUnits, filteredPersons]);

  // Enhanced search
  const matchedIds = useMemo<Set<string>>(() => {
    const q = search.trim().toLowerCase();
    if (!q) return new Set();
    return new Set(
      filteredPersons
        .filter((p) => {
          if (p.fullName.toLowerCase().includes(q)) return true;
          if (p.uin && p.uin.toLowerCase().includes(q)) return true;
          if (p.title.toLowerCase().includes(q)) return true;
          if (p.departmentName && p.departmentName.toLowerCase().includes(q)) return true;
          if (p.status.toLowerCase().includes(q)) return true;
          return false;
        })
        .map((p) => p.id)
    );
  }, [filteredPersons, search]);

  // Path to root for single search result
  const pathToRoot = useMemo(() => {
    if (matchedIds.size !== 1) return undefined;
    const targetId = Array.from(matchedIds)[0];
    return getPathToRoot(filteredPersons, targetId);
  }, [matchedIds, filteredPersons]);

  // Count people per org unit name
  const unitCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const unit of orgUnits) {
      counts[unit.name] = filteredPersons.filter((p) => p.departmentName === unit.name).length;
    }
    return counts;
  }, [filteredPersons, orgUnits]);

  const onEdit = useCallback((person: Person) => {
    console.log("Edit person:", person.fullName);
  }, []);

  const wrappedReparent = useCallback(
    async (draggedId: string, newParentId: string | null, moveWithChildren?: boolean) => {
      await reparent(draggedId, newParentId, moveWithChildren);
    },
    [reparent]
  );

  const onPendingDrop = useCallback((info: PendingDrop) => {
    setPendingDrop(info);
  }, []);

  const onPendingGroupMove = useCallback((info: PendingGroupMove) => {
    setPendingGroupMove(info);
  }, []);

  const onContextMenuAction = useCallback((action: string, targetId: string) => {
    console.log("Context menu action:", action, "on", targetId);
  }, []);

  return (
    <div className="flex flex-col overflow-hidden" style={{ height: "calc(100vh - 64px - 12px - 24px)" }}>
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
          exportButton={<ExportButton />}
        />

        {/* Status bar */}
        <div className="px-6 flex items-center gap-3 h-8 shrink-0">
          {!isAllView && (
            <p className="text-xs text-muted-foreground">
              Showing{" "}
              <span className="font-medium text-foreground">
                {selectedMemberCount}
              </span>{" "}
              {selectedMemberCount === 1 ? "person" : "people"} in{" "}
              <span className="font-medium text-foreground">
                {Array.from(selectedUnits).join(", ")}
              </span>{" "}
              —{" "}
              <button
                type="button"
                onClick={clearUnits}
                className="text-primary hover:underline"
              >
                clear
              </button>
            </p>
          )}
          {search.trim() && (
            <p className="text-xs text-gray-400 dark:text-gray-500">
              {matchedIds.size === 0
                ? "No matches"
                : `${matchedIds.size} ${matchedIds.size === 1 ? "person" : "people"} highlighted`}
            </p>
          )}
        </div>

        {/* Main content */}
        <main className="flex-1 min-h-0">
          {(peopleLoading || loading) ? (
            <div className="flex items-center justify-center h-full">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
                {error}
              </p>
            </div>
          ) : (
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
              onContextMenuAction={onContextMenuAction}
            />
          )}
        </main>

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
          onReassignReports={(newParentId: string) => {
            void wrappedReparent(
              pendingDrop.draggedId,
              pendingDrop.newParentId,
              false
            );
            setPendingDrop(null);
            filteredPersons
              .filter((p) => p.parentId === pendingDrop.draggedId)
              .forEach((p) => {
                void wrappedReparent(p.id, newParentId, true);
              });
          }}
          onCancel={() => setPendingDrop(null)}
        />
      )}

      {pendingGroupMove && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setPendingGroupMove(null)}
          />
          <div className="relative bg-white dark:bg-gray-800 rounded-2xl shadow-2xl p-6 max-w-sm w-full mx-4">
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 mb-2">
              Move {pendingGroupMove.persons.length} people
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-5">
              Move all {pendingGroupMove.persons.length} direct reports{" "}
              {pendingGroupMove.targetId
                ? `under ${filteredPersons.find((p) => p.id === pendingGroupMove.targetId)?.fullName ?? "the target"}`
                : "to unallocated"}
              ?
            </p>
            <div className="flex flex-col gap-2">
              <Button
                onClick={() => {
                  for (const p of pendingGroupMove.persons) {
                    void wrappedReparent(p.id, pendingGroupMove.targetId, true);
                  }
                  setPendingGroupMove(null);
                }}
              >
                Confirm
              </Button>
              <Button
                variant="ghost"
                onClick={() => setPendingGroupMove(null)}
              >
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
