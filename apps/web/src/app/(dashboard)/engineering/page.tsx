"use client";

import { useState, useMemo } from "react";
import { AppBar } from "@/components/layout/app-bar";
import {
  useOrgUnits,
  useCreateOrgUnit,
  OrganizationUnit,
} from "@/services/organizations.service";
import { COMPANY_ID } from "@/services/admin.service";

// ─── Tree building ────────────────────────────────────────────────────────────

interface OrgUnitNode extends OrganizationUnit {
  children: OrgUnitNode[];
}

function buildTree(units: OrganizationUnit[]): OrgUnitNode[] {
  const map = new Map<string, OrgUnitNode>();
  const roots: OrgUnitNode[] = [];

  // Initialize all nodes
  for (const unit of units) {
    map.set(unit.id, { ...unit, children: [] });
  }

  // Build parent-child relationships
  for (const unit of units) {
    const node = map.get(unit.id)!;
    if (unit.parentId && map.has(unit.parentId)) {
      map.get(unit.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

// ─── Type badge colors ────────────────────────────────────────────────────────

const TYPE_COLORS: Record<string, string> = {
  Division: "bg-blue-900/30 text-blue-400 border-blue-700",
  Department: "bg-blue-500/20 text-blue-300 border-blue-600",
  Tribe: "bg-purple-500/20 text-purple-300 border-purple-600",
  Cluster: "bg-amber-500/20 text-amber-300 border-amber-600",
  Squad: "bg-emerald-500/20 text-emerald-300 border-emerald-600",
};

function TypeBadge({ typeName }: { typeName: string }) {
  const colorClasses = TYPE_COLORS[typeName] ?? "bg-muted text-muted-foreground border-border";
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${colorClasses}`}>
      {typeName}
    </span>
  );
}

// ─── Tree node component ──────────────────────────────────────────────────────

function OrgUnitTreeNode({
  node,
  expanded,
  onToggle,
  onAdd,
  depth = 0,
}: {
  node: OrgUnitNode;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onAdd: (parentId: string) => void;
  depth?: number;
}) {
  const hasChildren = node.children.length > 0;
  const isExpanded = expanded.has(node.id);
  const typeName = node.type?.name ?? "";

  return (
    <div>
      <div
        className="flex items-center justify-between rounded-md px-3 py-2 hover:bg-muted/30 transition-colors group"
        style={{ paddingLeft: `${depth * 20 + 12}px` }}
      >
        <div className="flex items-center gap-2">
          {hasChildren ? (
            <button
              type="button"
              onClick={() => onToggle(node.id)}
              className="text-xs text-muted-foreground hover:text-foreground w-4"
              aria-expanded={isExpanded}
              aria-label={isExpanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
            >
              {isExpanded ? "▼" : "▶"}
            </button>
          ) : (
            <span className="w-4 text-center text-xs text-muted-foreground">•</span>
          )}
          <span className="text-sm font-medium text-foreground">{node.name}</span>
          <TypeBadge typeName={typeName} />
        </div>
        <button
          type="button"
          onClick={() => onAdd(node.id)}
          className="rounded px-2 py-1 text-xs font-medium text-primary opacity-0 group-hover:opacity-100 hover:bg-primary/10 transition-all"
          aria-label={`Add child unit under ${node.name}`}
        >
          + Add
        </button>
      </div>
      {isExpanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <OrgUnitTreeNode
              key={child.id}
              node={child}
              expanded={expanded}
              onToggle={onToggle}
              onAdd={onAdd}
              depth={depth + 1}
            />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function EngineeringPage() {
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [addParentId, setAddParentId] = useState<string | null>(null);
  const [newUnitName, setNewUnitName] = useState("");
  const [newUnitTypeId, setNewUnitTypeId] = useState("");

  const {
    data: orgUnits,
    isLoading,
    isError,
    error,
    refetch,
  } = useOrgUnits(COMPANY_ID);

  const createOrgUnit = useCreateOrgUnit();

  const tree = useMemo(() => {
    if (!orgUnits) return [];
    return buildTree(orgUnits);
  }, [orgUnits]);

  // Get available org unit types from the fetched data
  const orgUnitTypes = useMemo(() => {
    if (!orgUnits) return [];
    const typeMap = new Map<string, { id: string; name: string }>();
    for (const unit of orgUnits) {
      if (unit.type && !typeMap.has(unit.type.id)) {
        typeMap.set(unit.type.id, { id: unit.type.id, name: unit.type.name });
      }
    }
    return Array.from(typeMap.values());
  }, [orgUnits]);

  const toggleNode = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const expandAll = () => {
    if (!orgUnits) return;
    setExpanded(new Set(orgUnits.map((u) => u.id)));
  };

  const collapseAll = () => {
    setExpanded(new Set());
  };

  const handleAdd = (parentId: string | null) => {
    setAddParentId(parentId);
    setNewUnitName("");
    setNewUnitTypeId(orgUnitTypes[0]?.id ?? "");
    setShowAddDialog(true);
  };

  const handleSubmitAdd = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUnitName.trim() || !newUnitTypeId) return;

    createOrgUnit.mutate(
      {
        companyId: COMPANY_ID,
        typeId: newUnitTypeId,
        parentId: addParentId,
        name: newUnitName.trim(),
      },
      {
        onSuccess: () => {
          setShowAddDialog(false);
          setNewUnitName("");
        },
      }
    );
  };

  if (isError) {
    return (
      <div className="space-y-4">
        <AppBar>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Engineering</h1>
            <p className="text-xs text-muted-foreground">
              Organization structure — Departments, Tribes, Clusters, and Squads.
            </p>
          </div>
        </AppBar>
        <div className="flex flex-col items-center justify-center rounded-md border border-border bg-card p-8">
          <p className="text-sm text-destructive mb-4">
            {error?.message || "Failed to load organization data"}
          </p>
          <button
            type="button"
            onClick={() => refetch()}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-4">
        <AppBar>
          <div>
            <h1 className="text-lg font-semibold text-foreground">Engineering</h1>
            <p className="text-xs text-muted-foreground">
              Organization structure — Departments, Tribes, Clusters, and Squads.
            </p>
          </div>
        </AppBar>
        <div className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="animate-pulse rounded-md border border-border bg-card p-4"
            >
              <div className="h-5 w-48 rounded bg-muted mb-2" />
              <div className="h-4 w-24 rounded bg-muted" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AppBar className="justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Engineering</h1>
          <p className="text-xs text-muted-foreground">
            Organization structure — Departments, Tribes, Clusters, and Squads.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={expandAll}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            Expand All
          </button>
          <button
            type="button"
            onClick={collapseAll}
            className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-muted transition-colors"
          >
            Collapse All
          </button>
          <button
            type="button"
            onClick={() => handleAdd(null)}
            className="rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
          >
            Add Root Unit
          </button>
        </div>
      </AppBar>

      <div className="rounded-md border border-border bg-card py-2">
        {tree.length === 0 ? (
          <div className="text-sm text-muted-foreground text-center p-8">
            No organization units found. Create one to get started.
          </div>
        ) : (
          tree.map((node) => (
            <OrgUnitTreeNode
              key={node.id}
              node={node}
              expanded={expanded}
              onToggle={toggleNode}
              onAdd={handleAdd}
            />
          ))
        )}
      </div>

      {/* Add Org Unit Dialog */}
      {showAddDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="bg-card border border-border rounded-lg p-6 w-full max-w-md shadow-xl">
            <h2 className="text-lg font-semibold mb-4">
              {addParentId ? "Add Child Unit" : "Add Root Unit"}
            </h2>
            <form onSubmit={handleSubmitAdd} className="space-y-3">
              <div>
                <label htmlFor="unit-name" className="block text-sm font-medium text-foreground mb-1">
                  Name
                </label>
                <input
                  id="unit-name"
                  type="text"
                  required
                  value={newUnitName}
                  onChange={(e) => setNewUnitName(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="Enter unit name"
                />
              </div>
              <div>
                <label htmlFor="unit-type" className="block text-sm font-medium text-foreground mb-1">
                  Type
                </label>
                <select
                  id="unit-type"
                  required
                  value={newUnitTypeId}
                  onChange={(e) => setNewUnitTypeId(e.target.value)}
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {orgUnitTypes.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-2 mt-4">
                <button
                  type="button"
                  onClick={() => setShowAddDialog(false)}
                  className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createOrgUnit.isPending}
                  className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
                >
                  {createOrgUnit.isPending ? "Saving..." : "Save"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
