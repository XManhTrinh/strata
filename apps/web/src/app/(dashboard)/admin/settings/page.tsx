"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { PageBar } from "@vkieu/mui";
import { Icon } from "@vkieu/mui";
import { Card, CardContent } from "@vkieu/mui";
import { TextField } from "@vkieu/mui";
import { Select } from "@vkieu/mui";
import { Button } from "@vkieu/mui/buttons";
import { Chip } from "@vkieu/mui";
import { Divider } from "@vkieu/mui";
import { List, ListItem } from "@vkieu/mui";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@vkieu/mui";
import { useToast } from "@/hooks/use-toast";
import { useCompanySettings, useUpdateCompanySettings, useResetAllData } from "@/services";
import { useCompanyId } from "@/hooks/use-company";
import { pageTransitionVariants, defaultTransition } from "@/lib/motion";
import { CsvImportDialog } from "@/components/import";

// ─── Helpers ────────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", {
    year: "numeric", month: "long", day: "numeric",
  });
}

// ─── Constants ──────────────────────────────────────────────────────────────────

type SettingsSection = "general" | "financial" | "import" | "danger";

const NAV_ITEMS: { id: SettingsSection; label: string; icon: string }[] = [
  { id: "general", label: "General", icon: "business" },
  { id: "financial", label: "Financial", icon: "payments" },
  { id: "import", label: "Data Import", icon: "upload" },
  { id: "danger", label: "Danger Zone", icon: "warning" },
];

const STAT_CONFIG = [
  { label: "Members", icon: "group", color: "bg-primary-container", iconColor: "text-on-primary-container" },
  { label: "Roles", icon: "shield", color: "bg-secondary-container", iconColor: "text-on-secondary-container" },
  { label: "Positions", icon: "work", color: "bg-tertiary-container", iconColor: "text-on-tertiary-container" },
  { label: "Org Units", icon: "lan", color: "bg-primary-container", iconColor: "text-on-primary-container" },
  { label: "Unit Types", icon: "label", color: "bg-secondary-container", iconColor: "text-on-secondary-container" },
];

