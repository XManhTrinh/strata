import { type Node, type Edge } from "@xyflow/react";
import { Person, TreeNode } from "@/lib/org-tree/types";
import type { PersonNodeData } from "@/components/flow-org/PersonNode";

const NODE_W = 200;
const NODE_H = 80;
const GAP_X = 40;
const GAP_Y = 100;

interface LayoutOptions {
  matchedIds: Set<string>;
  collapsedIds: Set<string>;
  onEdit: (p: Person) => void;
  onToggleCollapse: (id: string) => void;
}

interface SubtreeResult {
  width: number;
  nodes: Node[];
  edges: Edge[];
}

function layoutSubtree(
  node: TreeNode,
  x: number,
  y: number,
  opts: LayoutOptions,
): SubtreeResult {
  const { matchedIds, collapsedIds, onEdit, onToggleCollapse } = opts;
  const hasMatch = matchedIds.size > 0;
  const isCollapsed = collapsedIds.has(node.person.id);

  const makeData = (p: Person, childCount: number, collapsed: boolean): PersonNodeData => ({
    person: p,
    matched: hasMatch && matchedIds.has(p.id),
    dimmed: hasMatch && !matchedIds.has(p.id),
    onEdit,
    childCount,
    collapsed,
    onToggleCollapse,
  });

  const childCount = node.children.length;

  if (childCount === 0 || isCollapsed) {
    return {
      width: NODE_W,
      nodes: [{ id: node.person.id, type: "person", position: { x, y }, data: makeData(node.person, childCount, isCollapsed) }],
      edges: [],
    };
  }

  const childResults: SubtreeResult[] = [];
  let totalChildWidth = 0;
  for (let i = 0; i < node.children.length; i++) {
    const result = layoutSubtree(node.children[i], 0, y + NODE_H + GAP_Y, opts);
    childResults.push(result);
    totalChildWidth += result.width;
    if (i < node.children.length - 1) totalChildWidth += GAP_X;
  }

  const subtreeWidth = Math.max(NODE_W, totalChildWidth);
  const parentX = x + (subtreeWidth - NODE_W) / 2;

  const allNodes: Node[] = [
    { id: node.person.id, type: "person", position: { x: parentX, y }, data: makeData(node.person, childCount, false) },
  ];
  const allEdges: Edge[] = [];

  let offsetX = x + (subtreeWidth - totalChildWidth) / 2;
  for (const cr of childResults) {
    for (const cn of cr.nodes) {
      cn.position = { x: cn.position.x + offsetX, y: cn.position.y };
    }
    allNodes.push(...cr.nodes);
    allEdges.push(...cr.edges);
    allEdges.push({
      id: `e-${node.person.id}-${cr.nodes[0].id}`,
      source: node.person.id,
      target: cr.nodes[0].id,
      type: "smoothstep",
      style: { stroke: "#94a3b8", strokeWidth: 1.5 },
    });
    offsetX += cr.width + GAP_X;
  }

  return { width: subtreeWidth, nodes: allNodes, edges: allEdges };
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
