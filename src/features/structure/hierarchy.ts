import type { OrgLevel, OrgUnit, OrgUnitNode } from "./types";

/** Builds the tree from the root, leaving out archived units unless asked. */
export function buildTree(units: OrgUnit[], includeArchived: boolean): OrgUnitNode[] {
  const shown = units.filter((u) => includeArchived || !u.archived);
  const nodes = new Map(shown.map((u) => [u.id, { ...u, children: [] as OrgUnitNode[] }]));
  const roots: OrgUnitNode[] = [];
  for (const node of nodes.values()) {
    const parent = node.parentId ? nodes.get(node.parentId) : undefined;
    if (parent) parent.children.push(node);
    else if (!node.parentId) roots.push(node);
  }
  return roots;
}

/** The unit and every unit under it. */
export function subtreeIds(units: OrgUnit[], id: string): Set<string> {
  const ids = new Set([id]);
  for (let grew = true; grew;) {
    grew = false;
    for (const u of units) {
      if (u.parentId && ids.has(u.parentId) && !ids.has(u.id)) {
        ids.add(u.id);
        grew = true;
      }
    }
  }
  return ids;
}

/** "Acme › Engineering › Platform", for choosing a parent. */
export function unitPath(units: OrgUnit[], id: string): string {
  const byId = new Map(units.map((u) => [u.id, u]));
  const names: string[] = [];
  for (let u = byId.get(id); u; u = u.parentId ? byId.get(u.parentId) : undefined) {
    names.unshift(u.name);
  }
  return names.join(" › ");
}

/**
 * Levels a unit may have: active, below its parent's level and above its sub-units' levels.
 * Levels can be skipped, never reversed.
 */
export function allowedLevels(
  levels: OrgLevel[],
  units: OrgUnit[],
  parentId: string | null,
  unitId: string | null
): OrgLevel[] {
  const order = new Map(levels.map((l) => [l.id, l.sortOrder]));
  const parent = units.find((u) => u.id === parentId);
  const above = parent?.levelId ? (order.get(parent.levelId) ?? -Infinity) : -Infinity;
  const below = Math.min(
    ...units
      .filter((u) => unitId && u.parentId === unitId && u.levelId)
      .map((u) => order.get(u.levelId!) ?? Infinity)
  );
  return levels.filter((l) => !l.archived && l.sortOrder > above && l.sortOrder < below);
}
