"use client";

import React, { useState, useRef, useMemo, useCallback } from "react";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import type { DragEndEvent } from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import {
  Icon,
  Card,
  CardContent,
  Chip,
  Select,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  Divider,
} from "@vkieu/mui";
import { Button } from "@vkieu/mui/buttons";
import { useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/api-client";
import { parseCsvLine, autoDetectMapping, detectUnitTypeName, detectUnitTypeIcon, detectUnitTypeColor } from "@/lib/csv";
import { useBulkImport, useRoles } from "@/services";
import type { ImportMemberRow } from "@/services";
import { toast } from "sonner";

import type { ColumnMapping, MappingTarget, ImportStep } from "./types";
import { MAPPING_OPTIONS } from "./types";
import { SortableOrgLevelItem } from "./sortable-org-level-item";

// ─── Props ──────────────────────────────────────────────────────────────────────

export interface CsvImportDialogProps {
  companyId: string;
  /** Called after a successful import so the parent can refresh data. */
  onImportComplete?: () => void;
}

// ─── Component ──────────────────────────────────────────────────────────────────

/**
 * Self-contained CSV import dialog for bootstrapping workspace data.
 *
 * Handles the full flow:
 *   1. File selection → parse CSV
 *   2. Column mapping (with drag-reorderable org hierarchy)
 *   3. Preview & confirm import
 *
 * All state is internal — the parent only provides `companyId` and an
 * optional `onImportComplete` callback. Exposes a trigger button via
 * `CsvImportDialog.Trigger` (render-prop pattern) or can be controlled
 * via the returned ref.
 */
export function CsvImportDialog({ companyId, onImportComplete }: CsvImportDialogProps) {
  const queryClient = useQueryClient();

  // ── DnD sensors ─────────────────────────────────────────────────────────
  const dndSensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  // ── Data ────────────────────────────────────────────────────────────────
  const { data: roles = [] } = useRoles(companyId);
  const bulkImportMutation = useBulkImport(companyId);

  // ── State ───────────────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [importStep, setImportStep] = useState<ImportStep>("upload");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [orgLevelOrder, setOrgLevelOrder] = useState<number[]>([]);
  const [importDefaultRoleId, setImportDefaultRoleId] = useState("");
  const [lineManagerMatchField, setLineManagerMatchField] = useState("email");

  // ── Reset ───────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    setOpen(false);
    setImportStep("upload");
    setCsvHeaders([]);
    setCsvRows([]);
    setColumnMappings([]);
    setOrgLevelOrder([]);
    setImportDefaultRoleId("");
    setLineManagerMatchField("email");
  }, []);

  // ── File selection & parsing ────────────────────────────────────────────
  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        const lines = text.split(/\r?\n/).filter((l) => l.trim());
        if (lines.length < 2) {
          toast.error("CSV must have a header row and at least one data row");
          return;
        }

        const headers = parseCsvLine(lines[0]);
        const rows = lines.slice(1).map(parseCsvLine);

        setCsvHeaders(headers);
        setCsvRows(rows);

        // Auto-detect mappings from column headers
        const mappings: ColumnMapping[] = headers.map((h) => {
          const target = autoDetectMapping(h);
          return {
            csvHeader: h,
            target,
            unitTypeName: target === "orgLevel" ? detectUnitTypeName(h) : undefined,
          };
        });

        // Assign unique icons/colors per org level using index
        let orgIdx = 0;
        for (const m of mappings) {
          if (m.target === "orgLevel") {
            m.unitTypeIcon = detectUnitTypeIcon(m.csvHeader, orgIdx);
            m.unitTypeColor = detectUnitTypeColor(m.csvHeader, orgIdx);
            orgIdx++;
          }
        }
        setColumnMappings(mappings);

        // Build initial org-level ordering (left-to-right from CSV)
        setOrgLevelOrder(
          mappings
            .map((m, i) => (m.target === "orgLevel" ? i : -1))
            .filter((i) => i >= 0),
        );

        setImportStep("mapping");
        setOpen(true);
      };
      reader.readAsText(file);
      e.target.value = ""; // allow re-selecting the same file
    },
    [],
  );

  // ── Column mapping change ───────────────────────────────────────────────
  const handleMappingChange = useCallback((index: number, target: MappingTarget) => {
    setColumnMappings((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], target };
      return next;
    });
    setOrgLevelOrder((prev) => {
      if (target === "orgLevel") {
        return prev.includes(index) ? prev : [...prev, index];
      }
      return prev.filter((i) => i !== index);
    });
  }, []);

  // ── Preview data (derived) ─────────────────────────────────────────────
  const importPreview = useMemo(() => {
    if (importStep !== "preview" || csvRows.length === 0) return null;

    const nameIdx = columnMappings.findIndex((m) => m.target === "fullName");
    const emailIdx = columnMappings.findIndex((m) => m.target === "email");
    const orgLevelIdxs = orgLevelOrder;
    const posIdx = columnMappings.findIndex((m) => m.target === "position");
    const gradeIdx = columnMappings.findIndex((m) => m.target === "grade");
    const managerIdx = columnMappings.findIndex((m) => m.target === "lineManager");
    const empTypeIdx = columnMappings.findIndex((m) => m.target === "employmentType");
    const salaryIdx = columnMappings.findIndex((m) => m.target === "salary");
    const dayRateIdx = columnMappings.findIndex((m) => m.target === "dayRate");
    const extraIdxs = columnMappings
      .map((m, i) => (m.target === "extra" ? i : -1))
      .filter((i) => i >= 0);

    if (nameIdx === -1 || emailIdx === -1) return null;

    const rows: ImportMemberRow[] = [];
    const errors: { row: number; message: string }[] = [];

    for (let i = 0; i < csvRows.length; i++) {
      const fields = csvRows[i];
      const fullName = fields[nameIdx]?.trim() ?? "";
      const email = fields[emailIdx]?.trim() ?? "";

      if (!fullName) {
        errors.push({ row: i + 2, message: "Missing name" });
        continue;
      }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errors.push({ row: i + 2, message: `Invalid email: "${email || ""}"` });
        continue;
      }

      const metadata: Record<string, string> = {};
      for (const idx of extraIdxs) {
        const val = fields[idx]?.trim();
        if (val) metadata[columnMappings[idx].csvHeader] = val;
      }

      // Build org structure from multiple columns, skipping empty values
      let orgStructure: string | undefined;
      const orgLevelTypesList: string[] = [];
      const orgLevelIconsList: string[] = [];
      const orgLevelColorsList: string[] = [];
      if (orgLevelIdxs.length > 0) {
        const parts: string[] = [];
        for (const idx of orgLevelIdxs) {
          const val = fields[idx]?.trim();
          if (val) {
            parts.push(val);
            orgLevelTypesList.push(columnMappings[idx].unitTypeName || columnMappings[idx].csvHeader);
            orgLevelIconsList.push(columnMappings[idx].unitTypeIcon || "corporate_fare");
            orgLevelColorsList.push(columnMappings[idx].unitTypeColor || "#6B7280");
          }
        }
        if (parts.length > 0) orgStructure = parts.join(" | ");
      }

      rows.push({
        fullName,
        email,
        orgStructure,
        orgLevelTypes: orgLevelTypesList.length > 0 ? orgLevelTypesList : undefined,
        orgLevelIcons: orgLevelIconsList.length > 0 ? orgLevelIconsList : undefined,
        orgLevelColors: orgLevelColorsList.length > 0 ? orgLevelColorsList : undefined,
        position: posIdx >= 0 ? fields[posIdx]?.trim() || undefined : undefined,
        grade: gradeIdx >= 0 ? fields[gradeIdx]?.trim() || undefined : undefined,
        lineManagerIdentifier: managerIdx >= 0 ? fields[managerIdx]?.trim() || undefined : undefined,
        lineManagerMatchField: managerIdx >= 0 && fields[managerIdx]?.trim() ? lineManagerMatchField : undefined,
        employmentType: empTypeIdx >= 0 ? fields[empTypeIdx]?.trim() || undefined : undefined,
        annualSalary: salaryIdx >= 0 ? fields[salaryIdx]?.trim() || undefined : undefined,
        dayRate: dayRateIdx >= 0 ? fields[dayRateIdx]?.trim() || undefined : undefined,
        roleId: importDefaultRoleId || undefined,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      });
    }

    return { rows, errors };
  }, [importStep, csvRows, columnMappings, importDefaultRoleId, orgLevelOrder, lineManagerMatchField]);

  // ── Step navigation ─────────────────────────────────────────────────────
  const handleMappingNext = useCallback(() => {
    const hasName = columnMappings.some((m) => m.target === "fullName");
    const hasEmail = columnMappings.some((m) => m.target === "email");
    if (!hasName || !hasEmail) {
      toast.error("You must map at least a Full Name and Email column");
      return;
    }
    setImportStep("preview");
  }, [columnMappings]);

  // ── Confirm import ──────────────────────────────────────────────────────
  const handleImportConfirm = useCallback(() => {
    if (!importPreview?.rows.length) return;

    const toastId = toast.loading(
      `Importing ${importPreview.rows.length} members...`,
      { duration: Infinity },
    );

    const rows = importPreview.rows;
    reset();

    // Use plain apiClient so the request survives component unmount
    apiClient<{ total: number; created: number; updated: number; errors: unknown[] }>(
      `/companies/${companyId}/members/import`,
      { method: "POST", body: { rows } },
    )
      .then((result) => {
        const msg = `Imported ${result.created} new, updated ${result.updated}`;
        if (result.errors.length > 0) {
          toast.success(`${msg} (${result.errors.length} errors)`, { id: toastId });
        } else {
          toast.success(msg, { id: toastId });
        }
        queryClient.invalidateQueries({ queryKey: ["members", companyId] });
        queryClient.invalidateQueries({ queryKey: ["company-settings", companyId] });
        onImportComplete?.();
      })
      .catch((err) => {
        toast.error(err.message || "Import failed", { id: toastId });
      });
  }, [importPreview, companyId, queryClient, onImportComplete, reset]);

  // ─── Render ─────────────────────────────────────────────────────────────
  return (
    <>
      {/* Hidden file input — triggered externally via the trigger button */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Trigger button */}
      <Button variant="filled" onClick={() => fileInputRef.current?.click()}>
        <Icon name="upload" size={18} />
        Import CSV
      </Button>

      {/* Dialog */}
      <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {importStep === "mapping" && "Map CSV Columns"}
              {importStep === "preview" && "Import Summary"}
            </DialogTitle>
            <DialogDescription>
              {importStep === "mapping" &&
                "Match each CSV column to a member field. Unmapped columns are stored as metadata."}
              {importStep === "preview" &&
                "Review what will be imported into your workspace."}
            </DialogDescription>
          </DialogHeader>

          {/* ── Step 1: Column Mapping ──────────────────────────────────── */}
          {importStep === "mapping" && (
            <MappingStep
              csvHeaders={csvHeaders}
              csvRows={csvRows}
              columnMappings={columnMappings}
              orgLevelOrder={orgLevelOrder}
              importDefaultRoleId={importDefaultRoleId}
              lineManagerMatchField={lineManagerMatchField}
              roles={roles}
              dndSensors={dndSensors}
              onMappingChange={handleMappingChange}
              onOrgLevelReorder={setOrgLevelOrder}
              onUnitTypeChange={(idx, value) => {
                setColumnMappings((prev) => {
                  const next = [...prev];
                  next[idx] = { ...next[idx], unitTypeName: value };
                  return next;
                });
              }}
              onUnitTypeIconChange={(idx, value) => {
                setColumnMappings((prev) => {
                  const next = [...prev];
                  next[idx] = { ...next[idx], unitTypeIcon: value };
                  return next;
                });
              }}
              onUnitTypeColorChange={(idx, value) => {
                setColumnMappings((prev) => {
                  const next = [...prev];
                  next[idx] = { ...next[idx], unitTypeColor: value };
                  return next;
                });
              }}
              onDefaultRoleChange={setImportDefaultRoleId}
              onLineManagerMatchFieldChange={setLineManagerMatchField}
            />
          )}

          {/* ── Step 2: Import Preview ─────────────────────────────────── */}
          {importStep === "preview" && importPreview && (
            <PreviewStep
              importPreview={importPreview}
              columnMappings={columnMappings}
              orgLevelOrder={orgLevelOrder}
              isPending={bulkImportMutation.isPending}
            />
          )}

          {/* ── Footer ─────────────────────────────────────────────────── */}
          <DialogFooter>
            {importStep === "mapping" && (
              <>
                <Button variant="text" onClick={reset}>Cancel</Button>
                <Button variant="filled" onClick={handleMappingNext}>
                  <Icon name="arrow_forward" size={18} />Review Import
                </Button>
              </>
            )}
            {importStep === "preview" && (
              <>
                <Button variant="text" onClick={() => setImportStep("mapping")}>
                  <Icon name="arrow_back" size={18} />Back
                </Button>
                <Button
                  variant="filled"
                  onClick={handleImportConfirm}
                  disabled={!importPreview?.rows.length || bulkImportMutation.isPending}
                >
                  {bulkImportMutation.isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-on-primary border-t-transparent rounded-full animate-spin" />
                      Importing...
                    </span>
                  ) : (
                    <>
                      <Icon name="upload" size={18} />
                      Import {importPreview?.rows.length ?? 0} Records
                    </>
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

// ─── Step 1: Mapping ────────────────────────────────────────────────────────────

interface MappingStepProps {
  csvHeaders: string[];
  csvRows: string[][];
  columnMappings: ColumnMapping[];
  orgLevelOrder: number[];
  importDefaultRoleId: string;
  lineManagerMatchField: string;
  roles: { id: string; name: string }[];
  dndSensors: ReturnType<typeof useSensors>;
  onMappingChange: (index: number, target: MappingTarget) => void;
  onOrgLevelReorder: React.Dispatch<React.SetStateAction<number[]>>;
  onUnitTypeChange: (index: number, value: string) => void;
  onUnitTypeIconChange: (index: number, value: string) => void;
  onUnitTypeColorChange: (index: number, value: string) => void;
  onDefaultRoleChange: (value: string) => void;
  onLineManagerMatchFieldChange: (value: string) => void;
}

function MappingStep({
  csvHeaders,
  csvRows,
  columnMappings,
  orgLevelOrder,
  importDefaultRoleId,
  lineManagerMatchField,
  roles,
  dndSensors,
  onMappingChange,
  onOrgLevelReorder,
  onUnitTypeChange,
  onUnitTypeIconChange,
  onUnitTypeColorChange,
  onDefaultRoleChange,
  onLineManagerMatchFieldChange,
}: MappingStepProps) {
  return (
    <div className="px-6 space-y-4 max-h-[60vh] overflow-y-auto">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        <Chip variant="filter" selected leadingIcon="looks_one">Step 1 of 2</Chip>
        <Chip variant="filter" leadingIcon="table_chart">{csvHeaders.length} columns</Chip>
        <Chip variant="filter" leadingIcon="dataset">{csvRows.length} rows</Chip>
      </div>

      {/* Column mapping grid */}
      <Card variant="outlined" className="overflow-visible">
        <div>
          {/* Header */}
          <div className="grid grid-cols-[6fr_20px_5fr_20px] gap-x-2 items-center px-3 py-2 bg-surface-container-low/50 border-b border-outline-variant/50">
            <p className="text-[10px] text-surface-variant-foreground uppercase tracking-wider font-medium">CSV Column</p>
            <div />
            <p className="text-[10px] text-surface-variant-foreground uppercase tracking-wider font-medium">Maps To</p>
            <div />
          </div>
          {/* Rows */}
          {columnMappings.map((mapping, idx) => {
            const isSkipped = mapping.target === "skip";
            return (
            <div key={idx} className={`grid grid-cols-[6fr_20px_5fr_20px] gap-x-2 items-center px-3 py-2 hover:bg-surface-foreground/4 transition-colors ${isSkipped ? "opacity-40" : ""}`}>
              <div className="flex items-center gap-1.5 min-w-0">
                <Icon name="table_chart" size={12} className="text-surface-variant-foreground shrink-0" />
                <span className={`text-[11px] font-medium truncate ${isSkipped ? "line-through text-surface-variant-foreground" : "text-surface-foreground"}`}>{mapping.csvHeader}</span>
                {!isSkipped && csvRows.length > 0 && csvRows[0][idx] && (
                  <span className="text-[10px] text-surface-variant-foreground/60 truncate max-w-20">({csvRows[0][idx]})</span>
                )}
              </div>
              <div className="flex items-center justify-center">
                <Icon name="arrow_forward" size={12} className="text-surface-variant-foreground/40" />
              </div>
              <div className="min-w-0 flex items-center">
                <Select
                  variant="outlined"
                  value={mapping.target}
                  onValueChange={(val) => onMappingChange(idx, val as MappingTarget)}
                  options={MAPPING_OPTIONS}
                  className="w-full text-[11px]"
                />
              </div>
              <button
                type="button"
                onClick={() => onMappingChange(idx, isSkipped ? "extra" : "skip")}
                className="flex items-center justify-center w-5 h-5 rounded-full hover:bg-surface-foreground/8 transition-colors"
                title={isSkipped ? "Restore column" : "Skip column"}
              >
                <Icon name={isSkipped ? "undo" : "close"} size={14} className="text-surface-variant-foreground" />
              </button>
            </div>
            );
          })}
        </div>
      </Card>

      {/* Org Hierarchy Order (draggable) */}
      {orgLevelOrder.length > 0 && (
        <Card variant="outlined" className="overflow-visible">
          <CardContent className="p-3 overflow-visible">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <Icon name="account_tree" size={16} className="text-primary" />
                <p className="text-label-medium text-surface-foreground">Hierarchy Order</p>
              </div>
              <p className="text-[10px] text-surface-variant-foreground">Drag to reorder</p>
            </div>
            <DndContext
              sensors={dndSensors}
              collisionDetection={closestCenter}
              onDragEnd={(event: DragEndEvent) => {
                const { active, over } = event;
                if (over && active.id !== over.id) {
                  onOrgLevelReorder((prev) => {
                    const oldIndex = prev.indexOf(Number(active.id));
                    const newIndex = prev.indexOf(Number(over.id));
                    return arrayMove(prev, oldIndex, newIndex);
                  });
                }
              }}
            >
              <SortableContext items={orgLevelOrder} strategy={verticalListSortingStrategy}>
                <div className="rounded-lg border border-outline-variant/50 overflow-visible">
                  {orgLevelOrder.map((idx, rank) => (
                    <SortableOrgLevelItem
                      key={idx}
                      id={idx}
                      rank={rank}
                      total={orgLevelOrder.length}
                      csvHeader={columnMappings[idx]?.csvHeader ?? ""}
                      unitTypeName={columnMappings[idx]?.unitTypeName ?? ""}
                      unitTypeIcon={columnMappings[idx]?.unitTypeIcon ?? "corporate_fare"}
                      unitTypeColor={columnMappings[idx]?.unitTypeColor ?? "#6366F1"}
                      onUnitTypeChange={(value) => onUnitTypeChange(idx, value)}
                      onUnitTypeIconChange={(value) => onUnitTypeIconChange(idx, value)}
                      onUnitTypeColorChange={(value) => onUnitTypeColorChange(idx, value)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
            <p className="mt-2 text-[10px] text-surface-variant-foreground">
              {orgLevelOrder.map((idx) => columnMappings[idx]?.unitTypeName || columnMappings[idx]?.csvHeader).join(" → ")}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Line Manager Matching */}
      {columnMappings.some((m) => m.target === "lineManager") && (
        <Card variant="outlined">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <Icon name="supervisor_account" size={16} className="text-primary" />
              <p className="text-label-medium text-surface-foreground">Line Manager Matching</p>
            </div>
            <p className="text-[11px] text-surface-variant-foreground mb-2">
              Which column should be used to identify the manager? The line manager value
              will be matched against this field.
            </p>
            <Select
              variant="outlined"
              value={lineManagerMatchField}
              onValueChange={onLineManagerMatchFieldChange}
              options={[
                { value: "email", label: "Email" },
                { value: "fullName", label: "Full Name" },
                ...columnMappings
                  .filter((m) => m.target === "extra")
                  .map((m) => ({ value: m.csvHeader, label: `${m.csvHeader} (metadata)` })),
              ]}
              className="w-full"
            />
          </CardContent>
        </Card>
      )}

      {/* Default Role */}
      <Card variant="outlined">
        <CardContent className="p-3">
          <div className="flex items-center gap-2 mb-2">
            <Icon name="shield" size={16} className="text-primary" />
            <p className="text-label-medium text-surface-foreground">Default Role</p>
          </div>
          <p className="text-[11px] text-surface-variant-foreground mb-2">
            Assigned to all imported members. Leave empty for no role.
          </p>
          <Select
            variant="outlined"
            value={importDefaultRoleId}
            onValueChange={onDefaultRoleChange}
            options={[
              { value: "", label: "No role" },
              ...roles.map((r) => ({ value: r.id, label: r.name })),
            ]}
            className="w-full"
          />
        </CardContent>
      </Card>
    </div>
  );
}

// ─── Step 2: Preview ────────────────────────────────────────────────────────────

interface PreviewStepProps {
  importPreview: {
    rows: ImportMemberRow[];
    errors: { row: number; message: string }[];
  };
  columnMappings: ColumnMapping[];
  orgLevelOrder: number[];
  isPending: boolean;
}

function PreviewStep({ importPreview, columnMappings, orgLevelOrder, isPending }: PreviewStepProps) {
  const rows = importPreview.rows;
  const uniqueEmails = new Set(rows.map((r) => r.email.toLowerCase()));
  const duplicateRows = rows.length - uniqueEmails.size;
  const positions = new Set(rows.map((r) => r.position).filter(Boolean));
  const grades = new Set(rows.map((r) => r.grade).filter(Boolean));
  const permCount = rows.filter((r) => r.employmentType === "Perm").length;
  const subConCount = rows.filter((r) => r.employmentType === "SubCon").length;
  const withManagers = rows.filter((r) => r.lineManagerIdentifier).length;
  const uniqueManagers = new Set(rows.map((r) => r.lineManagerIdentifier).filter(Boolean)).size;
  const withSalary = rows.filter((r) => r.annualSalary).length;
  const withDayRate = rows.filter((r) => r.dayRate).length;

  return (
    <div className="px-6 space-y-4 max-h-[60vh] overflow-y-auto relative">
      {/* Loading overlay */}
      {isPending && (
        <div className="absolute inset-0 bg-surface/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-4 rounded-xl">
          <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
          <p className="text-title-medium text-surface-foreground">Importing...</p>
          <p className="text-body-small text-surface-variant-foreground">
            {rows.length} records with org structure, positions, and roles
          </p>
        </div>
      )}

      {/* Step indicator */}
      <div className="flex items-center gap-2">
        <Chip variant="filter" selected leadingIcon="looks_two">Step 2 of 2</Chip>
        {importPreview.errors.length === 0 && (
          <Chip variant="filter" selected leadingIcon="check_circle" className="text-primary">Ready to import</Chip>
        )}
      </div>

      {/* KPI Summary */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { value: uniqueEmails.size, label: "Members", icon: "group", color: "bg-primary-container" },
          { value: positions.size, label: "Positions", icon: "work", color: "bg-secondary-container" },
          { value: grades.size, label: "Grades", icon: "leaderboard", color: "bg-tertiary-container" },
          { value: importPreview.errors.length, label: "Errors", icon: importPreview.errors.length > 0 ? "error" : "check_circle", color: importPreview.errors.length > 0 ? "bg-error-container" : "bg-primary-container" },
        ].map((stat) => (
          <Card key={stat.label} variant="elevated">
            <CardContent className="flex items-center gap-3 p-3">
              <div className={`flex items-center justify-center w-9 h-9 rounded-full ${stat.color} shrink-0`}>
                <Icon name={stat.icon} size={18} className="text-on-primary-container" />
              </div>
              <div>
                <p className="text-title-large text-surface-foreground leading-tight">{stat.value}</p>
                <p className="text-label-small text-surface-variant-foreground">{stat.label}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Multi-squad notice */}
      {duplicateRows > 0 && (
        <Card variant="outlined" className="border-secondary/30">
          <CardContent className="flex items-start gap-3 p-3">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-secondary-container shrink-0">
              <Icon name="workspaces" size={16} className="text-on-secondary-container" />
            </div>
            <div>
              <p className="text-label-medium text-surface-foreground">{duplicateRows} multi-squad allocation{duplicateRows !== 1 ? "s" : ""}</p>
              <p className="text-body-small text-surface-variant-foreground">
                Members appearing on multiple rows will be split across squads automatically.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data breakdown */}
      <Card variant="outlined">
        <CardContent className="p-3 space-y-3">
          <p className="text-label-medium text-surface-foreground">Data Breakdown</p>
          <div className="flex flex-wrap gap-2">
            {permCount > 0 && <Chip variant="filter" selected leadingIcon="badge">{permCount} Perm</Chip>}
            {subConCount > 0 && <Chip variant="filter" selected leadingIcon="engineering">{subConCount} SubCon</Chip>}
            {withManagers > 0 && <Chip variant="filter" leadingIcon="supervisor_account">{uniqueManagers} managers ({withManagers} reports)</Chip>}
            {withSalary > 0 && <Chip variant="filter" leadingIcon="payments">{withSalary} salaries</Chip>}
            {withDayRate > 0 && <Chip variant="filter" leadingIcon="schedule">{withDayRate} day rates</Chip>}
          </div>

          {/* Org structure counts per level */}
          {orgLevelOrder.length > 0 && (
            <>
              <Divider />
              <p className="text-label-medium text-surface-foreground">Org Structure</p>
              <div className="flex flex-wrap gap-2">
                {orgLevelOrder.map((colIdx, levelIdx) => {
                  const typeName = columnMappings[colIdx]?.unitTypeName || columnMappings[colIdx]?.csvHeader;
                  const uniqueValues = new Set(
                    rows.map((r) => r.orgStructure?.split(" | ")?.[levelIdx]).filter(Boolean),
                  );
                  return (
                    <Chip key={colIdx} variant="filter" leadingIcon="lan">
                      {uniqueValues.size} {typeName}{uniqueValues.size !== 1 ? "s" : ""}
                    </Chip>
                  );
                })}
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Errors */}
      {importPreview.errors.length > 0 && (
        <Card variant="outlined" className="border-error/30">
          <CardContent className="p-3">
            <div className="flex items-center gap-2 mb-2">
              <Icon name="error" size={16} className="text-error" />
              <p className="text-label-medium text-error">
                {importPreview.errors.length} row{importPreview.errors.length !== 1 ? "s" : ""} will be skipped
              </p>
            </div>
            <div className="space-y-0.5 max-h-20 overflow-y-auto">
              {importPreview.errors.map((err, i) => (
                <p key={i} className="text-[11px] text-error/80">Row {err.row}: {err.message}</p>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
