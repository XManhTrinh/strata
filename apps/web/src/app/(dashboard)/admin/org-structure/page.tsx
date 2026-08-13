"use client";

import { useState, useMemo } from "react";
import { motion } from "motion/react";
import { Search } from "@vkieu/mui";
import { AppBar } from "@/components/layout/app-bar";
import { Button } from "@vkieu/mui/buttons";
import { IconButton } from "@vkieu/mui/buttons";
import { Icon } from "@vkieu/mui";
import { Card, CardContent } from "@vkieu/mui";
import { Chip } from "@vkieu/mui";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip } from "@vkieu/mui";
import { TextField } from "@vkieu/mui";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@vkieu/mui";
import { toast } from "sonner";
import {
  useOrgUnits,
  useCreateOrgUnit,
  useUpdateOrgUnit,
  useDeleteOrgUnit,
  type OrganizationUnit,
} from "@/services";
import { useOrgUnitTypes, COMPANY_ID } from "@/services";
import { pageTransitionVariants, defaultTransition } from "@/lib/motion";

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
        className="group flex items-center gap-2 rounded-lg px-3 py-2 hover:bg-surface-foreground/8 transition-colors"
        style={{ paddingLeft: `${depth * 24 + 12}px` }}
      >
        {hasChildren ? (
          <IconButton
            variant="standard"
            size="xs"
            onClick={() => setExpanded(!expanded)}
            aria-label={expanded ? "Collapse" : "Expand"}
          >
            <Icon name={expanded ? "expand_more" : "chevron_right"} size={20} />
          </IconButton>
        ) : (
          <span className="inline-flex items-center justify-center h-8 w-8">
            <Icon name="remove" size={18} className="text-surface-variant-foreground/40" />
          </span>
        )}

        <div className="flex flex-1 items-center gap-3">
          <Icon name="folder" size={18} className="text-primary" />
          <span className="text-[14px] leading-5 font-medium text-surface-foreground">{unit.name}</span>
          <Chip variant="assist">{unit.typeName}</Chip>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <Tooltip content="Edit">
            <IconButton variant="standard" size="xs" aria-label="Edit" onClick={() => onEdit(unit)}>
              <Icon name="edit" size={18} />
            </IconButton>
          </Tooltip>
          <Tooltip content="Add child">
            <IconButton variant="standard" size="xs" aria-label="Add child" onClick={() => onAddChild(unit.id)}>
              <Icon name="add" size={18} className="text-primary" />
            </IconButton>
          </Tooltip>
          <Tooltip content="Archive">
            <IconButton variant="standard" size="xs" aria-label="Archive" onClick={() => onArchive(unit.id)}>
              <Icon name="archive" size={18} />
            </IconButton>
          </Tooltip>
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

  const { data: orgUnits = [], isLoading, error, refetch } = useOrgUnits(COMPANY_ID);
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
      <div className="space-y-6">
        <AppBar className="justify-between">
          <div>
            <h1 className="text-[28px] leading-9 font-normal text-surface-foreground">Organization Structure</h1>
            <p className="text-[14px] leading-5 text-surface-variant-foreground">
              Build and manage your organization&apos;s hierarchical structure.
            </p>
          </div>
        </AppBar>
        <Card variant="elevated" className="max-w-lg mx-auto">
          <CardContent className="flex flex-col items-center py-12 px-8 text-center">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-error/12 mb-4">
              <Icon name="error" size={24} className="text-error" />
            </div>
            <h2 className="text-[22px] leading-7 font-normal text-surface-foreground mb-2">
              Unable to load structure
            </h2>
            <p className="text-[14px] leading-5 text-surface-variant-foreground mb-6">
              Failed to load organization structure. Please try again.
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
          <h1 className="text-[28px] leading-9 font-normal text-surface-foreground">Organization Structure</h1>
          <p className="text-[14px] leading-5 text-surface-variant-foreground">
            Build and manage your organization&apos;s hierarchical structure.
          </p>
        </div>
        <Button onClick={() => openCreate()}>
          <Icon name="add" size={18} />
          Create Unit
        </Button>
      </AppBar>

      {/* Search */}
      <Search
        className="max-w-sm"
        value={search}
        onValueChange={setSearch}
        placeholder="Search units..."
      />

      {/* Tree */}
      <Card variant="elevated">
        <CardContent className="p-2">
          {isLoading ? (
            <div className="space-y-3 p-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3" style={{ paddingLeft: `${(i % 3) * 24}px` }}>
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-5 w-40" />
                  <Skeleton className="h-6 w-16 rounded-lg" />
                </div>
              ))}
            </div>
          ) : filteredTree.length === 0 ? (
            <div className="flex flex-col items-center py-12 text-center">
              <div className="flex items-center justify-center h-16 w-16 rounded-full bg-surface-variant/20 mb-4">
                <Icon name="account_tree" size={24} className="text-surface-variant-foreground" />
              </div>
              <h2 className="text-[22px] leading-7 font-normal text-surface-foreground mb-2">
                No units found
              </h2>
              <p className="text-[14px] leading-5 text-surface-variant-foreground mb-6">
                No organization units found. Create one to get started.
              </p>
              <Button onClick={() => openCreate()}>
                <Icon name="add" size={18} />
                Create Unit
              </Button>
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
        </CardContent>
      </Card>

      {/* Create/Edit Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingUnit ? "Edit Organization Unit" : "Create Organization Unit"}
            </DialogTitle>
            <DialogDescription>
              {editingUnit
                ? "Update the details for this organization unit."
                : "Add a new unit to your organization hierarchy."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <TextField
              variant="outlined"
              label="Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder="e.g., Engineering"
            />
            <div className="space-y-1">
              <label className="text-[12px] leading-4 text-surface-variant-foreground">Type</label>
              <Select
                value={formData.typeId}
                onValueChange={(value) => setFormData({ ...formData, typeId: value })}
              >
                <SelectTrigger>
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
            <div className="space-y-1">
              <label className="text-[12px] leading-4 text-surface-variant-foreground">Parent Unit</label>
              <Select
                value={formData.parentId || "none"}
                onValueChange={(value) => setFormData({ ...formData, parentId: value === "none" ? "" : value })}
              >
                <SelectTrigger>
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
          <DialogFooter>
            <Button variant="text" onClick={() => setShowModal(false)}>
              Cancel
            </Button>
            <Button
              variant="text"
              onClick={handleSubmit}
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {createMutation.isPending || updateMutation.isPending
                ? "Saving..."
                : editingUnit
                  ? "Save Changes"
                  : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
