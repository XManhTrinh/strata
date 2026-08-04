import { type Node, type Edge } from "@xyflow/react";
import { Person, TreeNode, VacancyNode } from "@/lib/org-tree/types";
import type { PersonNodeData } from "@/components/flow-org/PersonNode";
import type { GroupNodeData } from "@/components/flow-org/GroupNode";
import type { VacancyNodeData } from "@/components/flow-org/VacancyNode";

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
  vacancies?: VacancyNode[];
  placedVacancyIds: Set<string>;
}

interface SubtreeResult {
  width: number;
  height: number;
  nodes: Node[];
  edges: Edge[];
}

function countAllDescendants(node: TreeNode): number {
  let count = 0;
  for (const child of node.children) {
    count += 1 + countAllDescendants(child);
  }
  return count;
}

function makeData(
  node: TreeNode,
  collapsed: boolean,
  opts: LayoutOptions
): PersonNodeData {
  const hasMatch = opts.matchedIds.size > 0;
  const childCount = node.children.length;
  const totalDescendants = countAllDescendants(node);
  return {
    person: node.person,
    matched: hasMatch && opts.matchedIds.has(node.person.id),
    dimmed: hasMatch && !opts.matchedIds.has(node.person.id),
    onEdit: opts.onEdit,
    childCount,
    indirectCount: totalDescendants - childCount,
    totalDescendants,
    collapsed,
    onToggleCollapse: opts.onToggleCollapse,
    canEdit: node.person.canEdit !== false,
  };
}

function isLeaf(child: TreeNode, collapsedIds: Set<string>): boolean {
  return child.children.length === 0 || collapsedIds.has(child.person.id);
}

function estimateGroupSize(count: number): { w: number; h: number } {
  const rows = Math.ceil(count / COLS);
  const w = COLS * GROUP_CARD_W + (COLS - 1) * GROUP_GAP + GROUP_PAD * 2;
  const h =
    GROUP_HEADER + rows * GROUP_CARD_H + (rows - 1) * GROUP_GAP + GROUP_PAD * 2;
  return { w, h };
}

function getEdgeStyle(person: Person): { stroke: string; strokeWidth: number; strokeDasharray?: string } {
  if (person.temporary) {
    return { stroke: "#818cf8", strokeWidth: 1.5, strokeDasharray: "5 3" };
  }
  return { stroke: "#94a3b8", strokeWidth: 1.5 };
}

function layoutSubtree(
  node: TreeNode,
  x: number,
  y: number,
  opts: LayoutOptions
): SubtreeResult {
  const isCollapsed = opts.collapsedIds.has(node.person.id);
  const childCount = node.children.length;

  if (childCount === 0 || isCollapsed) {
    return {
      width: NODE_W,
      height: NODE_H,
      nodes: [
        {
          id: node.person.id,
          type: "person",
          position: { x, y },
          data: makeData(node, isCollapsed, opts),
          draggable: node.person.canEdit !== false,
        },
      ],
      edges: [],
    };
  }

  return layoutMixed(node, x, y, opts);
}

function layoutMixed(
  node: TreeNode,
  x: number,
  y: number,
  opts: LayoutOptions
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
        nodes: [
          {
            id: leaf.person.id,
            type: "person",
            position: { x: 0, y: childY },
            data: makeData(
              leaf,
              opts.collapsedIds.has(leaf.person.id),
              opts
            ),
            draggable: leaf.person.canEdit !== false,
          },
        ],
        edges: [],
      });
    }
  }

  // Add vacancy nodes under this manager
  if (opts.vacancies) {
    const nodeVacancies = opts.vacancies.filter(
      (v) => v.departmentId === node.person.departmentId && v.level === (node.depth ?? 0) + 2 && !opts.placedVacancyIds.has(v.id)
    );
    for (const vacancy of nodeVacancies) {
      opts.placedVacancyIds.add(vacancy.id);
      segments.push({
        width: NODE_W,
        height: NODE_H,
        nodes: [
          {
            id: vacancy.id,
            type: "vacancy",
            position: { x: 0, y: childY },
            data: { vacancy } satisfies VacancyNodeData,
            draggable: false,
          },
        ],
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
    {
      id: node.person.id,
      type: "person",
      position: { x: parentX, y },
      data: makeData(node, false, opts),
      draggable: node.person.canEdit !== false,
    },
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

    const targetId = seg.nodes[0].id;
    const targetPerson = seg.nodes[0].data?.person as Person | undefined;
    const edgeStyle = targetPerson ? getEdgeStyle(targetPerson) : { stroke: "#94a3b8", strokeWidth: 1.5 };

    allEdges.push({
      id: `e-${node.person.id}-${targetId}`,
      source: node.person.id,
      target: targetId,
      type: "smoothstep",
      style: edgeStyle,
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
  opts: LayoutOptions
): SubtreeResult {
  const persons = leaves.map((l) => l.person);
  const { w, h } = estimateGroupSize(persons.length);
  const groupId = `group-${parentId}`;

  const childCounts: Record<string, number> = {};
  for (const l of leaves) {
    childCounts[l.person.id] = l.children.length;
  }

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
        childCounts,
        collapsedIds: opts.collapsedIds,
        onToggleCollapse: opts.onToggleCollapse,
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
  vacancies?: VacancyNode[]
): { nodes: Node[]; edges: Edge[] } {
  const opts: LayoutOptions = {
    matchedIds,
    collapsedIds,
    onEdit,
    onToggleCollapse,
    vacancies,
    placedVacancyIds: new Set<string>(),
  };
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
