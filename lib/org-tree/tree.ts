import { Person, TreeNode } from './types';

/**
 * Builds a nested tree from a flat list of persons.
 * Root nodes (parentId === null) get depth 0; children get parent.depth + 1.
 */
export function buildTree(persons: Person[]): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>();

  // Create all nodes first
  for (const person of persons) {
    nodeMap.set(person.id, { person, children: [], depth: 0 });
  }

  const roots: TreeNode[] = [];

  for (const person of persons) {
    const node = nodeMap.get(person.id)!;
    if (person.parentId === null || !nodeMap.has(person.parentId)) {
      roots.push(node);
    } else {
      const parent = nodeMap.get(person.parentId)!;
      parent.children.push(node);
    }
  }

  // Assign depths via BFS from roots
  const queue: TreeNode[] = roots.map(r => { r.depth = 0; return r; });
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const child of current.children) {
      child.depth = current.depth + 1;
      queue.push(child);
    }
  }

  return roots;
}

/**
 * Flattens a tree back to a flat array of persons.
 */
export function flattenTree(nodes: TreeNode[]): Person[] {
  const result: Person[] = [];
  const stack = [...nodes];
  while (stack.length > 0) {
    const node = stack.pop()!;
    result.push(node.person);
    stack.push(...node.children);
  }
  return result;
}

/**
 * Returns true if descendantId is a descendant of ancestorId in the persons list.
 * Used for cycle prevention during drag-and-drop reparenting.
 */
export function isDescendant(persons: Person[], ancestorId: string, descendantId: string): boolean {
  // Build a child map for efficient traversal
  const childMap = new Map<string, string[]>();
  for (const person of persons) {
    if (person.parentId !== null) {
      const siblings = childMap.get(person.parentId) ?? [];
      siblings.push(person.id);
      childMap.set(person.parentId, siblings);
    }
  }

  // BFS from ancestorId to see if we can reach descendantId
  const queue = [ancestorId];
  const visited = new Set<string>();
  while (queue.length > 0) {
    const current = queue.shift()!;
    if (current === descendantId) return true;
    if (visited.has(current)) continue;
    visited.add(current);
    const children = childMap.get(current) ?? [];
    queue.push(...children);
  }
  return false;
}

/**
 * Builds a tree scoped to one or more squads.
 * Only persons who belong to at least one of the given squads are included.
 * Hierarchy is preserved: if a person's parent is also in the squad set,
 * they appear as a child. Otherwise they become a root in this view's tree.
 */
export function buildSquadTree(persons: Person[], squads: string[]): TreeNode[] {
  const squadSet = new Set(squads);
  const squadPersons = persons.filter((p) => p.squads.some((s) => squadSet.has(s)));
  const squadIds = new Set(squadPersons.map((p) => p.id));

  // Remap parentIds: if the parent is not in the squad set, treat as root
  const remapped: Person[] = squadPersons.map((p) => ({
    ...p,
    parentId: p.parentId && squadIds.has(p.parentId) ? p.parentId : null,
  }));

  return buildTree(remapped);
}
