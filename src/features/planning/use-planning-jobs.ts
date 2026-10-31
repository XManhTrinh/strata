"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getBrowserClient } from "@/lib/supabase/client";
import type { PlanningJob } from "./types";

type Progress = { processed: number; total: number };

/**
 * Carries running plan jobs (building, copying, costing) on from the browser, a chunk at a time,
 * while the page is open, and refreshes it when one finishes. Jobs this user may not run are
 * shown as they are. Returns each job's progress.
 */
export function usePlanningJobs(
  jobs: PlanningJob[],
  mayRun: (job: PlanningJob) => boolean
): Map<string, Progress> {
  const router = useRouter();
  const [progress, setProgress] = useState(new Map<string, Progress>());
  const runnable = jobs.filter(mayRun).map((j) => j.id);
  const key = runnable.join(",");

  useEffect(() => {
    if (!key) return;
    let stopped = false;
    const supabase = getBrowserClient();
    void Promise.all(
      key.split(",").map(async (id) => {
        while (!stopped) {
          const { data, error } = await supabase.rpc("run_planning_job", { p_job_id: id });
          if (error || !data) return;
          const status = data as { done: boolean; processed: number; total: number };
          setProgress((current) => new Map(current).set(id, status));
          if (status.done) return true;
        }
      })
    ).then((finished) => {
      if (!stopped && finished.some(Boolean)) router.refresh();
    });
    return () => {
      stopped = true;
    };
  }, [key, router]);

  return new Map(
    jobs.map((j) => [j.id, progress.get(j.id) ?? { processed: j.processed, total: j.total }])
  );
}
