import { type Node, type Edge } from "@xyflow/react";
import { Person, TreeNode } from "@/lib/org-tree/types";
import type { PersonNodeData } from "@/components/flow-org/PersonNode";
import type { GroupNodeData } from "@/components/flow-org/GroupNode";

const NODE_W = 280;
const NODE_H = 90;
const GAP_X = 24;
const GAP_Y = 100;
const COLS = 2;
const GROUP_CARD_W = 280;
const GROUP_CARD_H = 90;
const GROUP_GAP = 16;
const GROUP_PAD = 20;
const GROUP_HEADER = 40;

interface LayoutOptions {
  matchedIds: Set<string>;
  collapsedIds: Set<string>;
  onEdit: (p: Person) => void;
  onToggleCollapse: (id: string) => void;
}

interface SubtreeResult {
  width: number;
  height: number;
  nodes: Node[];
  edges: Edge[];
}

function makeData(
  p: Person,
  childCount: number,
  collapsed: boolean,
  opts: LayoutOptions,
): PersonNodeData {
  const hasMatch = opts.matchedIds.size > 0;
  return {
    person: p,
    matched: hasMatch && opts.matchedIds.has(p.id),
    dimmed: hasMatch && !opts.matchedIds.has(p.id),
    onEdit: opts.onEdit,
    childCount,
    collapsed,
    onToggleCollapse: opts.onToggleCollapse,
  };
}

function isLeaf(child: TreeNode, collapsedIds: Set<string>): boolean {
  return child.children.length === 0 || collapsedIds.has(child.person.id);
}

function estimateGroupSize(count: number): { w: number; h: number } {
  const rows = Math.ceil(count / COLS);
  const w = COLS * GROUP_CARD_W + (COLS - 1) * GROUP_GAP + GROUP_PAD * 2;
  const h = GROUP_HEADER + rows * GROUP_CARD_H + (rows - 1) * GROUP_GAP + GROUP_PAD * 2;
  return { w, h };
}

function layoutSubtree(
  node: TreeNode,
  x: number,
  y: number,
  opts: LayoutOptions,
): SubtreeResult {
  const isCollapsed = opts.collapsedIds.has(node.person.id);
  const childCount = node.children.length;

  if (childCount === 0 || isCollapsed) {
    return {
      width: NODE_W,
      height: NODE_H,
      nodes: [{ id: node.person.id, type: "person", position: { x, y }, data: makeData(node.person, childCount, isCollapsed, opts) }],
      edges: [],
    };
  }

  return layoutMixed(node, x, y, opts);
}

function layoutMixed(
  node: TreeNode,
  x: number,
  y: number,
  opts: LayoutOptions,
): SubtreeResult {
  const leaves = node.children.filter((c) => isLeaf(c, opts.collapsedIds));
  const branches = node.children.filter((c) => !isLeaf(c, opts.collapsedIds));

  const childY = y + NODE_H + GAP_Y;
  const segments: SubtreeResult[] = [];

  for (const branch of branches) {
    segments.push(layoutSubtree(branch, 0, childY, opts));
  }

  if (leaves.length >= 2) {
    segments.push(buildGroupSegment(node.person.id, leaves, childY, opts));
  } else {
    for (const leaf of leaves) {
      segments.push({
        width: NODE_W,
        height: NODE_H,
        nodes: [{ id: leaf.person.id, type: "person", position: { x: 0, y: childY }, data: makeData(leaf.person, leaf.children.length, opts.collapsedIds.has(leaf.person.id), opts) }],
        edges: [],
      });
    }
  }

  let totalWidth = 0;
  for (let i = 0; i < segments.length; i++) {
    totalWidth += segments[i].width;
    if (i < segments.length - 1) totalWidth += GAP_X;
  }

  const subtreeWidth = Math.max(NODE_W, totalWidth);
  const parentX = x + (subtreeWidth - NODE_W) / 2;

  const allNodes: Node[] = [
    { id: node.person.id, type: "person", position: { x: parentX, y }, data: makeData(node.person, node.children.length, false, opts) },
  ];
  const allEdges: Edge[] = [];

  let maxChildHeight = 0;
  let offsetX = x + (subtreeWidth - totalWidth) / 2;
  for (const seg of segments) {
    for (const cn of seg.nodes) {
      if (!cn.parentId) {
        cn.position = { x: cn.position.x + offsetX, y: cn.position.y };
      }
    }
    allNodes.push(...seg.nodes);
    allEdges.push(...seg.edges);
    allEdges.push({
      id: `e-${node.person.id}-${seg.nodes[0].id}`,
      source: node.person.id,
      target: seg.nodes[0].id,
      type: "smoothstep",
      style: { stroke: "#94a3b8", strokeWidth: 1.5 },
    });
    if (seg.height > maxChildHeight) maxChildHeight = seg.height;
    offsetX += seg.width + GAP_X;
  }

  return {
    width: subtreeWidth,
    height: NODE_H + GAP_Y + maxChildHeight,
    nodes: allNodes,
    edges: allEdges,
  };
}

function buildGroupSegment(
  parentId: string,
  leaves: TreeNode[],
  y: number,
  opts: LayoutOptions,
): SubtreeResult {
  const persons = leaves.map((l) => l.person);
  const { w, h } = estimateGroupSize(persons.length);
  const groupId = `group-${parentId}`;

  const nodes: Node[] = [
    {
      id: groupId,
      type: "group",
      position: { x: 0, y },
      data: {
        label: "Direct reports",
        persons,
        matchedIds: opts.matchedIds,
        onEdit: opts.onEdit,
      } satisfies GroupNodeData,
      style: { width: w },
      draggable: true,
    },
  ];

  return { width: w, height: h, nodes, edges: [] };
}

export function buildFlowLayout(
  trees: TreeNode[],
  matchedIds: Set<string>,
  collapsedIds: Set<string>,
  onEdit: (p: Person) => void,
  onToggleCollapse: (id: string) => void,
): { nodes: Node[]; edges: Edge[] } {
  const opts: LayoutOptions = { matchedIds, collapsedIds, onEdit, onToggleCollapse };
  const allNodes: Node[] = [];
  const allEdges: Edge[] = [];

  let offsetX = 0;
  for (const root of trees) {
    const result = layoutSubtree(root, offsetX, 0, opts);
    allNodes.push(...result.nodes);
    allEdges.push(...result.edges);
    offsetX += result.width + GAP_X * 2;
  }

  return { nodes: allNodes, edges: allEdges };
}
