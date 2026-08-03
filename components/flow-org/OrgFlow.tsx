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
  useViewport,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Person, TreeNode } from "@/lib/org-tree/types";
import { isDescendant } from "@/lib/org-tree/tree";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { buildFlowLayout } from "@/lib/flow-org/layout";
import PersonNode, { type PersonNodeData } from "./PersonNode";
import GroupNode from "./GroupNode";
import UnallocatedPanel from "./UnallocatedPanel";

const nodeTypes = { person: PersonNode, group: GroupNode };
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
  onPendingGroupMove: (info: { parentId: string; targetId: string | null; persons: Person[] }) => void;
  onSkipNextFitView?: () => void;
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
  const dragged = persons.find((p) => p.id === draggedId);

  // First: check if cursor is over a person card inside a group ([data-person-id])
  // Skip cards inside the dragged group node
  const draggedGroupEl = document.querySelector(`[data-id="group-${draggedId}"]`);
  const personCards = document.querySelectorAll<HTMLElement>("[data-person-id]");
  for (const el of personCards) {
    if (draggedGroupEl && draggedGroupEl.contains(el)) continue;
    const pid = el.getAttribute("data-person-id");
    if (!pid || pid === draggedId) continue;
    if (dragged && dragged.parentId === pid) continue;
    if (isDescendant(persons, draggedId, pid)) continue;
    const rect = el.getBoundingClientRect();
    if (screenX >= rect.left && screenX <= rect.right && screenY >= rect.top && screenY <= rect.bottom) {
      return pid;
    }
  }

  const nodeEls = document.querySelectorAll<HTMLElement>(".react-flow__node:not(.dragging)");

  // Second: check if cursor is directly over a standalone person node
  for (const el of nodeEls) {
    const rawId = el.getAttribute("data-id");
    if (!rawId || rawId.startsWith("group-")) continue;
    if (rawId === draggedId) continue;
    if (dragged && dragged.parentId === rawId) continue;
    if (isDescendant(persons, draggedId, rawId)) continue;
    const rect = el.getBoundingClientRect();
    if (screenX >= rect.left && screenX <= rect.right && screenY >= rect.top && screenY <= rect.bottom) {
      return rawId;
    }
  }

  // Third: check if cursor is inside any valid group
  for (const el of nodeEls) {
    const rawId = el.getAttribute("data-id");
    if (!rawId || !rawId.startsWith("group-")) continue;
    const parentId = rawId.replace("group-", "");
    if (parentId === draggedId) continue;
    if (dragged && dragged.parentId === parentId) continue;
    if (isDescendant(persons, draggedId, parentId)) continue;
    const rect = el.getBoundingClientRect();
    if (screenX >= rect.left && screenX <= rect.right && screenY >= rect.top && screenY <= rect.bottom) {
      return parentId;
    }
  }

  // Fourth: closest standalone person node by center distance
  let closest: string | null = null;
  let minDist = DROP_DISTANCE;
  for (const el of nodeEls) {
    const rawId = el.getAttribute("data-id");
    if (!rawId || rawId.startsWith("group-")) continue;
    if (rawId === draggedId) continue;
    if (dragged && dragged.parentId === rawId) continue;
    if (isDescendant(persons, draggedId, rawId)) continue;

    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = cx - screenX;
    const dy = cy - screenY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist < minDist) {
      minDist = dist;
      closest = rawId;
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
  const dragged = persons.find((p) => p.id === draggedId);
  if (!dragged || dragged.parentId === newParentId) return;

  const directReports = persons.filter((p) => p.parentId === draggedId);
  if (directReports.length > 0) {
    onPendingDrop({
      draggedId,
      newParentId,
      personName: dragged.fullName,
      directReportCount: directReports.length,
    });
  } else {
    void reparent(draggedId, newParentId);
  }
}

function setDomHighlight(nodeId: string | null, prevId: string | null) {
  if (prevId) {
    document.querySelector(`[data-id="${prevId}"]`)?.classList.remove(HIGHLIGHT_CLASS);
    document.querySelector(`[data-id="group-${prevId}"]`)?.classList.remove(HIGHLIGHT_CLASS);
    document.querySelector(`[data-person-id="${prevId}"]`)?.classList.remove(HIGHLIGHT_CLASS);
  }
  if (nodeId) {
    document.querySelector(`[data-id="${nodeId}"]`)?.classList.add(HIGHLIGHT_CLASS);
    document.querySelector(`[data-id="group-${nodeId}"]`)?.classList.add(HIGHLIGHT_CLASS);
    document.querySelector(`[data-person-id="${nodeId}"]`)?.classList.add(HIGHLIGHT_CLASS);
  }
}

