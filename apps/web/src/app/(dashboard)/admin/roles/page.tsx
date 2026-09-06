"use client";

import { useState, useCallback, useMemo, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "motion/react";
import { Search } from "@vkieu/mui";
import { Chip } from "@vkieu/mui";
import { Button } from "@vkieu/mui/buttons";
import { Icon } from "@vkieu/mui";
import { Card, CardContent } from "@vkieu/mui";
import { Checkbox } from "@vkieu/mui";
import { TextField } from "@vkieu/mui";
import { Skeleton } from "@/components/ui/skeleton";
import { Divider } from "@vkieu/mui";
import { Tooltip } from "@vkieu/mui";
import { List, ListItem } from "@vkieu/mui";
import { Select } from "@vkieu/mui";
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
  useRoles,
  useCreateRole,
  useRolePermissions,
  useBulkRolePermissions,
  useAllFeatures,
  useFeatures,
  type AdminRole,
  type AdminFeature,
  type RolePermissionDetail,
} from "@/services";
import { useCompanyId } from "@/hooks/use-company";
import { pageTransitionVariants, defaultTransition } from "@/lib/motion";

// ─── Types ──────────────────────────────────────────────────────────────────────

type Scope = "OWN" | "DIRECT_REPORTS" | "ORGANIZATION_UNIT" | "BRANCH" | "COMPANY" | "GLOBAL";

/** Local draft: maps "featureKey:permissionKey" → scope */
type DraftPermissions = Map<string, Scope>;

const scopeOptions: Scope[] = ["OWN", "DIRECT_REPORTS", "ORGANIZATION_UNIT", "BRANCH", "COMPANY", "GLOBAL"];

const scopeLabels: Record<Scope, string> = {
  OWN: "Own",
  DIRECT_REPORTS: "Direct Reports",
  ORGANIZATION_UNIT: "Org Unit",
  BRANCH: "Branch",
  COMPANY: "Company",
  GLOBAL: "Global",
};

function draftKey(featureKey: string, permissionKey: string) {
  return `${featureKey}:${permissionKey}`;
}

// ─── Build draft from server state ──────────────────────────────────────────────

function buildServerDraft(rolePermissions: RolePermissionDetail | undefined): DraftPermissions {
  const draft: DraftPermissions = new Map();
  if (!rolePermissions?.permissions) return draft;
  for (const rp of rolePermissions.permissions) {
    const key = draftKey(rp.featurePermission.feature.key, rp.featurePermission.key);
    draft.set(key, rp.scope as Scope);
  }
  return draft;
}

function draftsEqual(a: DraftPermissions, b: DraftPermissions): boolean {
  if (a.size !== b.size) return false;
  for (const [key, scope] of a) {
    if (b.get(key) !== scope) return false;
  }
  return true;
}

// ─── Compute diff for bulk API ──────────────────────────────────────────────────

interface BulkEntry { featureKey: string; permissionKey: string; scope: string }

function computeDiff(
  serverDraft: DraftPermissions,
  localDraft: DraftPermissions,
): { add: BulkEntry[]; remove: BulkEntry[] } {
  const add: BulkEntry[] = [];
  const remove: BulkEntry[] = [];

  // Added or scope-changed
  for (const [key, scope] of localDraft) {
    const [featureKey, permissionKey] = key.split(":");
    const serverScope = serverDraft.get(key);
    if (!serverScope) {
      add.push({ featureKey, permissionKey, scope });
    } else if (serverScope !== scope) {
      // Scope changed: remove old, add new
      remove.push({ featureKey, permissionKey, scope: serverScope });
      add.push({ featureKey, permissionKey, scope });
    }
  }

  // Removed
  for (const [key, scope] of serverDraft) {
    if (!localDraft.has(key)) {
      const [featureKey, permissionKey] = key.split(":");
      remove.push({ featureKey, permissionKey, scope });
    }
  }

  return { add, remove };
}

// ─── Main Page ──────────────────────────────────────────────────────────────────

