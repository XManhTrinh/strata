"use client";
import type React from "react";

import { useState, useCallback, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {SearchBar,
  TopAppBar,Card,AssistChip,
  Checkbox,
  TextField,
  TooltipTrigger,
  Tooltip,
  Divider,
  List,
  ListItem,
  Dialog, DialogContent, DialogTitle, DialogActions,
  Button,
  IconButton,
  Select,
  SelectItem} from "@windmorph/react";
import { CardContent } from "@/components/ui/card-content";
import { Icon } from "@/components/ui/icon";
import { Skeleton, SkeletonGroup } from "@windmorph/react-pro";
import { useToast } from "@/hooks/use-toast";
import {
  useRoles,
  useCreateRole,
  useCreateAdminRole,
  useDeleteRole,
  useRolePermissions,
  useBulkRolePermissions,
  useAllFeatures,
  useFeatures,
  type AdminRole,
  type AdminFeature,
  type RolePermissionDetail,
} from "@/services";
import { useCompanyId } from "@/hooks/use-company";
import { useReducedMotionContext } from "@/components/accessibility/reduced-motion";
import { pageTransitionVariants, defaultTransition, resolveAnimationVariants } from "@/lib/motion";

// Legacy compatibility type for interactive ListItem
// Legacy compatibility - TypeScript cast for interactive list items
const ListItemWithClick = ListItem as unknown as (props: React.ComponentProps<typeof ListItem> & { onClick?: () => void; selected?: boolean; }) => React.ReactElement;


// ─── Types & constants ────────────────────────────────────────────────────────

type Scope = "OWN" | "DIRECT_REPORTS" | "ORGANIZATION_UNIT" | "BRANCH" | "COMPANY" | "GLOBAL";
type DraftPermissions = Map<string, Scope>;

const SCOPE_OPTIONS: Scope[] = ["OWN", "DIRECT_REPORTS", "ORGANIZATION_UNIT", "BRANCH", "COMPANY", "GLOBAL"];
const SCOPE_LABELS: Record<Scope, string> = {
  OWN: "Own",
  DIRECT_REPORTS: "Direct Reports",
  ORGANIZATION_UNIT: "Org Unit",
  BRANCH: "Branch",
  COMPANY: "Company",
  GLOBAL: "Global",
};

interface BulkEntry { featureKey: string; permissionKey: string; scope: string }

function draftKey(fk: string, pk: string) { return `${fk}:${pk}`; }

// ─── Draft helpers ────────────────────────────────────────────────────────────

function buildServerDraft(rp: RolePermissionDetail | undefined): DraftPermissions {
  const d: DraftPermissions = new Map();
  if (!rp?.permissions) return d;
  for (const p of rp.permissions) d.set(draftKey(p.featurePermission.feature.key, p.featurePermission.key), p.scope as Scope);
  return d;
}

function draftsEqual(a: DraftPermissions, b: DraftPermissions): boolean {
  if (a.size !== b.size) return false;
  for (const [k, v] of a) if (b.get(k) !== v) return false;
  return true;
}

function computeDiff(server: DraftPermissions, local: DraftPermissions): { add: BulkEntry[]; remove: BulkEntry[] } {
  const add: BulkEntry[] = [];
  const remove: BulkEntry[] = [];
  for (const [key, scope] of local) {
    const [fk, pk] = key.split(":");
    const ss = server.get(key);
    if (!ss) add.push({ featureKey: fk, permissionKey: pk, scope });
    else if (ss !== scope) { remove.push({ featureKey: fk, permissionKey: pk, scope: ss }); add.push({ featureKey: fk, permissionKey: pk, scope }); }
  }
  for (const [key, scope] of server) {
    if (!local.has(key)) { const [fk, pk] = key.split(":"); remove.push({ featureKey: fk, permissionKey: pk, scope }); }
  }
  return { add, remove };
}

// ─── Page header ──────────────────────────────────────────────────────────────

function PageHeader({
  onCreateClick,
  onAddAdmin,
  isAddingAdmin,
  showAddAdmin,
}: {
  onCreateClick: () => void;
  onAddAdmin: () => void;
  isAddingAdmin: boolean;
  showAddAdmin: boolean;
}) {
  return (
    <TopAppBar
      className="justify-between shrink-0"
      title={<h1 className="text-headline-small">Roles & Permissions</h1>}
      subtitle="Define roles and manage feature-level access with granular scope control."
      actions={
        <div className="flex items-center gap-2 shrink-0">
          {showAddAdmin && (
            <Button variant="tonal" onClick={onAddAdmin} disabled={isAddingAdmin} leadingIcon={<Icon name="shield_person" />}>
              {isAddingAdmin ? "Adding…" : "Add Admin"}
            </Button>
          )}
          <Button onClick={onCreateClick} leadingIcon={<Icon name="add" />}>
            Create Role
          </Button>
        </div>
      }
    />
  );
}

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function LoadingSkeleton() {
  return (
    <div className="flex-1 grid grid-cols-1 lg:grid-cols-[420px_1fr] mt-6 min-h-0 border border-outline-variant rounded-xl overflow-hidden bg-surface">
      <div className="border-r border-outline-variant p-4 space-y-3">
        <SkeletonGroup label="Loading roles">
          <Skeleton className="h-14 w-full" corner="full" />
          <div className="space-y-2 mt-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-18 w-full" corner="large" />
            ))}
          </div>
        </SkeletonGroup>
      </div>
      <div className="p-6 space-y-6">
        <SkeletonGroup label="Loading role details">
          <div className="space-y-2">
            <Skeleton className="h-7 w-48" corner="extra-small" />
            <Skeleton className="h-4 w-72" corner="extra-small" />
          </div>
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-48 w-full" corner="extra-large" />
          ))}
        </SkeletonGroup>
      </div>
    </div>
  );
}

