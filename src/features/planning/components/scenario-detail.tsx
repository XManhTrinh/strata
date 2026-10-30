"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { Button, Select, SelectItem, TextField } from "@windmorph/react";
import { Tag } from "@windmorph/react-pro";
import { DataGrid, type GridColumn, type GridRow } from "@/components/ui/data-grid";
import { FormDialog } from "@/components/ui/form-dialog";
import { Icon } from "@/components/ui/icon";
import { IsoDateField } from "@/components/ui/iso-date-field";
import { ItemMenu } from "@/components/ui/item-menu";
import { PersonPicker } from "@/features/people/components/person-picker";
import type { JobChoices } from "@/features/people/types";
import { useWorkspace } from "@/features/workspaces/workspace-context";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useSnackbar } from "@/lib/snackbar";
import type { FormState } from "@/lib/form-state";
import {
  deletePlannedRole,
  fillPlannedRole,
  loadGrid,
  saveAllocations,
  savePlannedRole,
} from "../grid-actions";
import type { AllocationRow, PlannedRole, PlanningSettings, Scenario } from "../types";

/** Rows the grid holds at most; beyond that, narrow by team or name. */
const MAX_ROWS = 5000;

type Dialog =
  { kind: "role"; role?: PlannedRole } | { kind: "fill"; role: PlannedRole } | { kind: "person" };

function monthsBetween(first: string, last: string): string[] {
  const months: string[] = [];
  const [y, m] = first.split("-").map(Number) as [number, number];
  for (let i = 0; ; i++) {
    const month = new Date(Date.UTC(y, m - 1 + i, 1)).toISOString().slice(0, 10);
    if (month > last) return months;
    months.push(month);
  }
}

function nextMonth(month: string): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
}

