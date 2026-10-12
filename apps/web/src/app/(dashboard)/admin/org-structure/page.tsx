"use client";
import type React from "react";

import { useState, useMemo, useCallback } from "react";
import { motion } from "motion/react";
import {
  SearchBar,
  TopAppBar,
  Card,
  TooltipTrigger,
  Tooltip,
  TextField,
  AssistChip,
  List,
  ListItem,
  Dialog, DialogContent, DialogTitle, DialogActions,
  Button,
  IconButton,
  Select,
  SelectItem,
} from "@vkieu/windmorph";
import { Icon } from "@/components/ui/icon";
import { CardContent } from "@/components/ui/card-content";
import { Skeleton, SkeletonGroup } from "@vkieu/windmorph/vk";
import { useToast } from "@/hooks/use-toast";
import {
  useOrgUnits,
  useOrgUnitTree,
  useCreateOrgUnit,
  useUpdateOrgUnit,
  useDeleteOrgUnit,
  type OrganizationUnit,
} from "@/services";
import { useOrgUnitTypes } from "@/services";
import { useCompanyId } from "@/hooks/use-company";
import { useReducedMotionContext } from "@/components/accessibility/reduced-motion";
import {
  pageTransitionVariants,
  defaultTransition,
  resolveAnimationVariants,
} from "@/lib/motion";
import { OrgUnitFlow } from "@/components/flow-org/OrgUnitFlow";

// Legacy compatibility type for interactive ListItem
// Legacy compatibility - TypeScript cast for interactive list items
const ListItemWithClick = ListItem as unknown as (props: React.ComponentProps<typeof ListItem> & { onClick?: () => void; selected?: boolean; }) => React.ReactElement;


// ─── Tree types ───────────────────────────────────────────────────────────────

interface OrgTreeNode {
  id: string;
  name: string;
  typeId: string;
  typeName: string;
  typeColor: string;
  typeIcon: string;
  parentId: string | null;
  children: OrgTreeNode[];
}

// ─── Tree helpers ─────────────────────────────────────────────────────────────

