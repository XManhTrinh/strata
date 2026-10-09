"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ReactFlow,
  Background,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  ReactFlowProvider,
  useReactFlow,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import type { OrganizationUnit } from "@/services";
import OrgUnitNode, { type OrgUnitNodeData } from "./OrgUnitNode";
import OrgUnitGroupNode, { type OrgUnitGroupNodeData } from "./OrgUnitGroupNode";

// ─── Layout constants ───────────────────────────────────────────────────────────

const NODE_W = 224;   // single card width (w-56 = 224px)
const NODE_H = 80;
const GAP_X = 32;
const GAP_Y = 80;

// Group card sizing
const GROUP_COLS = 2;
const GROUP_CARD_W = 200;
const GROUP_GAP = 8;
const GROUP_PAD = 8;
const GROUP_HEADER = 32;
const GROUP_CARD_H = 52;

// ─── Node types ─────────────────────────────────────────────────────────────────

const nodeTypes = {
  orgUnit: OrgUnitNode,
  orgUnitGroup: OrgUnitGroupNode,
};

// ─── Tree → Flow layout ────────────────────────────────────────────────────────

interface LayoutResult {
  width: number;
  height: number;
  nodes: Node[];
  edges: Edge[];
}

interface LayoutCallbacks {
  onEdit: (unit: OrganizationUnit) => void;
  onAddChild: (parentId: string) => void;
  onArchive: (id: string) => void;
}

function countChildren(unit: OrganizationUnit): number {
  return (unit.children ?? []).length;
}

function isLeaf(unit: OrganizationUnit): boolean {
  return (unit.children ?? []).length === 0;
}

function estimateGroupSize(count: number): { w: number; h: number } {
  const rows = Math.ceil(count / GROUP_COLS);
  const w = GROUP_COLS * GROUP_CARD_W + (GROUP_COLS - 1) * GROUP_GAP + GROUP_PAD * 2;
  const h = GROUP_HEADER + rows * GROUP_CARD_H + (rows - 1) * GROUP_GAP + GROUP_PAD * 2;
  return { w, h };
}

/**
 * Recursively lays out an org-unit subtree, centering each parent
 * above its children. Groups leaf siblings into a 2-column card
 * when there are 3 or more.
 */
function layoutSubtree(
  unit: OrganizationUnit,
  x: number,
  y: number,
  cb: LayoutCallbacks,
): LayoutResult {
  const children = unit.children ?? [];

  // Leaf node
  if (children.length === 0) {
    return {
      width: NODE_W,
      height: NODE_H,
      nodes: [{
        id: unit.id,
        type: "orgUnit",
        position: { x, y },
        data: { unit, childCount: 0, ...cb } satisfies OrgUnitNodeData,
      }],
      edges: [],
    };
  }

  // Separate leaves from branches
  const leaves = children.filter(isLeaf);
  const branches = children.filter((c) => !isLeaf(c));

  const childY = y + NODE_H + GAP_Y;
  const segments: LayoutResult[] = [];

  // Layout branches as individual subtrees
  for (const branch of branches) {
    segments.push(layoutSubtree(branch, 0, childY, cb));
  }

  // Group leaves into a 2-col card if ≥3, otherwise render individually
  if (leaves.length >= 3) {
    const { w, h } = estimateGroupSize(leaves.length);
    const groupId = `group-${unit.id}`;
    segments.push({
      width: w,
      height: h,
      nodes: [{
        id: groupId,
        type: "orgUnitGroup",
        position: { x: 0, y: childY },
        style: { width: w },
        data: { units: leaves, ...cb } satisfies OrgUnitGroupNodeData,
      }],
      edges: [],
    });
  } else {
    for (const leaf of leaves) {
      segments.push({
        width: NODE_W,
        height: NODE_H,
        nodes: [{
          id: leaf.id,
          type: "orgUnit",
          position: { x: 0, y: childY },
          data: { unit: leaf, childCount: 0, ...cb } satisfies OrgUnitNodeData,
        }],
        edges: [],
      });
    }
  }

  // Compute total width and position segments
  let totalChildWidth = 0;
  for (let i = 0; i < segments.length; i++) {
    totalChildWidth += segments[i].width;
    if (i < segments.length - 1) totalChildWidth += GAP_X;
  }

  const subtreeWidth = Math.max(NODE_W, totalChildWidth);
  let childOffsetX = x + (subtreeWidth - totalChildWidth) / 2;
  let maxChildHeight = 0;

  const allNodes: Node[] = [];
  const allEdges: Edge[] = [];

  for (const seg of segments) {
    for (const node of seg.nodes) {
      allNodes.push({
        ...node,
        position: { x: node.position.x + childOffsetX, y: node.position.y },
      });
    }
    allEdges.push(...seg.edges);

    // Edge from parent to this segment's root
    const targetId = seg.nodes[0].id;
    allEdges.push({
      id: `e-${unit.id}-${targetId}`,
      source: unit.id,
      target: targetId,
      type: "smoothstep",
      style: { stroke: "hsl(var(--outline-variant))", strokeWidth: 1.5 },
    });

    if (seg.height > maxChildHeight) maxChildHeight = seg.height;
    childOffsetX += seg.width + GAP_X;
  }

  // Center parent above children
  const parentX = x + (subtreeWidth - NODE_W) / 2;
  allNodes.unshift({
    id: unit.id,
    type: "orgUnit",
    position: { x: parentX, y },
    data: { unit, childCount: countChildren(unit), ...cb } satisfies OrgUnitNodeData,
  });

  return {
    width: subtreeWidth,
    height: NODE_H + GAP_Y + maxChildHeight,
    nodes: allNodes,
    edges: allEdges,
  };
}

