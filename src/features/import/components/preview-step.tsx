"use client";

import { useTranslations } from "next-intl";
import { Button } from "@windmorph/react";
import { Alert } from "@windmorph/react-pro";
import { type ColumnDef, DataTable } from "@/components/ui/data-table";
import { useDataTableLabels } from "@/hooks/use-data-table-labels";
import type { PreviewCounts, RowError } from "../types";

const COUNTS = ["new", "changed", "unchanged", "leaving", "errors"] as const;

/** What applying would do, and the rows it would skip and why. */
export function PreviewStep({
  counts,
  errors,
  pending,
  onApply,
  onCancel,
}: {
  counts: PreviewCounts;
  errors: RowError[];
  pending: boolean;
  onApply: () => void;
  onCancel: () => void;
}) {
  const t = useTranslations("import");
  const labels = useDataTableLabels();
  const problems = (e: RowError) =>
    e.errors
      .map((code) => (code in ROW_ERRORS ? t(`rowErrors.${code as RowErrorCode}`) : code))
      .join(", ");
  const columns: ColumnDef<RowError>[] = [
    {
      id: "row",
      header: t("preview.row"),
      accessor: (e) => e.row,
      type: "number",
      width: 90,
      isRowHeader: true,
    },
    { id: "key", header: t("preview.key"), accessor: (e) => e.key, width: 200 },
    { id: "problems", header: t("preview.problems"), accessor: problems, width: 420 },
  ];
  const changes = counts.new + counts.changed + counts.leaving;

  return (
    <div className="flex flex-col gap-6">
      <section aria-labelledby="preview-title" className="flex flex-col gap-3">
        <h2 id="preview-title" className="text-title-medium text-on-surface">
          {t("preview.title")}
        </h2>
        <dl className="medium:grid-cols-5 grid grid-cols-2 gap-3">
          {COUNTS.map((key) => (
            <div key={key} className="bg-surface-container-low rounded-xl p-4">
              <dt className="text-label-large text-on-surface-variant">{t(`preview.${key}`)}</dt>
              <dd className="text-headline-medium text-on-surface tabular-nums">{counts[key]}</dd>
            </div>
          ))}
        </dl>
      </section>

      {counts.leaving > 0 && (
        <Alert severity="warning">{t("preview.leavingWarning", { count: counts.leaving })}</Alert>
      )}

      {errors.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-title-medium text-on-surface">{t("preview.errorsTitle")}</h2>
          <DataTable
            aria-label={t("preview.errorsTitle")}
            columns={columns}
            rows={errors}
            getRowId={(e) => String(e.row)}
            compactItem={(e) => ({ headline: `${e.row} · ${e.key}`, supporting: problems(e) })}
            labels={labels}
          />
        </section>
      )}

      {changes === 0 && (
        <p className="text-body-medium text-on-surface-variant">{t("preview.nothing")}</p>
      )}

      <div className="flex justify-between gap-3">
        <Button variant="text" onPress={onCancel}>
          {t("preview.cancel")}
        </Button>
        <Button variant="filled" pending={pending} disabled={changes === 0} onPress={onApply}>
          {t("preview.apply")}
        </Button>
      </div>
    </div>
  );
}

const ROW_ERRORS = {
  missingKey: true,
  emailInvalid: true,
  nameRequired: true,
  unknownEmploymentType: true,
  payNotAllowed: true,
  duplicateKey: true,
};
type RowErrorCode = keyof typeof ROW_ERRORS;
