"use client";

import { useMemo, useState, useCallback } from "react";
import { MockPersonRepository } from "@/lib/org-tree/MockPersonRepository";
import { MockAIProvider } from "@/lib/org-tree/MockAIProvider";
import { useOrgTree } from "@/lib/org-tree/useOrgTree";
import { Person } from "@/lib/org-tree/types";
import { buildSquadTree } from "@/lib/org-tree/tree";
import { ALL_SQUADS, TRIBES } from "@/lib/org-tree/squads";
import OrgFlow from "@/components/flow-org/OrgFlow";
import FlowOrgHeader from "@/components/flow-org/FlowOrgHeader";
import EditPersonModal from "@/components/flow-org/EditPersonModal";
import CreatePersonModal from "@/components/flow-org/CreatePersonModal";
import ReparentModal from "@/components/flow-org/ReparentModal";
import GroupMoveModal from "@/components/flow-org/GroupMoveModal";
import AIChatPanel from "@/components/flow-org/AIChatPanel";


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

export default function FlowOrgPage() {
  const repository = useMemo(() => new MockPersonRepository(), []);
  const aiProvider = useMemo(() => new MockAIProvider(), []);
  const { unallocated, persons, loading, error, reparent, editPerson, createPerson } =
    useOrgTree(repository);

  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null);
  const [pendingGroupMove, setPendingGroupMove] = useState<PendingGroupMove | null>(null);
  const [selectedSquads, setSelectedSquads] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");

  const toggleSquad = useCallback((squad: string) => {
    setSelectedSquads((prev) => {
      const next = new Set(prev);
      if (next.has(squad)) { next.delete(squad); } else { next.add(squad); }
      return next;
    });
  }, []);

  const clearSquads = useCallback(() => setSelectedSquads(new Set()), []);

  const isAllView = selectedSquads.size === 0;

  const activeTree = useMemo(() => {
    if (isAllView) return [];
    return buildSquadTree(persons, Array.from(selectedSquads));
  }, [isAllView, selectedSquads, persons]);

  const selectedMemberCount = useMemo(() => {
    if (isAllView) return persons.length;
    return new Set(
      persons.filter((p) => p.squads.some((s) => selectedSquads.has(s))).map((p) => p.id)
    ).size;
  }, [isAllView, selectedSquads, persons]);

  const matchedIds = useMemo<Set<string>>(() => {
    const q = search.trim().toLowerCase();
    if (!q) return new Set();
    return new Set(persons.filter((p) => p.fullName.toLowerCase().includes(q)).map((p) => p.id));
  }, [persons, search]);

  const allSquads = useMemo(() => {
    const fromData = new Set(persons.flatMap((p) => p.squads));
    ALL_SQUADS.forEach((s) => fromData.add(s));
    return Array.from(fromData).sort();
  }, [persons]);

  const squadCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const squad of ALL_SQUADS) {
      counts[squad] = persons.filter((p) => p.squads.includes(squad)).length;
    }
    return counts;
  }, [persons]);

  const onEdit = useCallback((person: Person) => {
    setEditError(null);
    setEditingPerson(person);
  }, []);

  const onPendingDrop = useCallback((info: PendingDrop) => setPendingDrop(info), []);
  const onPendingGroupMove = useCallback((info: PendingGroupMove) => setPendingGroupMove(info), []);

  const handleEdit = useCallback(async (data: Partial<Pick<Person, "fullName" | "title" | "squads" | "salary">>) => {
    if (!editingPerson) return;
    setEditError(null);
    try {
      await editPerson(editingPerson.id, data);
      setEditingPerson(null);
    } catch (err) {
      setEditError(err instanceof Error ? err.message : "Failed to update person.");
      throw err;
    }
  }, [editingPerson, editPerson]);

  const handleCreate = useCallback(async (data: {
    fullName: string; title: string; squads?: string[]; salary?: number; parentId?: string | null;
  }) => {
    setCreateError(null);
    try {
      await createPerson(data);
      setShowCreate(false);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : "Failed to create person.");
      throw err;
    }
  }, [createPerson]);

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      <FlowOrgHeader
        search={search}
        onSearchChange={setSearch}
        onAddPerson={() => { setCreateError(null); setShowCreate(true); }}
        selectedSquads={selectedSquads}
        onToggleSquad={toggleSquad}
        onClearSquads={clearSquads}
        squadCounts={squadCounts}
        totalCount={persons.length}
        tribes={TRIBES}
      />

      {/* Status bar */}
      <div className="px-6 pt-3 pb-1 flex items-center gap-3 min-h-7 shrink-0">
        {!isAllView && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Showing <span className="font-medium text-gray-700 dark:text-gray-200">{selectedMemberCount}</span>{" "}
            {selectedMemberCount === 1 ? "person" : "people"} across{" "}
            <span className="font-medium text-gray-700 dark:text-gray-200">{Array.from(selectedSquads).join(", ")}</span>
            {" "}—{" "}
            <button type="button" onClick={clearSquads} className="text-indigo-500 hover:text-indigo-400 underline underline-offset-2">clear</button>
          </p>
        )}
        {search.trim() && (
          <p className="text-xs text-gray-400 dark:text-gray-500">
            {matchedIds.size === 0 ? "No matches" : `${matchedIds.size} ${matchedIds.size === 1 ? "person" : "people"} highlighted`}
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
            <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>
          </div>
        ) : isAllView ? (
          <div className="flex flex-col items-center justify-center h-full gap-3">
            <p className="text-gray-400 dark:text-gray-500 text-sm">Select a squad or tribe to view the org chart</p>
            <p className="text-gray-300 dark:text-gray-600 text-xs">{persons.length.toLocaleString()} people across {ALL_SQUADS.length} squads</p>
          </div>
        ) : (
          <OrgFlow
            tree={activeTree}
            unallocated={unallocated}
            persons={persons}
            matchedIds={matchedIds}
            onEdit={onEdit}
            reparent={reparent}
            onPendingDrop={onPendingDrop}
            onPendingGroupMove={onPendingGroupMove}
          />
        )}
      </main>

      {editingPerson && (
        <EditPersonModal
          person={editingPerson}
          allSquads={allSquads}
          onSubmit={handleEdit}
          onClose={() => { setEditingPerson(null); setEditError(null); }}
          error={editError}
        />
      )}

      {showCreate && (
        <CreatePersonModal
          onSubmit={handleCreate}
          onClose={() => { setShowCreate(false); setCreateError(null); }}
          error={createError}
          persons={persons}
          allSquads={allSquads}
        />
      )}

      {pendingDrop && (
        <ReparentModal
          personName={pendingDrop.personName}
          directReportCount={pendingDrop.directReportCount}
          targetIsUnallocated={pendingDrop.newParentId === null}
          persons={persons}
          draggedId={pendingDrop.draggedId}
          onMoveWithReports={() => {
            void reparent(pendingDrop.draggedId, pendingDrop.newParentId, true);
            setPendingDrop(null);
          }}
          onLeaveReports={() => {
            void reparent(pendingDrop.draggedId, pendingDrop.newParentId, false);
            setPendingDrop(null);
          }}
          onReassignReports={(newParentId) => {
            void reparent(pendingDrop.draggedId, pendingDrop.newParentId, false, newParentId);
            setPendingDrop(null);
          }}
          onCancel={() => setPendingDrop(null)}
        />
      )}

      {pendingGroupMove && (
        <GroupMoveModal
          persons={pendingGroupMove.persons}
          targetName={pendingGroupMove.targetId ? persons.find((p) => p.id === pendingGroupMove.targetId)?.fullName ?? null : null}
          onConfirm={() => {
            for (const p of pendingGroupMove.persons) {
              void reparent(p.id, pendingGroupMove.targetId, true);
            }
            setPendingGroupMove(null);
          }}
          onCancel={() => setPendingGroupMove(null)}
        />
      )}

      <AIChatPanel provider={aiProvider} persons={persons} />
    </div>
  );
}