// ─── Error state ──────────────────────────────────────────────────────────────

function ErrorState() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <Card variant="outlined" className="max-w-sm w-full">
        <CardContent className="flex flex-col items-center py-12 px-8 text-center">
          <div className="flex items-center justify-center h-14 w-14 rounded-full bg-error/12 mb-4">
            <Icon name="error" size={24} className="text-error" />
          </div>
          <h2 className="text-title-medium mb-1">Unable to load roles</h2>
          <p className="text-body-medium text-on-surface-variant">
            Something went wrong. Please try again later.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ onCreateClick }: { onCreateClick: () => void }) {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="flex flex-col items-center text-center max-w-sm">
        <div className="flex items-center justify-center h-20 w-20 rounded-full bg-primary/8 mb-6">
          <Icon name="shield" size={40} className="text-primary" />
        </div>
        <h2 className="text-title-large mb-2">No roles yet</h2>
        <p className="text-body-medium text-on-surface-variant mb-6">
          Create your first role to start managing permissions.
        </p>
        <Button onClick={onCreateClick} leadingIcon={<Icon name="add" />}>
          Create your first role
        </Button>
      </div>
    </div>
  );
}

// ─── Create role dialog ───────────────────────────────────────────────────────

function CreateRoleDialog({
  open, onOpenChange, name, onNameChange, description, onDescriptionChange, onSubmit, isPending,
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  name: string; onNameChange: (v: string) => void;
  description: string; onDescriptionChange: (v: string) => void;
  onSubmit: () => void; isPending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} icon={<Icon name="shield" />}>
      <DialogTitle>Create Role</DialogTitle>
      <DialogContent>
        <p className="text-sm text-on-surface-variant mb-4">Create a new role to assign feature permissions and scope access.</p>
        <div className="space-y-4">
          <TextField variant="outlined" label="Role Name" className="w-full" value={name} onChange={(value) => onNameChange(value)} placeholder="e.g., Finance Administrator" onKeyDown={(e) => { if (e.key === "Enter" && name.trim()) onSubmit(); }} />
          <TextField variant="outlined" label="Description" className="w-full" value={description} onChange={(value) => onDescriptionChange(value)} placeholder="Brief description of responsibilities" />
        </div>
      </DialogContent>
      <DialogActions>
        <Button variant="text" onClick={() => { onOpenChange(false); onNameChange(""); onDescriptionChange(""); }}>Cancel</Button>
        <Button variant="text" onClick={onSubmit} disabled={!name.trim() || isPending}>{isPending ? "Creating..." : "Create"}</Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Delete role dialog ───────────────────────────────────────────────────────

function DeleteRoleDialog({
  open, onOpenChange, roleName, affectedUsers, onConfirm, isPending,
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  roleName: string; affectedUsers: number;
  onConfirm: () => void; isPending: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} icon={<Icon name="delete" />}>
      <DialogTitle>Delete &ldquo;{roleName}&rdquo;?</DialogTitle>
      <DialogContent>
        <p>
          {affectedUsers > 0
            ? `${affectedUsers} member${affectedUsers !== 1 ? "s" : ""} will lose this role and its permissions. This can't be undone.`
            : "This role isn't assigned to anyone. This can't be undone."}
        </p>
      </DialogContent>
      <DialogActions>
        <Button variant="text" onClick={() => onOpenChange(false)}>Cancel</Button>
        <Button variant="text" onClick={onConfirm} disabled={isPending} className="text-error">
          {isPending ? "Deleting..." : "Delete role"}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Unsaved changes dialog ───────────────────────────────────────────────────

function UnsavedChangesDialog({
  open, onOpenChange, changeCount, roleName, onStay, onSaveAndSwitch, onDiscard,
}: {
  open: boolean; onOpenChange: (o: boolean) => void;
  changeCount: number; roleName: string;
  onStay: () => void; onSaveAndSwitch: () => void; onDiscard: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} icon={<Icon name="warning" />}>
      <DialogTitle>Unsaved Changes</DialogTitle>
      <DialogContent>
        <p>You have {changeCount} unsaved permission change{changeCount !== 1 ? "s" : ""} for {roleName}. Switching roles will discard them.</p>
      </DialogContent>
      <DialogActions>
        <Button variant="text" onClick={onStay}>Stay</Button>
        <Button variant="text" onClick={onSaveAndSwitch}>Save &amp; Switch</Button>
        <Button variant="text" className="text-error" onClick={onDiscard}>Discard</Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Scope guide dialog ───────────────────────────────────────────────────────

const SCOPE_GUIDE = [
  { scope: "Own", icon: "person", desc: "Only the user's own data." },
  { scope: "Direct Reports", icon: "supervisor_account", desc: "The user's data plus anyone reporting directly to them." },
  { scope: "Org Unit", icon: "group", desc: "Everyone in the user's assigned org unit." },
  { scope: "Branch", icon: "account_tree", desc: "The org unit and all children below it." },
  { scope: "Company", icon: "apartment", desc: "Everyone in the company." },
  { scope: "Global", icon: "public", desc: "Cross-company access for platform admins." },
];

function ScopeGuideDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange} icon={<Icon name="help" />} className="max-w-lg">
      <DialogTitle>Permission Scopes</DialogTitle>
      <DialogContent>
        <p className="mb-4">Scopes control how far a permission reaches in your organization.</p>
        <div className="divide-y divide-outline-variant">
          {SCOPE_GUIDE.map((item) => (
            <div key={item.scope} className="flex gap-3 py-3 first:pt-0 last:pb-0">
              <div className="flex items-center justify-center h-8 w-8 rounded-lg bg-primary/8 shrink-0">
                <Icon name={item.icon} size={18} className="text-primary" />
              </div>
              <div className="min-w-0">
                <span className="text-label-large">{item.scope}</span>
                <p className="text-body-small text-on-surface-variant">{item.desc}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="flex gap-3 rounded-xl bg-secondary-container/30 p-3 mt-4">
          <Icon name="lightbulb" size={18} className="text-secondary shrink-0 mt-0.5" />
          <p className="text-body-small text-secondary">
            <span className="font-medium">Tip:</span> For small teams, you only need 3 scopes: Own, Branch, and Company.
          </p>
        </div>
      </DialogContent>
      <DialogActions>
        <Button variant="text" onClick={() => onOpenChange(false)}>Got it</Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Permission matrix ────────────────────────────────────────────────────────

function PermissionMatrix({
  features, localDraft, onToggle, onScopeChange, onSelectAll, expandedFeatures, onToggleFeature, onExpandAll, onCollapseAll, readOnly = false,
}: {
  features: AdminFeature[]; localDraft: DraftPermissions;
  onToggle: (fk: string, pk: string, checked: boolean) => void;
  onScopeChange: (fk: string, pk: string, scope: Scope) => void;
  onSelectAll: (f: AdminFeature, checked: boolean) => void;
  expandedFeatures: Set<string>;
  onToggleFeature: (id: string) => void;
  onExpandAll: () => void; onCollapseAll: () => void;
  readOnly?: boolean;
}) {
  const reduced = useReducedMotionContext();
  const [showScopeGuide, setShowScopeGuide] = useState(false);

  if (!features.length) {
    return (
      <div className="flex flex-col items-center py-16 text-center">
        <div className="flex items-center justify-center h-16 w-16 rounded-full bg-surface-variant/50 mb-4">
          <Icon name="lock" size={24} className="text-on-surface-variant/60" />
        </div>
        <h2 className="text-title-medium mb-1">No features available</h2>
        <p className="text-body-medium text-on-surface-variant">Features will appear here once configured.</p>
      </div>
    );
  }

  const allExpanded = expandedFeatures.size === features.length;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-label-medium text-on-surface-variant uppercase tracking-wide">
            {features.length} {features.length === 1 ? "feature" : "features"}
          </span>
          <TooltipTrigger placement="right">
            <IconButton variant="standard" size="xs" onClick={() => setShowScopeGuide(true)} aria-label="Scope guide" icon={<Icon name="help" size={16} />} />
            <Tooltip>What do the scopes mean?</Tooltip>
          </TooltipTrigger>
        </div>
        <Button variant="text" onClick={allExpanded ? onCollapseAll : onExpandAll} className="text-label-large h-8">
          {allExpanded ? "Collapse all" : "Expand all"}
        </Button>
      </div>

      {features.map((feature) => {
        const isExpanded = expandedFeatures.has(feature.id);
        const assignedCount = feature.permissions.filter((fp) => localDraft.has(draftKey(feature.key, fp.key))).length;

        return (
          <Card key={feature.id} variant="outlined" className="overflow-hidden">
            <button type="button" onClick={() => onToggleFeature(feature.id)} className="w-full flex items-center gap-3 px-4 py-3 hover:bg-on-surface/4 transition-colors text-left">
              <Icon name="extension" size={20} className="text-primary shrink-0" />
              <span className="text-label-large flex-1 min-w-0">{feature.displayName}</span>
              {assignedCount > 0 && (
                <span className="text-label-small inline-flex items-center justify-center h-6 px-2 rounded-full bg-secondary-container text-on-secondary-container">
                  {assignedCount}/{feature.permissions.length}
                </span>
              )}
              <Icon name={isExpanded ? "expand_less" : "expand_more"} size={20} className="text-on-surface-variant shrink-0" />
            </button>

            <AnimatePresence initial={false}>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: "auto", opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={reduced ? { duration: 0 } : { duration: 0.2, ease: [0.2, 0, 0, 1] }}
                  className="overflow-hidden"
                >
                  <Divider />
                  <div className="divide-y divide-outline-variant">
                    {!readOnly && (
                      <div className="flex items-center gap-3 px-4 py-2 bg-surface-container-low/50">
                        <Checkbox
                          checked={assignedCount === feature.permissions.length && assignedCount > 0}
                          indeterminate={assignedCount > 0 && assignedCount < feature.permissions.length}
                          onCheckedChange={(c) => onSelectAll(feature, c === true)}
                          aria-label={`${assignedCount === feature.permissions.length ? "Deselect" : "Select"} all permissions for ${feature.displayName}`}
                        />
                        <span className="text-body-small text-on-surface-variant font-medium">
                          {assignedCount === feature.permissions.length ? "Deselect all" : "Select all"}
                        </span>
                      </div>
                    )}
                    {feature.permissions.map((fp) => {
                      const key = draftKey(feature.key, fp.key);
                      const isEnabled = localDraft.has(key);
                      const scope = (localDraft.get(key) as Scope) ?? "OWN";
                      return (
                        <div key={fp.id} className="flex items-center gap-3 px-4 py-2.5 hover:bg-on-surface/4 transition-colors">
                          <Checkbox checked={isEnabled} disabled={readOnly} onCheckedChange={(c) => onToggle(feature.key, fp.key, c === true)} aria-label={`Toggle ${fp.displayName}`} />
                          <span className={`text-body-medium ${isEnabled ? "text-on-surface" : "text-on-surface-variant"} flex-1 min-w-0 truncate`}>
                            {fp.displayName}
                          </span>
                          <Select
                            aria-label={`Scope for ${fp.displayName}`}
                            value={scope} disabled={readOnly || !isEnabled}
                            onChange={(key) => onScopeChange(feature.key, fp.key, String(key) as Scope)}
                            className={`h-8 w-35 text-label-small border-outline-variant ${readOnly || !isEnabled ? "opacity-40" : ""}`}
                            variant="outlined"
                          >
                            {SCOPE_OPTIONS.map((s) => (
                              <SelectItem key={s}>{SCOPE_LABELS[s]}</SelectItem>
                            ))}
                          </Select>
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

      <ScopeGuideDialog open={showScopeGuide} onOpenChange={setShowScopeGuide} />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function RolesPage() {
  const reduced = useReducedMotionContext();
  const toast = useToast();
  const companyId = useCompanyId();

  const { data: backendRoles, isLoading, error } = useRoles(companyId);
  const { data: allFeatures, isLoading: featuresLoading } = useAllFeatures();
  const createRoleMutation = useCreateRole();
  const createAdminRoleMutation = useCreateAdminRole();
  const deleteRoleMutation = useDeleteRole();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const bulkPermissionMutation = useBulkRolePermissions();

  const [selectedRoleId, setSelectedRoleId] = useState<string | null>(null);
  const [roleSearch, setRoleSearch] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newRoleName, setNewRoleName] = useState("");
  const [newRoleDescription, setNewRoleDescription] = useState("");
  const [expandedFeatures, setExpandedFeatures] = useState<Set<string>>(new Set());
  const [localDraft, setLocalDraft] = useState<DraftPermissions>(new Map());
  const [serverDraft, setServerDraft] = useState<DraftPermissions>(new Map());
  const [pendingRoleSwitch, setPendingRoleSwitch] = useState<string | null>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);

  const roles: AdminRole[] = useMemo(() => backendRoles ?? [], [backendRoles]);
  const hasAdminRole = roles.some((r) => r.isSystem);
  const effectiveSelectedId = selectedRoleId ?? roles[0]?.id ?? null;
  const selectedRole = roles.find((r) => r.id === effectiveSelectedId) ?? roles[0];

  const filteredRoles = useMemo(() =>
    roles.filter((r) => r.name.toLowerCase().includes(roleSearch.toLowerCase()) || (r.description ?? "").toLowerCase().includes(roleSearch.toLowerCase())),
    [roles, roleSearch],
  );

  const { data: rolePermissionDetail, isLoading: permissionsLoading } = useRolePermissions(companyId, effectiveSelectedId ?? "");
  const { data: companyFeatures } = useFeatures(companyId);
  const disabledFeatureKeys = useMemo(() => new Set((companyFeatures ?? []).filter((cf) => !cf.enabled).map((cf) => cf.feature?.key).filter(Boolean)), [companyFeatures]);

  // Which role id, and which permission-detail object, the drafts are currently
  // synced to. Held in state (not a ref) so the sync can run during render
  // without reading a ref mid-render. Handlers reset `syncedRoleId` to null to
  // force a re-sync for the next selection/mutation result.
  const [syncedRoleId, setSyncedRoleId] = useState<string | null>(null);
  const [syncedDetail, setSyncedDetail] = useState<typeof rolePermissionDetail>(undefined);

  if (rolePermissionDetail) {
    if (effectiveSelectedId !== syncedRoleId) {
      // Newly selected (or force-resynced) role: adopt the server permissions.
      setSyncedRoleId(effectiveSelectedId);
      setSyncedDetail(rolePermissionDetail);
      const d = buildServerDraft(rolePermissionDetail);
      setServerDraft(d);
      setLocalDraft(new Map(d));
    } else if (rolePermissionDetail !== syncedDetail) {
      // Same role, but the backend returned fresh permissions.
      setSyncedDetail(rolePermissionDetail);
      const ns = buildServerDraft(rolePermissionDetail);
      if (!draftsEqual(ns, serverDraft)) {
        setServerDraft(ns);
        setLocalDraft(new Map(ns));
      }
    }
  }

  const isDirty = !draftsEqual(serverDraft, localDraft);
  const diff = useMemo(() => computeDiff(serverDraft, localDraft), [serverDraft, localDraft]);
  const changeCount = diff.add.length + diff.remove.length;

  // ── Handlers ───────────────────────────────────────────────────────────

  const handleRoleSelect = useCallback((roleId: string) => {
    if (isDirty) { setPendingRoleSwitch(roleId); setShowUnsavedDialog(true); }
    else { setSyncedRoleId(null); setSelectedRoleId(roleId); }
  }, [isDirty]);

  const handleDiscardAndSwitch = useCallback(() => {
    if (pendingRoleSwitch) { setSyncedRoleId(null); setSelectedRoleId(pendingRoleSwitch); }
    setPendingRoleSwitch(null); setShowUnsavedDialog(false);
  }, [pendingRoleSwitch]);

  const handleDiscard = useCallback(() => setLocalDraft(new Map(serverDraft)), [serverDraft]);

  const handleSave = useCallback(() => {
    if (!effectiveSelectedId || !isDirty) return;
    bulkPermissionMutation.mutate(
      { companyId, roleId: effectiveSelectedId, add: diff.add, remove: diff.remove },
      { onSuccess: () => { toast.success(`Saved ${changeCount} change${changeCount !== 1 ? "s" : ""}`); setSyncedRoleId(null); }, onError: (err) => toast.error(err.message || "Failed to save") },
    );
  }, [effectiveSelectedId, isDirty, bulkPermissionMutation, companyId, diff, changeCount, toast]);

  const handleTogglePermission = useCallback((fk: string, pk: string, checked: boolean) => {
    setLocalDraft((prev) => { const n = new Map(prev); const k = draftKey(fk, pk); if (checked) n.set(k, "OWN"); else n.delete(k); return n; });
  }, []);

  const handleScopeChange = useCallback((fk: string, pk: string, scope: Scope) => {
    setLocalDraft((prev) => { const n = new Map(prev); n.set(draftKey(fk, pk), scope); return n; });
  }, []);

  const handleSelectAll = useCallback((feature: AdminFeature, checked: boolean) => {
    setLocalDraft((prev) => { const n = new Map(prev); for (const fp of feature.permissions) { const k = draftKey(feature.key, fp.key); if (checked) { if (!n.has(k)) n.set(k, "OWN"); } else n.delete(k); } return n; });
  }, []);

  const toggleFeatureExpanded = useCallback((id: string) => {
    setExpandedFeatures((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }, []);

  const expandAll = useCallback(() => setExpandedFeatures(new Set((allFeatures ?? []).map((f) => f.id))), [allFeatures]);
  const collapseAll = useCallback(() => setExpandedFeatures(new Set()), []);

  const handleCreateRole = useCallback(() => {
    if (!newRoleName.trim()) return;
    createRoleMutation.mutate(
      { companyId, name: newRoleName.trim(), description: newRoleDescription.trim() || undefined },
      { onSuccess: (r) => { toast.success("Role created"); setSyncedRoleId(null); setSelectedRoleId(r.id); setNewRoleName(""); setNewRoleDescription(""); setShowCreateModal(false); }, onError: (e) => toast.error(e.message || "Failed to create role") },
    );
  }, [companyId, newRoleName, newRoleDescription, createRoleMutation, toast]);

  const handleDuplicateRole = useCallback(() => {
    if (!selectedRole) return;
    createRoleMutation.mutate(
      { companyId, name: `${selectedRole.name} (Copy)`, description: selectedRole.description || undefined },
      { onSuccess: (r) => { toast.success("Role duplicated"); setSyncedRoleId(null); setSelectedRoleId(r.id); }, onError: (e) => toast.error(e.message || "Failed to duplicate role") },
    );
  }, [selectedRole, companyId, createRoleMutation, toast]);

  const handleAddAdmin = useCallback(() => {
    createAdminRoleMutation.mutate(
      { companyId },
      {
        onSuccess: (r) => { toast.success("Admin role created with all permissions"); setSyncedRoleId(null); setSelectedRoleId(r.id); },
        onError: (e) => toast.error(e.message || "Failed to create Admin role"),
      },
    );
  }, [companyId, createAdminRoleMutation, toast]);

  const handleDeleteRole = useCallback(() => {
    if (!selectedRole) return;
    deleteRoleMutation.mutate(
      { companyId, id: selectedRole.id },
      {
        onSuccess: () => {
          toast.success("Role deleted");
          setShowDeleteDialog(false);
          setSyncedRoleId(null);
          setSelectedRoleId(null);
        },
        onError: (e) => toast.error(e.message || "Failed to delete role"),
      },
    );
  }, [selectedRole, companyId, deleteRoleMutation, toast]);

  // ── Loading ────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <motion.div className="flex flex-col h-full" variants={resolveAnimationVariants(pageTransitionVariants, reduced)} initial="initial" animate="enter" exit="exit" transition={defaultTransition}>
        <PageHeader onCreateClick={() => {}} onAddAdmin={() => {}} isAddingAdmin={false} showAddAdmin={false} />
        <LoadingSkeleton />
      </motion.div>
    );
  }

  // ── Error ──────────────────────────────────────────────────────────────
  if (error) {
    return (
      <motion.div className="flex flex-col h-full" variants={resolveAnimationVariants(pageTransitionVariants, reduced)} initial="initial" animate="enter" exit="exit" transition={defaultTransition}>
        <PageHeader onCreateClick={() => {}} onAddAdmin={() => {}} isAddingAdmin={false} showAddAdmin={false} />
        <ErrorState />
      </motion.div>
    );
  }

  // ── Empty ──────────────────────────────────────────────────────────────
  if (roles.length === 0) {
    return (
      <motion.div className="flex flex-col h-full" variants={resolveAnimationVariants(pageTransitionVariants, reduced)} initial="initial" animate="enter" exit="exit" transition={defaultTransition}>
        <PageHeader onCreateClick={() => setShowCreateModal(true)} onAddAdmin={handleAddAdmin} isAddingAdmin={createAdminRoleMutation.isPending} showAddAdmin={!hasAdminRole} />
        <EmptyState onCreateClick={() => setShowCreateModal(true)} />
        <CreateRoleDialog open={showCreateModal} onOpenChange={setShowCreateModal} name={newRoleName} onNameChange={setNewRoleName} description={newRoleDescription} onDescriptionChange={setNewRoleDescription} onSubmit={handleCreateRole} isPending={createRoleMutation.isPending} />
      </motion.div>
    );
  }

  // ── Main ───────────────────────────────────────────────────────────────
  const featureCatalog: AdminFeature[] = allFeatures ?? [];

  return (
    <motion.div className="flex flex-col h-[calc(100vh-100px)]" variants={resolveAnimationVariants(pageTransitionVariants, reduced)} initial="initial" animate="enter" exit="exit" transition={defaultTransition}>
      <PageHeader onCreateClick={() => setShowCreateModal(true)} onAddAdmin={handleAddAdmin} isAddingAdmin={createAdminRoleMutation.isPending} showAddAdmin={!hasAdminRole} />

      {/* Master-Detail */}
      <div className="flex-1 grid grid-cols-[420px_1fr] mt-6 min-h-0 border border-outline-variant rounded-xl overflow-hidden bg-surface">

        {/* ── Left: role list ──────────────────────────────────────────── */}
        <div className="border-r border-outline-variant flex flex-col min-h-0">
          <div className="p-3 shrink-0 min-h-21 flex items-center border-b border-outline-variant">
            <SearchBar aria-label="Search" value={roleSearch} onChange={setRoleSearch} placeholder="Search roles..." className="min-w-0 w-full max-w-none mx-0" />
          </div>
          <div className="flex-1 overflow-y-auto">
            <List aria-label="List" className="py-0">
              {filteredRoles.map((role) => {
                const isSelected = role.id === effectiveSelectedId;
                return (
                  <ListItemWithClick
                    key={role.id}
                    selected={isSelected}
                    leading={<Icon name={role.isSystem ? "shield_person" : "shield"} size={24} className={isSelected ? "text-primary" : "text-on-surface-variant"} />}
                    trailing={role.isSystem ? <AssistChip className="text-label-small h-6 px-2">System</AssistChip> : undefined}
                    supportingText={role.description ?? undefined}
                    onClick={() => handleRoleSelect(role.id)}
                  >
                    {role.name}
                  </ListItemWithClick>
                );
              })}
            </List>
            {filteredRoles.length === 0 && roleSearch && (
              <div className="flex flex-col items-center py-8 text-center px-4">
                <Icon name="search_off" size={24} className="text-on-surface-variant/40 mb-2" />
                <p className="text-body-medium text-on-surface-variant">
                  No roles matching &ldquo;{roleSearch}&rdquo;
                </p>
              </div>
            )}
          </div>
        </div>

        {/* ── Right: permissions ────────────────────────────────────────── */}
        <div className="flex flex-col min-h-0">
          {selectedRole ? (
            <>
              {/* Role header */}
              <div className="shrink-0 min-h-21 flex items-center px-6 border-b border-outline-variant bg-surface-container-low/50">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-title-medium truncate">{selectedRole.name}</h2>
                    {selectedRole.isSystem && <AssistChip className="shrink-0">System</AssistChip>}
                  </div>
                  {selectedRole.description && (
                    <p className="text-body-small text-on-surface-variant truncate">
                      {selectedRole.description}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-4">
                  {isDirty ? (
                    <>
                      <AssistChip className="shrink-0">{changeCount} unsaved</AssistChip>
                      <Button variant="text" onClick={handleDiscard} disabled={bulkPermissionMutation.isPending}>Discard</Button>
                      <Button onClick={handleSave} disabled={bulkPermissionMutation.isPending} leadingIcon={<Icon name="save" />}>
                        {bulkPermissionMutation.isPending ? "Saving..." : "Save"}
                      </Button>
                    </>
                  ) : (
                    <>
                      <TooltipTrigger placement="bottom">
                        <Button variant="tonal" onClick={handleDuplicateRole} disabled={createRoleMutation.isPending} leadingIcon={<Icon name="content_copy" />}>
                          Duplicate
                        </Button>
                        <Tooltip>Duplicate this role</Tooltip>
                      </TooltipTrigger>
                      <TooltipTrigger placement="bottom">
                        <Button variant="text" onClick={() => setShowDeleteDialog(true)} className="text-error" leadingIcon={<Icon name="delete" />}>
                          Delete
                        </Button>
                        <Tooltip>Delete this role</Tooltip>
                      </TooltipTrigger>
                    </>
                  )}
                </div>
              </div>

              {/* Permission matrix */}
              <div className="flex-1 overflow-y-auto p-6">
                {(permissionsLoading || featuresLoading) ? (
                  <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                      <SkeletonGroup key={i} label="Loading permissions">
                        <div className="space-y-3">
                          <Skeleton className="h-5 w-40" corner="extra-small" />
                          <Skeleton className="h-48 w-full" corner="extra-large" />
                        </div>
                      </SkeletonGroup>
                    ))}
                  </div>
                ) : (
                  <>
                    {selectedRole.isSystem && (
                      <div className="flex items-start gap-2 mb-4 rounded-lg bg-secondary-container/40 px-4 py-3">
                        <Icon name="lock" size={18} className="text-secondary shrink-0 mt-0.5" />
                        <p className="text-body-small text-on-surface-variant">
                          The Admin role always has full access to every enabled feature, so its
                          permissions can&apos;t be edited. To limit what Admin can reach, disable a
                          feature on the Features page, or create a custom role instead.
                        </p>
                      </div>
                    )}
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
                      readOnly={selectedRole.isSystem}
                    />
                  </>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex flex-col items-center text-center px-4">
                <Icon name="shield" size={48} className="text-on-surface-variant/30 mb-3" />
                <p className="text-body-medium text-on-surface-variant">Select a role to view permissions</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Dialogs */}
      <CreateRoleDialog open={showCreateModal} onOpenChange={setShowCreateModal} name={newRoleName} onNameChange={setNewRoleName} description={newRoleDescription} onDescriptionChange={setNewRoleDescription} onSubmit={handleCreateRole} isPending={createRoleMutation.isPending} />
      <DeleteRoleDialog
        open={showDeleteDialog}
        onOpenChange={setShowDeleteDialog}
        roleName={selectedRole?.name ?? ""}
        affectedUsers={selectedRole?._count?.assignments ?? 0}
        onConfirm={handleDeleteRole}
        isPending={deleteRoleMutation.isPending}
      />
      <UnsavedChangesDialog
        open={showUnsavedDialog} onOpenChange={setShowUnsavedDialog}
        changeCount={changeCount} roleName={selectedRole?.name ?? ""}
        onStay={() => { setShowUnsavedDialog(false); setPendingRoleSwitch(null); }}
        onSaveAndSwitch={() => { handleSave(); setShowUnsavedDialog(false); setPendingRoleSwitch(null); }}
        onDiscard={handleDiscardAndSwitch}
      />
    </motion.div>
  );
}
