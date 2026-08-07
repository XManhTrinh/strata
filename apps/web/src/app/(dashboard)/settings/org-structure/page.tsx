"use client";

import { useState, useMemo } from "react";
import { Badge, SearchInput } from "@strata/ui";
import { AppBar } from "@/components/layout/app-bar";
import {
  useOrgUnits,
  useCreateOrgUnit,
  useUpdateOrgUnit,
  useDeleteOrgUnit,
  type OrganizationUnit,
} from "@/services";
import { useOrgUnitTypes, COMPANY_ID } from "@/services";

interface OrgTreeNode {
  id: string;
  name: string;
  typeId: string;
  typeName: string;
  typeColor: string;
  parentId: string | null;
  children: OrgTreeNode[];
}

function buildTree(units: OrganizationUnit[]): OrgTreeNode[] {
  const nodeMap = new Map<string, OrgTreeNode>();

  // Create all nodes first
  for (const unit of units) {
    nodeMap.set(unit.id, {
      id: unit.id,
      name: unit.name,
      typeId: unit.typeId,
      typeName: unit.type?.name || "Unknown",
      typeColor: "#6B7280",
      parentId: unit.parentId,
      children: [],
    });
  }

  // Build parent-child relationships
  const roots: OrgTreeNode[] = [];
  for (const node of nodeMap.values()) {
    if (node.parentId && nodeMap.has(node.parentId)) {
      nodeMap.get(node.parentId)!.children.push(node);
    } else {
      roots.push(node);
    }
  }

  return roots;
}

function filterTree(nodes: OrgTreeNode[], search: string): OrgTreeNode[] {
  if (!search) return nodes;
  const lower = search.toLowerCase();

  function matches(node: OrgTreeNode): boolean {
    if (node.name.toLowerCase().includes(lower)) return true;
    return node.children.some(matches);
  }

  return nodes.filter(matches);
}

