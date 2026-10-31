import type { ELK as ElkEngine } from "elkjs/lib/elk-api";
import ELK from "elkjs/lib/elk-api";

export const CARD_WIDTH = 240;
export const CARD_HEIGHT = 88;

// A team box: reports without reports shown below them, in two columns.
export const TEAM_COLUMNS = 2;
export const TEAM_GAP = 24;
export const TEAM_PADDING = 16;
export const TEAM_HEADER = 40;

/** The size of a team box holding `count` cards. */
export function teamSize(count: number): { width: number; height: number } {
  const rows = Math.ceil(count / TEAM_COLUMNS);
  return {
    width: TEAM_COLUMNS * CARD_WIDTH + (TEAM_COLUMNS - 1) * TEAM_GAP + TEAM_PADDING * 2,
    height: TEAM_HEADER + rows * CARD_HEIGHT + (rows - 1) * TEAM_GAP + TEAM_PADDING * 2,
  };
}

let engine: ElkEngine | null = null;

/** ELK in a web worker, so laying out large charts never blocks the page. */
function elk(): ElkEngine {
  engine ??= new ELK({
    workerFactory: () => new Worker(new URL("elkjs/lib/elk-worker.min.js", import.meta.url)),
  });
  return engine;
}

/** Top-down tree positions for nodes of the given sizes, keyed by id. */
export async function layoutTree(
  nodes: { id: string; width: number; height: number }[],
  edges: { source: string; target: string }[]
): Promise<Map<string, { x: number; y: number }>> {
  const graph = await elk().layout({
    id: "chart",
    layoutOptions: {
      "elk.algorithm": "mrtree",
      "elk.direction": "DOWN",
      "elk.spacing.nodeNode": "32",
      "elk.mrtree.spacing.nodeNode": "32",
      "elk.layered.spacing.nodeNodeBetweenLayers": "56",
    },
    children: nodes,
    edges: edges.map((e) => ({
      id: `${e.source}>${e.target}`,
      sources: [e.source],
      targets: [e.target],
    })),
  });
  return new Map((graph.children ?? []).map((n) => [n.id, { x: n.x ?? 0, y: n.y ?? 0 }]));
}
