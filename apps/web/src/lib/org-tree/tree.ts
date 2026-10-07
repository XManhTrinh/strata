import { Person, TreeNode } from "./types";

/**
 * Builds a nested tree from a flat list of persons.
 * Root nodes (parentId === null) get depth 0; children get parent.depth + 1.
 */
export function buildTree(persons: Person[]): TreeNode[] {
  const nodeMap = new Map<string, TreeNode>();

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

  const queue: TreeNode[] = roots.map((r) => {
    r.depth = 0;
    return r;
  });
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
export function isDescendant(
  persons: Person[],
  ancestorId: string,
  descendantId: string
): boolean {
  const childMap = new Map<string, string[]>();
  for (const person of persons) {
    if (person.parentId !== null) {
      const siblings = childMap.get(person.parentId) ?? [];
      siblings.push(person.id);
      childMap.set(person.parentId, siblings);
    }
  }

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
  const squadPersons = persons.filter((p) =>
    p.squads.some((s) => squadSet.has(s))
  );
  const squadIds = new Set(squadPersons.map((p) => p.id));

  const remapped: Person[] = squadPersons.map((p) => ({
    ...p,
    parentId: p.parentId && squadIds.has(p.parentId) ? p.parentId : null,
  }));

  return buildTree(remapped);
}

/**
 * Builds a department-based tree structure.
 * Creates virtual department root nodes with employees nested inside.
 */
export function buildDepartmentTree(persons: Person[]): TreeNode[] {
  // Group persons by department
  const deptMap = new Map<string, Person[]>();
  for (const person of persons) {
    const dept = person.departmentName ?? person.departmentId ?? "Unassigned";
    const list = deptMap.get(dept) ?? [];
    list.push(person);
    deptMap.set(dept, list);
  }

  const roots: TreeNode[] = [];

  for (const [deptName, deptPersons] of deptMap) {
    // Find the most senior person in the department (they have the fewest ancestors)
    const deptIds = new Set(deptPersons.map((p) => p.id));

    // Find the root(s) of this department — persons whose parent is not in the same department
    const deptRoots = deptPersons.filter(
      (p) => p.parentId === null || !deptIds.has(p.parentId)
    );

    if (deptRoots.length === 0) continue;

    // Create a virtual department head node
    const headPerson: Person = {
      id: `dept-${deptName}`,
      fullName: deptName,
      title: `${deptPersons.length} members`,
      squads: [],
      salary: 0,
      parentId: null,
      departmentId: deptPersons[0]?.departmentId,
      departmentName: deptName,
      status: "ACTIVE",
      capacityAllocation: 0,
      canEdit: false,
    };

    const headNode: TreeNode = {
      person: headPerson,
      children: [],
      depth: 0,
    };

    // Build sub-tree within this department
    const nodeMap = new Map<string, TreeNode>();
    for (const p of deptPersons) {
      nodeMap.set(p.id, { person: p, children: [], depth: 1 });
    }

    for (const p of deptPersons) {
      const node = nodeMap.get(p.id)!;
      if (p.parentId && deptIds.has(p.parentId)) {
        const parent = nodeMap.get(p.parentId)!;
        parent.children.push(node);
      } else {
        headNode.children.push(node);
      }
    }

    // Set depths
    const queue: TreeNode[] = headNode.children.map((c) => {
      c.depth = 1;
      return c;
    });
    while (queue.length > 0) {
      const current = queue.shift()!;
      for (const child of current.children) {
        child.depth = current.depth + 1;
        queue.push(child);
      }
    }

    roots.push(headNode);
  }

  return roots;
}

/**
 * Gets the path from a person to the root of the tree.
 * Returns an array of person names from root to the target.
 */
export function getPathToRoot(persons: Person[], targetId: string): string[] {
  const path: string[] = [];
  let currentId: string | null = targetId;

  const personMap = new Map<string, Person>();
  for (const p of persons) {
    personMap.set(p.id, p);
  }

  while (currentId) {
    const person = personMap.get(currentId);
    if (!person) break;
    path.unshift(person.fullName);
    currentId = person.parentId;
  }

  return path;
}

/**
 * Like getPathToRoot, but returns { id, name } for each step so callers can
 * make the breadcrumb (e.g. click a segment to focus that person).
 */
export function getPathToRootNodes(
  persons: Person[],
  targetId: string,
): { id: string; name: string }[] {
  const path: { id: string; name: string }[] = [];
  let currentId: string | null = targetId;
  const seen = new Set<string>();

  const personMap = new Map<string, Person>();
  for (const p of persons) personMap.set(p.id, p);

  while (currentId && !seen.has(currentId)) {
    seen.add(currentId);
    const person = personMap.get(currentId);
    if (!person) break;
    path.unshift({ id: person.id, name: person.fullName });
    currentId = person.parentId;
  }

  return path;
}
