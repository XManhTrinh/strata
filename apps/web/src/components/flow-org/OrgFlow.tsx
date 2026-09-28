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
  useNodesInitialized,
  ReactFlowProvider,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { Person, TreeNode, VacancyNode } from "@/lib/org-tree/types";
import { isDescendant } from "@/lib/org-tree/tree";
import { buildFlowLayout } from "@/lib/flow-org/layout";
import PersonNode, { type PersonNodeData } from "./PersonNode";
import GroupNode, { type GroupNodeData } from "./GroupNode";
import VacancyNodeComponent, { type VacancyNodeData } from "./VacancyNode";
import UnallocatedPanel from "./UnallocatedPanel";
import ContextMenu, { type ContextMenuTarget } from "./ContextMenu";

const nodeTypes = {
  person: PersonNode,
  group: GroupNode,
  vacancy: VacancyNodeComponent,
};
const DROP_DISTANCE = 100;
const DRAG_THRESHOLD = 5;
const HIGHLIGHT_CLASS = "flow-drop-target";

interface OrgFlowInnerProps {
  tree: TreeNode[];
  unallocated: Person[];
  persons: Person[];
  matchedIds: Set<string>;
  onEdit: (person: Person) => void;
  reparent: (
    draggedId: string,
    newParentId: string | null,
    moveWithChildren?: boolean
  ) => Promise<void>;
  onPendingDrop: (info: {
    draggedId: string;
    newParentId: string | null;
    personName: string;
    directReportCount: number;
  }) => void;
  onPendingGroupMove: (info: {
    parentId: string;
    targetId: string | null;
    persons: Person[];
  }) => void;
  onSkipNextFitView?: () => void;
  vacancies?: VacancyNode[];
  onContextMenuAction?: (action: string, targetId: string) => void;
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .slice(0, 2);
}

/**
 * Find the closest visible canvas node to the screen cursor.
 */
function findClosestNodeByScreen(
  draggedId: string,
  screenX: number,
  screenY: number,
  persons: Person[]
): string | null {
  const dragged = persons.find((p) => p.id === draggedId);

  // Check person cards inside groups
  const draggedGroupEl = document.querySelector(
    `[data-id="group-${draggedId}"]`
  );
  const personCards =
    document.querySelectorAll<HTMLElement>("[data-person-id]");
  for (const el of personCards) {
    if (draggedGroupEl && draggedGroupEl.contains(el)) continue;
    const pid = el.getAttribute("data-person-id");
    if (!pid || pid === draggedId) continue;
    if (dragged && dragged.parentId === pid) continue;
    if (isDescendant(persons, draggedId, pid)) continue;
    const rect = el.getBoundingClientRect();
    if (
      screenX >= rect.left &&
      screenX <= rect.right &&
      screenY >= rect.top &&
      screenY <= rect.bottom
    ) {
      return pid;
    }
  }

  const nodeEls = document.querySelectorAll<HTMLElement>(
    ".react-flow__node:not(.dragging)"
  );

  // Check standalone person nodes
  for (const el of nodeEls) {
    const rawId = el.getAttribute("data-id");
    if (!rawId || rawId.startsWith("group-") || rawId.startsWith("vacancy-")) continue;
    if (rawId === draggedId) continue;
    if (dragged && dragged.parentId === rawId) continue;
    if (isDescendant(persons, draggedId, rawId)) continue;
    const rect = el.getBoundingClientRect();
    if (
      screenX >= rect.left &&
      screenX <= rect.right &&
      screenY >= rect.top &&
      screenY <= rect.bottom
    ) {
      return rawId;
    }
  }

  // Check group nodes
  for (const el of nodeEls) {
    const rawId = el.getAttribute("data-id");
    if (!rawId || !rawId.startsWith("group-")) continue;
    const parentId = rawId.replace("group-", "");
    if (parentId === draggedId) continue;
    if (dragged && dragged.parentId === parentId) continue;
    if (isDescendant(persons, draggedId, parentId)) continue;
    const rect = el.getBoundingClientRect();
    if (
      screenX >= rect.left &&
      screenX <= rect.right &&
      screenY >= rect.top &&
      screenY <= rect.bottom
    ) {
      return parentId;
    }
  }

  // Closest by center distance
  let closest: string | null = null;
  let minDist = DROP_DISTANCE;
  for (const el of nodeEls) {
    const rawId = el.getAttribute("data-id");
    if (!rawId || rawId.startsWith("group-") || rawId.startsWith("vacancy-")) continue;
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
  onPendingDrop: OrgFlowInnerProps["onPendingDrop"]
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
    document
      .querySelector(`[data-id="${prevId}"]`)
      ?.classList.remove(HIGHLIGHT_CLASS);
    document
      .querySelector(`[data-id="group-${prevId}"]`)
      ?.classList.remove(HIGHLIGHT_CLASS);
    document
      .querySelector(`[data-person-id="${prevId}"]`)
      ?.classList.remove(HIGHLIGHT_CLASS);
  }
  if (nodeId) {
    document
      .querySelector(`[data-id="${nodeId}"]`)
      ?.classList.add(HIGHLIGHT_CLASS);
    document
      .querySelector(`[data-id="group-${nodeId}"]`)
      ?.classList.add(HIGHLIGHT_CLASS);
    document
      .querySelector(`[data-person-id="${nodeId}"]`)
      ?.classList.add(HIGHLIGHT_CLASS);
  }
}

