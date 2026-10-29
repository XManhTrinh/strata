import { notFound } from "next/navigation";
import { SpikeView } from "@/features/spike/spike-view";

/** Development-only measurement page; absent unless the server runs with STRATA_DEV_PAGES=1. */
export default async function SpikePage({
  searchParams,
}: {
  searchParams: Promise<{ view?: string; count?: string }>;
}) {
  if (process.env.STRATA_DEV_PAGES !== "1") notFound();
  const { view, count } = await searchParams;
  return (
    <SpikeView
      view={view === "grid" ? "grid" : "table"}
      count={Math.min(Number(count) || 100_000, 100_000)}
    />
  );
}
