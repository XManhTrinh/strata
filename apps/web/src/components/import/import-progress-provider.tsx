"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useCompanyId } from "@/hooks/use-company";
import {
  startMemberImport,
  fetchImportProgress,
  type ImportMemberRow,
  type ImportJobProgress,
} from "@/services";

const POLL_INTERVAL_MS = 1000;
const STORAGE_KEY = "strata.activeImportJob";

interface ActiveJob {
  companyId: string;
  jobId: string;
}

interface ImportProgressValue {
  /** Latest progress snapshot for the active job, or null when idle. */
  progress: ImportJobProgress | null;
  /** 0–100, or null when idle. */
  percent: number | null;
  /** True while an import is running. */
  isActive: boolean;
  /** Start a background import; registers the job for global tracking. */
  startImport: (rows: ImportMemberRow[]) => Promise<void>;
  /** Dismiss a finished job's indicator. */
  dismiss: () => void;
}

const ImportProgressContext = createContext<ImportProgressValue>({
  progress: null,
  percent: null,
  isActive: false,
  startImport: async () => {},
  dismiss: () => {},
});

export function useImportProgress() {
  return useContext(ImportProgressContext);
}

function loadActiveJob(): ActiveJob | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as ActiveJob) : null;
  } catch {
    return null;
  }
}

/**
 * Tracks the current CSV import job globally so its progress indicator persists
 * across page navigation (the provider sits above the router) and across a full
 * refresh (the active jobId is stored in localStorage). Polls the backend
 * progress endpoint and exposes the result to any consumer (e.g. the avatar ring).
 */
export function ImportProgressProvider({ children }: { children: ReactNode }) {
  const companyId = useCompanyId();
  const queryClient = useQueryClient();
  // Restore any in-flight job from localStorage via a lazy initializer so the
  // persisted job is read once at init (SSR-safe: loadActiveJob returns null on
  // the server) without a setState in a mount effect.
  const [job, setJob] = useState<ActiveJob | null>(() => loadActiveJob());
  const [progress, setProgress] = useState<ImportJobProgress | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const refreshedRef = useRef(false);

  const persist = useCallback((next: ActiveJob | null) => {
    try {
      if (next) localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      else localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore storage errors */
    }
  }, []);

  const startImport = useCallback(
    async (rows: ImportMemberRow[]) => {
      if (!companyId) return;
      const { jobId } = await startMemberImport(companyId, rows);
      const next = { companyId, jobId };
      refreshedRef.current = false;
      setProgress(null);
      setJob(next);
      persist(next);
    },
    [companyId, persist],
  );

  const dismiss = useCallback(() => {
    setJob(null);
    setProgress(null);
    persist(null);
  }, [persist]);

  // Poll progress while a job is active.
  useEffect(() => {
    if (!job) {
      if (timerRef.current) clearInterval(timerRef.current);
      return;
    }

    let cancelled = false;
    const poll = async () => {
      try {
        const p = await fetchImportProgress(job.companyId, job.jobId);
        if (cancelled) return;
        setProgress(p);

        if (p.status === "completed" || p.status === "failed" || p.status === "unknown") {
          if (timerRef.current) clearInterval(timerRef.current);
          // Refresh members once when the import finishes.
          if (!refreshedRef.current && p.status === "completed") {
            refreshedRef.current = true;
            queryClient.invalidateQueries({ queryKey: ["members", job.companyId] });
            queryClient.invalidateQueries({ queryKey: ["company-settings", job.companyId] });
          }
          // Clear the persisted job; keep the final snapshot briefly so the ring
          // can show 100% before it disappears.
          persist(null);
          if (p.status !== "completed") {
            setJob(null);
          } else {
            // Auto-dismiss shortly after completion.
            setTimeout(() => {
              if (!cancelled) {
                setJob(null);
                setProgress(null);
              }
            }, 2500);
          }
        }
      } catch {
        // transient error — keep polling
      }
    };

    poll();
    timerRef.current = setInterval(poll, POLL_INTERVAL_MS);
    return () => {
      cancelled = true;
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [job, persist, queryClient]);

  const isActive = !!job && progress?.status !== "completed" && progress?.status !== "failed";
  const percent =
    progress && progress.total > 0
      ? Math.min(100, Math.round((progress.processed / progress.total) * 100))
      : job
        ? 0
        : null;

  return (
    <ImportProgressContext.Provider
      value={{ progress, percent, isActive, startImport, dismiss }}
    >
      {children}
    </ImportProgressContext.Provider>
  );
}
