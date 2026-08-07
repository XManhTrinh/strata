"use client";

import { useMemo, useState, useCallback } from "react";
import { MockPersonRepository } from "@/lib/org-tree/MockPersonRepository";
import { useOrgTree } from "@/lib/org-tree/useOrgTree";
import { Person, OrgChartViewMode } from "@/lib/org-tree/types";
import { buildSquadTree, buildTree, buildDepartmentTree, getPathToRoot } from "@/lib/org-tree/tree";
import { ALL_SQUADS, TRIBES } from "@/lib/org-tree/squads";
import { Button } from "@/components/ui/button";
import { MOCK_VACANCIES } from "@/lib/org-tree/mock-data";
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
  const repository = useMemo(() => new MockPersonRepository(), []);
  const { unallocated, persons, loading, error, reparent } =
    useOrgTree(repository);

  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null);
  const [pendingGroupMove, setPendingGroupMove] =
    useState<PendingGroupMove | null>(null);
  const [selectedSquads, setSelectedSquads] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<OrgChartViewMode>("reporting");
  const [timelineDate] = useState<string | null>(null);

  const toggleSquad = useCallback((squad: string) => {
    setSelectedSquads((prev) => {
      const next = new Set(prev);
      if (next.has(squad)) {
        next.delete(squad);
      } else {
        next.add(squad);
      }
      return next;
    });
  }, []);

  const clearSquads = useCallback(() => setSelectedSquads(new Set()), []);

  const isAllView = selectedSquads.size === 0;

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
    return buildSquadTree(filteredPersons, Array.from(selectedSquads));
  }, [isAllView, selectedSquads, filteredPersons, viewMode]);

  const selectedMemberCount = useMemo(() => {
    if (isAllView) return filteredPersons.length;
    return new Set(
      filteredPersons
        .filter((p) => p.squads.some((s) => selectedSquads.has(s)))
        .map((p) => p.id)
    ).size;
  }, [isAllView, selectedSquads, filteredPersons]);

  // Enhanced search: matches fullName, uin, title, departmentName, squads, status
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
          if (p.squads.some((s) => s.toLowerCase().includes(q))) return true;
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

  const squadCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const squad of ALL_SQUADS) {
      counts[squad] = filteredPersons.filter((p) => p.squads.includes(squad)).length;
    }
    return counts;
  }, [filteredPersons]);

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
          selectedSquads={selectedSquads}
          onToggleSquad={toggleSquad}
          onClearSquads={clearSquads}
          squadCounts={squadCounts}
          totalCount={filteredPersons.length}
          tribes={TRIBES}
          viewMode={viewMode}
          onViewModeChange={setViewMode}
          searchResultCount={search.trim() ? matchedIds.size : undefined}
          pathToRoot={pathToRoot}
          exportButton={<ExportButton />}
        />

        {/* Status bar */}
        <div className="px-6 flex items-center gap-3 h-8 shrink-0">
          {!isAllView && (
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Showing{" "}
              <span className="font-medium text-gray-700 dark:text-gray-200">
                {selectedMemberCount}
              </span>{" "}
              {selectedMemberCount === 1 ? "person" : "people"} across{" "}
              <span className="font-medium text-gray-700 dark:text-gray-200">
                {Array.from(selectedSquads).join(", ")}
              </span>{" "}
              —{" "}
              <button
                type="button"
                onClick={clearSquads}
                className="text-indigo-500 hover:text-indigo-400 underline underline-offset-2"
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
          {loading ? (
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