interface OverlayInfo { person: Person; x: number; y: number; overCanvas: boolean; groupPersons?: Person[] }

function GhostOverlay({ info, zoom }: { info: OverlayInfo; zoom: number }) {
  const scale = info.overCanvas ? zoom : 1;
  const isGroup = info.groupPersons && info.groupPersons.length > 0;

  return (
    <div
      className={`fixed pointer-events-none origin-center ${isGroup ? 'w-auto' : 'w-70'}`}
      style={{
        left: info.x,
        top: info.y,
        transform: `translate(-50%, -50%) rotate(2deg) scale(${scale})`,
        transition: "transform 300ms ease-in-out",
        zIndex: 9999,
      }}
    >
      {isGroup ? (
        <div className="bg-white dark:bg-gray-800 border-2 border-blue-400 rounded-2xl px-4 py-3 shadow-2xl opacity-90">
          <p className="text-[10px] font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider mb-3">
            Direct reports · {info.groupPersons!.length}
          </p>
          <div className="flex -space-x-2 items-center">
            {info.groupPersons!.slice(0, 10).map((p) => (
              <Avatar key={p.id} className="ring-2 ring-white dark:ring-gray-800">
                <AvatarImage src={p.avatarUrl} alt={p.fullName} />
                <AvatarFallback>{p.fullName.split(" ").map(w => w[0]).join("").slice(0, 2)}</AvatarFallback>
              </Avatar>
            ))}
            {info.groupPersons!.length > 10 && (
              <span className="ml-2 text-xs font-semibold text-gray-500 dark:text-gray-400">+{info.groupPersons!.length - 10}</span>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-white dark:bg-gray-800 border-2 border-blue-400 rounded-xl px-4 py-3 shadow-2xl opacity-90">
          <div className="flex items-center gap-2">
            <Avatar>
              <AvatarImage src={info.person.avatarUrl} alt={info.person.fullName} />
              <AvatarFallback>{info.person.fullName.split(" ").map(w => w[0]).join("").slice(0, 2)}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 dark:text-gray-100 text-sm">{info.person.fullName}</p>
              <p className="text-gray-500 dark:text-gray-400 text-xs">{info.person.title}</p>
            </div>
          </div>
          {info.person.squads.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {info.person.squads.map((s) => (
                <span key={s} className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-medium px-1.5 py-0.5 rounded-full">{s}</span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OrgFlowInner({
  tree, unallocated, persons, matchedIds, onEdit, reparent, onPendingDrop, onPendingGroupMove, onSkipNextFitView,
}: OrgFlowInnerProps) {
  const { fitView } = useReactFlow();
  const { zoom } = useViewport();
  const [ghost, setGhost] = useState<OverlayInfo | null>(null);
  const [isOverUnallocated, setIsOverUnallocated] = useState(false);
  // Start with all parent nodes collapsed
  const defaultCollapsed = useMemo(() => {
    const ids = new Set<string>();
    function walk(nodes: TreeNode[]) {
      for (const n of nodes) {
        if (n.children.length > 0) {
          ids.add(n.person.id);
          walk(n.children);
        }
      }
    }
    walk(tree);
    return ids;
  }, [tree]);

  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  // Reset collapsed state when tree changes (e.g. squad filter change)
  const prevTreeRef = useRef(tree);
  if (prevTreeRef.current !== tree) {
    prevTreeRef.current = tree;
    setCollapsedIds(defaultCollapsed);
  }

  // Initialize on first render
  const initializedRef = useRef(false);
  if (!initializedRef.current && defaultCollapsed.size > 0) {
    initializedRef.current = true;
    setCollapsedIds(defaultCollapsed);
  }

  const [autoPanEnabled, setAutoPanEnabled] = useState(true);

  const dropTargetRef = useRef<string | null>(null);
  const unallocatedRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
  const reparentRef = useRef(reparent);
  const onPendingDropRef = useRef(onPendingDrop);

  useEffect(() => {
    personsRef.current = persons;
    reparentRef.current = reparent;
    onPendingDropRef.current = onPendingDrop;
  });

  const skipFitViewRef = useRef(false);

  const setSkipFitView = useCallback(() => {
    skipFitViewRef.current = true;
    onSkipNextFitView?.();
  }, [onSkipNextFitView]);

  const onToggleCollapse = useCallback((id: string) => {
    setCollapsedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) { next.delete(id); } else { next.add(id); }
      return next;
    });
  }, []);

  // Skip fitView when collapsing/expanding
  const prevCollapsedRef = useRef(collapsedIds);
  useEffect(() => {
    if (prevCollapsedRef.current !== collapsedIds) {
      prevCollapsedRef.current = collapsedIds;
      skipFitViewRef.current = true;
      onSkipNextFitView?.();
    }
  }, [collapsedIds, onSkipNextFitView]);

  const layout = useMemo(
    () => buildFlowLayout(tree, matchedIds, collapsedIds, onEdit, onToggleCollapse),
    [tree, matchedIds, collapsedIds, onEdit, onToggleCollapse],
  );

  const [nodes, setNodes] = useState<Node[]>(layout.nodes);
  const [edges, setEdges] = useState<Edge[]>(layout.edges);

  const layoutRef = useRef(layout);

  // Sync layout into state when it changes
  useEffect(() => {
    layoutRef.current = layout;
    const shouldSkip = skipFitViewRef.current;
    skipFitViewRef.current = false;
    setNodes(layout.nodes); // eslint-disable-line react-hooks/set-state-in-effect
    setEdges(layout.edges);
    if (!shouldSkip) {
      setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 50);
    }
  }, [layout, fitView, setNodes, setEdges]);

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
        } else if (c.type === "dimensions" && c.id) {
          const idx = next.findIndex((n) => n.id === c.id);
          if (idx === -1) continue;
          if (c.dimensions) next[idx] = { ...next[idx], measured: { width: c.dimensions.width, height: c.dimensions.height } };
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
      if (node.id.startsWith("group-")) {
        const parentId = node.id.replace("group-", "");
        const parent = persons.find((p) => p.id === parentId);
        if (!parent) return;
        const groupData = node.data as import("./GroupNode").GroupNodeData;
        setGhost({ person: parent, x: e.clientX, y: e.clientY, overCanvas: true, groupPersons: groupData.persons });
        return;
      }
      const data = node.data as PersonNodeData;
      setGhost({ person: data.person, x: e.clientX, y: e.clientY, overCanvas: true });
    },
    [persons],
  );

  const onNodeDrag: OnNodeDrag = useCallback(
    (e: React.MouseEvent, node: Node) => {
      setGhost((prev) => prev ? { ...prev, x: e.clientX, y: e.clientY, overCanvas: true } : null);

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
      setIsOverUnallocated(false);
      setAutoPanEnabled(true);

      const overUnalloc = isOverUnallocatedPanel(e.clientX, e.clientY);
      const target = dropTargetRef.current;
      setDomHighlight(null, target);
      dropTargetRef.current = null;

      // Snap back
      setNodes(layoutRef.current.nodes);
      setEdges(layoutRef.current.edges);

      // Resolve the actual person ID for group nodes
      const isGroup = node.id.startsWith("group-");
      const draggedId = isGroup ? node.id.replace("group-", "") : node.id;

      if (isGroup && (overUnalloc || target)) {
        // Don't move group under the same parent
        if (target === draggedId) return;
        const groupData = node.data as import("./GroupNode").GroupNodeData;
        setSkipFitView();
        onPendingGroupMove({ parentId: draggedId, targetId: overUnalloc ? null : target, persons: groupData.persons });
      } else if (overUnalloc) {
        setSkipFitView();
        triggerReparent(draggedId, null, persons, reparent, onPendingDrop);
      } else if (target) {
        setSkipFitView();
        triggerReparent(draggedId, target, persons, reparent, onPendingDrop);
      }
    },
    [persons, reparent, onPendingDrop, onPendingGroupMove, setSkipFitView, setNodes, setEdges, isOverUnallocatedPanel],
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

        // Use fixed size ghost
        setGhost({
          person: drag.person,
          x: e.clientX,
          y: e.clientY,
          overCanvas: false,
        });
      } else {
        // Check if over unallocated panel
        const isOverUnalloc = unallocatedRef.current && (() => {
          const rect = unallocatedRef.current!.getBoundingClientRect();
          return e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
        })();
        setGhost((prev) => prev ? { ...prev, x: e.clientX, y: e.clientY, overCanvas: !isOverUnalloc } : null);
      }

      // Highlight closest canvas node (clear if over unallocated panel)
      const overUnalloc = unallocatedRef.current && (() => {
        const rect = unallocatedRef.current!.getBoundingClientRect();
        return e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      })();
      const target = overUnalloc ? null : findClosestNodeByScreen(drag.id, e.clientX, e.clientY, personsRef.current);
      const prev = dropTargetRef.current;
      if (target !== prev) {
        setDomHighlight(target, prev);
        dropTargetRef.current = target;
      }
    }

    function onMouseUp(e: MouseEvent) {
      const drag = sidebarDragRef.current;
      if (!drag) return;

      if (drag.sourceEl) drag.sourceEl.style.opacity = "";
      document.body.style.userSelect = "";
      document.body.style.cursor = "";
      setGhost(null);

      const target = dropTargetRef.current;
      setDomHighlight(null, target);
      dropTargetRef.current = null;

      // Don't reparent if dropped back on the unallocated panel
      const overUnalloc = unallocatedRef.current && (() => {
        const rect = unallocatedRef.current!.getBoundingClientRect();
        return e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;
      })();

      if (drag.active && target && !overUnalloc) {
        setSkipFitView();
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
  }, [setSkipFitView]);

  // --- Native mousedown on group person cards ---
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function onMouseDown(e: MouseEvent) {
      if ((e.target as HTMLElement).closest("button")) return;

      // Check if clicked on a person card inside a group
      const personCard = (e.target as HTMLElement).closest<HTMLElement>("[data-person-id]");
      if (!personCard) return;

      const personId = personCard.getAttribute("data-person-id");
      if (!personId) return;

      const person = personsRef.current.find((p) => p.id === personId);
      if (!person) return;

      e.stopPropagation();
      sidebarDragRef.current = {
        id: person.id,
        person,
        startX: e.clientX,
        startY: e.clientY,
        active: false,
        sourceEl: personCard,
      };
    }

    container.addEventListener("mousedown", onMouseDown, true);
    return () => container.removeEventListener("mousedown", onMouseDown, true);
  }, []);

  // --- Edge double-click ---

  const onEdgeDoubleClick = useCallback(
    (_: React.MouseEvent, edge: Edge) => {
      setSkipFitView();
      triggerReparent(edge.target, null, persons, reparent, onPendingDrop);
    },
    [persons, reparent, onPendingDrop, setSkipFitView],
  );

  const hasMatch = matchedIds.size > 0;

  return (
    <div ref={containerRef} className="flex h-full relative">
      <style>{`
        .react-flow__node.${HIGHLIGHT_CLASS}:not([data-id^="group-"]) > div {
          box-shadow: 0 0 0 2px #60a5fa, 0 4px 12px rgba(96,165,250,0.3) !important;
          border-color: #60a5fa !important;
          background: #eff6ff !important;
          transform: scale(1.05);
        }
        .dark .react-flow__node.${HIGHLIGHT_CLASS}:not([data-id^="group-"]) > div {
          background: rgba(30,58,138,0.3) !important;
        }
        .react-flow__node[data-id^="group-"].${HIGHLIGHT_CLASS} > div {
          box-shadow: 0 0 0 2px #60a5fa, 0 4px 12px rgba(96,165,250,0.3) !important;
          border-color: #60a5fa !important;
        }
        [data-person-id].${HIGHLIGHT_CLASS} {
          box-shadow: 0 0 0 2px #60a5fa, 0 4px 12px rgba(96,165,250,0.3) !important;
          border-color: #60a5fa !important;
          background: #eff6ff !important;
          transform: scale(1.05);
        }
        .dark [data-person-id].${HIGHLIGHT_CLASS} {
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
          <Background gap={20} size={1} className="bg-gray-50! dark:bg-gray-900!" />
          <Controls className="bg-white! dark:bg-gray-800! border-gray-200! dark:border-gray-700! shadow-md! [&>button]:bg-white! dark:[&>button]:bg-gray-800! [&>button]:border-gray-200! dark:[&>button]:border-gray-700! [&>button]:text-gray-600! dark:[&>button]:text-gray-300!" />
          <MiniMap
            nodeColor={(n) => {
              if (hasMatch && n.data && (n.data as PersonNodeData).matched) return "#fbbf24";
              if (hasMatch && n.data && (n.data as PersonNodeData).dimmed) return "#d1d5db";
              return "#6366f1";
            }}
            className="bg-white! dark:bg-gray-800! border-gray-200! dark:border-gray-700!"
          />
        </ReactFlow>
      </div>

      <div ref={unallocatedRef} className="w-80 shrink-0 border-l border-gray-200 dark:border-gray-700 overflow-y-auto bg-gray-50/50 dark:bg-gray-800/50 p-4">
        <UnallocatedPanel
          persons={unallocated}
          matchedIds={matchedIds}
          onEdit={onEdit}
          onDragStart={onUnallocatedDragStart}
          isDropTarget={isOverUnallocated}
        />
      </div>

      {ghost && <GhostOverlay info={ghost} zoom={zoom} />}
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