function buildOrgUnitFlowLayout(
  roots: OrganizationUnit[],
  cb: LayoutCallbacks,
): { nodes: Node[]; edges: Edge[] } {
  const allNodes: Node[] = [];
  const allEdges: Edge[] = [];
  let offsetX = 0;

  for (const root of roots) {
    const result = layoutSubtree(root, offsetX, 0, cb);
    allNodes.push(...result.nodes);
    allEdges.push(...result.edges);
    offsetX += result.width + GAP_X * 2;
  }

  return { nodes: allNodes, edges: allEdges };
}

// ─── Inner component ────────────────────────────────────────────────────────────

interface OrgUnitFlowInnerProps {
  tree: OrganizationUnit[];
  onEdit: (unit: OrganizationUnit) => void;
  onAddChild: (parentId: string) => void;
  onArchive: (id: string) => void;
}

function OrgUnitFlowInner({ tree, onEdit, onAddChild, onArchive }: OrgUnitFlowInnerProps) {
  const { fitView } = useReactFlow();

  const layout = useMemo(
    () => buildOrgUnitFlowLayout(tree, { onEdit, onAddChild, onArchive }),
    [tree, onEdit, onAddChild, onArchive],
  );

  const [nodes, setNodes] = useState<Node[]>(layout.nodes);
  const [edges, setEdges] = useState<Edge[]>(layout.edges);

  useEffect(() => {
    setNodes(layout.nodes);
    setEdges(layout.edges);
    setTimeout(() => fitView({ padding: 0.15, duration: 300 }), 50);
  }, [layout, fitView]);

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      fitView
      fitViewOptions={{ padding: 0.15 }}
      minZoom={0.1}
      maxZoom={2}
      proOptions={{ hideAttribution: true }}
      className="bg-surface"
    >
      <Background gap={20} size={1} className="opacity-30" />
      <Controls
        showInteractive={false}
        className="bg-surface-container! border-outline-variant! rounded-xl! shadow-md! [&>button]:bg-surface! [&>button]:border-outline-variant! [&>button]:text-on-surface! [&>button:hover]:bg-on-surface/8!"
      />
      <MiniMap
        className="bg-surface-container! border-outline-variant! rounded-xl!"
        maskColor="hsl(var(--surface) / 0.7)"
        nodeColor="hsl(var(--primary) / 0.3)"
      />
    </ReactFlow>
  );
}

// ─── Public component ───────────────────────────────────────────────────────────

export interface OrgUnitFlowProps {
  tree: OrganizationUnit[];
  onEdit: (unit: OrganizationUnit) => void;
  onAddChild: (parentId: string) => void;
  onArchive: (id: string) => void;
  className?: string;
}

export function OrgUnitFlow({ tree, onEdit, onAddChild, onArchive, className }: OrgUnitFlowProps) {
  const stableOnEdit = useCallback((u: OrganizationUnit) => onEdit(u), [onEdit]);
  const stableOnAddChild = useCallback((id: string) => onAddChild(id), [onAddChild]);
  const stableOnArchive = useCallback((id: string) => onArchive(id), [onArchive]);

  return (
    <div className={`w-full rounded-xl border border-outline-variant overflow-hidden ${className ?? "flex-1 min-h-0"}`}>
      <ReactFlowProvider>
        <OrgUnitFlowInner
          tree={tree}
          onEdit={stableOnEdit}
          onAddChild={stableOnAddChild}
          onArchive={stableOnArchive}
        />
      </ReactFlowProvider>
    </div>
  );
}
