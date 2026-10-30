"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button, LinearProgressIndicator } from "@windmorph/react";
import { Alert, EmptyState } from "@windmorph/react-pro";
import { Icon } from "@/components/ui/icon";
import { applyChunk } from "../client-api";
import type { PreviewCounts } from "../types";

const PHASES = ["people", "managers", "leavers", "finish", "done"] as const;
type Phase = (typeof PHASES)[number];

/** Applies the import chunk by chunk; leaving the page and resuming carries on where it stopped. */
export function ApplyStep({
  jobId,
  counts,
  peopleHref,
  onAnother,
}: {
  jobId: string;
  counts: Partial<PreviewCounts>;
  peopleHref: string;
  onAnother: () => void;
}) {
  const t = useTranslations("import.apply");
  const [phase, setPhase] = useState<Phase>("people");
  const [error, setError] = useState<string | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      try {
        for (;;) {
          const result = await applyChunk(jobId);
          setPhase(result.phase as Phase);
          if (result.done) break;
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      }
    })();
  }, [jobId]);

  if (error) return <Alert severity="error">{t("failed", { error })}</Alert>;

  if (phase === "done") {
    return (
      <EmptyState
        titleAs="h2"
        announce
        icon={<Icon name="task_alt" />}
        title={t("done")}
        description={t("doneBody", {
          new: counts.new ?? 0,
          changed: counts.changed ?? 0,
          leaving: counts.leaving ?? 0,
        })}
        actions={
          <>
            <Button variant="filled" href={peopleHref}>
              {t("toPeople")}
            </Button>
            <Button variant="text" onPress={onAnother}>
              {t("another")}
            </Button>
          </>
        }
      />
    );
  }

  const step = PHASES.indexOf(phase);
  return (
    <div className="flex flex-col gap-3" aria-live="polite">
      <p className="text-title-medium text-on-surface">
        {t("runningPhase", { phase: t(`phases.${phase}`) })}
      </p>
      <LinearProgressIndicator aria-label={t("running")} value={step / (PHASES.length - 1)} />
    </div>
  );
}
