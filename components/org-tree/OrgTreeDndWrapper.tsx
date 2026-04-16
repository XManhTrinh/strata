"use client";

import { useState } from "react";
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  DragOverlay,
  pointerWithin,
  rectIntersection,
  CollisionDetection,
} from "@dnd-kit/core";
import { Person, TreeNode } from "@/lib/org-tree/types";
import { isDescendant } from "@/lib/org-tree/tree";
import OrgTree from "./OrgTree";
import UnallocatedList from "./UnallocatedList";
import ReparentModal from "./ReparentModal";

const collisionDetection: CollisionDetection = (args) => {
  const pointerCollisions = pointerWithin(args);
  const hasUnallocated = pointerCollisions.some(
    (c) => c.id === "unallocated-drop-zone"
  );
  if (hasUnallocated) {
    return pointerCollisions.filter((c) => c.id === "unallocated-drop-zone");
  }
  return rectIntersection(args);
};

interface OrgTreeDndWrapperProps {
  tree: TreeNode[];
  unallocated: Person[];
  persons: Person[];
  loading: boolean;
  error: string | null;
  onEdit: (person: Person) => void;
  reparent: (draggedId: string, newParentId: string | null, moveWithChildren?: boolean, childrenNewParentId?: string) => Promise<void>;
  matchedIds?: Set<string>;
}

interface PendingDrop {
  draggedId: string;
  newParentId: string | null;
  personName: string;
  directReportCount: number;
}

export default function OrgTreeDndWrapper({
  tree,
  unallocated,
  persons,
  loading,
  error,
  onEdit,
  reparent,
  matchedIds = new Set(),
}: OrgTreeDndWrapperProps) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const [pendingDrop, setPendingDrop] = useState<PendingDrop | null>(null);

  const activePerson = activeId ? persons.find((p) => p.id === activeId) ?? null : null;

  function handleDragStart(event: DragStartEvent) {
    setActiveId(String(event.active.id));
  }

  function handleDragOver(event: DragOverEvent) {
    setOverId(event.over ? String(event.over.id) : null);
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveId(null);
    setOverId(null);

    const { active, over } = event;
    if (!active || !over) return;

    const draggedId = String(active.id);
    let newParentId: string | null;

    if (over.id === "unallocated-drop-zone") {
      newParentId = null;
    } else {
      const overData = over.data?.current as
        | { type: string; personId: string }
        | undefined;
      if (!overData?.personId) return;
      newParentId = overData.personId;
    }

    if (draggedId === newParentId) return;
    if (newParentId !== null && isDescendant(persons, draggedId, newParentId)) return;

    const directReports = persons.filter((p) => p.parentId === draggedId);

    if (directReports.length > 0) {
      const dragged = persons.find((p) => p.id === draggedId);
      setPendingDrop({
        draggedId,
        newParentId,
        personName: dragged?.fullName ?? "This person",
        directReportCount: directReports.length,
      });
    } else {
      void reparent(draggedId, newParentId);
    }
  }

  function handleMoveWithReports() {
    if (!pendingDrop) return;
    void reparent(pendingDrop.draggedId, pendingDrop.newParentId, true);
    setPendingDrop(null);
  }

  function handleLeaveReports() {
    if (!pendingDrop) return;
    void reparent(pendingDrop.draggedId, pendingDrop.newParentId, false);
    setPendingDrop(null);
  }

  const isOverUnallocated = overId === "unallocated-drop-zone";

  return (
    <DndContext
      collisionDetection={collisionDetection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex gap-6 items-start">
        <div className="flex-1 min-w-0">
          <OrgTree
            tree={tree}
            persons={persons}
            loading={loading}
            error={error}
            onEdit={onEdit}
            activeId={activeId}
            overId={overId}
            matchedIds={matchedIds}
          />
        </div>
        <div className="w-64 shrink-0">
          <UnallocatedList
            persons={unallocated}
            onEdit={onEdit}
            isOver={isOverUnallocated}
            matchedIds={matchedIds}
          />
        </div>
      </div>

      <DragOverlay dropAnimation={null}>
        {activePerson ? (
          <div className="bg-white border-2 border-blue-400 rounded-xl px-4 py-3 shadow-2xl min-w-[180px] max-w-[220px] opacity-95 rotate-2 scale-105 pointer-events-none">
            <p className="font-semibold text-gray-900 text-sm truncate">
              {activePerson.fullName}
            </p>
            <p className="text-gray-500 text-xs truncate">{activePerson.title}</p>
            {activePerson.squads.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {activePerson.squads.map((squad) => (
                  <span
                    key={squad}
                    className="bg-indigo-100 text-indigo-700 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                  >
                    {squad}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : null}
      </DragOverlay>

      {pendingDrop && (
        <ReparentModal
          personName={pendingDrop.personName}
          directReportCount={pendingDrop.directReportCount}
          targetIsUnallocated={pendingDrop.newParentId === null}
          persons={persons}
          draggedId={pendingDrop.draggedId}
          onMoveWithReports={handleMoveWithReports}
          onLeaveReports={handleLeaveReports}
          onReassignReports={(newParentId) => {
            void reparent(pendingDrop.draggedId, pendingDrop.newParentId, false, newParentId);
            setPendingDrop(null);
          }}
          onCancel={() => setPendingDrop(null)}
        />
      )}
    </DndContext>
  );
}
