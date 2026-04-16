"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type OnNodeDrag,
  type NodeChange,
  useReactFlow,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Person, TreeNode } from "@/lib/org-tree/types";
import { isDescendant } from "@/lib/org-tree/tree";
import { buildFlowLayout } from "@/lib/flow-org/layout";
import PersonNode, { type PersonNodeData } from "./PersonNode";
import UnallocatedPanel from "./UnallocatedPanel";

const nodeTypes = { person: PersonNode };
const DROP_DISTANCE = 100;
const DRAG_THRESHOLD = 5;
const HIGHLIGHT_CLASS = "flow-drop-target";

interface OrgFlowInnerProps {
  tree: TreeNode[];
  unallocated: Person[];
  persons: Person[];
  matchedIds: Set<string>;
  onEdit: (person: Person) => void;
  reparent: (draggedId: string, newParentId: string | null, moveWithChildren?: boolean) => Promise<void>;
  onPendingDrop: (info: { draggedId: string; newParentId: string | null; personName: string; directReportCount: number }) => void;
}

/**
 * Find the closest visible canvas node to the screen cursor.
 * Uses getBoundingClientRect for pixel-perfect hit testing at any zoom.
 */
function findClosestNodeByScreen(
  draggedId: string,
  screenX: number,
  screenY: number,
  persons: Person[],
): string | null {
  const nodeEls = document.querySelectorAll<HTMLElement>(".react-flow__node");
  let closest: string | null = null;
  let minDist = DROP_DISTANCE;

  for (const el of nodeEls) {
    const id = el.getAttribute("data-id");
    if (!id || id === draggedId) continue;
    if (isDescendant(persons, draggedId, id)) continue;

    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = cx - screenX;
    const dy = cy - screenY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDist) {
      minDist = dist;
      closest = id;
    }
  }
  return closest;
}

function triggerReparent(
  draggedId: string,
  newParentId: string | null,
  persons: Person[],
  reparent: OrgFlowInnerProps["reparent"],
  onPendingDrop: OrgFlowInnerProps["onPendingDrop"],
) {
  const directReports = persons.filter((p) => p.parentId === draggedId);
  if (directReports.length > 0) {
    const dragged = persons.find((p) => p.id === draggedId);
    onPendingDrop({
      draggedId,
      newParentId,
      personName: dragged?.fullName ?? "This person",
      directReportCount: directReports.length,
    });
  } else {
    void reparent(draggedId, newParentId);
  }
}

function setDomHighlight(nodeId: string | null, prevId: string | null) {
  if (prevId) document.querySelector(`[data-id="${prevId}"]`)?.classList.remove(HIGHLIGHT_CLASS);
  if (nodeId) document.querySelector(`[data-id="${nodeId}"]`)?.classList.add(HIGHLIGHT_CLASS);
}

interface OverlayInfo { person: Person; x: number; y: number; width: number; height: number }