function TreeNode({
  unit,
  depth = 0,
  onEdit,
  onArchive,
  onAddChild,
}: {
  unit: OrgTreeNode;
  depth?: number;
  onEdit: (unit: OrgTreeNode) => void;
  onArchive: (id: string) => void;
  onAddChild: (parentId: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const hasChildren = unit.children.length > 0;

  return (
    <div>
      <div
        className="group flex items-center gap-2 rounded-md px-3 py-2 hover:bg-muted/50 transition-colors"
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className="flex h-5 w-5 items-center justify-center rounded text-muted-foreground hover:bg-muted"
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            <span className="text-xs">{expanded ? "▼" : "▶"}</span>
          </button>
        ) : (
          <span className="inline-block h-5 w-5" />
        )}

        <div className="flex flex-1 items-center gap-3">
          <span className="font-medium text-foreground">{unit.name}</span>
          <Badge variant="default">
            <span style={{ color: unit.typeColor }}>●</span>
            <span className="ml-1">{unit.typeName}</span>
          </Badge>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => onEdit(unit)}
          >
            Edit
          </button>
          <button
            type="button"
            className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => onAddChild(unit.id)}
          >
            Add Child
          </button>
          <button
            type="button"
            className="rounded px-2 py-1 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
            onClick={() => onArchive(unit.id)}
          >
            Archive
          </button>
        </div>
      </div>

      {expanded && hasChildren && (
        <div>
          {unit.children.map((child) => (
            <TreeNode
              key={child.id}
              unit={child}
              depth={depth + 1}
              onEdit={onEdit}
              onArchive={onArchive}
              onAddChild={onAddChild}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function OrgStructurePage() {
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<OrgTreeNode | null>(null);
  const [formData, setFormData] = useState({ name: "", typeId: "", parentId: "" });

  const { data: orgUnits = [], isLoading, error } = useOrgUnits(COMPANY_ID);
  const { data: orgUnitTypes = [] } = useOrgUnitTypes(COMPANY_ID);
  const createMutation = useCreateOrgUnit();
  const updateMutation = useUpdateOrgUnit();
  const deleteMutation = useDeleteOrgUnit();

  const tree = useMemo(() => buildTree(orgUnits), [orgUnits]);
  const filteredTree = useMemo(() => filterTree(tree, search), [tree, search]);

  const openCreate = (parentId?: string) => {
    setEditingUnit(null);
    setFormData({ name: "", typeId: "", parentId: parentId || "" });
    setShowModal(true);
  };

  const openEdit = (unit: OrgTreeNode) => {
    setEditingUnit(unit);
    setFormData({ name: unit.name, typeId: unit.typeId, parentId: unit.parentId || "" });
    setShowModal(true);
  };

  const handleSubmit = () => {
    if (editingUnit) {
      updateMutation.mutate(
        {
          companyId: COMPANY_ID,
          id: editingUnit.id,
          name: formData.name,
          typeId: formData.typeId || undefined,
          parentId: formData.parentId || null,
        },
        { onSuccess: () => setShowModal(false) }
      );
    } else {
      createMutation.mutate(
        {
          companyId: COMPANY_ID,
          name: formData.name,
          typeId: formData.typeId,
          parentId: formData.parentId || null,
        },
        { onSuccess: () => setShowModal(false) }
      );
    }
  };

  const handleArchive = (id: string) => {
    deleteMutation.mutate({ companyId: COMPANY_ID, id });
  };

  if (error) {
    return (
      <div className="space-y-4">
        <AppBar className="justify-between">
          <div>
            <h1 className="text-lg font-semibold text-foreground">Organization Structure</h1>
            <p className="text-xs text-muted-foreground">
              Build and manage your organization&apos;s hierarchical structure.
            </p>
          </div>
        </AppBar>
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
          Failed to load organization structure. Please try again.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <AppBar className="justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Organization Structure</h1>
          <p className="text-xs text-muted-foreground">
            Build and manage your organization&apos;s hierarchical structure.
          </p>
        </div>
        <button
          type="button"
          onClick={() => openCreate()}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          Create Unit
        </button>
      </AppBar>

      <div className="max-w-sm">
        <SearchInput
          value={search}
          onChange={setSearch}
          placeholder="Search units..."
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <span className="text-sm text-muted-foreground">Loading...</span>
        </div>
      ) : (
        <div className="rounded-lg border border-border bg-background">
          <div className="border-b border-border px-4 py-3">
            <span className="text-sm font-medium text-muted-foreground">Organization Hierarchy</span>
          </div>
          <div className="py-2">
            {filteredTree.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-muted-foreground">
                No organization units found
              </div>
            ) : (
              filteredTree.map((unit) => (
                <TreeNode
                  key={unit.id}
                  unit={unit}
                  onEdit={openEdit}
                  onArchive={handleArchive}
                  onAddChild={(parentId) => openCreate(parentId)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg">
            <h2 className="text-lg font-semibold text-foreground">
              {editingUnit ? "Edit Organization Unit" : "Create Organization Unit"}
            </h2>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="unit-name" className="block text-sm font-medium text-foreground">
                  Name
                </label>
                <input
                  id="unit-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                  placeholder="e.g., Engineering"
                />
              </div>
              <div>
                <label htmlFor="unit-type" className="block text-sm font-medium text-foreground">
                  Type
                </label>
                <select
                  id="unit-type"
                  value={formData.typeId}
                  onChange={(e) => setFormData({ ...formData, typeId: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">Select a type...</option>
                  {orgUnitTypes.map((t) => (
                    <option key={t.id} value={t.id}>{t.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="unit-parent" className="block text-sm font-medium text-foreground">
                  Parent Unit
                </label>
                <select
                  id="unit-parent"
                  value={formData.parentId}
                  onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
                  className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  <option value="">None (root level)</option>
                  {orgUnits.map((u) => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="rounded-md border border-border px-4 py-2 text-sm font-medium text-foreground hover:bg-muted transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
              >
                {createMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : editingUnit
                    ? "Save Changes"
                    : "Create"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
