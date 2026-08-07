"use client";

import { useState, useMemo } from "react";
import { Badge } from "@strata/ui";
import { SearchBar } from "@/components/ui/search-bar";
import { AppBar } from "@/components/layout/app-bar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AnimatedDialog,
  AnimatedDialogContent,
  AnimatedDialogHeader,
  AnimatedDialogTitle,
  AnimatedDialogDescription,
  AnimatedDialogFooter,
} from "@/components/ui/animated-dialog";
import { toast } from "sonner";
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
          <Button
            variant="ghost"
            size="icon"
            className="h-5 w-5 text-muted-foreground"
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            <span className="text-xs">{expanded ? "▼" : "▶"}</span>
          </Button>
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
          <Button
            variant="ghost"
            size="sm"
            className="h-auto px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onEdit(unit)}
          >
            Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onAddChild(unit.id)}
          >
            Add Child
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-auto px-2 py-1 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => onArchive(unit.id)}
          >
            Archive
          </Button>
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
        {
          onSuccess: () => {
            toast.success("Organization unit updated successfully");
            setShowModal(false);
          },
          onError: (err) => {
            toast.error(err.message || "Failed to update organization unit");
          },
        }
      );
    } else {
      createMutation.mutate(
        {
          companyId: COMPANY_ID,
          name: formData.name,
          typeId: formData.typeId,
          parentId: formData.parentId || null,
        },
        {
          onSuccess: () => {
            toast.success("Organization unit created successfully");
            setShowModal(false);
          },
          onError: (err) => {
            toast.error(err.message || "Failed to create organization unit");
          },
        }
      );
    }
  };

  const handleArchive = (id: string) => {
    deleteMutation.mutate(
      { companyId: COMPANY_ID, id },
      {
        onSuccess: () => {
          toast.success("Organization unit archived successfully");
        },
        onError: (err) => {
          toast.error(err.message || "Failed to archive organization unit");
        },
      }
    );
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
        <Button onClick={() => openCreate()}>
          Create Unit
        </Button>
      </AppBar>

      <SearchBar
        className="max-w-sm"
        value={search}
        onValueChange={setSearch}
        placeholder="Search units..."
      />

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
      <AnimatedDialog open={showModal} onOpenChange={setShowModal}>
        <AnimatedDialogContent className="sm:max-w-md">
          <AnimatedDialogHeader>
            <AnimatedDialogTitle>
              {editingUnit ? "Edit Organization Unit" : "Create Organization Unit"}
            </AnimatedDialogTitle>
            <AnimatedDialogDescription>
              {editingUnit
                ? "Update the details for this organization unit."
                : "Add a new unit to your organization hierarchy."}
            </AnimatedDialogDescription>
          </AnimatedDialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="unit-name">Name</Label>
              <Input
                id="unit-name"
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Engineering"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit-type">Type</Label>
              <Select
                value={formData.typeId}
                onValueChange={(value) => setFormData({ ...formData, typeId: value })}
              >
                <SelectTrigger id="unit-type">
                  <SelectValue placeholder="Select a type..." />
                </SelectTrigger>
                <SelectContent>
                  {orgUnitTypes.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="unit-parent">Parent Unit</Label>
              <Select
                value={formData.parentId || "none"}
                onValueChange={(value) => setFormData({ ...formData, parentId: value === "none" ? "" : value })}
              >
                <SelectTrigger id="unit-parent">
                  <SelectValue placeholder="None (root level)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None (root level)</SelectItem>
                  {orgUnits.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <AnimatedDialogFooter>
            <Button variant="outline" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : editingUnit
                  ? "Save Changes"
                  : "Create"}
            </Button>
          </AnimatedDialogFooter>
        </AnimatedDialogContent>
      </AnimatedDialog>
    </div>
  );
}