function GhostOverlay({ info }: { info: OverlayInfo }) {
  return (
    <div
      className="fixed pointer-events-none"
      style={{
        left: info.x,
        top: info.y,
        width: info.width,
        height: info.height,
        transform: "translate(-50%, -50%) rotate(2deg)",
        zIndex: 9999,
      }}
    >
      <div className="bg-white dark:bg-gray-800 border-2 border-blue-400 rounded-xl px-4 py-3 shadow-2xl w-full h-full opacity-90 overflow-hidden">
        <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm truncate">{info.person.fullName}</p>
        <p className="text-gray-500 dark:text-gray-400 text-xs truncate">{info.person.title}</p>
        {info.person.squads.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-2">
            {info.person.squads.map((s) => (
              <span key={s} className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-medium px-1.5 py-0.5 rounded-full">{s}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function OrgFlowInner({
  tree, unallocated, persons, matchedIds, onEdit, reparent, onPendingDrop,
}: OrgFlowInnerProps) {
  const { fitView } = useReactFlow();
  const [nodes, setNodes] = useState<Node[]>([]);
  const [edges, setEdges] = useState<Edge[]>([]);
  const [ghost, setGhost] = useState<OverlayInfo | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [isOverUnallocated, setIsOverUnallocated] = useState(false);
  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  const [autoPanEnabled, setAutoPanEnabled] = useState(true);

  const layoutRef = useRef<{ nodes: Node[]; edges: Edge[] }>({ nodes: [], edges: [] });
  const dropTargetRef = useRef<string | null>(null);
  const unallocatedRef = useRef<HTMLDivElement>(null);

  // Refs for sidebar drag
  const sidebarDragRef = useRef<{
    id: string;
    person: Person;
    startX: number;
    startY: number;
    active: boolean;
    sourceEl: HTMLElement | null;
  } | null>(null);

  const personsRef = useRef(persons);
  personsRef.current = persons;
  const reparentRef = useRef(reparent);
  reparentRef.current = reparent;
  const onPendingDropRef = useRef(onPendingDrop);
  onPendingDropRef.current = onPendingDrop;


  const onToggleCollapse = useCallback((id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const layout = useMemo(
    () => buildFlowLayout(tree, matchedIds, collapsedIds, onEdit, onToggleCollapse),
    [tree, matchedIds, collapsedIds, onEdit, onToggleCollapse],
  );

  useEffect(() => {
    layoutRef.current = layout;
    setNodes(layout.nodes);
    setEdges(layout.edges);
    setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50);
  }, [layout, fitView]);

  // --- Canvas node drag (React Flow built-in) ---

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => {
      const next = [...nds];
      for (const c of changes) {
        if (c.type === "position" && c.id) {
          const idx = next.findIndex((n) => n.id === c.id);
          if (idx === -1) continue;
          if (c.position) next[idx] = { ...next[idx], position: c.position };
          if ("dragging" in c) next[idx] = { ...next[idx], dragging: c.dragging };
        }
      }
      return next;
    });
  }, []);

  const isOverUnallocatedPanel = useCallback((clientX: number, clientY: number) => {
    const el = unallocatedRef.current;
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    return clientX >= rect.left && clientX <= rect.right && clientY >= rect.top && clientY <= rect.bottom;
  }, []);

  const onNodeDragStart: OnNodeDrag = useCallback(
    (e: React.MouseEvent, node: Node) => {
      const data = node.data as PersonNodeData;
      setDraggingId(node.id);
      const el = document.querySelector(`[data-id="${node.id}"]`);
      const rect = el?.getBoundingClientRect();
      setGhost({ person: data.person, x: e.clientX, y: e.clientY, width: rect?.width ?? 200, height: rect?.height ?? 80 });
    },
    [],
  );

  const onNodeDrag: OnNodeDrag = useCallback(
    (e: React.MouseEvent, node: Node) => {
      setGhost((prev) => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);

      // Check if over unallocated panel — disable auto-pan when over it
      const overUnalloc = isOverUnallocatedPanel(e.clientX, e.clientY);
      setIsOverUnallocated(overUnalloc);
      setAutoPanEnabled(!overUnalloc);

      // Highlight closest canvas node
      const target = findClosestNodeByScreen(node.id, e.clientX, e.clientY, persons);
      const prev = dropTargetRef.current;
      if (target !== prev) {
        setDomHighlight(target, prev);
        dropTargetRef.current = target;
      }
    },
    [persons, isOverUnallocatedPanel],
  );

  const onNodeDragStop: OnNodeDrag = useCallback(
    (e: React.MouseEvent, node: Node) => {
      setGhost(null);
      setDraggingId(null);
      setIsOverUnallocated(false);
      setAutoPanEnabled(true);

      const overUnalloc = isOverUnallocatedPanel(e.clientX, e.clientY);
      const target = dropTargetRef.current;
      setDomHighlight(null, target);
      dropTargetRef.current = null;

      // Snap back
      setNodes(layoutRef.current.nodes);
      setEdges(layoutRef.current.edges);

      if (overUnalloc) {
        triggerReparent(node.id, null, persons, reparent, onPendingDrop);
      } else if (target) {
        triggerReparent(node.id, target, persons, reparent, onPendingDrop);
      }
    },
    [persons, reparent, onPendingDrop, setNodes, setEdges, isOverUnallocatedPanel],
  );

  // --- Sidebar (unallocated) drag ---

  const onUnallocatedDragStart = useCallback((person: Person, e: React.MouseEvent) => {
    if ((e.target as HTMLElement).closest("button")) return;
    const el = (e.target as HTMLElement).closest<HTMLElement>(".select-none");
    sidebarDragRef.current = {
      id: person.id,
      person,
      startX: e.clientX,
      startY: e.clientY,
      active: false,
      sourceEl: el,
    };
  }, []);

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      const drag = sidebarDragRef.current;
      if (!drag) return;

      if (!drag.active) {
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;
        if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
        drag.active = true;
        if (drag.sourceEl) drag.sourceEl.style.opacity = "0.3";
        document.body.style.userSelect = "none";
        document.body.style.cursor = "grabbing";

        // Use the source sidebar card's size for the ghost
        const rect = drag.sourceEl?.getBoundingClientRect();
        setGhost({
          person: drag.person,
          x: e.clientX,
          y: e.clientY,
          width: rect?.width ?? 220,
          height: rect?.height ?? 70,
        });
        setDraggingId(drag.id);
      } else {
        setGhost((prev) => prev ? { ...prev, x: e.clientX, y: e.clientY } : null);
      }

      // Highlight closest canvas node
      const target = findClosestNodeByScreen(drag.id, e.clientX, e.clientY, personsRef.current);
      const prev = dropTargetRef.current;
      if (target !== prev) {
        setDomHighlight(target, prev);
        dropTargetRef.current = target;
      }
    }

    function onMouseUp() {
      const drag = sidebarDragRef.current;
      if (!drag) return;

      if (drag.sourceEl) drag.sourceEl.style.opacity = "";
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      setGhost(null);
      setDraggingId(null);

      const target = dropTargetRef.current;
      setDomHighlight(null, target);
      dropTargetRef.current = null;

      if (drag.active && target) {
        triggerReparent(drag.id, target, personsRef.current, reparentRef.current, onPendingDropRef.current);
      }

      sidebarDragRef.current = null;
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  // --- Edge double-click ---

  const onEdgeDoubleClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      triggerReparent(edge.target, null, persons, reparent, onPendingDrop);
    },
    [persons, reparent, onPendingDrop],
  );

  const hasMatch = matchedIds.size > 0;

  return (
    <div className="flex h-full relative">
      <style>{`
        .react-flow__node.${HIGHLIGHT_CLASS} > div {
          box-shadow: 0 0 0 2px #60a5fa, 0 4px 12px rgba(96,165,250,0.3) !important;
          border-color: #60a5fa !important;
          background: #eff6ff !important;
          transform: scale(1.05);
        }
        .dark .react-flow__node.${HIGHLIGHT_CLASS} > div {
          background: rgba(30,58,138,0.3) !important;
        }
        .react-flow__node.dragging {
          opacity: 0 !important;
          pointer-events: none !important;
        }
      `}</style>

      <div className="flex-1 min-w-0 h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onNodeDragStart={onNodeDragStart}
          onNodeDrag={onNodeDrag}
          onNodeDragStop={onNodeDragStop}
          onEdgeDoubleClick={onEdgeDoubleClick}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2 }}
          minZoom={0.1}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          className="bg-gray-50 dark:bg-gray-900"
          autoPanOnNodeDrag={autoPanEnabled}
          edgesFocusable={false}
          edgesReconnectable={false}
          nodesConnectable={false}
        >
          <Background gap={20} size={1} className="!bg-gray-50 dark:!bg-gray-900" />
          <Controls className="!bg-white dark:!bg-gray-800 !border-gray-200 dark:!border-gray-700 !shadow-md [&>button]:!bg-white dark:[&>button]:!bg-gray-800 [&>button]:!border-gray-200 dark:[&>button]:!border-gray-700 [&>button]:!text-gray-600 dark:[&>button]:!text-gray-300" />
          <MiniMap
            nodeColor={(n) => {
              if (hasMatch && n.data && (n.data as PersonNodeData).matched) return "#fbbf24";
              if (hasMatch && n.data && (n.data as PersonNodeData).dimmed) return "#d1d5db";
              return "#6366f1";
            }}
            className="!bg-white dark:!bg-gray-800 !border-gray-200 dark:!border-gray-700"
          />
        </ReactFlow>
      </div>

      <div ref={unallocatedRef} className="w-64 shrink-0 border-l border-gray-200 dark:border-gray-700 overflow-y-auto bg-gray-50/50 dark:bg-gray-800/50 p-4">
        <UnallocatedPanel
          persons={unallocated}
          matchedIds={matchedIds}
          onEdit={onEdit}
          onDragStart={onUnallocatedDragStart}
          isDropTarget={isOverUnallocated}
        />
      </div>

      {ghost && <GhostOverlay info={ghost} />}
    </div>
  );
}

export default function OrgFlow(props: OrgFlowInnerProps) {
  return (
    <ReactFlowProvider>
      <OrgFlowInner {...props} />
    </ReactFlowProvider>
  );
}