/** A scenario's people and planned roles by team and month, edited in a grid on desktop. */
export function ScenarioDetail({
  scenario,
  settings,
  choices,
  plannedRoles,
  canEdit,
}: {
  scenario: Scenario;
  settings: PlanningSettings;
  choices: JobChoices;
  plannedRoles: PlannedRole[];
  canEdit: boolean;
}) {
  const t = useTranslations("scenarioDetail");
  const ts = useTranslations("scenarios");
  const te = useTranslations("errors");
  const format = useFormatter();
  const router = useRouter();
  const snackbar = useSnackbar();
  const { workspace } = useWorkspace();
  const desktop = useMediaQuery("(min-width: 1200px)");
  const [unitId, setUnitId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const [rows, setRows] = useState<AllocationRow[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, startLoading] = useTransition();
  const [saving, startSaving] = useTransition();
  const [edits, setEdits] = useState<Map<string, number | null>>(new Map());
  const [dialog, setDialog] = useState<Dialog | null>(null);
  const [reload, setReload] = useState(0);

  const months = useMemo(
    () => monthsBetween(scenario.firstPeriod, scenario.lastPeriod),
    [scenario.firstPeriod, scenario.lastPeriod]
  );
  const thisMonth = `${new Date().toISOString().slice(0, 7)}-01`;
  const open = !scenario.archived && (!settings.lifecycle || scenario.status === "draft");
  // The first month that can still change: after locked months, and not the past with the lifecycle on.
  const firstOpen = [
    scenario.lockedThrough ? nextMonth(scenario.lockedThrough) : scenario.firstPeriod,
    settings.lifecycle ? thisMonth : scenario.firstPeriod,
  ].reduce((a, b) => (a > b ? a : b));
  const editable = canEdit && open && desktop;

  // Search waits for a pause in typing.
  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(timer);
  }, [search]);

  const load = useCallback(
    (offset: number) =>
      startLoading(async () => {
        const page = await loadGrid(
          scenario.id,
          scenario.firstPeriod,
          scenario.lastPeriod,
          unitId,
          query,
          offset
        );
        setRows((current) => (offset === 0 ? page.rows : [...current, ...page.rows]));
        setTotal(page.total);
      }),
    [scenario.id, scenario.firstPeriod, scenario.lastPeriod, unitId, query]
  );
  useEffect(() => {
    load(0);
  }, [load, reload]);

  // Unsaved changes are kept when the page is left by accident.
  useEffect(() => {
    if (edits.size === 0) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [edits.size]);

  const byKey = useMemo(() => new Map(rows.map((r) => [r.key, r])), [rows]);
  const roles = useMemo(() => new Map(plannedRoles.map((r) => [r.id, r])), [plannedRoles]);
  const editKey = (rowKey: string, month: string) => `${rowKey}|${month}`;
  const value = (rowKey: string, month: string) => {
    const key = editKey(rowKey, month);
    return edits.has(key) ? (edits.get(key) ?? null) : (byKey.get(rowKey)?.months[month] ?? null);
  };
  // A person's total that month across teams, with unsaved changes in the rows loaded.
  const totalFor = (row: AllocationRow, month: string) => {
    let sum = row.totals[month] ?? 0;
    for (const other of rows) {
      if (other.memberId !== row.memberId || other.plannedRoleId !== row.plannedRoleId) continue;
      const key = editKey(other.key, month);
      if (edits.has(key)) sum += (edits.get(key) ?? 0) - (other.months[month] ?? 0);
    }
    return sum;
  };

  const percent = settings.displayUnit === "percent";
  const formatValue = (n: number | null) =>
    n === null
      ? ""
      : percent
        ? `${Math.round(n * 1000) / 10}%`
        : String(Math.round(n * 1000) / 1000);
  const parse = (text: string) => {
    const clean = text.trim().replace("%", "").replace(",", ".");
    if (clean === "") return null;
    const n = Number(clean) / (percent ? 100 : 1);
    if (!Number.isFinite(n) || n < 0 || n > 1) return undefined;
    return n === 0 ? null : Math.round(n * 1000) / 1000;
  };

  const monthLabel = (iso: string) =>
    format.dateTime(new Date(`${iso}T00:00:00Z`), {
      month: "short",
      year: "numeric",
      timeZone: "UTC",
    });
  const columns: GridColumn[] = months.map((m) => ({ id: m, header: monthLabel(m) }));
  const gridRows: GridRow[] = rows.map((r) => ({
    id: r.key,
    header: r.name,
    subheader: r.plannedRoleId
      ? r.filledOn
        ? t("filledFrom", { unit: r.unitName, date: monthLabel(r.filledOn.slice(0, 7) + "-01") })
        : t("openRole", { unit: r.unitName })
      : r.unitName,
  }));

  function onChange(rowKey: string, month: string, next: number | null) {
    if (month < firstOpen) {
      void snackbar.showSnackbar(te("periodLocked"), { replace: true });
      return;
    }
    const original = byKey.get(rowKey)?.months[month] ?? null;
    setEdits((current) => {
      const updated = new Map(current);
      if (next === original) updated.delete(editKey(rowKey, month));
      else updated.set(editKey(rowKey, month), next);
      return updated;
    });
  }

  function save() {
    const changes = [...edits].map(([key, fte]) => {
      const [rowKey, period] = key.split("|") as [string, string];
      const row = byKey.get(rowKey)!;
      return {
        memberId: row.memberId,
        plannedRoleId: row.plannedRoleId,
        unitId: row.unitId,
        period,
        fte: fte ?? 0,
      };
    });
    startSaving(async () => {
      const result = await saveAllocations(scenario.id, changes);
      if (!result.ok) {
        void snackbar.showSnackbar(te(result.error), { replace: true });
        return;
      }
      setEdits(new Map());
      setReload((n) => n + 1);
      void snackbar.showSnackbar(
        result.over > 0
          ? t("savedOver", { count: result.over })
          : t("saved", { count: changes.length }),
        { replace: true }
      );
    });
  }

  function afterDialog() {
    setDialog(null);
    setReload((n) => n + 1);
    router.refresh();
  }

  return (
    <section aria-labelledby="scenario-title" className="flex flex-col gap-4">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="text"
            href={`/w/${workspace.slug}/planning/scenarios`}
            leadingIcon={<Icon name="arrow_back" />}
          >
            {t("back")}
          </Button>
          <h2 id="scenario-title" className="text-headline-small text-on-surface">
            {scenario.name}
          </h2>
          {scenario.isLive && <Tag color="primary">{ts("live")}</Tag>}
          {settings.lifecycle && <Tag color="neutral">{ts(`statuses.${scenario.status}`)}</Tag>}
        </div>
        {canEdit && open && (
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outlined"
              leadingIcon={<Icon name="person_add" />}
              onPress={() => setDialog({ kind: "person" })}
            >
              {t("addPerson")}
            </Button>
            <Button
              variant="filled"
              leadingIcon={<Icon name="add" />}
              onPress={() => setDialog({ kind: "role" })}
            >
              {t("addRole")}
            </Button>
          </div>
        )}
      </header>
      <p className="text-body-medium text-on-surface-variant">
        {!open
          ? t("locked")
          : !canEdit
            ? t("readOnly")
            : !desktop
              ? t("desktopToEdit")
              : t("howToEdit")}
      </p>

      <div className="flex flex-wrap items-end gap-4">
        <Select
          className="w-72"
          label={t("team")}
          searchable={choices.units.length > 10}
          labels={{ search: t("team") }}
          value={unitId ?? "all"}
          onChange={(key) => key != null && setUnitId(key === "all" ? null : String(key))}
        >
          {[{ id: "all", label: t("allTeams") }, ...choices.units].map((u) => (
            <SelectItem key={u.id} textValue={u.label.trim()}>
              {u.label}
            </SelectItem>
          ))}
        </Select>
        <TextField
          className="w-72"
          label={t("search")}
          type="search"
          value={search}
          onChange={setSearch}
        />
        <p
          className="text-body-medium text-on-surface-variant"
          aria-live="polite"
          aria-busy={loading || undefined}
        >
          {t("showing", { shown: rows.length, total })}
        </p>
      </div>

      {rows.length === 0 && !loading ? (
        <p className="text-body-large text-on-surface-variant">{t("empty")}</p>
      ) : (
        <DataGrid
          aria-label={t("gridLabel", { name: scenario.name })}
          rows={gridRows}
          columns={columns}
          value={value}
          format={formatValue}
          parse={parse}
          editable={editable}
          onChange={onChange}
          tone={(rowKey, month) => {
            if (edits.has(editKey(rowKey, month))) return "changed";
            const row = byKey.get(rowKey);
            if (!row?.memberId) return null;
            const sum = totalFor(row, month);
            if (sum > 1.0005) return "over";
            if (sum > 0 && sum < 0.9995) return "under";
            return null;
          }}
          rowActions={(gridRow) => {
            const row = byKey.get(gridRow.id);
            const role = row?.plannedRoleId ? roles.get(row.plannedRoleId) : undefined;
            if (!role || !canEdit || !open) return null;
            return (
              <ItemMenu
                label={t("roleActions", { name: role.title })}
                onAction={(key) => {
                  if (key === "edit") setDialog({ kind: "role", role });
                  if (key === "fill") setDialog({ kind: "fill", role });
                  if (key === "delete")
                    startSaving(async () => {
                      const result = await deletePlannedRole(role.id);
                      void snackbar.showSnackbar(
                        result.ok ? t("roleRemoved", { name: role.title }) : te(result.error),
                        { replace: true }
                      );
                      if (result.ok) afterDialog();
                    });
                }}
                actions={[
                  { key: "edit", label: t("editRole"), icon: "edit" },
                  !role.filledOn && { key: "fill", label: t("fillRole"), icon: "how_to_reg" },
                  { key: "delete", label: t("removeRole"), icon: "delete" },
                ]}
              />
            );
          }}
          labels={{
            cell: (row, column) => t("cell", { name: row.header, month: column.header }),
            rowHeader: t("personOrRole"),
            tone: (tone) => t(`tones.${tone}`),
          }}
        />
      )}
      {rows.length < total && rows.length < MAX_ROWS && (
        <Button
          variant="text"
          className="self-start"
          pending={loading}
          onPress={() => load(rows.length)}
        >
          {t("loadMore")}
        </Button>
      )}
      {rows.length >= MAX_ROWS && total > rows.length && (
        <p className="text-body-medium text-on-surface-variant">{t("narrow")}</p>
      )}

      {edits.size > 0 && (
        <div
          role="region"
          aria-label={t("unsavedLabel")}
          className="bg-inverse-surface text-inverse-on-surface sticky bottom-4 flex flex-wrap items-center justify-between gap-3 rounded-lg px-4 py-2"
        >
          <span className="text-body-medium">{t("unsaved", { count: edits.size })}</span>
          <span className="flex gap-2">
            <Button
              variant="text"
              className="text-inverse-primary"
              onPress={() => setEdits(new Map())}
            >
              {t("discard")}
            </Button>
            <Button variant="filled" pending={saving} onPress={save}>
              {t("save")}
            </Button>
          </span>
        </div>
      )}

      {dialog?.kind === "role" && (
        <PlannedRoleDialog
          scenario={scenario}
          role={dialog.role}
          choices={choices}
          defaultUnitId={unitId}
          onClose={() => setDialog(null)}
          onSaved={afterDialog}
        />
      )}
      {dialog?.kind === "fill" && (
        <FormDialog
          title={t("fillTitle", { name: dialog.role.title })}
          submitLabel={t("fill")}
          action={withDone(fillPlannedRole.bind(null, dialog.role.id), afterDialog)}
          done={() => t("filled", { name: dialog.role.title })}
          onClose={() => setDialog(null)}
        >
          {(fieldError) => (
            <>
              <PersonPicker
                name="memberId"
                label={t("person")}
                defaultValue={null}
                errorMessage={fieldError("memberId")}
              />
              <IsoDateField
                name="from"
                label={t("fillFrom")}
                defaultValue={dialog.role.startDate > firstOpen ? dialog.role.startDate : firstOpen}
                required
                errorMessage={fieldError("from")}
              />
              <p className="text-body-small text-on-surface-variant">{t("fillHelp")}</p>
            </>
          )}
        </FormDialog>
      )}
      {dialog?.kind === "person" && (
        <AddPersonDialog
          units={choices.units}
          defaultUnitId={unitId}
          onClose={() => setDialog(null)}
          onAdd={(person, unit) => {
            const key = `${person.id}:${unit.id}`;
            if (!byKey.has(key)) {
              setRows((current) => [
                {
                  key,
                  memberId: person.id,
                  plannedRoleId: null,
                  name: person.name,
                  unitId: unit.id,
                  unitName: unit.label.trim(),
                  filledOn: null,
                  months: {},
                  totals: {},
                },
                ...current,
              ]);
            }
            setDialog(null);
            void snackbar.showSnackbar(t("personAdded", { name: person.name }), { replace: true });
          }}
        />
      )}
    </section>
  );
}

