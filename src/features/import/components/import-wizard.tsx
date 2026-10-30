"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import { Button, List, ListItem } from "@windmorph/react";
import { EmptyState } from "@windmorph/react-pro";
import { Icon } from "@/components/ui/icon";
import { useWorkspace } from "@/features/workspaces/workspace-context";
import { useSnackbar } from "@/lib/snackbar";
import { cancelImport, loadRowErrors, previewImport, stageRows, startImport } from "../client-api";
import { type ImportMapping, guessMapping, toImportRow } from "../mapping";
import type { ParsedFile } from "../parse-file";
import type {
  ImportJobSummary,
  ImportOptions,
  PreviewCounts,
  RowError,
  SavedMapping,
} from "../types";
import { ApplyStep } from "./apply-step";
import { FileStep } from "./file-step";
import { MapStep } from "./map-step";
import { PreviewStep } from "./preview-step";

type Step = "file" | "map" | "preview" | "apply";
const STEPS: Step[] = ["file", "map", "preview", "apply"];

export function ImportWizard({
  levels,
  customFields,
  saved,
  unfinished,
}: {
  levels: { id: string; name: string }[];
  customFields: { key: string; label: string }[];
  saved: SavedMapping[];
  unfinished: ImportJobSummary[];
}) {
  const t = useTranslations("import");
  const format = useFormatter();
  const router = useRouter();
  const snackbar = useSnackbar();
  const { workspace } = useWorkspace();
  const [step, setStep] = useState<Step>("file");
  const [file, setFile] = useState<ParsedFile | null>(null);
  const [mapping, setMapping] = useState<ImportMapping | null>(null);
  const [options, setOptions] = useState<ImportOptions>({
    effectiveDate: new Date().toISOString().slice(0, 10),
    markLeavers: false,
  });
  const [jobId, setJobId] = useState<string | null>(null);
  const [counts, setCounts] = useState<PreviewCounts | null>(null);
  const [errors, setErrors] = useState<RowError[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  async function preview(id: string, keyField: string) {
    const result = await previewImport(id);
    setCounts(result);
    setErrors(await loadRowErrors(id, keyField));
    setJobId(id);
    setStep("preview");
  }

  async function stage() {
    if (!file || !mapping) return;
    if (!mapping.columns[mapping.keyField]) {
      setError(t("map.keyMissing", { field: t(`fields.${mapping.keyField}`) }));
      return;
    }
    setError(null);
    try {
      const rows = file.records.map((record) => toImportRow(record, mapping));
      const id = await startImport(workspace.id, mapping, options);
      await stageRows(workspace.id, id, rows, (sent) =>
        setProgress(t("map.staging", { sent, total: rows.length }))
      );
      await preview(id, mapping.keyField);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setProgress(null);
    }
  }

  function cancel(id: string) {
    startTransition(async () => {
      await cancelImport(id);
      void snackbar.showSnackbar(t("unfinished.cancelled"), { replace: true });
      reset();
      router.refresh();
    });
  }

  function reset() {
    setStep("file");
    setFile(null);
    setMapping(null);
    setJobId(null);
    setCounts(null);
    setErrors([]);
  }

  return (
    <div className="flex max-w-5xl flex-col gap-6">
      <p className="text-body-medium text-on-surface-variant">{t("intro")}</p>

      {step === "file" && unfinished.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-title-medium text-on-surface">{t("unfinished.title")}</h2>
          <List aria-label={t("unfinished.title")}>
            {unfinished.map((job) => (
              <ListItem
                key={job.id}
                textValue={job.id}
                supportingText={t("unfinished.started", {
                  date: format.dateTime(new Date(job.createdAt), {
                    dateStyle: "medium",
                    timeStyle: "short",
                  }),
                })}
                trailing={
                  <div className="flex gap-2">
                    <Button variant="text" onPress={() => cancel(job.id)}>
                      {t("unfinished.cancel")}
                    </Button>
                    <Button
                      variant="tonal"
                      onPress={() => {
                        if (job.status === "applying") {
                          setJobId(job.id);
                          setCounts(job.counts as PreviewCounts);
                          setStep("apply");
                        } else startTransition(() => preview(job.id, "person_key"));
                      }}
                    >
                      {t("unfinished.resume")}
                    </Button>
                  </div>
                }
              >
                {t(
                  `apply.phases.${job.status === "applying" ? (job.phase as "people") : "people"}`
                )}
              </ListItem>
            ))}
          </List>
        </section>
      )}

      <ol className="flex flex-wrap gap-2" aria-label={t("title")}>
        {STEPS.map((s, i) => (
          <li
            key={s}
            aria-current={s === step ? "step" : undefined}
            className={`text-label-large rounded-full px-3 py-1 ${
              s === step
                ? "bg-secondary-container text-on-secondary-container"
                : "text-on-surface-variant"
            }`}
          >
            {t("stepLabel", { number: i + 1, name: t(`steps.${s}`) })}
          </li>
        ))}
      </ol>

      {step === "file" && (
        <FileStep
          file={file}
          onFile={(parsed) => {
            setFile(parsed);
            setMapping(guessMapping(parsed.headers, customFields));
          }}
          onNext={() => setStep("map")}
        />
      )}
      {step === "map" && file && mapping && (
        <MapStep
          workspaceId={workspace.id}
          headers={file.headers}
          mapping={mapping}
          options={options}
          levels={levels}
          customFields={customFields}
          saved={saved}
          error={error}
          pending={progress}
          onChange={setMapping}
          onOptions={setOptions}
          onBack={() => setStep("file")}
          onNext={() => void stage()}
        />
      )}
      {step === "preview" && counts && jobId && (
        <PreviewStep
          counts={counts}
          errors={errors}
          pending={pending}
          onApply={() => setStep("apply")}
          onCancel={() => cancel(jobId)}
        />
      )}
      {step === "apply" && jobId && counts && (
        <ApplyStep
          jobId={jobId}
          counts={counts}
          peopleHref={`/w/${workspace.slug}/people`}
          onAnother={() => {
            reset();
            router.refresh();
          }}
        />
      )}
    </div>
  );
}

/** Phones get a pointer to a larger screen; mapping columns needs the room. */
export function ImportNeedsLargerScreen() {
  const t = useTranslations("import");
  return (
    <EmptyState
      titleAs="h2"
      icon={<Icon name="devices" />}
      title={t("largerScreen")}
      description={t("largerScreenBody")}
    />
  );
}
