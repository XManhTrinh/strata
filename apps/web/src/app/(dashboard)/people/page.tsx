"use client";

import React, { useState, useRef, useMemo, useCallback } from "react";
import { motion } from "motion/react";
import {
  Search,
  Icon,
  Card,
  CardContent,
  TextField,
  Chip,
  Select,
  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription,
  Tooltip,
  Checkbox,
  Divider,
} from "@vkieu/mui";
import { Button } from "@vkieu/mui/buttons";
import { AppBar } from "@/components/layout/app-bar";
import {
  usePeople,
  useCreatePerson,
  useUpdatePerson,
  useDeletePerson,
  useBulkImport,
  useDeleteAllMembers,
  useMetadataKeys,
  useTableViews,
  useCreateTableView,
  useDeleteTableView,
  useRoles,
  useAssignRole,
} from "@/services";
import type {
  Person,
  CreatePersonRequest,
  ImportMemberRow,
} from "@/services";
import { useCompanyId } from "@/hooks/use-company";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/ui/avatar";
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table";
import { toast } from "sonner";
import { pageTransitionVariants, defaultTransition } from "@/lib/motion";

// ─── Types ────────────────────────────────────────────────────────────────────

type MappingTarget =
  | "fullName"
  | "email"
  | "orgLevel"
  | "position"
  | "grade"
  | "lineManager"
  | "employmentType"
  | "salary"
  | "dayRate"
  | "extra"
  | "skip";

interface ColumnMapping {
  csvHeader: string;
  target: MappingTarget;
  unitTypeName?: string; // for orgLevel: "Division", "Tribe", "Squad"
}

type ImportStep = "upload" | "mapping" | "preview";

const MAPPING_OPTIONS: { value: MappingTarget; label: string }[] = [
  { value: "fullName", label: "Full Name" },
  { value: "email", label: "Email" },
  { value: "orgLevel", label: "Org Level (specify type below)" },
  { value: "position", label: "Position" },
  { value: "grade", label: "Grade / Career Level" },
  { value: "lineManager", label: "Line Manager (email)" },
  { value: "employmentType", label: "Employment Type (Perm/SubCon)" },
  { value: "salary", label: "Annual Salary (Perm)" },
  { value: "dayRate", label: "Day Rate (SubCon)" },
  { value: "extra", label: "Extra Column" },
  { value: "skip", label: "Skip" },
];

// Core columns that always appear
const CORE_COLUMNS = [
  { key: "name", label: "Name" },
  { key: "email", label: "Email" },
  { key: "orgUnit", label: "Org Unit" },
  { key: "position", label: "Position" },
  { key: "roles", label: "Roles" },
] as const;

// ─── CSV Utilities ────────────────────────────────────────────────────────────

function escapeCsvField(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Robust CSV line parser that handles quoted fields with commas and newlines.
 */
function parseCsvLine(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
        inQuotes = true;
      } else if (ch === ",") {
        fields.push(current.trim());
        current = "";
      } else {
        current += ch;
      }
    }
  }
  fields.push(current.trim());
  return fields;
}