/** Runs `after` once the action succeeds, so the grid reloads with the change. */
function withDone(
  action: (previous: FormState, formData: FormData) => Promise<FormState>,
  after: () => void
) {
  return async (previous: FormState, formData: FormData) => {
    const result = await action(previous, formData);
    if (result.status === "success") after();
    return result;
  };
}

function PlannedRoleDialog({
  scenario,
  role,
  choices,
  defaultUnitId,
  onClose,
  onSaved,
}: {
  scenario: Scenario;
  role?: PlannedRole;
  choices: JobChoices;
  defaultUnitId: string | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const t = useTranslations("scenarioDetail");
  const { workspace } = useWorkspace();
  const select = (
    name: string,
    label: string,
    options: { id: string; label: string }[],
    initial: string | null,
    optional = true
  ) => (
    <Select
      className="w-full"
      name={name}
      label={label}
      searchable={options.length > 10}
      labels={{ search: label }}
      defaultValue={initial ?? (optional ? "none" : null)}
    >
      {[...(optional ? [{ id: "none", label: t("none") }] : []), ...options].map((o) => (
        <SelectItem key={o.id} textValue={o.label.trim()}>
          {o.label}
        </SelectItem>
      ))}
    </Select>
  );
  return (
    <FormDialog
      title={t(role ? "roleDialogEdit" : "roleDialogAdd")}
      submitLabel={t(role ? "save" : "add")}
      action={withDone(
        savePlannedRole.bind(null, workspace.id, scenario.id, role?.id ?? null),
        onSaved
      )}
      done={(name) => t(role ? "roleSaved" : "roleAdded", { name })}
      onClose={onClose}
    >
      {(fieldError) => (
        <>
          <TextField
            className="w-full"
            name="name"
            label={t("roleTitle")}
            required
            defaultValue={role?.title ?? ""}
            invalid={Boolean(fieldError("name"))}
            errorMessage={fieldError("name")}
          />
          {select(
            "unitId",
            t("team"),
            choices.units,
            role?.unitId ?? defaultUnitId ?? choices.units[0]?.id ?? null,
            false
          )}
          <div className="grid grid-cols-2 gap-4">
            {select("positionId", t("position"), choices.positions, role?.positionId ?? null)}
            {select(
              "careerLevelId",
              t("careerLevel"),
              choices.careerLevels,
              role?.careerLevelId ?? null
            )}
          </div>
          {select(
            "employmentTypeId",
            t("employmentType"),
            choices.employmentTypes,
            role?.employmentTypeId ?? null
          )}
          <div className="grid grid-cols-2 gap-4">
            <IsoDateField
              name="startDate"
              label={t("start")}
              defaultValue={role?.startDate ?? scenario.firstPeriod}
              required
              errorMessage={fieldError("startDate")}
            />
            <IsoDateField
              name="endDate"
              label={t("end")}
              defaultValue={role?.endDate ?? null}
              supportingText={t("endHelp")}
              errorMessage={fieldError("endDate")}
            />
          </div>
          <TextField
            className="w-full"
            name="fte"
            label={t("fte")}
            type="number"
            inputMode="decimal"
            defaultValue={String(role?.fte ?? 1)}
            invalid={Boolean(fieldError("fte"))}
            errorMessage={fieldError("fte")}
          />
          {role && <p className="text-body-small text-on-surface-variant">{t("roleReplanHelp")}</p>}
        </>
      )}
    </FormDialog>
  );
}

function AddPersonDialog({
  units,
  defaultUnitId,
  onClose,
  onAdd,
}: {
  units: { id: string; label: string }[];
  defaultUnitId: string | null;
  onClose: () => void;
  onAdd: (person: { id: string; name: string }, unit: { id: string; label: string }) => void;
}) {
  const t = useTranslations("scenarioDetail");
  const [person, setPerson] = useState<{ id: string; name: string } | null>(null);
  const [unit, setUnit] = useState(defaultUnitId ?? units[0]?.id ?? "");
  // A local step only: the person's time is saved with the grid.
  return (
    <FormDialog
      title={t("personDialog")}
      submitLabel={t("add")}
      action={async () => {
        const chosen = units.find((u) => u.id === unit);
        if (!person) return { status: "error", fieldErrors: { memberId: "personRequired" } };
        if (chosen) onAdd(person, chosen);
        return { status: "idle" };
      }}
      done={() => ""}
      onClose={onClose}
    >
      {(fieldError) => (
        <>
          <PersonPicker
            name="memberId"
            label={t("person")}
            defaultValue={null}
            onSelect={setPerson}
            errorMessage={fieldError("memberId")}
          />
          <Select
            className="w-full"
            label={t("team")}
            searchable={units.length > 10}
            labels={{ search: t("team") }}
            value={unit}
            onChange={(key) => key != null && setUnit(String(key))}
          >
            {units.map((u) => (
              <SelectItem key={u.id} textValue={u.label.trim()}>
                {u.label}
              </SelectItem>
            ))}
          </Select>
          <p className="text-body-small text-on-surface-variant">{t("personHelp")}</p>
        </>
      )}
    </FormDialog>
  );
}