function buildTree(units: OrganizationUnit[]): OrgTreeNode[] {
  const nodeMap = new Map<string, OrgTreeNode>();

  for (const unit of units) {
    nodeMap.set(unit.id, {
      id: unit.id,
      name: unit.name,
      typeId: unit.typeId,
      typeName: unit.type?.name ?? "Unknown",
      typeColor: unit.type?.color ?? "#6B7280",
      typeIcon: unit.type?.icon ?? "folder",
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

// ─── TreeNode ─────────────────────────────────────────────────────────────────

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
    <div role="treeitem" aria-expanded={hasChildren ? expanded : undefined}>
      <div style={{ paddingInlineStart: `${depth * 24}px` }}>
        <ListItemWithClick
          className="group rounded-lg"
          leading={
          hasChildren ? (
            <IconButton
              variant="standard"
              size="xs"
              onClick={() => setExpanded(!expanded)}
              aria-label={expanded ? "Collapse" : "Expand"}
              icon={<Icon name={expanded ? "expand_more" : "chevron_right"} size={20} />}
            />
          ) : (
            <span className="inline-flex items-center justify-center h-8 w-8">
              <Icon name="remove" size={16} className="text-outline" />
            </span>
          )
        }
        trailing={
          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
            <TooltipTrigger placement="top">
              <IconButton variant="standard" size="xs" aria-label="Edit" onClick={() => onEdit(unit)} icon={<Icon name="edit" size={18} />} />
              <Tooltip>Edit</Tooltip>
            </TooltipTrigger>
            <TooltipTrigger placement="top">
              <IconButton variant="standard" size="xs" aria-label="Add child" onClick={() => onAddChild(unit.id)} icon={<Icon name="add" size={18} className="text-primary" />} />
              <Tooltip>Add child</Tooltip>
            </TooltipTrigger>
            <TooltipTrigger placement="top">
              <IconButton variant="standard" size="xs" aria-label="Archive" onClick={() => onArchive(unit.id)} icon={<Icon name="archive" size={18} />} />
              <Tooltip>Archive</Tooltip>
            </TooltipTrigger>
          </div>
        }
        onClick={() => hasChildren && setExpanded(!expanded)}
      >
        <span className="inline-flex items-center gap-3">
          <span className="shrink-0" style={{ color: unit.typeColor }}>
            <Icon name={unit.typeIcon} size={18} />
          </span>
          <span className="text-body-medium font-medium text-on-surface">{unit.name}</span>
          <span
            className="inline-flex items-center h-5 text-label-small px-2 rounded-full"
            style={{ backgroundColor: unit.typeColor + "20", color: unit.typeColor }}
          >
            {unit.typeName}
          </span>
        </span>
      </ListItemWithClick>
      </div>

      {expanded && hasChildren && (
        <div role="group">
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

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function TreeSkeleton() {
  return (
    <div className="space-y-1 p-2">
      <SkeletonGroup label="Loading org structure">
        {Array.from({ length: 8 }).map((_, i) => {
          const indent = [0, 1, 2, 2, 1, 2, 0, 1][i];
          return (
            <div
              key={i}
              className="flex items-center gap-3 px-3 py-2.5"
              style={{ paddingInlineStart: `${indent * 24 + 12}px` }}
            >
              <Skeleton className="h-5 w-5" corner="extra-small" />
              <Skeleton className="h-4 w-32" corner="extra-small" />
              <Skeleton className="h-5 w-14" corner="full" />
            </div>
          );
        })}
      </SkeletonGroup>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex flex-col items-center py-16 text-center">
      <div className="flex items-center justify-center h-20 w-20 rounded-full bg-primary/8 mb-6">
        <Icon name="account_tree" size={40} className="text-primary" />
      </div>
      <h2 className="text-headline-small text-on-surface mb-2">
        No units found
      </h2>
      <p className="text-body-medium text-on-surface-variant mb-6 max-w-xs">
        Create your first organization unit to start building your hierarchy.
      </p>
      <Button onClick={onCreateClick} leadingIcon={<Icon name="add" />}>
        Create Unit
      </Button>
    </div>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <Card variant="elevated" className="max-w-lg mx-auto">
      <CardContent className="flex flex-col items-center py-12 px-8 text-center">
        <div className="flex items-center justify-center h-16 w-16 rounded-full bg-error/12 mb-4">
          <Icon name="error" size={24} className="text-error" />
        </div>
        <h2 className="text-headline-small text-on-surface mb-2">
          Unable to load structure
        </h2>
        <p className="text-body-medium text-on-surface-variant mb-6">
          Something went wrong loading your hierarchy. Please try again.
        </p>
        <Button variant="tonal" onClick={onRetry}>
          <Icon name="refresh" size={18} />
          Retry
        </Button>
      </CardContent>
    </Card>
  );
}

// ─── Create / Edit dialog ─────────────────────────────────────────────────────

interface OrgUnitDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: OrgTreeNode | null;
  formData: { name: string; typeId: string; parentId: string };
  onFormChange: (data: { name: string; typeId: string; parentId: string }) => void;
  onSubmit: () => void;
  isPending: boolean;
  orgUnitTypes: { id: string; name: string }[];
  orgUnits: { id: string; name: string }[];
}

function OrgUnitDialog({
  open,
  onOpenChange,
  editing,
  formData,
  onFormChange,
  onSubmit,
  isPending,
  orgUnitTypes,
  orgUnits,
}: OrgUnitDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} icon={<Icon name={editing ? "edit" : "add_circle"} />}>
      <DialogTitle>
        {editing ? "Edit Organization Unit" : "Create Organization Unit"}
      </DialogTitle>
      <DialogContent>
        <p className="text-body-medium text-on-surface-variant mb-4">
          {editing
            ? "Update the details for this organization unit."
            : "Add a new unit to your organization hierarchy."}
        </p>
        <div className="space-y-4">
          <TextField
            variant="outlined"
            label="Name"
            className="w-full"
            value={formData.name}
            onChange={(value) => onFormChange({ ...formData, name: value })}
            placeholder="e.g., Engineering"
            onKeyDown={(e) => { if (e.key === "Enter" && formData.name.trim()) onSubmit(); }}
          />
          <Select
            label="Type"
            selectedKey={formData.typeId}
            onSelectionChange={(key) =>
              onFormChange({ ...formData, typeId: key == null ? "" : String(key) })
            }
            placeholder="Select a type..."
            variant="outlined"
          >
            {orgUnitTypes.map((t) => (
              <SelectItem key={t.id}>{t.name}</SelectItem>
            ))}
          </Select>
          <Select
            label="Parent Unit"
            selectedKey={formData.parentId || "none"}
            onSelectionChange={(key) =>
              onFormChange({ ...formData, parentId: key === "none" || key == null ? "" : String(key) })
            }
            placeholder="None (root level)"
            variant="outlined"
          >
            {[
              <SelectItem key="none">None (root level)</SelectItem>,
              ...orgUnits.map((u) => <SelectItem key={u.id}>{u.name}</SelectItem>),
            ]}
          </Select>
        </div>
      </DialogContent>
      <DialogActions>
        <Button variant="text" onClick={() => onOpenChange(false)}>
          Cancel
        </Button>
        <Button
          variant="text"
          onClick={onSubmit}
          disabled={!formData.name.trim() || !formData.typeId || isPending}
        >
          {isPending ? "Saving..." : editing ? "Save Changes" : "Create"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function OrgStructurePage() {
  const toast = useToast();
  const companyId = useCompanyId();
  const reduced = useReducedMotionContext();

  // ── Local state ────────────────────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<"list" | "flow">("list");
  const [showModal, setShowModal] = useState(false);
  const [editingUnit, setEditingUnit] = useState<OrgTreeNode | null>(null);
  const [formData, setFormData] = useState({ name: "", typeId: "", parentId: "" });

  // ── Data ───────────────────────────────────────────────────────────────
  const { data: orgUnits = [], isLoading, error, refetch } = useOrgUnits(companyId);
  const { data: orgUnitTreeData = [] } = useOrgUnitTree(companyId);
  const { data: orgUnitTypes = [] } = useOrgUnitTypes(companyId);
  const createMutation = useCreateOrgUnit();
  const updateMutation = useUpdateOrgUnit();
  const deleteMutation = useDeleteOrgUnit();

  // ── Derived ────────────────────────────────────────────────────────────
  const tree = useMemo(() => buildTree(orgUnits), [orgUnits]);
  const filteredTree = useMemo(() => filterTree(tree, search), [tree, search]);
  const unitCount = orgUnits.length;

  // ── Handlers ───────────────────────────────────────────────────────────

  const openCreate = useCallback(
    (parentId?: string) => {
      setEditingUnit(null);
      setFormData({ name: "", typeId: "", parentId: parentId ?? "" });
      setShowModal(true);
    },
    [],
  );

  const openEdit = useCallback((unit: OrgTreeNode) => {
    setEditingUnit(unit);
    setFormData({ name: unit.name, typeId: unit.typeId, parentId: unit.parentId ?? "" });
    setShowModal(true);
  }, []);

  const openEditFromFlow = useCallback(
    (unit: OrganizationUnit) => {
      setEditingUnit({
        id: unit.id,
        name: unit.name,
        typeId: unit.typeId,
        typeName: unit.type?.name ?? "Unknown",
        typeColor: unit.type?.color ?? "#6B7280",
        typeIcon: unit.type?.icon ?? "folder",
        parentId: unit.parentId,
        children: [],
      });
      setFormData({ name: unit.name, typeId: unit.typeId, parentId: unit.parentId ?? "" });
      setShowModal(true);
    },
    [],
  );

  const handleSubmit = useCallback(() => {
    if (editingUnit) {
      updateMutation.mutate(
        {
          companyId,
          id: editingUnit.id,
          name: formData.name,
          typeId: formData.typeId || undefined,
          parentId: formData.parentId || null,
        },
        {
          onSuccess: () => {
            toast.success("Organization unit updated");
            setShowModal(false);
          },
          onError: (err) => toast.error(err.message || "Failed to update unit"),
        },
      );
    } else {
      createMutation.mutate(
        {
          companyId,
          name: formData.name,
          typeId: formData.typeId,
          parentId: formData.parentId || null,
        },
        {
          onSuccess: () => {
            toast.success("Organization unit created");
            setShowModal(false);
          },
          onError: (err) => toast.error(err.message || "Failed to create unit"),
        },
      );
    }
  }, [editingUnit, formData, companyId, createMutation, updateMutation, toast]);

  const handleArchive = useCallback(
    (id: string) => {
      deleteMutation.mutate(
        { companyId, id },
        {
          onSuccess: () => toast.success("Organization unit archived"),
          onError: (err) => toast.error(err.message || "Failed to archive unit"),
        },
      );
    },
    [companyId, deleteMutation, toast],
  );

  // ── Error state ────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="space-y-6">
        <TopAppBar
          title={<h1 className="text-headline-medium">Hierarchy</h1>}
          subtitle="Build and manage your organization's hierarchical structure."
        />
        <ErrorState onRetry={() => refetch()} />
      </div>
    );
  }

  // ── Main render ────────────────────────────────────────────────────────
  return (
    <motion.div
      className="flex flex-col h-full min-h-0 gap-6 overflow-hidden"
      variants={resolveAnimationVariants(pageTransitionVariants, reduced)}
      initial="initial"
      animate="enter"
      exit="exit"
      transition={defaultTransition}
    >
      {/* ── Page header ────────────────────────────────────────────────── */}
      <TopAppBar
        className="justify-between shrink-0"
        title={<h1 className="text-headline-medium">Hierarchy</h1>}
        subtitle="Build and manage your organization's hierarchical structure."
        actions={
          <Button onClick={() => openCreate()} leadingIcon={<Icon name="add" />}>
            Create Unit
          </Button>
        }
      />

      {/* ── Toolbar: search + stats + view toggle ──────────────────────── */}
      <div className="flex items-center gap-4 shrink-0">
        <SearchBar
          aria-label="Search"
          className="max-w-sm"
          value={search}
          onChange={setSearch}
          placeholder="Search units..."
        />

        {!isLoading && unitCount > 0 && (
          <AssistChip className="shrink-0">
            {unitCount} {unitCount === 1 ? "unit" : "units"}
          </AssistChip>
        )}

        <div className="ml-auto flex items-center gap-1 rounded-full bg-surface-container-highest/50 p-1">
          <TooltipTrigger placement="top">
            <IconButton
              variant={viewMode === "list" ? "tonal" : "standard"}
              size="xs"
              onClick={() => setViewMode("list")}
              aria-label="List view"
              aria-pressed={viewMode === "list"}
              icon={<Icon name="list" size={18} />}
            />
            <Tooltip>List view</Tooltip>
          </TooltipTrigger>
          <TooltipTrigger placement="top">
            <IconButton
              variant={viewMode === "flow" ? "tonal" : "standard"}
              size="xs"
              onClick={() => setViewMode("flow")}
              aria-label="Flow view"
              aria-pressed={viewMode === "flow"}
              icon={<Icon name="account_tree" size={18} />}
            />
            <Tooltip>Flow view</Tooltip>
          </TooltipTrigger>
        </div>
      </div>

      {/* ── List view ──────────────────────────────────────────────────── */}
      {viewMode === "list" && (
        <Card variant="elevated" className="flex-1 min-h-0 overflow-hidden">
          <CardContent className="p-0 h-full overflow-y-auto">
            {isLoading ? (
              <TreeSkeleton />
            ) : filteredTree.length === 0 ? (
              <EmptyState onCreateClick={() => openCreate()} />
            ) : (
              <List aria-label="List" className="py-1">
                {filteredTree.map((unit) => (
                  <TreeNode
                    key={unit.id}
                    unit={unit}
                    onEdit={openEdit}
                    onArchive={handleArchive}
                    onAddChild={(parentId) => openCreate(parentId)}
                  />
                ))}
              </List>
            )}
          </CardContent>
        </Card>
      )}

      {/* ── Flow view ──────────────────────────────────────────────────── */}
      {viewMode === "flow" && (
        orgUnitTreeData.length === 0 && !isLoading ? (
          <Card variant="elevated">
            <CardContent className="p-0">
              <EmptyState
                onCreateClick={() => {
                  setViewMode("list");
                  openCreate();
                }}
              />
            </CardContent>
          </Card>
        ) : (
          <OrgUnitFlow
            tree={orgUnitTreeData}
            onEdit={openEditFromFlow}
            onAddChild={(parentId) => openCreate(parentId)}
            onArchive={handleArchive}
          />
        )
      )}

      {/* ── Create / Edit dialog ───────────────────────────────────────── */}
      <OrgUnitDialog
        open={showModal}
        onOpenChange={setShowModal}
        editing={editingUnit}
        formData={formData}
        onFormChange={setFormData}
        onSubmit={handleSubmit}
        isPending={createMutation.isPending || updateMutation.isPending}
        orgUnitTypes={orgUnitTypes}
        orgUnits={orgUnits}
      />
    </motion.div>
  );
}
