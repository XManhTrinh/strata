import { describe, expect, it } from "vitest";
import { allowedLevels, buildTree, subtreeIds, unitPath } from "./hierarchy";
import type { OrgLevel, OrgUnit } from "./types";

const level = (id: string, sortOrder: number, archived = false): OrgLevel => ({
  id,
  name: id,
  sortOrder,
  archived,
});
const unit = (id: string, parentId: string | null, levelId: string | null, archived = false) => ({
  id,
  parentId,
  levelId,
  name: id,
  code: null,
  archived,
});

const levels = [
  level("division", 10),
  level("tribe", 20),
  level("old", 25, true),
  level("squad", 30),
];
const units: OrgUnit[] = [
  unit("acme", null, null),
  unit("eng", "acme", "division"),
  unit("platform", "eng", "tribe"),
  unit("squad-a", "platform", "squad"),
  unit("gone", "eng", "tribe", true),
];

describe("hierarchy", () => {
  it("builds the tree from the root, hiding archived units unless asked", () => {
    const [root] = buildTree(units, false);
    expect(root?.children.map((c) => c.id)).toEqual(["eng"]);
    expect(root?.children[0]?.children.map((c) => c.id)).toEqual(["platform"]);
    expect(buildTree(units, true)[0]?.children[0]?.children.map((c) => c.id)).toEqual([
      "platform",
      "gone",
    ]);
  });

  it("finds a unit's subtree and path", () => {
    expect([...subtreeIds(units, "eng")].sort()).toEqual(["eng", "gone", "platform", "squad-a"]);
    expect(unitPath(units, "squad-a")).toBe("acme › eng › platform › squad-a");
  });

  it("offers active levels below the parent and above the sub-units", () => {
    const ids = (parentId: string | null, unitId: string | null) =>
      allowedLevels(levels, units, parentId, unitId).map((l) => l.id);
    expect(ids("acme", null)).toEqual(["division", "tribe", "squad"]);
    expect(ids("eng", null)).toEqual(["tribe", "squad"]);
    // Platform has a squad under it, so it must stay above squad.
    expect(ids("eng", "platform")).toEqual(["tribe"]);
    expect(ids("squad-a", null)).toEqual([]);
  });
});
