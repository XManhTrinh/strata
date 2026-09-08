"use client";

import { useState, useEffect } from "react";
import { motion } from "motion/react";
import { AppBar } from "@/components/layout/app-bar";
import { Icon } from "@vkieu/mui";
import { Card, CardContent } from "@vkieu/mui";
import { TextField } from "@vkieu/mui";
import { Button } from "@vkieu/mui/buttons";
import { Divider } from "@vkieu/mui";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@vkieu/mui";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@vkieu/mui";
import { toast } from "sonner";
import { useCompanySettings, useUpdateCompanySettings, useResetAllData } from "@/services";
import { useCompanyId } from "@/hooks/use-company";
import { pageTransitionVariants, defaultTransition } from "@/lib/motion";

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString("en-GB", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

export default function SettingsPage() {
  const companyId = useCompanyId();
  const { data: company, isLoading, isError, error } = useCompanySettings(companyId);
  const updateMutation = useUpdateCompanySettings();
  const resetMutation = useResetAllData();
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState("");

  // Local form state
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [fiscalYearStart, setFiscalYearStart] = useState("1"); // month 1-12
  const [currency, setCurrency] = useState("GBP");
  const [workingDaysPerYear, setWorkingDaysPerYear] = useState("228");
  const [workingDaysPerMonth, setWorkingDaysPerMonth] = useState("19");

  // Sync server → local
  useEffect(() => {
    if (company) {
      setName(company.name);
      setSlug(company.slug);
      const settings = company.settings as Record<string, unknown>;
      setFiscalYearStart(String(settings.fiscalYearStart ?? "1"));
      setCurrency(String(settings.currency ?? "GBP"));
      setWorkingDaysPerYear(String(settings.workingDaysPerYear ?? "228"));
      setWorkingDaysPerMonth(String(settings.workingDaysPerMonth ?? "19"));
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
      const settings = company.settings as Record<string, unknown>;
      setFiscalYearStart(String(settings.fiscalYearStart ?? "1"));
      setCurrency(String(settings.currency ?? "GBP"));
      setWorkingDaysPerYear(String(settings.workingDaysPerYear ?? "228"));
      setWorkingDaysPerMonth(String(settings.workingDaysPerMonth ?? "19"));
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <AppBar><div>
          <h1 className="text-[28px] leading-9 font-normal text-surface-foreground">Settings</h1>
          <p className="text-[14px] leading-5 text-surface-variant-foreground">Workspace configuration.</p>
        </div></AppBar>
        <div className="space-y-4 max-w-2xl">
          {Array.from({ length: 3 }).map((_, i) => (
            <Card key={i} variant="elevated"><CardContent className="p-6 space-y-4">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-10 w-full" />
              <Skeleton className="h-10 w-full" />
            </CardContent></Card>
          ))}
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="space-y-6">
        <AppBar><div><h1 className="text-[28px] leading-9 font-normal text-surface-foreground">Settings</h1></div></AppBar>
        <Card variant="elevated" className="max-w-md mx-auto">
          <CardContent className="flex flex-col items-center py-12 text-center">
            <Icon name="error" size={32} className="text-error mb-3" />
            <p className="text-[14px] text-muted-foreground">{error?.message || "Failed to load settings"}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const monthOptions = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  return (
    <motion.div
      className="space-y-6 max-w-2xl"
      variants={pageTransitionVariants}
      initial="initial"
      animate="enter"
      exit="exit"
      transition={defaultTransition}
    >
      <AppBar className="justify-between">
        <div>
          <h1 className="text-[28px] leading-9 font-normal text-surface-foreground">Settings</h1>
          <p className="text-[14px] leading-5 text-surface-variant-foreground">
            Workspace configuration and preferences.
          </p>
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

      {/* Company Profile */}
      <Card variant="elevated">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary/12">
              <Icon name="business" size={24} className="text-primary" />
            </div>
            <div>
              <h2 className="text-[16px] leading-6 font-medium text-surface-foreground">Company Profile</h2>
              <p className="text-[12px] text-surface-variant-foreground">Basic workspace information.</p>
            </div>
          </div>
          <div className="space-y-4">
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
            <div className="flex items-center gap-6 text-[13px] text-surface-variant-foreground pt-2">
              <span>Created: {company ? fmtDate(company.createdAt) : "—"}</span>
              <span>ID: <code className="text-[11px] bg-surface-variant/20 px-1.5 py-0.5 rounded">{company?.id}</code></span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Financial Settings */}
      <Card variant="elevated">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-900/30">
              <Icon name="payments" size={24} className="text-emerald-600" />
            </div>
            <div>
              <h2 className="text-[16px] leading-6 font-medium text-surface-foreground">Financial Settings</h2>
              <p className="text-[12px] text-surface-variant-foreground">Currency, fiscal year, and cost calculation parameters.</p>
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              label="Fiscal Year Start"
              type="number"
              value={fiscalYearStart}
              onChange={(e) => setFiscalYearStart(e.target.value)}
              supportingText={`Month: ${monthOptions[parseInt(fiscalYearStart, 10) - 1] ?? "January"}`}
            />
            <TextField
              variant="outlined"
              label="Working Days per Year"
              type="number"
              value={workingDaysPerYear}
              onChange={(e) => setWorkingDaysPerYear(e.target.value)}
              supportingText="Used for SubCon annual cost (day rate × this)."
            />
            <TextField
              variant="outlined"
              label="Working Days per Month"
              type="number"
              value={workingDaysPerMonth}
              onChange={(e) => setWorkingDaysPerMonth(e.target.value)}
              supportingText="Used for SubCon monthly cost (day rate × this)."
            />
          </div>
        </CardContent>
      </Card>

      {/* Workspace Stats */}
      <Card variant="elevated">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900/30">
              <Icon name="analytics" size={24} className="text-blue-600" />
            </div>
            <div>
              <h2 className="text-[16px] leading-6 font-medium text-surface-foreground">Workspace Overview</h2>
              <p className="text-[12px] text-surface-variant-foreground">Current workspace statistics.</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
            {[
              { label: "Members", value: company?.stats.members ?? 0, icon: "group" },
              { label: "Roles", value: company?.stats.roles ?? 0, icon: "shield" },
              { label: "Positions", value: company?.stats.positions ?? 0, icon: "work" },
              { label: "Org Units", value: company?.stats.orgUnits ?? 0, icon: "lan" },
              { label: "Unit Types", value: company?.stats.orgUnitTypes ?? 0, icon: "label" },
            ].map((stat) => (
              <div key={stat.label} className="text-center p-3 rounded-lg bg-surface-variant/10">
                <Icon name={stat.icon} size={20} className="text-surface-variant-foreground mx-auto mb-1" />
                <p className="text-[22px] font-normal text-surface-foreground">{stat.value}</p>
                <p className="text-[11px] text-surface-variant-foreground">{stat.label}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Danger Zone */}
      <Card variant="outlined" className="border-error/30">
        <CardContent className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-error/12">
              <Icon name="warning" size={24} className="text-error" />
            </div>
            <div>
              <h2 className="text-[16px] leading-6 font-medium text-error">Danger Zone</h2>
              <p className="text-[12px] text-surface-variant-foreground">Destructive actions that cannot be undone.</p>
            </div>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 rounded-lg border border-outline-variant/50">
              <div>
                <p className="text-[14px] font-medium text-surface-foreground">Export All Data</p>
                <p className="text-[12px] text-surface-variant-foreground">Download all workspace data as CSV.</p>
              </div>
              <Button variant="outlined" disabled>
                <Icon name="download" size={18} />Coming Soon
              </Button>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-error/20">
              <div>
                <p className="text-[14px] font-medium text-surface-foreground">Reset All Data</p>
                <p className="text-[12px] text-surface-variant-foreground">Delete all members, org structure, roles, calendar data. Keeps super admin accounts.</p>
              </div>
              <Button variant="outlined" className="text-error border-error/30" onClick={() => setShowResetDialog(true)}>
                <Icon name="restart_alt" size={18} />Reset
              </Button>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg border border-error/20">
              <div>
                <p className="text-[14px] font-medium text-surface-foreground">Delete Workspace</p>
                <p className="text-[12px] text-surface-variant-foreground">Permanently delete this workspace and all its data.</p>
              </div>
              <Button variant="outlined" className="text-error border-error/30" disabled>
                <Icon name="delete_forever" size={18} />Delete
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

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
            <Button variant="text" onClick={() => { setShowResetDialog(false); setResetConfirmText(""); }}>
              Cancel
            </Button>
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
