"use client";

import { useState, useMemo } from "react";
import { AppBar } from "@/components/layout/app-bar";
import {
  useOrgUnits,
  useCreateOrgUnit,
  OrganizationUnit,
} from "@/services/organizations.service";
import { COMPANY_ID } from "@/services/admin.service";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "sonner";

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
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onToggle(node.id)}
              className="h-5 w-5 text-xs text-muted-foreground hover:text-foreground"
              aria-expanded={isExpanded}
              aria-label={isExpanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
            >
              {isExpanded ? "▼" : "▶"}
            </Button>
          ) : (
            <span className="w-5 text-center text-xs text-muted-foreground">•</span>
          )}
          <span className="text-sm font-medium text-foreground">{node.name}</span>
          <TypeBadge typeName={typeName} />
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onAdd(node.id)}
          className="text-xs font-medium text-primary opacity-0 group-hover:opacity-100 transition-all"
          aria-label={`Add child unit under ${node.name}`}
        >
          + Add
        </Button>
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
          toast.success("Organization unit created successfully");
          setShowAddDialog(false);
          setNewUnitName("");
        },
        onError: (err) => {
          toast.error(err.message || "Failed to create organization unit");
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
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8">
            <p className="text-sm text-destructive mb-4">
              {error?.message || "Failed to load organization data"}
            </p>
            <Button onClick={() => refetch()}>Retry</Button>
          </CardContent>
        </Card>
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
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="h-5 w-48 rounded bg-muted mb-2" />
                <div className="h-4 w-24 rounded bg-muted" />
              </CardContent>
            </Card>
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
          <Button variant="outline" size="sm" onClick={expandAll}>
            Expand All
          </Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>
            Collapse All
          </Button>
          <Button size="sm" onClick={() => handleAdd(null)}>
            Add Root Unit
          </Button>
        </div>
      </AppBar>

      <Card className="py-2">
        <CardContent className="p-0">
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
        </CardContent>
      </Card>

      {/* Add Org Unit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {addParentId ? "Add Child Unit" : "Add Root Unit"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitAdd} className="space-y-3">
            <div className="space-y-1">
              <Label htmlFor="unit-name">Name</Label>
              <Input
                id="unit-name"
                type="text"
                required
                value={newUnitName}
                onChange={(e) => setNewUnitName(e.target.value)}
                placeholder="Enter unit name"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="unit-type">Type</Label>
              <Select
                value={newUnitTypeId}
                onValueChange={setNewUnitTypeId}
              >
                <SelectTrigger id="unit-type">
                  <SelectValue placeholder="Select type" />
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
            <DialogFooter className="mt-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => setShowAddDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={createOrgUnit.isPending}>
                {createOrgUnit.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