interface OverlayInfo {
  person: Person;
  x: number;
  y: number;
  overCanvas: boolean;
  groupPersons?: Person[];
}

function GhostOverlay({ info, zoom }: { info: OverlayInfo; zoom: number }) {
  const scale = info.overCanvas ? zoom : 1;
  const isGroup = info.groupPersons && info.groupPersons.length > 0;

  return (
    <div
      className={`fixed pointer-events-none origin-center ${isGroup ? "w-auto" : "w-70"}`}
      style={{
        left: info.x,
        top: info.y,
        transform: `translate(-50%, -50%) rotate(2deg) scale(${scale})`,
        transition: "transform 300ms ease-in-out",
        zIndex: 9999,
      }}
    >
      {isGroup ? (
        <div className="bg-surface border-2 border-primary rounded-2xl px-4 py-3 shadow-2xl opacity-90">
          <p className="text-[10px] font-semibold text-surface-variant-foreground uppercase tracking-wider mb-3">
            Direct reports · {info.groupPersons!.length}
          </p>
          <div className="flex -space-x-2 items-center">
            {info.groupPersons!.slice(0, 10).map((p) => (
              <div
                key={p.id}
                className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-xs font-semibold text-indigo-700 dark:text-indigo-300 ring-2 ring-outline overflow-hidden"
              >
                {p.avatarUrl ? (
                  <img
                    src={p.avatarUrl}
                    alt={p.fullName}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  getInitials(p.fullName)
                )}
              </div>
            ))}
            {info.groupPersons!.length > 10 && (
              <span className="ml-2 text-xs font-semibold text-surface-variant-foreground">
                +{info.groupPersons!.length - 10}
              </span>
            )}
          </div>
        </div>
      ) : (
        <div className="bg-surface border-2 border-primary rounded-xl px-4 py-3 shadow-2xl opacity-90">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-xs font-semibold text-indigo-700 dark:text-indigo-300 shrink-0 overflow-hidden">
              {info.person.avatarUrl ? (
                <img
                  src={info.person.avatarUrl}
                  alt={info.person.fullName}
                  className="w-full h-full object-cover"
                />
              ) : (
                getInitials(info.person.fullName)
              )}
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-surface-foreground text-sm">
                {info.person.fullName}
              </p>
              <p className="text-surface-variant-foreground text-xs">
                {info.person.title}
              </p>
            </div>
          </div>
          {info.person.squads.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {info.person.squads.map((s) => (
                <span
                  key={s}
                  className="bg-indigo-100 dark:bg-indigo-900/40 text-indigo-700 dark:text-indigo-300 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
                >
                  {s}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function OrgFlowInner({
  tree,
  unallocated,
  persons,
  matchedIds,
  onEdit,
  reparent,
  onPendingDrop,
  onPendingGroupMove,
  onSkipNextFitView,
  vacancies,
  onContextMenuAction,
}: OrgFlowInnerProps) {
  const { fitView } = useReactFlow();
  const { zoom } = useViewport();
  const nodesInitialized = useNodesInitialized();
  const [ghost, setGhost] = useState<OverlayInfo | null>(null);
  const [isOverUnallocated, setIsOverUnallocated] = useState(false);
  const [contextMenu, setContextMenu] = useState<{
    x: number;
    y: number;
    target: ContextMenuTarget;
  } | null>(null);

  const defaultCollapsed = useMemo(() => {
    const ids = new Set<string>();
    function walk(nodes: TreeNode[], isRoot: boolean) {
      for (const n of nodes) {
        if (n.children.length > 0) {
          if (!isRoot) ids.add(n.person.id);
          walk(n.children, false);
        }
      }
    }
    walk(tree, true);
    return ids;
  }, [tree]);

  const [collapsedIds, setCollapsedIds] = useState<Set<string>>(new Set());

  const prevTreeRef = useRef(tree);
  if (prevTreeRef.current !== tree) {
    prevTreeRef.current = tree;
    setCollapsedIds(defaultCollapsed);
  }

  const initializedRef = useRef(false);
  if (!initializedRef.current && defaultCollapsed.size > 0) {
    initializedRef.current = true;
    setCollapsedIds(defaultCollapsed);
  }

  const [autoPanEnabled, setAutoPanEnabled] = useState(true);

  const dropTargetRef = useRef<string | null>(null);
  const unallocatedRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

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
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const prevCollapsedRef = useRef(collapsedIds);
  useEffect(() => {
    if (prevCollapsedRef.current !== collapsedIds) {
      prevCollapsedRef.current = collapsedIds;
      skipFitViewRef.current = true;
      onSkipNextFitView?.();
    }
  }, [collapsedIds, onSkipNextFitView]);

  const layout = useMemo(
    () =>
      buildFlowLayout(tree, matchedIds, collapsedIds, onEdit, onToggleCollapse, vacancies),
    [tree, matchedIds, collapsedIds, onEdit, onToggleCollapse, vacancies]
  );

  const [nodes, setNodes] = useState<Node[]>(layout.nodes);
  const [edges, setEdges] = useState<Edge[]>(layout.edges);

  const layoutRef = useRef(layout);

  // A signature of the current node set — changes whenever the tree changes
  // (e.g. entering/leaving focus). Used to trigger exactly one fitView per set.
  const layoutSignature = useMemo(
    () => layout.nodes.map((n) => n.id).join(","),
    [layout.nodes],
  );
  const fittedSignatureRef = useRef<string | null>(null);

  useEffect(() => {
    layoutRef.current = layout;
    const shouldSkip = skipFitViewRef.current;
    skipFitViewRef.current = false;
    setNodes(layout.nodes);
    setEdges(layout.edges);
    if (shouldSkip) {
      fittedSignatureRef.current = layoutSignature;
    }
  }, [layout, layoutSignature]);

  // Fit whenever ReactFlow reports the current node set as measured
  // (nodesInitialized flips true after a layout change). Guarded by the layout
  // signature so we fit once per distinct tree — reliable across the big→small
  // focus transition where a fixed timeout races the measurement.
  useEffect(() => {
    if (!nodesInitialized) return;
    if (fittedSignatureRef.current === layoutSignature) return;
    fittedSignatureRef.current = layoutSignature;
    // Wait two frames so ReactFlow has committed node measurements — this
    // matches the timing of the manual "fit view" control, which works.
    const raf1 = requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        fitView({ padding: 0.2, duration: 300, maxZoom: 1 });
      });
    });
    return () => cancelAnimationFrame(raf1);
  }, [nodesInitialized, layoutSignature, fitView]);

  const onNodesChange = useCallback((changes: NodeChange[]) => {
    setNodes((nds) => {
      const next = [...nds];
      for (const c of changes) {
        if (c.type === "position" && c.id) {
          const idx = next.findIndex((n) => n.id === c.id);
          if (idx === -1) continue;
          if (c.position)
            next[idx] = { ...next[idx], position: c.position };
          if ("dragging" in c)
            next[idx] = { ...next[idx], dragging: c.dragging };
        } else if (c.type === "dimensions" && c.id) {
          const idx = next.findIndex((n) => n.id === c.id);
          if (idx === -1) continue;
          if (c.dimensions)
            next[idx] = {
              ...next[idx],
              measured: {
                width: c.dimensions.width,
                height: c.dimensions.height,
              },
            };
        }
      }
      return next;
    });
  }, []);

  const isOverUnallocatedPanel = useCallback(
    (clientX: number, clientY: number) => {
      const el = unallocatedRef.current;
      if (!el) return false;
      const rect = el.getBoundingClientRect();
      return (
        clientX >= rect.left &&
        clientX <= rect.right &&
        clientY >= rect.top &&
        clientY <= rect.bottom
      );
    },
    []
  );

  const onNodeDragStart: OnNodeDrag = useCallback(
    ((e, node) => {
      const clientX = "clientX" in e ? e.clientX : (e as unknown as TouchEvent).touches?.[0]?.clientX ?? 0;
      const clientY = "clientY" in e ? e.clientY : (e as unknown as TouchEvent).touches?.[0]?.clientY ?? 0;
      if (node.id.startsWith("group-")) {
        const parentId = node.id.replace("group-", "");
        const parent = persons.find((p) => p.id === parentId);
        if (!parent) return;
        const groupData = node.data as GroupNodeData;
        setGhost({
          person: parent,
          x: clientX,
          y: clientY,
          overCanvas: true,
          groupPersons: groupData.persons,
        });
        return;
      }
      const data = node.data as PersonNodeData;
      setGhost({
        person: data.person,
        x: clientX,
        y: clientY,
        overCanvas: true,
      });
    }) as OnNodeDrag,
    [persons]
  );

  const onNodeDrag: OnNodeDrag = useCallback(
    ((e, node) => {
      const clientX = "clientX" in e ? e.clientX : (e as unknown as TouchEvent).touches?.[0]?.clientX ?? 0;
      const clientY = "clientY" in e ? e.clientY : (e as unknown as TouchEvent).touches?.[0]?.clientY ?? 0;
      setGhost((prev) =>
        prev ? { ...prev, x: clientX, y: clientY, overCanvas: true } : null
      );

      const overUnalloc = isOverUnallocatedPanel(clientX, clientY);
      setIsOverUnallocated(overUnalloc);
      setAutoPanEnabled(!overUnalloc);

      const target = findClosestNodeByScreen(
        node.id,
        clientX,
        clientY,
        persons
      );
      const prev = dropTargetRef.current;
      if (target !== prev) {
        setDomHighlight(target, prev);
        dropTargetRef.current = target;
      }
    }) as OnNodeDrag,
    [persons, isOverUnallocatedPanel]
  );

  const onNodeDragStop: OnNodeDrag = useCallback(
    ((e, node) => {
      const clientX = "clientX" in e ? e.clientX : (e as unknown as TouchEvent).changedTouches?.[0]?.clientX ?? 0;
      const clientY = "clientY" in e ? e.clientY : (e as unknown as TouchEvent).changedTouches?.[0]?.clientY ?? 0;
      setGhost(null);
      setIsOverUnallocated(false);
      setAutoPanEnabled(true);

      const overUnalloc = isOverUnallocatedPanel(clientX, clientY);
      const target = dropTargetRef.current;
      setDomHighlight(null, target);
      dropTargetRef.current = null;

      setNodes(layoutRef.current.nodes);
      setEdges(layoutRef.current.edges);

      const isGroup = node.id.startsWith("group-");
      const draggedId = isGroup ? node.id.replace("group-", "") : node.id;

      if (isGroup && (overUnalloc || target)) {
        if (target === draggedId) return;
        const groupData = node.data as GroupNodeData;
        setSkipFitView();
        onPendingGroupMove({
          parentId: draggedId,
          targetId: overUnalloc ? null : target,
          persons: groupData.persons,
        });
      } else if (overUnalloc) {
        setSkipFitView();
        triggerReparent(draggedId, null, persons, reparent, onPendingDrop);
      } else if (target) {
        setSkipFitView();
        triggerReparent(draggedId, target, persons, reparent, onPendingDrop);
      }
    }) as OnNodeDrag,
    [
      persons,
      reparent,
      onPendingDrop,
      onPendingGroupMove,
      setSkipFitView,
      isOverUnallocatedPanel,
    ]
  );

  // Context menu handler
  const onNodeContextMenu = useCallback(
    (event: React.MouseEvent, node: Node) => {
      event.preventDefault();
      event.stopPropagation();

      if (node.type === "vacancy") {
        const vacancyData = node.data as VacancyNodeData;
        setContextMenu({
          x: event.clientX,
          y: event.clientY,
          target: {
            type: "vacancy",
            vacancyId: vacancyData.vacancy.id,
            vacancyTitle: vacancyData.vacancy.title,
          },
        });
      } else if (node.type === "person") {
        const personData = node.data as PersonNodeData;
        setContextMenu({
          x: event.clientX,
          y: event.clientY,
          target: {
            type: "person",
            personId: personData.person.id,
            personName: personData.person.fullName,
          },
        });
      }
    },
    []
  );

  // Sidebar (unallocated) drag
  const onUnallocatedDragStart = useCallback(
    (person: Person, e: React.MouseEvent) => {
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
    },
    []
  );

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      const drag = sidebarDragRef.current;
      if (!drag) return;

      if (!drag.active) {
        const dx = e.clientX - drag.startX;
        const dy = e.clientY - drag.startY;
        if (Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD)
          return;
        drag.active = true;
        if (drag.sourceEl) drag.sourceEl.style.opacity = "0.3";
        document.body.style.userSelect = "none";
        document.body.style.cursor = "grabbing";

        setGhost({
          person: drag.person,
          x: e.clientX,
          y: e.clientY,
          overCanvas: false,
        });
      } else {
        const isOverUnalloc =
          unallocatedRef.current &&
          (() => {
            const rect = unallocatedRef.current!.getBoundingClientRect();
            return (
              e.clientX >= rect.left &&
              e.clientX <= rect.right &&
              e.clientY >= rect.top &&
              e.clientY <= rect.bottom
            );
          })();
        setGhost((prev) =>
          prev
            ? { ...prev, x: e.clientX, y: e.clientY, overCanvas: !isOverUnalloc }
            : null
        );
      }

      const overUnalloc =
        unallocatedRef.current &&
        (() => {
          const rect = unallocatedRef.current!.getBoundingClientRect();
          return (
            e.clientX >= rect.left &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom
          );
        })();
      const target = overUnalloc
        ? null
        : findClosestNodeByScreen(
            drag.id,
            e.clientX,
            e.clientY,
            personsRef.current
          );
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

      const overUnalloc =
        unallocatedRef.current &&
        (() => {
          const rect = unallocatedRef.current!.getBoundingClientRect();
          return (
            e.clientX >= rect.left &&
            e.clientX <= rect.right &&
            e.clientY >= rect.top &&
            e.clientY <= rect.bottom
          );
        })();

      if (drag.active && target && !overUnalloc) {
        setSkipFitView();
        triggerReparent(
          drag.id,
          target,
          personsRef.current,
          reparentRef.current,
          onPendingDropRef.current
        );
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

  // Native mousedown on group person cards
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    function onMouseDown(e: MouseEvent) {
      if ((e.target as HTMLElement).closest("button")) return;

      const personCard = (e.target as HTMLElement).closest<HTMLElement>(
        "[data-person-id]"
      );
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

  const onEdgeDoubleClick = useCallback(
    (_: React.MouseEvent | React.TouchEvent, edge: Edge) => {
      setSkipFitView();
      triggerReparent(edge.target, null, persons, reparent, onPendingDrop);
    },
    [persons, reparent, onPendingDrop, setSkipFitView]
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
          onNodeContextMenu={onNodeContextMenu}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.2, maxZoom: 1 }}
          minZoom={0.1}
          maxZoom={2}
          proOptions={{ hideAttribution: true }}
          className="bg-surface-container-lowest dark:bg-surface-container"
          autoPanOnNodeDrag={autoPanEnabled}
          edgesFocusable={false}
          edgesReconnectable={false}
          nodesConnectable={false}
        >
          <Background gap={20} size={1} />
          <Controls />
          <MiniMap
            nodeColor={(n) => {
              if (hasMatch && n.data && (n.data as PersonNodeData).matched)
                return "#fbbf24";
              if (hasMatch && n.data && (n.data as PersonNodeData).dimmed)
                return "#d1d5db";
              return "#6366f1";
            }}
          />
        </ReactFlow>
      </div>

      <div
        ref={unallocatedRef}
        className="w-80 shrink-0 border-l border-outline-variant overflow-y-auto bg-surface-container-lowest/50 dark:bg-surface-container/50 p-4"
      >
        <UnallocatedPanel
          persons={unallocated}
          matchedIds={matchedIds}
          onEdit={onEdit}
          onDragStart={onUnallocatedDragStart}
          isDropTarget={isOverUnallocated}
        />
      </div>

      {ghost && <GhostOverlay info={ghost} zoom={zoom} />}

      {contextMenu && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          target={contextMenu.target}
          onClose={() => setContextMenu(null)}
          onAction={(action, targetId) => {
            console.log("Context menu action:", action, targetId);
            onContextMenuAction?.(action, targetId);
          }}
        />
      )}
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
