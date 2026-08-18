"use client";

import { useState, useMemo } from "react";
import { motion } from "motion/react";
import { AppBar } from "@/components/layout/app-bar";
import {
  useOrgUnits,
  useCreateOrgUnit,
  OrganizationUnit,
} from "@/services/organizations.service";
import { COMPANY_ID } from "@/services/admin.service";
import { Button } from "@vkieu/mui/buttons";
import { IconButton } from "@vkieu/mui/buttons";
import { Icon } from "@vkieu/mui";
import { Card, CardContent } from "@vkieu/mui";
import { Chip } from "@vkieu/mui";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip } from "@vkieu/mui";
import { TextField } from "@vkieu/mui";
import { Select } from "@vkieu/mui";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@vkieu/mui";
import { toast } from "sonner";
import { pageTransitionVariants, defaultTransition } from "@/lib/motion";

// ─── Tree building ────────────────────────────────────────────────────────────

interface OrgUnitNode extends OrganizationUnit {
  children: OrgUnitNode[];
}

function buildTree(units: OrganizationUnit[]): OrgUnitNode[] {
  const map = new Map<string, OrgUnitNode>();
  const roots: OrgUnitNode[] = [];

  for (const unit of units) {
    map.set(unit.id, { ...unit, children: [] });
  }

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

// ─── Type icon mapping ────────────────────────────────────────────────────────

const TYPE_ICONS: Record<string, string> = {
  Division: "domain",
  Department: "apartment",
  Tribe: "hub",
  Cluster: "workspaces",
  Squad: "group_work",
};

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
  const typeIcon = TYPE_ICONS[typeName] ?? "folder";

  return (
    <div>
      <div
        className="group flex items-center justify-between rounded-lg px-3 py-2 hover:bg-surface-foreground/8 transition-colors"
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
      >
        <div className="flex items-center gap-2">
          {hasChildren ? (
            <IconButton
              variant="standard"
              size="xs"
              onClick={() => onToggle(node.id)}
              aria-label={isExpanded ? `Collapse ${node.name}` : `Expand ${node.name}`}
            >
              <Icon name={isExpanded ? "expand_more" : "chevron_right"} size={20} />
            </IconButton>
          ) : (
            <span className="flex w-8 h-8 items-center justify-center">
              <Icon name="remove" size={18} className="text-surface-variant-foreground/40" />
            </span>
          )}
          <Icon name={typeIcon} size={20} className="text-primary" />
          <span className="text-[14px] leading-5 font-medium text-surface-foreground">{node.name}</span>
          <Chip variant="assist">{typeName}</Chip>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity">
          <Tooltip content="Add child unit">
            <IconButton
              variant="standard"
              size="xs"
              onClick={() => onAdd(node.id)}
              aria-label={`Add child unit under ${node.name}`}
            >
              <Icon name="add" size={18} className="text-primary" />
            </IconButton>
          </Tooltip>
        </div>
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
      <div className="space-y-6">
        <AppBar>
          <div>
            <h1 className="text-[28px] leading-9 font-normal text-surface-foreground">Engineering</h1>
            <p className="text-[14px] leading-5 text-surface-variant-foreground">
              Organization structure — Departments, Tribes, Clusters, and Squads.
            </p>
          </div>
        </AppBar>
        <Card variant="elevated" className="max-w-lg mx-auto">
          <CardContent className="flex flex-col items-center py-12 px-8 text-center">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-error/12 mb-4">
              <Icon name="error" size={24} className="text-error" />
            </div>
            <h2 className="text-[22px] leading-7 font-normal text-surface-foreground mb-2">
              Unable to load data
            </h2>
            <p className="text-[14px] leading-5 text-surface-variant-foreground mb-6">
              {error?.message || "Failed to load organization data"}
            </p>
            <Button variant="tonal" onClick={() => refetch()}>
              <Icon name="refresh" size={18} />
              Retry
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <AppBar>
          <div>
            <h1 className="text-[28px] leading-9 font-normal text-surface-foreground">Engineering</h1>
            <p className="text-[14px] leading-5 text-surface-variant-foreground">
              Organization structure — Departments, Tribes, Clusters, and Squads.
            </p>
          </div>
        </AppBar>
        <Card variant="elevated">
          <CardContent className="space-y-4 p-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3" style={{ paddingLeft: `${(i % 3) * 24}px` }}>
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-5 w-40" />
                <Skeleton className="h-6 w-16 rounded-lg" />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <motion.div
      className="space-y-6"
      variants={pageTransitionVariants}
      initial="initial"
      animate="enter"
      exit="exit"
      transition={defaultTransition}
    >
      {/* Header */}
      <AppBar className="justify-between">
        <div>
          <h1 className="text-[28px] leading-9 font-normal text-surface-foreground">Engineering</h1>
          <p className="text-[14px] leading-5 text-surface-variant-foreground">
            Organization structure — Departments, Tribes, Clusters, and Squads.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outlined" onClick={expandAll}>
            <Icon name="unfold_more" size={18} />
            Expand All
          </Button>
          <Button variant="outlined" onClick={collapseAll}>
            <Icon name="unfold_less" size={18} />
            Collapse All
          </Button>
          <Button onClick={() => handleAdd(null)}>
            <Icon name="add" size={18} />
            Add Root Unit
          </Button>
        </div>
      </AppBar>

      {/* Tree */}
      <Card variant="elevated">
        <CardContent className="p-2">
          {tree.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-surface-variant/20 mb-4">
                <Icon name="account_tree" size={24} className="text-surface-variant-foreground" />
              </div>
              <h2 className="text-[22px] leading-7 font-normal text-surface-foreground mb-2">
                No units yet
              </h2>
              <p className="text-[14px] leading-5 text-surface-variant-foreground mb-6">
                No organization units found. Create one to get started.
              </p>
              <Button onClick={() => handleAdd(null)}>
                <Icon name="add" size={18} />
                Add Root Unit
              </Button>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {addParentId ? "Add Child Unit" : "Add Root Unit"}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitAdd} className="space-y-4">
            <TextField
              variant="outlined"
              label="Name"
              required
              value={newUnitName}
              onChange={(e) => setNewUnitName(e.target.value)}
              placeholder="Enter unit name"
            />
            <div className="space-y-1">
              <label className="text-[12px] leading-4 text-surface-variant-foreground">Type</label>
              <Select
                value={newUnitTypeId}
                onValueChange={setNewUnitTypeId}
                placeholder="Select type"
                variant="outlined"
                options={orgUnitTypes.map((t) => ({
                  value: t.id,
                  label: t.name,
                }))}
              />
            </div>
            <DialogFooter>
              <Button
                type="button"
                variant="text"
                onClick={() => setShowAddDialog(false)}
              >
                Cancel
              </Button>
              <Button type="submit" variant="text" disabled={createOrgUnit.isPending}>
                {createOrgUnit.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