// ─── Page ───────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const toast = useToast();
  const companyId = useCompanyId();
  const { data: company, isLoading, isError, error } = useCompanySettings(companyId);
  const updateMutation = useUpdateCompanySettings();
  const resetMutation = useResetAllData();
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");
  const [activeSection, setActiveSection] = useState<SettingsSection>("general");

  // Local form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [fiscalYearStart, setFiscalYearStart] = useState("1");
  const [currency, setCurrency] = useState("GBP");
  const [workingDaysPerYear, setWorkingDaysPerYear] = useState("228");
  const [workingDaysPerMonth, setWorkingDaysPerMonth] = useState("19");

  useEffect(() => {
    if (company) {
      setName(company.name);
      setSlug(company.slug);
      const s = company.settings as Record<string, unknown>;
      setFiscalYearStart(String(s.fiscalYearStart ?? "1"));
      setCurrency(String(s.currency ?? "GBP"));
      setWorkingDaysPerYear(String(s.workingDaysPerYear ?? "228"));
      setWorkingDaysPerMonth(String(s.workingDaysPerMonth ?? "19"));
    }
  }, [company]);

  const isDirty = company && (
    name !== company.name ||
    slug !== company.slug ||
    fiscalYearStart !== String((company.settings as Record<string, unknown>).fiscalYearStart ?? "1") ||
    currency !== String((company.settings as Record<string, unknown>).currency ?? "GBP") ||
    workingDaysPerYear !== String((company.settings as Record<string, unknown>).workingDaysPerYear ?? "228") ||
    workingDaysPerMonth !== String((company.settings as Record<string, unknown>).workingDaysPerMonth ?? "19")
  );

  const handleSave = () => {
    if (!name.trim()) { toast.error("Company name is required"); return; }
    if (!slug.trim()) { toast.error("Slug is required"); return; }
    updateMutation.mutate(
      {
        companyId,
        name: name.trim(),
        slug: slug.trim(),
        settings: {
          ...(company?.settings as Record<string, unknown> ?? {}),
          fiscalYearStart: parseInt(fiscalYearStart, 10) || 1,
          currency,
          workingDaysPerYear: parseInt(workingDaysPerYear, 10) || 228,
          workingDaysPerMonth: parseInt(workingDaysPerMonth, 10) || 19,
        },
      },
      {
        onSuccess: () => toast.success("Settings saved"),
        onError: (err) => toast.error(err.message || "Failed to save"),
      },
    );
  };

  const handleDiscard = () => {
    if (company) {
      setName(company.name);
      setSlug(company.slug);
      const s = company.settings as Record<string, unknown>;
      setFiscalYearStart(String(s.fiscalYearStart ?? "1"));
      setCurrency(String(s.currency ?? "GBP"));
      setWorkingDaysPerYear(String(s.workingDaysPerYear ?? "228"));
      setWorkingDaysPerMonth(String(s.workingDaysPerMonth ?? "19"));
    }
  };

  const monthLabels = [
    "January","February","March","April","May","June",
    "July","August","September","October","November","December",
  ];

  const statValues = [
    company?.stats.members ?? 0,
    company?.stats.roles ?? 0,
    company?.stats.positions ?? 0,
    company?.stats.orgUnits ?? 0,
    company?.stats.orgUnitTypes ?? 0,
  ];

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <PageBar>
          <div>
            <h1 className="text-headline-small text-surface-foreground">Settings</h1>
            <p className="text-body-medium text-surface-variant-foreground">Workspace configuration.</p>
          </div>
        </PageBar>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <Card key={i} variant="elevated"><CardContent className="p-4"><Skeleton className="h-14 w-full" /></CardContent></Card>
          ))}
        </div>
        <div className="flex-1 grid grid-cols-[240px_1fr] mt-4 gap-0 border border-outline-variant rounded-xl overflow-hidden bg-surface">
          <div className="border-r border-outline-variant p-2">
            {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full rounded-xl mb-1" />)}
          </div>
          <div className="p-8 space-y-6">
            <Skeleton className="h-8 w-48" /><Skeleton className="h-14 w-full" /><Skeleton className="h-14 w-full" />
          </div>
        </div>
      </div>
    );
  }

  // ─── Error ────────────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="flex flex-col h-full">
        <PageBar><div><h1 className="text-headline-small text-surface-foreground">Settings</h1></div></PageBar>
        <div className="flex-1 flex items-center justify-center">
          <Card variant="elevated" className="max-w-md">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <div className="flex items-center justify-center h-14 w-14 rounded-full bg-error-container mb-4">
                <Icon name="error" size={28} className="text-on-error-container" />
              </div>
              <p className="text-title-medium text-surface-foreground mb-1">Unable to load settings</p>
              <p className="text-body-medium text-surface-variant-foreground">{error?.message || "Something went wrong."}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  // ─── Main ─────────────────────────────────────────────────────────────────
  return (
    <motion.div className="flex flex-col h-full" variants={pageTransitionVariants} initial="initial" animate="enter" exit="exit" transition={defaultTransition}>
      {/* Header */}
      <PageBar className="justify-between shrink-0">
        <div>
          <h1 className="text-headline-small text-surface-foreground">Settings</h1>
          <p className="text-body-medium text-surface-variant-foreground">Workspace configuration and preferences.</p>
        </div>
        {isDirty && (
          <div className="flex items-center gap-2">
            <Button variant="text" onClick={handleDiscard} disabled={updateMutation.isPending}>Discard</Button>
            <Button variant="filled" onClick={handleSave} disabled={updateMutation.isPending}>
              <Icon name="save" size={18} />
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </PageBar>

      {/* Workspace Overview Strip — M3 elevated cards */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-6 shrink-0">
        {STAT_CONFIG.map((stat, i) => (
          <Card key={stat.label} variant="elevated">
            <CardContent className="flex items-center gap-3 p-4">
              <div className={`flex items-center justify-center w-10 h-10 rounded-full ${stat.color} shrink-0`}>
                <Icon name={stat.icon} size={20} className={stat.iconColor} />
              </div>
              <div className="min-w-0">
                <p className="text-headline-small text-surface-foreground leading-tight">{statValues[i]}</p>
                <p className="text-label-small text-surface-variant-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Master-Detail Layout */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[240px_1fr] mt-4 min-h-0 border border-outline-variant rounded-xl overflow-hidden bg-surface">
        {/* Side Navigation — M3 List */}
        <div className="border-b lg:border-b-0 lg:border-r border-outline-variant flex lg:flex-col overflow-x-auto lg:overflow-x-visible">
          <List className="py-1 flex lg:flex-col w-full">
            {NAV_ITEMS.map((item) => {
              const isActive = activeSection === item.id;
              return (
                <ListItem
                  key={item.id}
                  interactive
                  selected={isActive}
                  leading={
                    <Icon
                      name={item.icon}
                      size={20}
                      className={isActive ? "text-primary" : "text-surface-variant-foreground"}
                    />
                  }
                  onClick={() => setActiveSection(item.id)}
                >
                  {item.label}
                </ListItem>
              );
            })}
          </List>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">

          {/* ── General ──────────────────────────────────────────────────── */}
          {activeSection === "general" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-title-large text-surface-foreground">General</h2>
                <p className="text-body-medium text-surface-variant-foreground mt-1">Basic workspace information.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Company profile form */}
                <Card variant="outlined">
                  <CardContent className="p-6 space-y-5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-container">
                        <Icon name="edit" size={20} className="text-on-primary-container" />
                      </div>
                      <p className="text-title-small text-surface-foreground">Company Profile</p>
                    </div>
                    <TextField
                      variant="outlined"
                      label="Company Name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="e.g. Strata Technologies"
                    />
                    <TextField
                      variant="outlined"
                      label="Workspace Slug"
                      value={slug}
                      onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))}
                      placeholder="e.g. strata-tech"
                      supportingText="Used in URLs. Lowercase letters, numbers, and hyphens only."
                    />
                  </CardContent>
                </Card>

                {/* Workspace metadata */}
                <Card variant="outlined">
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-secondary-container">
                        <Icon name="info" size={20} className="text-on-secondary-container" />
                      </div>
                      <p className="text-title-small text-surface-foreground">Workspace Details</p>
                    </div>
                    <List className="py-0">
                      <ListItem
                        lines={1}
                        supporting="Workspace ID"
                        trailing={
                          <Chip variant="filter" className="font-mono text-[11px]">{company?.id}</Chip>
                        }
                      >
                        Identifier
                      </ListItem>
                      <Divider />
                      <ListItem lines={1} supporting="When this workspace was created" trailing={<span className="text-body-small text-surface-foreground">{company ? fmtDate(company.createdAt) : "—"}</span>}>
                        Created
                      </ListItem>
                      <Divider />
                      <ListItem lines={1} supporting="Last settings update" trailing={<span className="text-body-small text-surface-foreground">{company ? fmtDate(company.updatedAt) : "—"}</span>}>
                        Updated
                      </ListItem>
                    </List>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ── Financial ────────────────────────────────────────────────── */}
          {activeSection === "financial" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-title-large text-surface-foreground">Financial Settings</h2>
                <p className="text-body-medium text-surface-variant-foreground mt-1">Currency, fiscal year, and cost calculation parameters.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card variant="outlined">
                  <CardContent className="p-6 space-y-5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-tertiary-container">
                        <Icon name="currency_exchange" size={20} className="text-on-tertiary-container" />
                      </div>
                      <p className="text-title-small text-surface-foreground">Currency & Fiscal Year</p>
                    </div>
                    <TextField
                      variant="outlined"
                      label="Currency"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                      placeholder="e.g. GBP, USD, EUR"
                      supportingText="ISO 4217 currency code."
                    />
                    <Select
                      variant="outlined"
                      label="Fiscal Year Start Month"
                      value={fiscalYearStart}
                      onValueChange={(v) => setFiscalYearStart(v)}
                      options={monthLabels.map((label, i) => ({ value: String(i + 1), label }))}
                    />
                  </CardContent>
                </Card>

                <Card variant="outlined">
                  <CardContent className="p-6 space-y-5">
                    <div className="flex items-center gap-3 mb-2">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-container">
                        <Icon name="schedule" size={20} className="text-on-primary-container" />
                      </div>
                      <p className="text-title-small text-surface-foreground">Working Days</p>
                    </div>
                    <TextField
                      variant="outlined"
                      label="Working Days per Year"
                      type="number"
                      value={workingDaysPerYear}
                      onChange={(e) => setWorkingDaysPerYear(e.target.value)}
                      supportingText="SubCon annual cost = day rate × this value."
                    />
                    <TextField
                      variant="outlined"
                      label="Working Days per Month"
                      type="number"
                      value={workingDaysPerMonth}
                      onChange={(e) => setWorkingDaysPerMonth(e.target.value)}
                      supportingText="SubCon monthly cost = day rate × this value."
                    />
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* ── Data Import ────────────────────────────────────────────── */}
          {activeSection === "import" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-title-large text-surface-foreground">Data Import</h2>
                <p className="text-body-medium text-surface-variant-foreground mt-1">
                  Import members, org structure, positions, and roles from a CSV file.
                </p>
              </div>

              <Card variant="outlined">
                <CardContent className="p-6">
                  <div className="flex items-start gap-4">
                    <div className="flex items-center justify-center w-12 h-12 rounded-full bg-primary-container shrink-0">
                      <Icon name="upload_file" size={24} className="text-on-primary-container" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-title-small text-surface-foreground">CSV Import</p>
                      <p className="text-body-medium text-surface-variant-foreground mt-1">
                        Upload a CSV file to bulk-import members and automatically create your
                        org hierarchy (divisions, tribes, squads), positions, grades, and role
                        assignments. The import wizard will guide you through column mapping and
                        preview before committing.
                      </p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <Chip variant="filter" leadingIcon="group">Members</Chip>
                        <Chip variant="filter" leadingIcon="lan">Org Structure</Chip>
                        <Chip variant="filter" leadingIcon="work">Positions</Chip>
                        <Chip variant="filter" leadingIcon="leaderboard">Grades</Chip>
                        <Chip variant="filter" leadingIcon="shield">Roles</Chip>
                      </div>
                      <div className="mt-4">
                        <CsvImportDialog companyId={companyId} />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Tips card */}
              <Card variant="outlined">
                <CardContent className="p-6">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex items-center justify-center w-10 h-10 rounded-full bg-tertiary-container">
                      <Icon name="lightbulb" size={20} className="text-on-tertiary-container" />
                    </div>
                    <p className="text-title-small text-surface-foreground">Import Tips</p>
                  </div>
                  <List className="py-0">
                    <ListItem
                      lines={2}
                      leading={<Icon name="check_circle" size={20} className="text-primary" />}
                      supporting="Each row must have at least a name and email."
                    >
                      Required columns: Full Name & Email
                    </ListItem>
                    <Divider />
                    <ListItem
                      lines={2}
                      leading={<Icon name="account_tree" size={20} className="text-primary" />}
                      supporting="Use separate columns for each level (e.g. Division, Tribe, Squad). You can reorder them in the wizard."
                    >
                      Org hierarchy from multiple columns
                    </ListItem>
                    <Divider />
                    <ListItem
                      lines={2}
                      leading={<Icon name="table_chart" size={20} className="text-primary" />}
                      supporting="Any CSV column not mapped to a known field is stored as member metadata."
                    >
                      Extra columns become metadata
                    </ListItem>
                    <Divider />
                    <ListItem
                      lines={2}
                      leading={<Icon name="sync" size={20} className="text-primary" />}
                      supporting="Members matched by email are updated. New emails create new members."
                    >
                      Safe to re-import
                    </ListItem>
                  </List>
                </CardContent>
              </Card>
            </div>
          )}

          {/* ── Danger Zone ──────────────────────────────────────────────── */}
          {activeSection === "danger" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-title-large text-error">Danger Zone</h2>
                <p className="text-body-medium text-surface-variant-foreground mt-1">Destructive actions that cannot be undone.</p>
              </div>

              <Card variant="outlined">
                <List className="py-0">
                  {/* Export */}
                  <ListItem
                    lines={2}
                    leading={
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-surface-variant/30">
                        <Icon name="download" size={20} className="text-surface-variant-foreground" />
                      </div>
                    }
                    supporting="Download all workspace data as CSV files."
                    trailing={<Button variant="outlined" disabled>Coming Soon</Button>}
                  >
                    Export All Data
                  </ListItem>

                  <Divider />

                  {/* Reset */}
                  <ListItem
                    lines={2}
                    leading={
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-error-container">
                        <Icon name="restart_alt" size={20} className="text-on-error-container" />
                      </div>
                    }
                    supporting="Delete all members, org structure, roles, capacity data. Preserves super admin accounts."
                    trailing={
                      <Button variant="tonal" className="text-error" onClick={() => setShowResetDialog(true)}>
                        <Icon name="restart_alt" size={18} />Reset
                      </Button>
                    }
                  >
                    Reset All Data
                  </ListItem>

                  <Divider />

                  {/* Delete */}
                  <ListItem
                    lines={2}
                    leading={
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-error-container">
                        <Icon name="delete_forever" size={20} className="text-on-error-container" />
                      </div>
                    }
                    supporting="Permanently delete this workspace and all its data."
                    trailing={<Button variant="outlined" className="text-error border-error/30" disabled><Icon name="delete_forever" size={18} />Delete</Button>}
                  >
                    Delete Workspace
                  </ListItem>
                </List>
              </Card>
            </div>
          )}
        </div>
      </div>

      {/* Reset Confirmation Dialog — M3 Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent icon="warning">
          <DialogHeader centered>
            <DialogTitle>Reset All Data</DialogTitle>
            <DialogDescription>
              This will permanently delete all members, org structure, positions, roles, calendar data,
              capacity allocations, and rate cards. Only super admin accounts will be preserved.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-body-small text-surface-variant-foreground">
              Type <strong className="text-error">RESET</strong> to confirm:
            </p>
            <TextField
              variant="outlined"
              value={resetConfirmText}
              onChange={(e) => setResetConfirmText(e.target.value)}
              placeholder="Type RESET"
            />
          </div>
          <DialogFooter>
            <Button variant="text" onClick={() => { setShowResetDialog(false); setResetConfirmText(""); }}>Cancel</Button>
            <Button
              variant="text"
              className="text-error"
              disabled={resetConfirmText !== "RESET" || resetMutation.isPending}
              onClick={() => {
                resetMutation.mutate(
                  { companyId },
                  {
                    onSuccess: (result) => {
                      toast.success(`Workspace reset. ${result.preserved.superAdmins} super admin(s) preserved.`);
                      setShowResetDialog(false);
                      setResetConfirmText("");
                    },
                    onError: (err) => toast.error(err.message || "Failed to reset"),
                  },
                );
              }}
            >
              {resetMutation.isPending ? "Resetting..." : "Reset All Data"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