function autoDetectMapping(header: string): MappingTarget {
  const h = header.toLowerCase();
  if (h.includes("name") && !h.includes("unit")) return "fullName";
  if (h.includes("email") || h.includes("e-mail")) {
    // "line manager email" should NOT match as the member's email
    if (h.includes("manager") || h.includes("supervisor") || h.includes("reports")) {
      return "lineManager";
    }
    return "email";
  }
  if (
    h === "division" ||
    h === "tribe" ||
    h === "cluster" ||
    h === "squad"
  )
    return "orgLevel";
  if (h.includes("position") || h.includes("title") || h.includes("role"))
    return "position";
  if (h.includes("grade") || h.includes("level") || h.includes("career"))
    return "grade";
  if (h.includes("manager") || h.includes("reports to") || h.includes("supervisor"))
    return "lineManager";
  if (h.includes("employment") || h === "type" || h === "emp type")
    return "employmentType";
  if (h.includes("salary") || h.includes("annual"))
    return "salary";
  if (h.includes("day rate") || h.includes("dayrate") || h.includes("daily rate"))
    return "dayRate";
  return "extra";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PeoplePage() {
  const companyId = useCompanyId();

  // ── Data queries (always called) ──────────────────────────────────────────
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 20;

  const {
    data,
    isLoading,
    isError,
    error,
    refetch,
  } = usePeople({ companyId, page, pageSize, search: search || undefined });

  const { data: metadataKeys = [] } = useMetadataKeys(companyId);
  const { data: roles = [] } = useRoles(companyId);
  const { data: tableViews = [] } = useTableViews(companyId, "members");

  // ── Mutations (always called) ─────────────────────────────────────────────
  const createMutation = useCreatePerson(companyId);
  const updateMutation = useUpdatePerson(companyId);
  const deleteMutation = useDeletePerson(companyId);
  const bulkImportMutation = useBulkImport(companyId);
  const deleteAllMutation = useDeleteAllMembers(companyId);
  const createViewMutation = useCreateTableView(companyId);
  const deleteViewMutation = useDeleteTableView(companyId);

  // ── Dialog state ──────────────────────────────────────────────────────────
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [editPerson, setEditPerson] = useState<Person | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [showDeleteAllDialog, setShowDeleteAllDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [showColumnToggle, setShowColumnToggle] = useState(false);
  const [showSaveViewDialog, setShowSaveViewDialog] = useState(false);
  const [newViewName, setNewViewName] = useState("");

  // ── Form state ────────────────────────────────────────────────────────────
  const [formData, setFormData] = useState<CreatePersonRequest>({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    dateOfBirth: "",
  });
  const [formMetadata, setFormMetadata] = useState<Record<string, string>>({});

  // ── CSV Import state ──────────────────────────────────────────────────────
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importStep, setImportStep] = useState<ImportStep>("upload");
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [csvRows, setCsvRows] = useState<string[][]>([]);
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [importDefaultRoleId, setImportDefaultRoleId] = useState("");

  // ── Column visibility state ───────────────────────────────────────────────
  const [visibleMetaKeys, setVisibleMetaKeys] = useState<Set<string>>(
    new Set()
  );
  const [selectedViewId, setSelectedViewId] = useState<string>("");

  // ── Derived data ──────────────────────────────────────────────────────────
  const people = data?.data ?? [];
  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1;

  // ── Batch selection ─────────────────────────────────────────────────────
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showBatchRoleDialog, setShowBatchRoleDialog] = useState(false);
  const [batchRoleId, setBatchRoleId] = useState("");
  const assignRoleMutation = useAssignRole(companyId);

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = () => {
    if (selectedIds.size === people.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(people.map((p) => p.id)));
    }
  };

  const handleBatchAssignRole = async () => {
    if (!batchRoleId || selectedIds.size === 0) return;
    let successCount = 0;
    for (const personId of selectedIds) {
      try {
        await assignRoleMutation.mutateAsync({ personId, roleId: batchRoleId });
        successCount++;
      } catch {
        // skip failures (might already have the role)
      }
    }
    toast.success(`Role assigned to ${successCount} member${successCount !== 1 ? "s" : ""}`);
    setShowBatchRoleDialog(false);
    setBatchRoleId("");
    setSelectedIds(new Set());
  };

  // Combine core + metadata columns for the table
  const allColumns = useMemo(() => {
    const core = CORE_COLUMNS.map((c) => ({
      key: c.key,
      label: c.label,
      isCore: true,
    }));
    const meta = metadataKeys.map((k) => ({
      key: `meta:${k}`,
      label: k,
      isCore: false,
    }));
    return [...core, ...meta];
  }, [metadataKeys]);

  const visibleColumns = useMemo(() => {
    return allColumns.filter(
      (col) => col.isCore || visibleMetaKeys.has(col.key)
    );
  }, [allColumns, visibleMetaKeys]);

  // ── CSV import preview data ───────────────────────────────────────────────
  const importPreview = useMemo(() => {
    if (importStep !== "preview" || csvRows.length === 0) return null;

    const nameIdx = columnMappings.findIndex((m) => m.target === "fullName");
    const emailIdx = columnMappings.findIndex((m) => m.target === "email");
    // Collect all org level columns in order
    const orgLevelIdxs = columnMappings
      .map((m, i) => (m.target === "orgLevel" ? i : -1))
      .filter((i) => i >= 0);
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
        errors.push({
          row: i + 2,
          message: `Invalid email: "${email || ""}"`,
        });
        continue;
      }

      const metadata: Record<string, string> = {};
      for (const idx of extraIdxs) {
        const val = fields[idx]?.trim();
        if (val) {
          metadata[columnMappings[idx].csvHeader] = val;
        }
      }

      // Build org structure from multiple columns, skipping empty values
      let orgStructure: string | undefined;
      const orgLevelTypesList: string[] = [];
      if (orgLevelIdxs.length > 0) {
        const parts: string[] = [];
        for (const idx of orgLevelIdxs) {
          const val = fields[idx]?.trim();
          if (val) {
            parts.push(val);
            orgLevelTypesList.push(columnMappings[idx].unitTypeName || columnMappings[idx].csvHeader);
          }
        }
        if (parts.length > 0) {
          orgStructure = parts.join(" | ");
        }
      }

      rows.push({
        fullName,
        email,
        orgStructure,
        orgLevelTypes: orgLevelTypesList.length > 0 ? orgLevelTypesList : undefined,
        position: posIdx >= 0 ? fields[posIdx]?.trim() || undefined : undefined,
        grade: gradeIdx >= 0 ? fields[gradeIdx]?.trim() || undefined : undefined,
        lineManagerEmail: managerIdx >= 0 ? fields[managerIdx]?.trim() || undefined : undefined,
        employmentType: empTypeIdx >= 0 ? fields[empTypeIdx]?.trim() || undefined : undefined,
        annualSalary: salaryIdx >= 0 ? fields[salaryIdx]?.trim() || undefined : undefined,
        dayRate: dayRateIdx >= 0 ? fields[dayRateIdx]?.trim() || undefined : undefined,
        roleId: importDefaultRoleId || undefined,
        metadata: Object.keys(metadata).length > 0 ? metadata : undefined,
      });
    }

    return { rows, errors };
  }, [importStep, csvRows, columnMappings, importDefaultRoleId]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const resetForm = useCallback(() => {
    setFormData({
      fullName: "",
      email: "",
      phone: "",
      address: "",
      dateOfBirth: "",
      roleId: undefined,
    });
    setFormMetadata({});
  }, []);

  const openAdd = () => {
    resetForm();
    setShowAddDialog(true);
  };

  const openEdit = (person: Person) => {
    setFormData({
      fullName: person.fullName,
      email: person.email,
      phone: person.phone ?? "",
      address: person.address ?? "",
      dateOfBirth: person.dateOfBirth ? person.dateOfBirth.split("T")[0] : "",
    });
    setFormMetadata(person.metadata ?? {});
    setEditPerson(person);
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    createMutation.mutate(formData, {
      onSuccess: () => {
        toast.success("Member added successfully");
        setShowAddDialog(false);
        resetForm();
      },
      onError: (err) => toast.error(err.message || "Failed to add member"),
    });
  };

  const handleEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editPerson) return;
    updateMutation.mutate(
      { id: editPerson.id, ...formData, metadata: formMetadata },
      {
        onSuccess: () => {
          toast.success("Member updated successfully");
          setEditPerson(null);
          resetForm();
        },
        onError: (err) => toast.error(err.message || "Failed to update member"),
      }
    );
  };

  const handleDelete = () => {
    if (!deleteId) return;
    deleteMutation.mutate(deleteId, {
      onSuccess: () => {
        toast.success("Member removed successfully");
        setDeleteId(null);
      },
      onError: (err) => {
        toast.error(err.message || "Failed to remove member");
        setDeleteId(null);
      },
    });
  };

  const handleDeleteAll = () => {
    deleteAllMutation.mutate(undefined, {
      onSuccess: (result) => {
        toast.success(`Removed ${result.removed} members`);
        setShowDeleteAllDialog(false);
      },
      onError: (err) => {
        toast.error(err.message || "Failed to remove members");
        setShowDeleteAllDialog(false);
      },
    });
  };

  // ── CSV Import handlers ───────────────────────────────────────────────────

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
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

      // Auto-detect mappings
      const mappings: ColumnMapping[] = headers.map((h) => {
        const target = autoDetectMapping(h);
        const hl = h.toLowerCase();
        let unitTypeName: string | undefined;
        if (target === "orgLevel") {
          // Auto-detect unit type name from column header
          if (hl.includes("division")) unitTypeName = "Division";
          else if (hl.includes("tribe")) unitTypeName = "Tribe";
          else if (hl.includes("cluster")) unitTypeName = "Cluster";
          else if (hl.includes("squad")) unitTypeName = "Squad";
          else if (hl.includes("team")) unitTypeName = "Team";
          else if (hl.includes("department")) unitTypeName = "Department";
          else unitTypeName = h; // Use the column header as type name
        }
        return { csvHeader: h, target, unitTypeName };
      });
      setColumnMappings(mappings);
      setImportStep("mapping");
      setShowImportDialog(true);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleMappingChange = (index: number, target: MappingTarget) => {
    setColumnMappings((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], target };
      return next;
    });
  };

  const handleMappingNext = () => {
    const hasName = columnMappings.some((m) => m.target === "fullName");
    const hasEmail = columnMappings.some((m) => m.target === "email");

    if (!hasName || !hasEmail) {
      toast.error("You must map at least a Full Name and Email column");
      return;
    }
    setImportStep("preview");
  };

  const handleImportConfirm = () => {
    if (!importPreview?.rows.length) return;

    // Show a persistent loading toast that survives page navigation
    const toastId = toast.loading(
      `Importing ${importPreview.rows.length} members...`,
      { duration: Infinity },
    );

    // Close the dialog immediately so user can navigate
    const rows = importPreview.rows;
    resetImportDialog();

    // Fire the import — toast callbacks work even after navigation
    bulkImportMutation.mutate(rows, {
      onSuccess: (result) => {
        const msg = `Imported ${result.created} new, updated ${result.updated}`;
        if (result.errors.length > 0) {
          toast.success(`${msg} (${result.errors.length} errors)`, { id: toastId });
        } else {
          toast.success(msg, { id: toastId });
        }
      },
      onError: (err) => {
        toast.error(err.message || "Import failed", { id: toastId });
      },
    });
  };

  const resetImportDialog = () => {
    setShowImportDialog(false);
    setImportStep("upload");
    setCsvHeaders([]);
    setCsvRows([]);
    setColumnMappings([]);
    setImportDefaultRoleId("");
  };

  // ── Export handler ────────────────────────────────────────────────────────

  const handleExport = () => {
    if (people.length === 0) {
      toast.error("No members to export");
      return;
    }

    const headers = visibleColumns.map((c) => c.label);
    const rows = people.map((p) =>
      visibleColumns.map((col) => {
        if (col.key === "name") return escapeCsvField(p.fullName);
        if (col.key === "email") return escapeCsvField(p.email);
        if (col.key === "orgUnit")
          return escapeCsvField(p.orgUnitName ?? "");
        if (col.key === "position")
          return escapeCsvField(p.positionName ?? "");
        if (col.key === "roles")
          return escapeCsvField(
            (p.roles ?? []).map((r) => r.name).join(", ")
          );
        // metadata column
        const metaKey = col.key.replace("meta:", "");
        return escapeCsvField(p.metadata?.[metaKey] ?? "");
      })
    );

    const csv = [headers.join(","), ...rows.map((r) => r.join(","))].join(
      "\n"
    );
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `members-export-${new Date().toISOString().split("T")[0]}.csv`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success(`Exported ${people.length} members`);
  };

  // ── Table View handlers ───────────────────────────────────────────────────

  const handleSelectView = (viewId: string) => {
    setSelectedViewId(viewId);
    if (!viewId) {
      // Reset to default: show only core columns
      setVisibleMetaKeys(new Set());
      return;
    }
    const view = tableViews.find((v) => v.id === viewId);
    if (view) {
      const metaSet = new Set(
        view.columns.filter((c) => c.startsWith("meta:"))
      );
      setVisibleMetaKeys(metaSet);
    }
  };

  const handleSaveView = () => {
    if (!newViewName.trim()) {
      toast.error("View name is required");
      return;
    }
    const columns = visibleColumns.map((c) => c.key);
    createViewMutation.mutate(
      { name: newViewName.trim(), table: "members", columns },
      {
        onSuccess: () => {
          toast.success("View saved");
          setShowSaveViewDialog(false);
          setNewViewName("");
        },
        onError: (err) => toast.error(err.message || "Failed to save view"),
      }
    );
  };

  const handleDeleteView = (viewId: string) => {
    deleteViewMutation.mutate(viewId, {
      onSuccess: () => {
        toast.success("View deleted");
        if (selectedViewId === viewId) {
          setSelectedViewId("");
          setVisibleMetaKeys(new Set());
        }
      },
      onError: (err) => toast.error(err.message || "Failed to delete view"),
    });
  };

  const toggleMetaColumn = (colKey: string) => {
    setVisibleMetaKeys((prev) => {
      const next = new Set(prev);
      if (next.has(colKey)) {
        next.delete(colKey);
      } else {
        next.add(colKey);
      }
      return next;
    });
  };

  // ── Cell renderer ─────────────────────────────────────────────────────────

  const renderCell = (person: Person, colKey: string) => {
    switch (colKey) {
      case "name":
        return (
          <div className="flex items-center gap-3">
            <Avatar name={person.fullName} size="s" />
            <span className="font-medium">{person.fullName}</span>
          </div>
        );
      case "email":
        return person.email;
      case "orgUnit":
        return person.orgUnitName ?? "—";
      case "position":
        return person.positionName ?? "—";
      case "roles":
        return (
          <div className="flex items-center gap-1 flex-wrap">
            {person.isSuperAdmin && (
              <Chip variant="filter" selected>
                Admin
              </Chip>
            )}
            {(person.roles ?? []).map((r) => (
              <Chip key={r.id} variant="filter">
                {r.name}
              </Chip>
            ))}
            {!person.isSuperAdmin && (person.roles ?? []).length === 0 && (
              <span className="text-[12px] text-muted-foreground">
                No role
              </span>
            )}
          </div>
        );
      default: {
        // metadata column
        const metaKey = colKey.replace("meta:", "");
        return person.metadata?.[metaKey] ?? "—";
      }
    }
  };

  // ─── Error State ──────────────────────────────────────────────────────────
  if (isError) {
    return (
      <div className="space-y-6">
        <AppBar className="justify-between">
          <div>
            <h1 className="text-[28px] leading-9 font-normal text-foreground">
              Members
            </h1>
            <p className="text-[14px] leading-5 text-muted-foreground">
              Manage workspace members and their roles.
            </p>
          </div>
        </AppBar>
        <Card variant="elevated" className="max-w-lg mx-auto">
          <CardContent className="flex flex-col items-center py-12 px-8 text-center">
            <div className="flex items-center justify-center h-14 w-14 rounded-full bg-error/12 mb-4">
              <Icon name="error" size={24} className="text-destructive" />
            </div>
            <h2 className="text-[16px] font-medium leading-6 text-foreground mb-2">
              Unable to load members
            </h2>
            <p className="text-[14px] leading-5 text-muted-foreground mb-6">
              {error?.message ||
                "Something went wrong while fetching member data."}
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

  // ─── Main Content ─────────────────────────────────────────────────────────
  return (
    <motion.div
      className="space-y-6"
      variants={pageTransitionVariants}
      initial="initial"
      animate="enter"
      exit="exit"
      transition={defaultTransition}
    >
      {/* Page Header */}
      <AppBar className="justify-between">
        <div>
          <h1 className="text-[28px] leading-9 font-normal text-foreground">
            Members
          </h1>
          <p className="text-[14px] leading-5 text-muted-foreground">
            Manage workspace members and their roles.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip content="Import members from CSV">
            <Button
              variant="tonal"
              onClick={() => fileInputRef.current?.click()}
            >
              <Icon name="upload" size={18} />
              Import CSV
            </Button>
          </Tooltip>
          <Tooltip content="Export visible columns to CSV">
            <Button variant="tonal" onClick={handleExport}>
              <Icon name="download" size={18} />
              Export
            </Button>
          </Tooltip>
          <Button
            variant="tonal"
            className="text-error"
            onClick={() => setShowDeleteAllDialog(true)}
          >
            <Icon name="delete_sweep" size={18} />
            Delete All
          </Button>
          <Button onClick={openAdd}>
            <Icon name="person_add" size={18} />
            Add Member
          </Button>
        </div>
      </AppBar>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".csv"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Search + Filters Row */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4 flex-1">
          <Search
            className="max-w-sm flex-1"
            value={search}
            onValueChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            placeholder="Search by name or email..."
          />
          <Chip variant="filter" selected={false} leadingIcon="group">
            {data?.total ?? 0} members
          </Chip>
        </div>

        <div className="flex items-center gap-2">
          {/* Saved Views Dropdown */}
          <Select
            variant="outlined"
            label="View"
            value={selectedViewId}
            onValueChange={handleSelectView}
            options={[
              { value: "", label: "Default" },
              ...tableViews.map((v) => ({ value: v.id, label: v.name })),
            ]}
            className="min-w-35"
          />

          {/* Delete selected view */}
          {selectedViewId && (
            <Tooltip content="Delete this view">
              <Button
                variant="text"
                size="xs"
                className="rounded-full text-error"
                onClick={() => handleDeleteView(selectedViewId)}
              >
                <Icon name="delete" size={18} />
              </Button>
            </Tooltip>
          )}

          {/* Save View */}
          <Tooltip content="Save current column selection as a view">
            <Button
              variant="tonal"
              size="xs"
              onClick={() => setShowSaveViewDialog(true)}
            >
              <Icon name="save" size={18} />
              Save View
            </Button>
          </Tooltip>

          {/* Column Visibility Toggle */}
          <div className="relative">
            <Tooltip content="Toggle columns">
              <Button
                variant="tonal"
                size="xs"
                onClick={() => setShowColumnToggle((v) => !v)}
              >
                <Icon name="view_column" size={18} />
                Columns
              </Button>
            </Tooltip>

            {showColumnToggle && (
              <>
                {/* Backdrop to close dropdown */}
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setShowColumnToggle(false)}
                />
                <div className="absolute right-0 top-full mt-2 z-50 w-64 rounded-xl bg-surface-container-low border border-outline-variant shadow-lg p-3 space-y-1">
                  <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider px-2 mb-2">
                    Core Columns
                  </p>
                  {CORE_COLUMNS.map((col) => (
                    <div
                      key={col.key}
                      className="flex items-center gap-3 px-2 py-1.5 rounded-lg"
                    >
                      <Checkbox checked disabled />
                      <span className="text-[14px] text-surface-foreground">
                        {col.label}
                      </span>
                    </div>
                  ))}

                  {metadataKeys.length > 0 && (
                    <>
                      <Divider className="my-2" />
                      <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider px-2 mb-2">
                        Extra Columns
                      </p>
                      {metadataKeys.map((key) => {
                        const colKey = `meta:${key}`;
                        return (
                          <label
                            key={colKey}
                            className="flex items-center gap-3 px-2 py-1.5 rounded-lg hover:bg-surface-foreground/4 cursor-pointer"
                          >
                            <Checkbox
                              checked={visibleMetaKeys.has(colKey)}
                              onCheckedChange={() => toggleMetaColumn(colKey)}
                            />
                            <span className="text-[14px] text-surface-foreground">
                              {key}
                            </span>
                          </label>
                        );
                      })}
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <Card variant="elevated">
          <CardContent className="p-0">
            <div className="p-4 space-y-4">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4">
                  <Skeleton className="h-10 w-10 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-50" />
                    <Skeleton className="h-3 w-40" />
                  </div>
                  <Skeleton className="h-4 w-30" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {!isLoading && people.length === 0 && (
        <Card variant="elevated" className="max-w-lg mx-auto">
          <CardContent className="flex flex-col items-center py-16 px-8 text-center">
            <div className="flex items-center justify-center h-16 w-16 rounded-full bg-primary/8 mb-6">
              <Icon name="people" size={40} className="text-primary" />
            </div>
            <h2 className="text-[22px] font-normal leading-7 text-foreground mb-2">
              No members yet
            </h2>
            <p className="text-[14px] leading-5 text-muted-foreground mb-6 max-w-sm">
              Add your first workspace member. You can import from CSV or add
              them one by one.
            </p>
            <div className="flex gap-3">
              <Button
                variant="tonal"
                onClick={() => fileInputRef.current?.click()}
              >
                <Icon name="upload" size={18} />
                Import CSV
              </Button>
              <Button onClick={openAdd}>
                <Icon name="person_add" size={18} />
                Add Member
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Data Table */}
      {!isLoading && people.length > 0 && (
        <>
          {/* Batch Action Bar */}
          {selectedIds.size > 0 && (
            <Card variant="elevated" className="hidden md:block">
              <CardContent className="flex items-center gap-4 p-3">
                <Chip variant="filter" selected>
                  {selectedIds.size} selected
                </Chip>
                <Button
                  variant="tonal"
                  onClick={() => setShowBatchRoleDialog(true)}
                >
                  <Icon name="shield" size={18} />
                  Assign Role
                </Button>
                <Button
                  variant="text"
                  onClick={() => setSelectedIds(new Set())}
                >
                  Clear selection
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Desktop Table */}
          <Card variant="elevated" className="hidden md:block">
            <CardContent className="p-0 max-h-[calc(100vh-280px)] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-surface shadow-sm">
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={people.length > 0 && selectedIds.size === people.length}
                        indeterminate={selectedIds.size > 0 && selectedIds.size < people.length}
                        onCheckedChange={toggleSelectAll}
                      />
                    </TableHead>
                    {visibleColumns.map((col) => (
                      <TableHead key={col.key}>{col.label}</TableHead>
                    ))}
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {people.map((person) => (
                    <TableRow key={person.id} className={selectedIds.has(person.id) ? "bg-primary/5" : ""}>
                      <TableCell className="w-10">
                        <Checkbox
                          checked={selectedIds.has(person.id)}
                          onCheckedChange={() => toggleSelect(person.id)}
                        />
                      </TableCell>
                      {visibleColumns.map((col) => (
                        <TableCell key={col.key}>
                          {renderCell(person, col.key)}
                        </TableCell>
                      ))}
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="text"
                            size="xs"
                            className="rounded-full"
                            onClick={() => openEdit(person)}
                            aria-label={`Edit ${person.fullName}`}
                          >
                            <Icon name="edit" size={18} />
                          </Button>
                          <Button
                            variant="text"
                            size="xs"
                            className="rounded-full text-destructive hover:text-destructive"
                            onClick={() => setDeleteId(person.id)}
                            aria-label={`Delete ${person.fullName}`}
                          >
                            <Icon name="delete" size={18} />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          {/* Mobile Card View */}
          <div className="flex flex-col gap-4 md:hidden">
            {people.map((person) => (
              <Card key={person.id} variant="elevated">
                <CardContent className="flex items-center gap-4 p-4">
                  <Avatar name={person.fullName} size="l" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[16px] font-medium leading-6 text-foreground truncate">
                      {person.fullName}
                    </p>
                    <p className="text-[14px] leading-5 text-muted-foreground truncate">
                      {person.email}
                    </p>
                    {person.orgUnitName && (
                      <p className="text-[12px] leading-4 text-muted-foreground mt-0.5">
                        {person.orgUnitName}
                      </p>
                    )}
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="text"
                      size="xs"
                      className="rounded-full"
                      onClick={() => openEdit(person)}
                      aria-label={`Edit ${person.fullName}`}
                    >
                      <Icon name="edit" size={18} />
                    </Button>
                    <Button
                      variant="text"
                      size="xs"
                      className="rounded-full text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(person.id)}
                      aria-label={`Delete ${person.fullName}`}
                    >
                      <Icon name="delete" size={18} />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <p className="text-[14px] leading-5 text-muted-foreground">
                Page {page} of {totalPages} · {data?.total ?? 0} total
              </p>
              <div className="flex gap-2">
                <Button
                  variant="outlined"
                  size="xs"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  <Icon name="chevron_left" size={18} />
                  Previous
                </Button>
                <Button
                  variant="outlined"
                  size="xs"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                >
                  Next
                  <Icon name="chevron_right" size={18} />
                </Button>
              </div>
            </div>
          )}
        </>
      )}

      {/* ─── Dialogs ──────────────────────────────────────────────────────────── */}

      {/* Add Member Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent fullScreen>
          <DialogHeader>
            <DialogTitle>Add Member</DialogTitle>
            <DialogDescription>
              Add a new member to your workspace.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAdd} className="space-y-4">
            <TextField
              variant="outlined"
              label="Full Name"
              required
              value={formData.fullName}
              onChange={(e) =>
                setFormData({ ...formData, fullName: e.target.value })
              }
            />
            <TextField
              variant="outlined"
              label="Email"
              type="email"
              required
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
            <Select
              variant="outlined"
              label="Role"
              value={formData.roleId ?? ""}
              onValueChange={(value) =>
                setFormData({ ...formData, roleId: value || undefined })
              }
              options={[
                { value: "", label: "No role (basic access)" },
                ...roles.map((r) => ({ value: r.id, label: r.name })),
              ]}
            />
            <TextField
              variant="outlined"
              label="Phone"
              type="tel"
              value={formData.phone ?? ""}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
            />
            <TextField
              variant="outlined"
              label="Address"
              value={formData.address ?? ""}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
            />
            <TextField
              variant="outlined"
              label="Date of Birth"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) =>
                setFormData({ ...formData, dateOfBirth: e.target.value })
              }
            />
            <DialogFooter>
              <Button
                type="button"
                variant="text"
                onClick={() => setShowAddDialog(false)}
              >
                Cancel
              </Button>
              <Button
                variant="text"
                type="submit"
                disabled={createMutation.isPending}
              >
                {createMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Edit Member Dialog */}
      <Dialog
        open={!!editPerson}
        onOpenChange={(open) => !open && setEditPerson(null)}
      >
        <DialogContent fullScreen>
          <DialogHeader>
            <DialogTitle>Edit Member</DialogTitle>
            <DialogDescription>
              Update the member&apos;s information.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <TextField
              variant="outlined"
              label="Full Name"
              required
              value={formData.fullName}
              onChange={(e) =>
                setFormData({ ...formData, fullName: e.target.value })
              }
            />
            <TextField
              variant="outlined"
              label="Email"
              type="email"
              required
              value={formData.email}
              onChange={(e) =>
                setFormData({ ...formData, email: e.target.value })
              }
            />
            <TextField
              variant="outlined"
              label="Phone"
              type="tel"
              value={formData.phone ?? ""}
              onChange={(e) =>
                setFormData({ ...formData, phone: e.target.value })
              }
            />
            <TextField
              variant="outlined"
              label="Address"
              value={formData.address ?? ""}
              onChange={(e) =>
                setFormData({ ...formData, address: e.target.value })
              }
            />
            <TextField
              variant="outlined"
              label="Date of Birth"
              type="date"
              value={formData.dateOfBirth}
              onChange={(e) =>
                setFormData({ ...formData, dateOfBirth: e.target.value })
              }
            />

            {/* Dynamic metadata fields (Edit only) */}
            {editPerson && metadataKeys.length > 0 && (
              <>
                <Divider />
                <p className="text-[13px] font-medium text-surface-variant-foreground uppercase tracking-wide">
                  Additional Fields
                </p>
                {metadataKeys.map((key) => (
                  <TextField
                    key={key}
                    variant="outlined"
                    label={key}
                    value={formMetadata[key] ?? ""}
                    onChange={(e) =>
                      setFormMetadata({ ...formMetadata, [key]: e.target.value })
                    }
                  />
                ))}
              </>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="text"
                onClick={() => setEditPerson(null)}
              >
                Cancel
              </Button>
              <Button
                variant="text"
                type="submit"
                disabled={updateMutation.isPending}
              >
                {updateMutation.isPending ? "Saving..." : "Save"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Single Member Dialog */}
      <Dialog open={!!deleteId} onOpenChange={() => {}}>
        <DialogContent alert icon="delete">
          <DialogHeader centered>
            <DialogTitle>Confirm Delete</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove this member? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              type="button"
              variant="text"
              onClick={() => setDeleteId(null)}
            >
              Cancel
            </Button>
            <Button
              variant="text"
              className="text-error"
              onClick={handleDelete}
              disabled={deleteMutation.isPending}
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete All Members Dialog */}
      <Dialog open={showDeleteAllDialog} onOpenChange={setShowDeleteAllDialog}>
        <DialogContent alert icon="delete_sweep">
          <DialogHeader centered>
            <DialogTitle>Delete All Members</DialogTitle>
            <DialogDescription>
              Are you sure you want to remove all members? This action cannot be
              undone.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-start gap-3 rounded-lg bg-warning-container/40 p-3 mx-6">
            <Icon
              name="info"
              size={20}
              className="text-warning shrink-0 mt-0.5"
            />
            <p className="text-[13px] text-warning-foreground">
              Super admins will not be removed.
            </p>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="text"
              onClick={() => setShowDeleteAllDialog(false)}
            >
              Cancel
            </Button>
            <Button
              variant="text"
              className="text-error"
              onClick={handleDeleteAll}
              disabled={deleteAllMutation.isPending}
            >
              {deleteAllMutation.isPending
                ? "Deleting..."
                : "Delete All Members"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save View Dialog */}
      <Dialog open={showSaveViewDialog} onOpenChange={setShowSaveViewDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Table View</DialogTitle>
            <DialogDescription>
              Save the current column selection as a named view.
            </DialogDescription>
          </DialogHeader>
          <div className="px-6 py-2">
            <TextField
              variant="outlined"
              label="View Name"
              required
              value={newViewName}
              onChange={(e) => setNewViewName(e.target.value)}
              placeholder="e.g. Engineering View"
            />
            <div className="mt-3">
              <p className="text-[12px] text-muted-foreground mb-1">
                Visible columns:
              </p>
              <div className="flex flex-wrap gap-1">
                {visibleColumns.map((col) => (
                  <Chip key={col.key} variant="filter">
                    {col.label}
                  </Chip>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="text"
              onClick={() => {
                setShowSaveViewDialog(false);
                setNewViewName("");
              }}
            >
              Cancel
            </Button>
            <Button
              variant="text"
              onClick={handleSaveView}
              disabled={createViewMutation.isPending}
            >
              {createViewMutation.isPending ? "Saving..." : "Save"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* CSV Import Dialog (Multi-step) */}
      <Dialog
        open={showImportDialog}
        onOpenChange={(open) => {
          if (!open) resetImportDialog();
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {importStep === "mapping" && "Map CSV Columns"}
              {importStep === "preview" && "Confirm Import"}
            </DialogTitle>
            <DialogDescription>
              {importStep === "mapping" &&
                "Match each CSV column to a member field. Columns mapped to 'Extra Column' will be stored as metadata."}
              {importStep === "preview" &&
                "Review the data below before importing."}
            </DialogDescription>
          </DialogHeader>

          {/* Step 2: Column Mapping */}
          {importStep === "mapping" && (
            <div className="px-6 space-y-3 max-h-[60vh] overflow-y-auto">
              <div className="grid grid-cols-[1fr_auto_1fr] gap-x-4 gap-y-2 items-center">
                <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">
                  CSV Column
                </p>
                <div />
                <p className="text-[12px] font-medium text-muted-foreground uppercase tracking-wider">
                  Maps To
                </p>

                {columnMappings.map((mapping, idx) => (
                  <React.Fragment key={idx}>
                    <div className="flex items-center gap-2">
                      <Icon
                        name="table_chart"
                        size={16}
                        className="text-muted-foreground"
                      />
                      <span className="text-[14px] text-surface-foreground font-medium truncate">
                        {mapping.csvHeader}
                      </span>
                      {csvRows.length > 0 && csvRows[0][idx] && (
                        <span className="text-[12px] text-muted-foreground truncate max-w-30">
                          (e.g. {csvRows[0][idx]})
                        </span>
                      )}
                    </div>
                    <Icon
                      name="arrow_forward"
                      size={16}
                      className="text-muted-foreground"
                    />
                    <Select
                      variant="outlined"
                      value={mapping.target}
                      onValueChange={(val) =>
                        handleMappingChange(idx, val as MappingTarget)
                      }
                      options={MAPPING_OPTIONS}
                    />
                  </React.Fragment>
                ))}
              </div>

              <p className="text-[12px] text-muted-foreground pt-2">
                {csvRows.length} data rows detected ·{" "}
                {csvHeaders.length} columns
              </p>

              {/* Org Level type names shown when orgLevel is selected */}
              {columnMappings.some((m) => m.target === "orgLevel") && (
                <div className="mt-3 p-3 rounded-xl bg-surface-container-low border border-outline-variant/50">
                  <p className="text-[13px] font-medium text-surface-foreground mb-2">
                    Unit type for each org level column:
                  </p>
                  <div className="space-y-2">
                    {columnMappings.map((m, idx) =>
                      m.target === "orgLevel" ? (
                        <div key={idx} className="flex items-center gap-2">
                          <span className="text-[13px] text-surface-variant-foreground w-32 shrink-0 truncate">
                            {m.csvHeader}
                          </span>
                          <span className="text-[12px] text-muted-foreground">→</span>
                          <TextField
                            variant="outlined"
                            value={m.unitTypeName ?? ""}
                            onChange={(e) => {
                              const next = [...columnMappings];
                              next[idx] = { ...next[idx], unitTypeName: e.target.value };
                              setColumnMappings(next);
                            }}
                            placeholder="e.g. Division, Tribe, Squad"
                            className="flex-1"
                          />
                        </div>
                      ) : null,
                    )}
                  </div>
                </div>
              )}

              {/* Default role for imported members */}
              <div className="mt-3 p-3 rounded-xl bg-surface-container-low border border-outline-variant/50">
                <p className="text-[13px] font-medium text-surface-foreground mb-2">
                  Default role for imported members
                </p>
                <p className="text-[12px] text-muted-foreground mb-2">
                  All imported members will be assigned this role. Leave empty for no role.
                </p>
                <Select
                  variant="outlined"
                  value={importDefaultRoleId}
                  onValueChange={setImportDefaultRoleId}
                  options={[
                    { value: "", label: "No role" },
                    ...roles.map((r) => ({ value: r.id, label: r.name })),
                  ]}
                  className="w-full"
                />
              </div>
            </div>
          )}

          {/* Step 3: Preview */}
          {importStep === "preview" && importPreview && (
            <div className="px-6 space-y-4 max-h-[60vh] overflow-y-auto relative">
              {bulkImportMutation.isPending && (
                <div className="absolute inset-0 bg-surface/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center gap-4 rounded-xl">
                  <div className="w-12 h-12 border-4 border-primary border-t-transparent rounded-full animate-spin" />
                  <p className="text-[16px] font-medium text-surface-foreground">
                    Importing members...
                  </p>
                  <p className="text-[13px] text-surface-variant-foreground">
                    Creating {importPreview.rows.length} members with org structure, positions, and roles
                  </p>
                  <div className="w-48 h-1.5 bg-surface-variant/30 rounded-full overflow-hidden">
                    <div className="h-full bg-primary rounded-full animate-pulse" style={{ width: '60%' }} />
                  </div>
                </div>
              )}
              {importPreview.rows.length > 0 && (
                <div>
                  <p className="text-[14px] font-medium text-surface-foreground mb-2">
                    ✓ {importPreview.rows.length} valid{" "}
                    {importPreview.rows.length === 1 ? "record" : "records"}
                  </p>
                  <div className="space-y-1">
                    {importPreview.rows.slice(0, 5).map((row, i) => (
                      <div
                        key={i}
                        className="text-[13px] text-surface-variant-foreground flex gap-2"
                      >
                        <span className="font-medium text-surface-foreground">
                          {row.fullName}
                        </span>
                        <span>— {row.email}</span>
                        {row.orgStructure && (
                          <span className="text-muted-foreground">
                            · {row.orgStructure}
                          </span>
                        )}
                      </div>
                    ))}
                    {importPreview.rows.length > 5 && (
                      <p className="text-[12px] text-surface-variant-foreground">
                        ...and {importPreview.rows.length - 5} more
                      </p>
                    )}
                  </div>
                </div>
              )}
              {importPreview.errors.length > 0 && (
                <div>
                  <p className="text-[14px] font-medium text-error mb-2">
                    ✗ {importPreview.errors.length}{" "}
                    {importPreview.errors.length === 1 ? "error" : "errors"}
                  </p>
                  <div className="space-y-1">
                    {importPreview.errors.slice(0, 5).map((err, i) => (
                      <p key={i} className="text-[12px] text-error">
                        Row {err.row}: {err.message}
                      </p>
                    ))}
                    {importPreview.errors.length > 5 && (
                      <p className="text-[12px] text-surface-variant-foreground">
                        ...and {importPreview.errors.length - 5} more errors
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {importStep === "mapping" && (
              <>
                <Button variant="text" onClick={resetImportDialog}>
                  Cancel
                </Button>
                <Button variant="text" onClick={handleMappingNext}>
                  Next
                </Button>
              </>
            )}
            {importStep === "preview" && (
              <>
                <Button
                  variant="text"
                  onClick={() => setImportStep("mapping")}
                >
                  Back
                </Button>
                <Button
                  variant="text"
                  onClick={handleImportConfirm}
                  disabled={
                    !importPreview?.rows.length ||
                    bulkImportMutation.isPending
                  }
                >
                  {bulkImportMutation.isPending
                    ? (
                      <span className="flex items-center gap-2">
                        <span className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        Importing {importPreview?.rows.length ?? 0} records...
                      </span>
                    )
                    : `Import ${importPreview?.rows.length ?? 0} records`}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Batch Role Assignment Dialog */}
      <Dialog open={showBatchRoleDialog} onOpenChange={setShowBatchRoleDialog}>
        <DialogContent icon="shield">
          <DialogHeader centered>
            <DialogTitle>Assign Role</DialogTitle>
            <DialogDescription>
              Assign a role to {selectedIds.size} selected member{selectedIds.size !== 1 ? "s" : ""}.
            </DialogDescription>
          </DialogHeader>
          <Select
            variant="outlined"
            label="Role"
            value={batchRoleId}
            onValueChange={setBatchRoleId}
            options={roles.map((r) => ({ value: r.id, label: r.name }))}
          />
          <DialogFooter>
            <Button variant="text" onClick={() => setShowBatchRoleDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="text"
              onClick={handleBatchAssignRole}
              disabled={!batchRoleId || assignRoleMutation.isPending}
            >
              {assignRoleMutation.isPending ? "Assigning..." : "Assign"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  );
}