export default function RolesPage() {
  const companyId = useCompanyId();
  const { data: backendRoles, isLoading, error } = useRoles(companyId);
  const { data: allFeatures, isLoading: featuresLoading } = useAllFeatures();
  const createRoleMutation = useCreateRole();
  const bulkPermissionMutation = useBulkRolePermissions();

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [roleSearch, setRoleSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set());
  const [mobileShowPermissions, setMobileShowPermissions] = useState(false);

  // Local draft state
  const [localDraft, setLocalDraft] = useState<DraftPermissions>(new Map());
  const [serverDraft, setServerDraft] = useState<DraftPermissions>(new Map());

  // Unsaved changes dialog
  const [pendingRoleSwitch, setPendingRoleSwitch] = useState<string | null>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);

  const roles: AdminRole[] = backendRoles ?? [];
  const effectiveSelectedId = selectedRoleId ?? roles[0]?.id ?? null;
  const selectedRole = roles.find((r) => r.id === effectiveSelectedId) ?? roles[0];

  const filteredRoles = roles.filter(
    (r) =>
      r.name.toLowerCase().includes(roleSearch.toLowerCase()) ||
      (r.description ?? "").toLowerCase().includes(roleSearch.toLowerCase()),
  );

  const {
    data: rolePermissionDetail,
    isLoading: permissionsLoading,
  } = useRolePermissions(companyId, effectiveSelectedId ?? "");

  // Get company feature toggles
  const { data: companyFeatures } = useFeatures(companyId);
  const disabledFeatureKeys = new Set(
    (companyFeatures ?? [])
      .filter((cf) => !cf.enabled)
      .map((cf) => cf.feature?.key)
      .filter(Boolean),
  );

  // Sync server state → local draft when role permissions load
  const lastSyncedRoleId = useRef<string | null>(null);
  useEffect(() => {
    if (rolePermissionDetail && effectiveSelectedId !== lastSyncedRoleId.current) {
      const draft = buildServerDraft(rolePermissionDetail);
      setServerDraft(draft);
      setLocalDraft(new Map(draft));
      lastSyncedRoleId.current = effectiveSelectedId;
    }
  }, [rolePermissionDetail, effectiveSelectedId]);

  // Also re-sync when rolePermissionDetail changes (e.g. after save invalidates query)
  useEffect(() => {
    if (rolePermissionDetail && effectiveSelectedId === lastSyncedRoleId.current) {
      const newServer = buildServerDraft(rolePermissionDetail);
      // Only re-sync if we're not in the middle of unsaved changes
      if (draftsEqual(newServer, serverDraft)) return;
      setServerDraft(newServer);
      setLocalDraft(new Map(newServer));
    }
  }, [rolePermissionDetail]);

  const isDirty = !draftsEqual(serverDraft, localDraft);
  const diff = useMemo(() => computeDiff(serverDraft, localDraft), [serverDraft, localDraft]);
  const changeCount = diff.add.length + diff.remove.length;

  // ─── Handlers ───────────────────────────────────────────────────────────

  const handleRoleSelect = (roleId: string) => {
    if (isDirty) {
      setPendingRoleSwitch(roleId);
      setShowUnsavedDialog(true);
    } else {
      lastSyncedRoleId.current = null; // Force re-sync
      setSelectedRoleId(roleId);
      setMobileShowPermissions(true);
    }
  };

  const handleDiscardAndSwitch = () => {
    if (pendingRoleSwitch) {
      lastSyncedRoleId.current = null;
      setSelectedRoleId(pendingRoleSwitch);
      setMobileShowPermissions(true);
    }
    setPendingRoleSwitch(null);
    setShowUnsavedDialog(false);
  };

  const handleDiscard = () => {
    setLocalDraft(new Map(serverDraft));
  };

  const handleSave = () => {
    if (!effectiveSelectedId || !isDirty) return;
    bulkPermissionMutation.mutate(
      { companyId, roleId: effectiveSelectedId, add: diff.add, remove: diff.remove },
      {
        onSuccess: () => {
          toast.success(`Saved ${changeCount} permission change${changeCount !== 1 ? "s" : ""}`);
          // Server draft will be updated via query invalidation
          lastSyncedRoleId.current = null; // Force re-sync on next data
        },
        onError: (err) => toast.error(err.message || "Failed to save permissions"),
      },
    );
  };

  const handleTogglePermission = useCallback(
    (featureKey: string, permissionKey: string, checked: boolean) => {
      setLocalDraft((prev) => {
        const next = new Map(prev);
        const key = draftKey(featureKey, permissionKey);
        if (checked) {
          next.set(key, "OWN");
        } else {
          next.delete(key);
        }
        return next;
      });
    },
    [],
  );

  const handleScopeChange = useCallback(
    (featureKey: string, permissionKey: string, newScope: Scope) => {
      setLocalDraft((prev) => {
        const next = new Map(prev);
        next.set(draftKey(featureKey, permissionKey), newScope);
        return next;
      });
    },
    [],
  );

  const handleSelectAll = useCallback(
    (feature: AdminFeature, checked: boolean) => {
      setLocalDraft((prev) => {
        const next = new Map(prev);
        for (const fp of feature.permissions) {
          const key = draftKey(feature.key, fp.key);
          if (checked) {
            if (!next.has(key)) next.set(key, "OWN");
          } else {
            next.delete(key);
          }
        }
        return next;
      });
    },
    [],
  );

  const toggleFeatureExpanded = (featureId: string) => {
    setExpandedFeatures((prev) => {
      const next = new Set(prev);
      if (next.has(featureId)) next.delete(featureId);
      else next.add(featureId);
      return next;
    });
  };

  const expandAll = () => {
    const featureCatalog: AdminFeature[] = allFeatures ?? [];
    setExpandedFeatures(new Set(featureCatalog.map((f) => f.id)));
  };

  const collapseAll = () => setExpandedFeatures(new Set());

  const handleCreateRole = () => {
    if (!newRoleName.trim()) return;
    createRoleMutation.mutate(
      { companyId, name: newRoleName.trim(), description: newRoleDescription.trim() || undefined },
      {
        onSuccess: (newRole) => {
          toast.success("Role created");
          lastSyncedRoleId.current = null;
          setSelectedRoleId(newRole.id);
          setNewRoleName("");
          setNewRoleDescription("");
          setShowCreateModal(false);
        },
        onError: (err) => toast.error(err.message || "Failed to create role"),
      },
    );
  };

  const handleDuplicateRole = () => {
    if (!selectedRole) return;
    createRoleMutation.mutate(
      { companyId, name: `${selectedRole.name} (Copy)`, description: selectedRole.description || undefined },
      {
        onSuccess: (newRole) => {
          toast.success("Role duplicated");
          lastSyncedRoleId.current = null;
          setSelectedRoleId(newRole.id);
        },
        onError: (err) => toast.error(err.message || "Failed to duplicate role"),
      },
    );
  };

  // ─── Loading State ────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <motion.div className="flex flex-col h-full" variants={pageTransitionVariants} initial="initial" animate="enter" exit="exit" transition={defaultTransition}>
        <PageHeader onCreateClick={() => {}} />
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[420px_1fr] gap-0 mt-6 min-h-0">
          <div className="border-r border-outline-variant p-4 space-y-3">
            <Skeleton className="h-14 w-full rounded-full" />
            <div className="space-y-2 mt-4">
              {Array.from({ length: 6 }).map((_, i) => (<Skeleton key={i} className="h-18 w-full rounded-lg" />))}
            </div>
          </div>
          <div className="p-6 space-y-6">
            <div className="space-y-2"><Skeleton className="h-7 w-48" /><Skeleton className="h-4 w-72" /></div>
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (<Skeleton key={i} className="h-48 w-full rounded-xl" />))}
            </div>
          </div>
        </div>
      </motion.div>
    );
  }

  // ─── Error State ──────────────────────────────────────────────────────────────
  if (error) {
    return (
      <motion.div className="flex flex-col h-full" variants={pageTransitionVariants} initial="initial" animate="enter" exit="exit" transition={defaultTransition}>
        <PageHeader onCreateClick={() => {}} />
        <div className="flex-1 flex items-center justify-center">
          <Card variant="outlined" className="max-w-sm w-full">
            <CardContent className="flex flex-col items-center py-12 px-8 text-center">
              <div className="flex items-center justify-center h-14 w-14 rounded-full bg-error/12 mb-4">
                <Icon name="error" size={24} className="text-destructive" />
              </div>
              <p className="text-[16px] leading-6 font-medium text-foreground mb-1">Unable to load roles</p>
              <p className="text-[14px] leading-5 text-muted-foreground">Something went wrong. Please try again later.</p>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    );
  }

  // ─── Empty State ──────────────────────────────────────────────────────────────
  if (roles.length === 0) {
    return (
      <motion.div className="flex flex-col h-full" variants={pageTransitionVariants} initial="initial" animate="enter" exit="exit" transition={defaultTransition}>
        <PageHeader onCreateClick={() => setShowCreateModal(true)} />
        <div className="flex-1 flex items-center justify-center">
          <div className="flex flex-col items-center text-center max-w-sm">
            <div className="flex items-center justify-center h-20 w-20 rounded-full bg-primary/8 mb-6">
              <Icon name="shield" size={40} className="text-primary" />
            </div>
            <h2 className="text-[22px] leading-7 font-normal text-foreground mb-2">No roles yet</h2>
            <p className="text-[14px] leading-5 text-muted-foreground mb-6">Create your first role to start managing permissions.</p>
            <Button onClick={() => setShowCreateModal(true)}><Icon name="add" size={18} />Create your first role</Button>
          </div>
        </div>
        <CreateRoleDialog open={showCreateModal} onOpenChange={setShowCreateModal} name={newRoleName} onNameChange={setNewRoleName} description={newRoleDescription} onDescriptionChange={setNewRoleDescription} onSubmit={handleCreateRole} isPending={createRoleMutation.isPending} />
      </motion.div>
    );
  }

  const featureCatalog: AdminFeature[] = allFeatures ?? [];

  return (
    <motion.div className="flex flex-col h-full" variants={pageTransitionVariants} initial="initial" animate="enter" exit="exit" transition={defaultTransition}>
      <PageHeader onCreateClick={() => setShowCreateModal(true)} />

      {/* Master-Detail Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[420px_1fr] mt-6 min-h-0 border border-outline-variant rounded-xl overflow-hidden bg-surface">
        {/* Left: Role List */}
        <div className="border-b lg:border-b-0 lg:border-r border-outline-variant flex flex-col min-h-0">
          <div className="p-3 shrink-0">
            <Search value={roleSearch} onValueChange={setRoleSearch} placeholder="Search roles..." className="min-w-0 w-full max-w-none mx-0" />
          </div>
          <Divider />
          <div className="flex-1 overflow-y-auto">
            <List className="py-0">
              {filteredRoles.map((role) => {
                const isSelected = role.id === effectiveSelectedId;
                return (
                  <ListItem
                    key={role.id}
                    interactive
                    selected={isSelected}
                    lines={2}
                    leading={<Icon name="shield" size={24} className={isSelected ? "text-primary" : "text-surface-variant-foreground"} />}
                    trailing={role.isSystem ? <Chip variant="filter" selected className="text-[11px] h-6 px-2">System</Chip> : undefined}
                    supporting={role.description ?? undefined}
                    onClick={() => handleRoleSelect(role.id)}
                  >
                    {role.name}
                  </ListItem>
                );
              })}
            </List>
            {filteredRoles.length === 0 && roleSearch && (
              <div className="flex flex-col items-center py-8 text-center px-4">
                <Icon name="search_off" size={24} className="text-muted-foreground/40 mb-2" />
                <p className="text-[14px] leading-5 text-muted-foreground">No roles matching &ldquo;{roleSearch}&rdquo;</p>
              </div>
            )}
          </div>
        </div>

        {/* Right: Permission Matrix */}
        <div className={`flex flex-col min-h-0 ${!mobileShowPermissions ? "hidden lg:flex" : "flex"}`}>
          {selectedRole ? (
            <>
              {/* Role Header */}
              <div className="shrink-0 px-6 py-4 border-b border-outline-variant bg-surface-container-low/50">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-3 mb-1">
                      <button type="button" onClick={() => setMobileShowPermissions(false)} className="lg:hidden flex items-center justify-center h-10 w-10 -ml-2 rounded-full hover:bg-surface-foreground/8 transition-colors" aria-label="Back to roles">
                        <Icon name="arrow_back" size={20} />
                      </button>
                      <h2 className="text-[22px] leading-7 font-normal text-foreground truncate">{selectedRole.name}</h2>
                      {selectedRole.isSystem && <Chip variant="filter" selected className="shrink-0">System</Chip>}
                    </div>
                    {selectedRole.description && (
                      <p className="text-[14px] leading-5 text-muted-foreground lg:pl-0 pl-10">{selectedRole.description}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Tooltip content="Duplicate this role" side="bottom">
                      <Button variant="tonal" onClick={handleDuplicateRole} disabled={createRoleMutation.isPending}>
                        <Icon name="content_copy" size={18} />Duplicate
                      </Button>
                    </Tooltip>
                  </div>
                </div>
              </div>

              {/* Permission Matrix */}
              <div className="flex-1 overflow-y-auto p-6">
                {(permissionsLoading || featuresLoading) ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <div key={i} className="space-y-3"><Skeleton className="h-5 w-40" /><Skeleton className="h-40 w-full rounded-xl" /></div>
                    ))}
                  </div>
                ) : (
                  <PermissionMatrix
                    features={featureCatalog.filter((f) => !disabledFeatureKeys.has(f.key))}
                    localDraft={localDraft}
                    onToggle={handleTogglePermission}
                    onScopeChange={handleScopeChange}
                    onSelectAll={handleSelectAll}
                    expandedFeatures={expandedFeatures}
                    onToggleFeature={toggleFeatureExpanded}
                    onExpandAll={expandAll}
                    onCollapseAll={collapseAll}
                  />
                )}
              </div>

              {/* Floating Save Bar */}
              <AnimatePresence>
                {isDirty && (
                  <motion.div
                    initial={{ y: 80, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    exit={{ y: 80, opacity: 0 }}
                    transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                    className="shrink-0 border-t border-outline-variant bg-surface-container px-6 py-3 flex items-center justify-between gap-4"
                  >
                    <p className="text-[13px] text-surface-variant-foreground">
                      <span className="font-medium text-foreground">{changeCount}</span> unsaved change{changeCount !== 1 ? "s" : ""}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button variant="text" onClick={handleDiscard} disabled={bulkPermissionMutation.isPending}>
                        Discard
                      </Button>
                      <Button onClick={handleSave} disabled={bulkPermissionMutation.isPending}>
                        <Icon name="save" size={18} />
                        {bulkPermissionMutation.isPending ? "Saving..." : "Save Changes"}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center text-center px-4">
                <Icon name="shield" size={48} className="text-muted-foreground/30 mb-3" />
                <p className="text-[14px] leading-5 text-muted-foreground">Select a role to view permissions</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Create Role Dialog */}
      <CreateRoleDialog open={showCreateModal} onOpenChange={setShowCreateModal} name={newRoleName} onNameChange={setNewRoleName} description={newRoleDescription} onDescriptionChange={setNewRoleDescription} onSubmit={handleCreateRole} isPending={createRoleMutation.isPending} />

      {/* Unsaved Changes Dialog */}
      <Dialog open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}>
        <DialogContent icon="warning">
          <DialogHeader centered>
            <DialogTitle>Unsaved Changes</DialogTitle>
            <DialogDescription>
              You have {changeCount} unsaved permission change{changeCount !== 1 ? "s" : ""} for {selectedRole?.name}.
              Switching roles will discard them.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="text" onClick={() => { setShowUnsavedDialog(false); setPendingRoleSwitch(null); }}>
              Stay
            </Button>
            <Button variant="text" onClick={() => { handleSave(); setShowUnsavedDialog(false); setPendingRoleSwitch(null); }}>
              Save & Switch
            </Button>
            <Button variant="text" className="text-error" onClick={handleDiscardAndSwitch}>
              Discard
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}

// ─── Page Header ────────────────────────────────────────────────────────────────

function PageHeader({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex items-center justify-between gap-4 shrink-0">
      <div>
        <h1 className="text-[24px] leading-8 font-normal text-foreground">Roles & Permissions</h1>
        <p className="text-[14px] leading-5 text-muted-foreground mt-1">Define roles and manage feature-level access with granular scope control.</p>
      </div>
      <Button onClick={onCreateClick} className="shrink-0"><Icon name="add" size={18} />Create Role</Button>
    </div>
  );
}

// ─── Create Role Dialog ─────────────────────────────────────────────────────────

interface CreateRoleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  onNameChange: (value: string) => void;
  description: string;
  onDescriptionChange: (value: string) => void;
  onSubmit: () => void;
  isPending: boolean;
}

function CreateRoleDialog({ open, onOpenChange, name, onNameChange, description, onDescriptionChange, onSubmit, isPending }: CreateRoleDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent icon="shield">
        <DialogHeader centered>
          <DialogTitle>Create Role</DialogTitle>
          <DialogDescription>Create a new role to assign feature permissions and scope access.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <TextField variant="outlined" label="Role Name" value={name} onChange={(e) => onNameChange(e.target.value)} placeholder="e.g., Finance Administrator" onKeyDown={(e) => { if (e.key === "Enter") onSubmit(); }} />
          <TextField variant="outlined" label="Description" value={description} onChange={(e) => onDescriptionChange(e.target.value)} placeholder="Brief description of responsibilities" />
        </div>
        <DialogFooter>
          <Button variant="text" onClick={() => { onOpenChange(false); onNameChange(""); onDescriptionChange(""); }}>Cancel</Button>
          <Button variant="text" onClick={onSubmit} disabled={!name.trim() || isPending}>{isPending ? "Creating..." : "Create"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ─── Permission Matrix ──────────────────────────────────────────────────────────

interface PermissionMatrixProps {
  features: AdminFeature[];
  localDraft: DraftPermissions;
  onToggle: (featureKey: string, permissionKey: string, checked: boolean) => void;
  onScopeChange: (featureKey: string, permissionKey: string, newScope: Scope) => void;
  onSelectAll: (feature: AdminFeature, checked: boolean) => void;
  expandedFeatures: Set<string>;
  onToggleFeature: (featureId: string) => void;
  onExpandAll: () => void;
  onCollapseAll: () => void;
}

function PermissionMatrix({
  features,
  localDraft,
  onToggle,
  onScopeChange,
  onSelectAll,
  expandedFeatures,
  onToggleFeature,
  onExpandAll,
  onCollapseAll,
}: PermissionMatrixProps) {
  if (!features.length) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <div className="flex items-center justify-center h-16 w-16 rounded-full bg-surface-variant/50 mb-4">
          <Icon name="lock" size={24} className="text-muted-foreground/60" />
        </div>
        <p className="text-[16px] leading-6 font-medium text-foreground mb-1">No features available</p>
        <p className="text-[14px] leading-5 text-muted-foreground">Features will appear here once configured.</p>
      </div>
    );
  }

  const allExpanded = expandedFeatures.size === features.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-[12px] leading-4 font-medium text-muted-foreground uppercase tracking-wide">
          {features.length} {features.length === 1 ? "feature" : "features"}
        </p>
        <Button variant="text" onClick={allExpanded ? onCollapseAll : onExpandAll} className="text-[12px] h-8">
          {allExpanded ? "Collapse all" : "Expand all"}
        </Button>
      </div>

      {features.map((feature) => {
        const isExpanded = expandedFeatures.has(feature.id);
        const assignedCount = feature.permissions.filter((fp) =>
          localDraft.has(draftKey(feature.key, fp.key)),
        ).length;

        return (
          <Card key={feature.id} variant="outlined" className="overflow-hidden">
            <button type="button" onClick={() => onToggleFeature(feature.id)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-surface-foreground/4 transition-colors text-left">
              <Icon name="extension" size={20} className="text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <span className="text-[14px] leading-5 font-medium text-foreground">{feature.displayName}</span>
              </div>
              {assignedCount > 0 && (
                <span className="inline-flex items-center justify-center h-6 px-2 rounded-full bg-secondary-container text-secondary-container-foreground text-[11px] font-medium">
                  {assignedCount}/{feature.permissions.length}
                </span>
              )}
              <Icon name={isExpanded ? "expand_less" : "expand_more"} size={20} className="text-muted-foreground shrink-0" />
            </button>

            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.2, ease: [0.2, 0, 0, 1] }}
                  className="overflow-hidden"
                >
                  <Divider />
                  <div className="divide-y divide-outline-variant">
                    {/* Select All row */}
                    <div className="flex items-center gap-3 px-4 py-2 bg-surface-container-low/50">
                      <Checkbox
                        checked={assignedCount === feature.permissions.length && assignedCount > 0}
                        indeterminate={assignedCount > 0 && assignedCount < feature.permissions.length}
                        onCheckedChange={(checked) => onSelectAll(feature, checked === true)}
                      />
                      <span className="text-[13px] font-medium text-surface-variant-foreground">
                        {assignedCount === feature.permissions.length ? "Deselect all" : "Select all"}
                      </span>
                    </div>

                    {/* Permission rows */}
                    {feature.permissions.map((fp) => {
                      const key = draftKey(feature.key, fp.key);
                      const isEnabled = localDraft.has(key);
                      const currentScope = (localDraft.get(key) as Scope) ?? "OWN";

                      return (
                        <div key={fp.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-surface-foreground/4 transition-colors">
                          <Checkbox
                            checked={isEnabled}
                            onCheckedChange={(checked) => onToggle(feature.key, fp.key, checked === true)}
                          />
                          <span className={`flex-1 text-[14px] leading-5 min-w-0 truncate ${isEnabled ? "text-foreground" : "text-muted-foreground"}`}>
                            {fp.displayName}
                          </span>
                          <Select
                            value={currentScope}
                            disabled={!isEnabled}
                            onValueChange={(value) => onScopeChange(feature.key, fp.key, value as Scope)}
                            className={`h-8 w-35 text-[12px] border-outline-variant ${!isEnabled ? "opacity-40" : ""}`}
                            variant="outlined"
                            options={scopeOptions.map((s) => ({ value: s, label: scopeLabels[s] }))}
                          />
                        </div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </Card>
        );
      })}
    </div>
  );
}
