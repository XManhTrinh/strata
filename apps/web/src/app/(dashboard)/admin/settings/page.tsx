"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { AppBar } from "@/components/layout/app-bar";
import { Icon } from "@vkieu/mui";
import { Card, CardContent } from "@vkieu/mui";
import { TextField } from "@vkieu/mui";
import { Button } from "@vkieu/mui/buttons";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@vkieu/mui";
import { toast } from "sonner";
import { useCompanySettings, useUpdateCompanySettings, useResetAllData } from "@/services";
import { useCompanyId } from "@/hooks/use-company";
import { pageTransitionVariants, defaultTransition } from "@/lib/motion";

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", {
    year: "numeric", month: "long", day: "numeric",
  });
}

type SettingsSection = "general" | "financial" | "workspace" | "danger";

const NAV_ITEMS: { id: SettingsSection; label: string; icon: string }[] = [
  { id: "general", label: "General", icon: "business" },
  { id: "financial", label: "Financial", icon: "payments" },
  { id: "workspace", label: "Workspace", icon: "analytics" },
  { id: "danger", label: "Danger Zone", icon: "warning" },
];

export default function SettingsPage() {
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

  if (isLoading) {
    return (
      <div className="flex flex-col h-full">
        <AppBar><div>
          <h1 className="text-[28px] leading-9 font-normal text-surface-foreground">Settings</h1>
        </div></AppBar>
        <div className="flex-1 grid grid-cols-[240px_1fr] mt-6 gap-0 border border-outline-variant rounded-xl overflow-hidden bg-surface">
          <div className="border-r border-outline-variant p-4 space-y-2">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-10 w-full rounded-lg" />)}
          </div>
          <div className="p-8 space-y-6">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-12 w-full" />
            <Skeleton className="h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="flex flex-col h-full">
        <AppBar><div><h1 className="text-[28px] leading-9 font-normal text-surface-foreground">Settings</h1></div></AppBar>
        <div className="flex-1 flex items-center justify-center">
          <Card variant="elevated" className="max-w-md">
            <CardContent className="flex flex-col items-center py-12 text-center">
              <Icon name="error" size={32} className="text-error mb-3" />
              <p className="text-[14px] text-muted-foreground">{error?.message || "Failed to load"}</p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <motion.div className="flex flex-col h-full" variants={pageTransitionVariants} initial="initial" animate="enter" exit="exit" transition={defaultTransition}>
      {/* Header */}
      <AppBar className="justify-between shrink-0">
        <div>
          <h1 className="text-[28px] leading-9 font-normal text-surface-foreground">Settings</h1>
          <p className="text-[14px] leading-5 text-surface-variant-foreground">Workspace configuration and preferences.</p>
        </div>
        {isDirty && (
          <div className="flex items-center gap-2">
            <Button variant="text" onClick={handleDiscard} disabled={updateMutation.isPending}>Discard</Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending}>
              <Icon name="save" size={18} />
              {updateMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          </div>
        )}
      </AppBar>

      {/* Main Layout: Side Nav + Content */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-[240px_1fr] mt-6 min-h-0 border border-outline-variant rounded-xl overflow-hidden bg-surface">
        {/* Side Navigation */}
        <nav className="border-b lg:border-b-0 lg:border-r border-outline-variant py-2 flex lg:flex-col overflow-x-auto lg:overflow-x-visible">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveSection(item.id)}
              className={`flex items-center gap-3 px-4 py-3 text-left text-[14px] transition-colors whitespace-nowrap ${
                activeSection === item.id
                  ? "bg-primary/8 text-primary font-medium border-b-2 lg:border-b-0 lg:border-r-2 border-primary"
                  : "text-surface-variant-foreground hover:bg-surface-foreground/4"
              }`}
            >
              <Icon name={item.icon} size={20} className={activeSection === item.id ? "text-primary" : "text-surface-variant-foreground"} />
              {item.label}
            </button>
          ))}
        </nav>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 lg:p-8">
          {/* General Section */}
          {activeSection === "general" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-[22px] leading-7 font-normal text-surface-foreground">General</h2>
                <p className="text-[14px] text-surface-variant-foreground mt-1">Basic workspace information.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card variant="outlined">
                  <CardContent className="p-5 space-y-4">
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

                <Card variant="outlined">
                  <CardContent className="p-5">
                    <h3 className="text-[14px] font-medium text-surface-foreground mb-3">Workspace Details</h3>
                    <div className="space-y-3 text-[13px]">
                      <div className="flex justify-between">
                        <span className="text-surface-variant-foreground">Workspace ID</span>
                        <code className="text-[11px] bg-surface-variant/20 px-2 py-0.5 rounded font-mono">{company?.id}</code>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-surface-variant-foreground">Created</span>
                        <span className="text-surface-foreground">{company ? fmtDate(company.createdAt) : "—"}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-surface-variant-foreground">Last Updated</span>
                        <span className="text-surface-foreground">{company ? fmtDate(company.updatedAt) : "—"}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {/* Financial Section */}
          {activeSection === "financial" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-[22px] leading-7 font-normal text-surface-foreground">Financial Settings</h2>
                <p className="text-[14px] text-surface-variant-foreground mt-1">Currency, fiscal year, and cost calculation parameters.</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <Card variant="outlined">
                  <CardContent className="p-5 space-y-4">
                    <h3 className="text-[14px] font-medium text-surface-foreground">Currency & Fiscal Year</h3>
                    <TextField
                      variant="outlined"
                      label="Currency"
                      value={currency}
                      onChange={(e) => setCurrency(e.target.value.toUpperCase())}
                      placeholder="e.g. GBP, USD, EUR"
                      supportingText="ISO 4217 currency code."
                    />
                    <TextField
                      variant="outlined"
                      label="Fiscal Year Start Month"
                      type="number"
                      value={fiscalYearStart}
                      onChange={(e) => setFiscalYearStart(e.target.value)}
                      supportingText={`Month: ${monthLabels[parseInt(fiscalYearStart, 10) - 1] ?? "January"}`}
                    />
                  </CardContent>
                </Card>

                <Card variant="outlined">
                  <CardContent className="p-5 space-y-4">
                    <h3 className="text-[14px] font-medium text-surface-foreground">Working Days</h3>
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

          {/* Workspace Section */}
          {activeSection === "workspace" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-[22px] leading-7 font-normal text-surface-foreground">Workspace Overview</h2>
                <p className="text-[14px] text-surface-variant-foreground mt-1">Current workspace statistics and usage.</p>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                {[
                  { label: "Members", value: company?.stats.members ?? 0, icon: "group", color: "bg-blue-100 dark:bg-blue-900/30", iconColor: "text-blue-600" },
                  { label: "Roles", value: company?.stats.roles ?? 0, icon: "shield", color: "bg-violet-100 dark:bg-violet-900/30", iconColor: "text-violet-600" },
                  { label: "Positions", value: company?.stats.positions ?? 0, icon: "work", color: "bg-emerald-100 dark:bg-emerald-900/30", iconColor: "text-emerald-600" },
                  { label: "Org Units", value: company?.stats.orgUnits ?? 0, icon: "lan", color: "bg-amber-100 dark:bg-amber-900/30", iconColor: "text-amber-600" },
                  { label: "Unit Types", value: company?.stats.orgUnitTypes ?? 0, icon: "label", color: "bg-cyan-100 dark:bg-cyan-900/30", iconColor: "text-cyan-600" },
                ].map((stat) => (
                  <Card key={stat.label} variant="outlined">
                    <CardContent className="p-4 text-center">
                      <div className={`flex items-center justify-center w-10 h-10 rounded-full ${stat.color} mx-auto mb-2`}>
                        <Icon name={stat.icon} size={20} className={stat.iconColor} />
                      </div>
                      <p className="text-[28px] font-normal text-surface-foreground">{stat.value}</p>
                      <p className="text-[12px] text-surface-variant-foreground">{stat.label}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Danger Zone Section */}
          {activeSection === "danger" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-[22px] leading-7 font-normal text-error">Danger Zone</h2>
                <p className="text-[14px] text-surface-variant-foreground mt-1">Destructive actions that cannot be undone.</p>
              </div>

              <div className="space-y-4">
                <Card variant="outlined" className="border-outline-variant">
                  <CardContent className="p-5 flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-surface-variant/20 shrink-0">
                        <Icon name="download" size={20} className="text-surface-variant-foreground" />
                      </div>
                      <div>
                        <p className="text-[14px] font-medium text-surface-foreground">Export All Data</p>
                        <p className="text-[13px] text-surface-variant-foreground">Download all workspace data as CSV files.</p>
                      </div>
                    </div>
                    <Button variant="outlined" disabled className="shrink-0">Coming Soon</Button>
                  </CardContent>
                </Card>

                <Card variant="outlined" className="border-amber-300 dark:border-amber-700">
                  <CardContent className="p-5 flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-900/30 shrink-0">
                        <Icon name="restart_alt" size={20} className="text-amber-600" />
                      </div>
                      <div>
                        <p className="text-[14px] font-medium text-surface-foreground">Reset All Data</p>
                        <p className="text-[13px] text-surface-variant-foreground">
                          Delete all members, org structure, roles, positions, calendar data, and capacity allocations. Super admin accounts will be preserved.
                        </p>
                      </div>
                    </div>
                    <Button variant="outlined" className="text-amber-600 border-amber-300 dark:border-amber-700 shrink-0" onClick={() => setShowResetDialog(true)}>
                      <Icon name="restart_alt" size={18} />Reset
                    </Button>
                  </CardContent>
                </Card>

                <Card variant="outlined" className="border-error/30">
                  <CardContent className="p-5 flex items-center justify-between gap-4">
                    <div className="flex items-start gap-3">
                      <div className="flex items-center justify-center w-10 h-10 rounded-full bg-error/12 shrink-0">
                        <Icon name="delete_forever" size={20} className="text-error" />
                      </div>
                      <div>
                        <p className="text-[14px] font-medium text-surface-foreground">Delete Workspace</p>
                        <p className="text-[13px] text-surface-variant-foreground">Permanently delete this workspace and all its data. This cannot be undone.</p>
                      </div>
                    </div>
                    <Button variant="outlined" className="text-error border-error/30 shrink-0" disabled>
                      <Icon name="delete_forever" size={18} />Delete
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Reset Confirmation Dialog */}
      <Dialog open={showResetDialog} onOpenChange={setShowResetDialog}>
        <DialogContent icon="warning">
          <DialogHeader centered>
            <DialogTitle>Reset All Data</DialogTitle>
            <DialogDescription>
              This will permanently delete all members, org structure, positions, roles, calendar data,
              capacity allocations, and rate cards. Only super admin accounts will be preserved.
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <p className="text-[13px] text-surface-variant-foreground">
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
