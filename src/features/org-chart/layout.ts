import type { ELK as ElkEngine } from "elkjs/lib/elk-api";
import ELK from "elkjs/lib/elk-api";

export const CARD_WIDTH = 240;
export const CARD_HEIGHT = 88;

let engine: ElkEngine | null = null;

/** ELK in a web worker, so laying out large charts never blocks the page. */
function elk(): ElkEngine {
  engine ??= new ELK({
    workerFactory: () => new Worker(new URL("elkjs/lib/elk-worker.min.js", import.meta.url)),
  });
  return engine;
}

/** Top-down tree positions for cards of one size, keyed by id. */
export async function layoutTree(
  ids: string[],
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
    children: ids.map((id) => ({ id, width: CARD_WIDTH, height: CARD_HEIGHT })),
    edges: edges.map((e) => ({
      id: `${e.source}>${e.target}`,
      sources: [e.source],
      targets: [e.target],
    })),
  });
  return new Map((graph.children ?? []).map((n) => [n.id, { x: n.x ?? 0, y: n.y ?? 0 }]));
}
